import multer from 'multer';
import { supabase } from '../config/supabase.js';

const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files allowed!'), false);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/docs/upload
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const userId = req.user.id;
    const fileName = `${userId}/${Date.now()}-${req.file.originalname}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, req.file.buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert([{
        owner_id: userId,
        filename: fileName,
        original_name: req.file.originalname,
        storage_path: fileName,
        file_url: urlData.publicUrl,
        status: 'uploaded',
      }])
      .select()
      .single();

    if (dbError) throw dbError;
    return res.status(201).json({ message: 'Document uploaded successfully!', document });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed.' });
  }
};

// GET /api/docs
export const getDocuments = async (req, res) => {
  try {
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('owner_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json({ documents });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch documents.' });
  }
};

// GET /api/docs/:id
export const getDocument = async (req, res) => {
  try {
    // Check owner — if it doesn't match, try without owner check (self-sign flow)
    let query = supabase.from('documents').select('*').eq('id', req.params.id);
    
    if (req.user?.id) {
      query = query.eq('owner_id', req.user.id);
    }

    const { data: document, error } = await query.single();

    if (error || !document) return res.status(404).json({ error: 'Document not found.' });

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(document.storage_path);
    return res.status(200).json({ document: { ...document, file_url: urlData.publicUrl } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch document.' });
  }
};

// POST /api/docs/:id/stamp — stamp save
export const saveStamp = async (req, res) => {
  try {
    const { id } = req.params;
    const { stampData } = req.body;

    console.log('saveStamp called, docId:', id);
    console.log('stampData received:', stampData ? 'YES - length:' + stampData.length : 'NO');
    console.log('user id:', req.user?.id);

    const { data, error } = await supabase
      .from('documents')
      .update({ stamp_data: stampData })
      .eq('id', id)
      .eq('owner_id', req.user.id)
      .select();

    console.log('Supabase update result:', data, error);

    if (error) throw error;
    return res.status(200).json({ message: 'Stamp saved!' });
  } catch (err) {
    console.error('Stamp save error:', err);
    return res.status(500).json({ error: 'Failed to save stamp.' });
  }
};

// DELETE /api/docs/:id
export const deleteDocument = async (req, res) => {
  try {
    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .single();

    if (!doc) return res.status(404).json({ error: 'Document not found.' });

    await supabase.storage.from('documents').remove([doc.storage_path]);
    await supabase.from('documents').delete().eq('id', req.params.id);

    return res.status(200).json({ message: 'Document deleted!' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete document.' });
  }
};