import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import docsRoutes from './routes/docs.js';
import shareRoutes from './routes/share.js';
import signatureRoutes from './routes/signatures.js';
import signerRoutes from './routes/signers.js';
import auditRoutes from './routes/audit.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/signers', signerRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));