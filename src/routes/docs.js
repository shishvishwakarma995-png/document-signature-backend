import express from 'express';
import { upload, uploadDocument, getDocuments, getDocument, deleteDocument, saveStamp } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.get('/:id', protect, getDocument);
router.post('/:id/stamp', protect, saveStamp);
router.delete('/:id', protect, deleteDocument);

export default router;