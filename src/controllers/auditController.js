import { supabase } from '../config/supabase.js';

export const getAuditLogs = async (req, res) => {
  try {
    const { docId } = req.params;

    // Document owner check
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .eq('owner_id', req.user.id)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('document_id', docId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json({ logs });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.' });
  }
};