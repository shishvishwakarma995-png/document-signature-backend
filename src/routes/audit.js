import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/:docId', protect, getAuditLogs);

export default router;