import express from 'express';
import {
  inviteSigners,
  getSigners,
  getDocumentBySignerToken,
  signByToken,
  rejectByToken,
} from '../controllers/signerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/:docId/invite', protect, inviteSigners);
router.get('/:docId', protect, getSigners);
router.get('/sign/:token', getDocumentBySignerToken);
router.post('/sign/:token', signByToken);
router.post('/reject/:token', rejectByToken);

export default router;