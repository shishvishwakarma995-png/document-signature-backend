import { supabase } from '../config/supabase.js';

export const saveSignatureFields = async (req, res) => {
  try {
    const { documentId, fields } = req.body;
    if (!documentId || !fields?.length) {
      return res.status(400).json({ error: 'documentId and fields required.' });
    }

    
    await supabase
      .from('signatures')
      .delete()
      .eq('document_id', documentId);

    const inserts = fields.map(f => ({
      document_id: documentId,
      signer_id: req.user.id,
      x: f.x,
      y: f.y,
      page: f.page,
      width: f.width,
      height: f.height,
      type: f.type || 'signature',
      status: 'pending',
    }));

    const { data, error } = await supabase
      .from('signatures')
      .insert(inserts)
      .select();

    if (error) throw error;

    return res.status(201).json({ message: 'Signature fields saved!', signatures: data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save signatures.' });
  }
};

export const getSignatures = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('document_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return res.status(200).json({ signatures: data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch signatures.' });
  }
};