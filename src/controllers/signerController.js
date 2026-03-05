import crypto from 'crypto';
import * as Brevo from '@getbrevo/brevo';
import { supabase } from '../config/supabase.js';

const brevoClient = new Brevo.TransactionalEmailsApi();
brevoClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

export const inviteSigners = async (req, res) => {
  try {
    const { docId } = req.params;
    const { emails } = req.body;

    if (!emails || !emails.length) {
      return res.status(400).json({ error: 'At least one email required.' });
    }

    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .eq('owner_id', req.user.id)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const results = [];

    for (const email of emails) {
      const token = crypto.randomBytes(32).toString('hex');

      const { data: signer, error } = await supabase
        .from('signers')
        .insert([{ document_id: docId, email: email.trim(), token, status: 'pending' }])
        .select()
        .single();

      if (error) { results.push({ email, success: false, error: error.message }); continue; }

      const signingLink = `${process.env.CLIENT_URL}/sign/${token}`;

      try {
        await brevoClient.sendTransacEmail({
          sender: { email: process.env.GMAIL_USER, name: 'SignVault' },
          to: [{ email: email.trim() }],
          subject: `You have been requested to sign: ${doc.original_name}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: #0A0A0B; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: #C9A84C; font-size: 24px; margin: 0; letter-spacing: 2px;">SignVault</h1>
              </div>
              <div style="background: #f5f0e8; padding: 32px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #1a1714; font-size: 20px; margin-bottom: 16px;">Document Signature Request</h2>
                <p style="color: #6b6460; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                  You have been requested to review and sign the following document:
                </p>
                <div style="background: white; border: 1px solid #e8e2d8; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                  <p style="color: #1a1714; font-size: 14px; margin: 0;"><strong>Document:</strong> ${doc.original_name}</p>
                </div>
                <a href="${signingLink}" style="display: block; background: #0A0A0B; color: #C9A84C; text-decoration: none; padding: 16px 32px; border-radius: 4px; text-align: center; font-size: 14px; letter-spacing: 1px; font-weight: 600; margin-bottom: 24px;">
                  Review & Sign Document →
                </a>
                <p style="color: #9a9088; font-size: 12px; text-align: center;">
                  This link will expire in 7 days. If you did not expect this request, please ignore this email.
                </p>
              </div>
            </div>
          `,
        });

        await supabase.from('signers').update({ email_sent_at: new Date().toISOString() }).eq('id', signer.id);
        results.push({ email, success: true });
      } catch (emailError) {
        console.error('Email error:', emailError);
        results.push({ email, success: false, error: 'Email failed to send.' });
      }
    }

    await supabase.from('documents').update({ status: 'pending', total_signers: emails.length }).eq('id', docId);
    return res.status(200).json({ message: 'Invitations sent!', results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send invitations.' });
  }
};

export const getSigners = async (req, res) => {
  try {
    const { docId } = req.params;
    const { data: signers, error } = await supabase
      .from('signers').select('*').eq('document_id', docId).order('created_at', { ascending: true });

    if (error) throw error;

    const total = signers.length;
    const signed = signers.filter(s => s.status === 'signed').length;
    const rejected = signers.filter(s => s.status === 'rejected').length;
    const pending = signers.filter(s => s.status === 'pending').length;

    return res.status(200).json({ signers, total, signed, rejected, pending });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch signers.' });
  }
};

const DOC_SELECT = 'id, owner_id, filename, original_name, storage_path, file_url, status, stamp_data, created_at';

export const getDocumentBySignerToken = async (req, res) => {
  try {
    const { token } = req.params;

    const { data: signer } = await supabase
      .from('signers')
      .select(`*, documents(${DOC_SELECT})`)
      .eq('token', token)
      .single();

    if (!signer) return res.status(404).json({ error: 'Invalid link.' });
    if (signer.status !== 'pending') {
      return res.status(410).json({ error: `This document has already been ${signer.status}.` });
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(signer.documents.storage_path);

    console.log('stamp_data value:', signer.documents.stamp_data ? 'EXISTS' : 'NULL');

    return res.status(200).json({
      document: {
        ...signer.documents,
        file_url: urlData.publicUrl,
        stamp_data: signer.documents.stamp_data || null,
      },
      signer: { id: signer.id, email: signer.email, name: signer.name || '' },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch document.' });
  }
};

export const signByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { name } = req.body;

    const { data: signer } = await supabase
      .from('signers')
      .select(`*, documents(${DOC_SELECT})`)
      .eq('token', token)
      .single();

    if (!signer) return res.status(404).json({ error: 'Invalid link.' });
    if (signer.status !== 'pending') return res.status(410).json({ error: 'Already signed.' });

    await supabase.from('signers')
      .update({ status: 'signed', name, signed_at: new Date().toISOString() })
      .eq('token', token);

    const { data: allSigners } = await supabase
      .from('signers').select('status').eq('document_id', signer.document_id);

    const signedCount = allSigners.filter(s => s.status === 'signed').length;
    const rejectedCount = allSigners.filter(s => s.status === 'rejected').length;
    const allDone = signedCount + rejectedCount === allSigners.length;

    await supabase.from('documents').update({
      signed_count: signedCount,
      rejected_count: rejectedCount,
      status: allDone ? (rejectedCount > 0 ? 'partially_signed' : 'signed') : 'pending',
    }).eq('id', signer.document_id);

    await supabase.from('audit_logs').insert([{
      document_id: signer.document_id,
      action: 'document_signed',
      ip_address: req.ip,
      metadata: { name, signerEmail: signer.email },
    }]);

    return res.status(200).json({ message: 'Document signed successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to sign.' });
  }
};

export const rejectByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;

    const { data: signer } = await supabase
      .from('signers')
      .select(`*, documents(${DOC_SELECT})`)
      .eq('token', token)
      .single();

    if (!signer) return res.status(404).json({ error: 'Invalid link.' });

    await supabase.from('signers')
      .update({ status: 'rejected', rejection_reason: reason })
      .eq('token', token);

    const { data: allSigners } = await supabase
      .from('signers').select('status').eq('document_id', signer.document_id);

    const signedCount = allSigners.filter(s => s.status === 'signed').length;
    const rejectedCount = allSigners.filter(s => s.status === 'rejected').length;

    await supabase.from('documents')
      .update({ signed_count: signedCount, rejected_count: rejectedCount })
      .eq('id', signer.document_id);

    return res.status(200).json({ message: 'Document rejected.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reject.' });
  }
};