import multer from 'multer';
import { supabase } from '../config/supabase.js';

// Multer — memory mein file store karo
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed!'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// POST /api/docs/upload
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const userId = req.user.id;
    const fileName = `${userId}/${Date.now()}-${req.file.originalname}`;

    // Supabase Storage mein upload karo
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Signed URL banao
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

    // Database mein save karo
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert([{
        owner_id: userId,
        filename: fileName,
        original_name: req.file.originalname,
        storage_path: fileName,
        file_url: urlData.signedUrl,
        status: 'uploaded',
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    return res.status(201).json({
      message: 'Document uploaded successfully!',
      document,
    });
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
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', req.user.id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Fresh signed URL banao
    const { data: urlData } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.storage_path, 60 * 60);

    return res.status(200).json({
      document: { ...document, file_url: urlData.signedUrl }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch document.' });
  }
};