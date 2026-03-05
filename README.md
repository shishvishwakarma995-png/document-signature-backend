# SignVault — Backend

> REST API for SignVault Document Signature Platform

**Live API:** https://document-signature-backend-production.up.railway.app

---

## Tech Stack

- Node.js + Express
- Supabase (PostgreSQL + Storage)
- JWT (access + refresh tokens)
- Nodemailer (Gmail SMTP)
- Multer (file upload)

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login + get tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/docs` | Get all documents |
| POST | `/api/docs/upload` | Upload PDF |
| GET | `/api/docs/:id` | Get document |
| DELETE | `/api/docs/:id` | Delete document |
| POST | `/api/docs/:id/stamp` | Save company stamp |

### Signatures
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signatures` | Save signature fields |
| GET | `/api/signatures/:docId` | Get fields for document |

### Signers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signers/:docId/invite` | Invite signers by email |
| GET | `/api/signers/:docId` | Get signers status |
| GET | `/api/signers/sign/:token` | Get doc by token |
| POST | `/api/signers/sign/:token` | Sign document |
| POST | `/api/signers/reject/:token` | Reject document |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/:docId` | Get audit logs |

---

## Getting Started

### Prerequisites
- Node.js 20+
- Supabase account
- Gmail account with App Password

### Installation

```bash
git clone https://github.com/shishvishwakarma995-png/document-signature-backend.git
cd document-signature-backend
npm install
```

### Environment Variables

Create a `.env` file:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GMAIL_USER=your@gmail.com
GMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
```

### Gmail App Password Setup
1. Google Account → Security → 2-Step Verification → App Passwords
2. Generate password for "Mail"
3. Use that 16-character password in `GMAIL_PASS`

### Run Development Server

```bash
node src/index.js
```

API runs at `http://localhost:5000`

---

## Database Schema (Supabase)

### Tables
- `users` — id, email, name, password_hash
- `documents` — id, owner_id, filename, original_name, storage_path, file_url, status, stamp_data
- `signatures` — id, document_id, x, y, page, width, height, type
- `signers` — id, document_id, email, name, token, status, signed_at, rejection_reason
- `audit_logs` — id, document_id, action, ip_address, metadata

---

## Deployment

Deployed on **Railway**.

---

## Frontend

See: https://github.com/shishvishwakarma995-png/document-signature-frontend
