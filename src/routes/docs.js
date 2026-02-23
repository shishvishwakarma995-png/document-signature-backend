import express from 'express';
import { uploadDocument, getDocuments, getDocument, upload } from '../controllers/documentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/upload', protect, upload.single('file'), uploadDocument);
router.get('/', protect, getDocuments);
router.get('/:id', protect, getDocument);

export default router;