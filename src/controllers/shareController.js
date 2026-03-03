import crypto from 'crypto';
import { supabase } from '../config/supabase.js';

// POST /api/share/:docId 
export const createShareLink = async (req, res) => {
  try {
    const { docId } = req.params;
    const { signerEmail } = req.body;

    // Document already exist ?
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .eq('owner_id', req.user.id)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    // Unique token 
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: shareToken, error } = await supabase
      .from('share_tokens')
      .insert([{
        document_id: docId,
        token,
        signer_email: signerEmail || null,
        expires_at: expiresAt.toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;

    // Document status pending 
    await supabase
      .from('documents')
      .update({ status: 'pending' })
      .eq('id', docId);

    const shareLink = `${process.env.CLIENT_URL}/sign/${token}`;

    return res.status(201).json({
      message: 'Share link created!',
      shareLink,
      token: shareToken.token,
      expiresAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create share link.' });
  }
};

// GET /api/share/:token - Fetch document from token
export const getDocumentByToken = async (req, res) => {
  try {
    const { token } = req.params;

    const { data: shareToken } = await supabase
      .from('share_tokens')
      .select('*, documents(*)')
      .eq('token', token)
      .single();

    if (!shareToken) return res.status(404).json({ error: 'Invalid link.' });
    if (shareToken.used) return res.status(410).json({ error: 'This link has already been used.' });
    if (new Date(shareToken.expires_at) < new Date()) {
      return res.status(410).json({ error: 'This link has expired.' });
    }

    // Fresh signed URL 
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(shareToken.documents.storage_path, 60 * 60);

    return res.status(200).json({
      document: {
        ...shareToken.documents,
        file_url: urlData.signedUrl,
      },
      signerEmail: shareToken.signer_email,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch document.' });
  }
};

// POST /api/share/:token/sign — Document sign 
export const signDocument = async (req, res) => {
  try {
    const { token } = req.params;
    const { signerName, signerEmail } = req.body;

    const { data: shareToken } = await supabase
      .from('share_tokens')
      .select('*, documents(*)')
      .eq('token', token)
      .single();

    if (!shareToken) return res.status(404).json({ error: 'Invalid link.' });
    if (shareToken.used) return res.status(410).json({ error: 'Already signed.' });

    // Signature save 
    await supabase.from('signatures').insert([{
      document_id: shareToken.document_id,
      signer_email: signerEmail || shareToken.signer_email,
      status: 'signed',
      signed_at: new Date().toISOString(),
    }]);

    // Token used mark 
    await supabase.from('share_tokens').update({ used: true }).eq('token', token);

    // Document status signed 
    await supabase.from('documents').update({ status: 'signed' }).eq('id', shareToken.document_id);

    // Audit log
    await supabase.from('audit_logs').insert([{
      document_id: shareToken.document_id,
      action: 'document_signed',
      ip_address: req.ip,
      metadata: { signerName, signerEmail },
    }]);

    return res.status(200).json({ message: 'Document signed successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to sign document.' });
  }
};

// POST /api/share/:token/reject — Document reject 
export const rejectDocument = async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const { data: shareToken } = await supabase
      .from('share_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (!shareToken) return res.status(404).json({ error: 'Invalid link.' });

    await supabase.from('signatures').insert([{
      document_id: shareToken.document_id,
      status: 'rejected',
      rejection_reason: reason || 'No reason provided',
    }]);

    await supabase.from('share_tokens').update({ used: true }).eq('token', token);
    await supabase.from('documents').update({ status: 'rejected' }).eq('id', shareToken.document_id);

    return res.status(200).json({ message: 'Document rejected.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reject document.' });
  }
};