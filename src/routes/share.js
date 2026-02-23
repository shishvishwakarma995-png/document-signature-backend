import express from 'express';
import { createShareLink, getDocumentByToken, signDocument, rejectDocument } from '../controllers/shareController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/:docId', protect, createShareLink);
router.get('/:token', getDocumentByToken);
router.post('/:token/sign', signDocument);
router.post('/:token/reject', rejectDocument);

export default router;