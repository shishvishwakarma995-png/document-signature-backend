import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const GOLD = '#C9A84C';
const BLACK = '#0A0A0B';
const PARCHMENT = '#f5f0e8';

interface Doc {
  id: string;
  original_name: string;
  status: string;
  created_at: string;
  file_url: string;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [sharingDocId, setSharingDocId] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/api/docs');
      setDocuments(res.data.documents);
    } catch (err) {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { setError('Only PDF files allowed!'); return; }
    setUploading(true); setError(''); setSuccess(''); setShareLink('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/api/docs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Document uploaded successfully!');
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShare = async (docId: string) => {
    setError(''); setSuccess(''); setShareLink('');
    try {
      const res = await api.post(`/api/share/${docId}`, { signerEmail });
      setShareLink(res.data.shareLink);
      setSharingDocId('');
      setSignerEmail('');
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create share link.');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/api/docs/${docId}`);
      setSuccess('Document deleted!');
      fetchDocuments();
    } catch (err: any) {
      setError('Failed to delete document.');
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setSuccess('Link copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    if (status === 'signed') return '#10b981';
    if (status === 'pending') return GOLD;
    if (status === 'rejected') return '#ef4444';
    return '#6b7280';
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'DM Mono, monospace', minHeight: '100vh', width: '100%', background: PARCHMENT, position: 'absolute', top: 0, left: 0 }}>
      <nav style={{ background: BLACK, padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 600, color: GOLD, letterSpacing: 2 }}>SignVault</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, color: '#6b6460' }}>👤 {user?.name}</span>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', color: GOLD, padding: '6px 14px', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', borderRadius: 3 }}>
            Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 36, fontWeight: 600, color: '#1a1714', marginBottom: 8 }}>My Documents</h1>
        <p style={{ fontSize: 12, color: '#9a9088', marginBottom: 40 }}>Upload, manage and send documents for signing</p>

        {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '12px 16px', fontSize: 12, color: '#dc2626', marginBottom: 20 }}>⚠ {error}</div>}
        {success && <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 6, padding: '12px 16px', fontSize: 12, color: '#059669', marginBottom: 20 }}>{success}</div>}

        {/* Share Link Box */}
        {shareLink && (
          <div style={{ background: 'white', border: `1px solid ${GOLD}`, borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, marginBottom: 12 }}>🔗 Share Link Ready!</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input readOnly value={shareLink} style={{ flex: 1, background: '#fafafa', border: '1px solid #e8e2d8', borderRadius: 4, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', color: '#1a1714', outline: 'none' }} />
              <button onClick={copyLink} style={{ background: BLACK, color: GOLD, border: 'none', padding: '10px 20px', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', borderRadius: 4 }}>Copy</button>
            </div>
          </div>
        )}

        {/* Upload Area */}
        <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(201,168,76,0.4)', borderRadius: 12, padding: 48, textAlign: 'center', background: 'rgba(201,168,76,0.02)', marginBottom: 40, cursor: 'pointer' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, color: '#1a1714', marginBottom: 8 }}>Upload a Document</h2>
          <p style={{ fontSize: 12, color: '#9a9088', marginBottom: 24 }}>PDF files only — max 10MB</p>
          <button disabled={uploading} style={{ background: BLACK, color: GOLD, border: 'none', padding: '14px 32px', fontFamily: 'inherit', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', borderRadius: 4 }}>
            {uploading ? 'Uploading...' : '+ Upload PDF'}
          </button>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUpload} style={{ display: 'none' }} />
        </div>

        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#9a9088', marginBottom: 16 }}>
          {documents.length} Document{documents.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#9a9088', padding: 40 }}>Loading...</p>
        ) : documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9a9088' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 24, color: '#6b6460', marginBottom: 8 }}>No documents yet</p>
            <p style={{ fontSize: 12 }}>Upload your first PDF to get started</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {documents.map((doc) => (
              <div key={doc.id} style={{ background: 'white', border: '1px solid #e8e2d8', borderRadius: 10, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, background: 'rgba(201,168,76,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📄</div>
                    <div>
                      <div style={{ fontSize: 14, color: '#1a1714', marginBottom: 4 }}>{doc.original_name}</div>
                      <div style={{ fontSize: 11, color: '#9a9088' }}>{formatDate(doc.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, color: getStatusColor(doc.status), background: getStatusColor(doc.status) + '18' }}>
                      {doc.status}
                    </span>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ border: '1px solid #e8e2d8', color: '#6b6460', padding: '8px 14px', fontSize: 11, borderRadius: 4, textDecoration: 'none' }}>
                      View →
                    </a>
                    <button onClick={() => navigate(`/editor/${doc.id}`)} style={{ background: 'rgba(201,168,76,0.1)', color: GOLD, border: `1px solid ${GOLD}`, padding: '8px 14px', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', borderRadius: 4 }}>
                      ✍️ Edit
                    </button>
                    <button onClick={() => setSharingDocId(sharingDocId === doc.id ? '' : doc.id)} style={{ background: BLACK, color: GOLD, border: 'none', padding: '8px 14px', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', borderRadius: 4 }}>
                      Share 🔗
                    </button>
                    <button onClick={() => handleDelete(doc.id)} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '8px 14px', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', borderRadius: 4 }}>
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Share Panel */}
                {sharingDocId === doc.id && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e8e2d8', display: 'flex', gap: 10 }}>
                    <input
                      type="email"
                      placeholder="Signer email (optional)"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      style={{ flex: 1, background: '#fafafa', border: '1px solid #e8e2d8', borderRadius: 4, padding: '10px 14px', fontSize: 12, fontFamily: 'inherit', color: '#1a1714', outline: 'none' }}
                    />
                    <button onClick={() => handleShare(doc.id)} style={{ background: GOLD, color: BLACK, border: 'none', padding: '10px 20px', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer', borderRadius: 4, fontWeight: 600 }}>
                      Generate Link
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}