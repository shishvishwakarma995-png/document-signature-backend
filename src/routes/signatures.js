import express from 'express';
import { saveSignatureFields, getSignatures } from '../controllers/signatureController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.post('/', protect, saveSignatureFields);
router.get('/:id', protect, getSignatures);

export default router;