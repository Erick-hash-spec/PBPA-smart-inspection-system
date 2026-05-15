import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productReceiptCertificateService } from '../services/api';
import { SubmitModal } from '../components/SubmitModal';

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
      <p className="text-gray-800 font-semibold mb-1">Confirm Delete</p>
      <p className="text-gray-500 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

export const ProductReceiptCertificateListPage = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { fetchCertificates(); }, [statusFilter]); // eslint-disable-line

  const fetchCertificates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await productReceiptCertificateService.getCertificates(statusFilter ? { status: statusFilter } : {});
      setCertificates(res.data.results || res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view certificates.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to load certificates. Check that the backend server is running.');
      }
    }
    finally { setLoading(false); }
  };

  const handleIssue = async (id) => {
    try { await productReceiptCertificateService.issueCertificate(id); fetchCertificates(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to issue certificate'); }
  };

  const handleDownloadDoc = async (cert) => {
    try {
      const res = await productReceiptCertificateService.generateDocument(cert.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `PRC_${cert.certificate_number}.docx`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download document'); }
  };

  const handleDelete = async () => {
    try { await productReceiptCertificateService.deleteCertificate(deleteTarget.id); fetchCertificates(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleteTarget(null); }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Product Receipt Certificate"
          docTypeKey="product_receipt"
          docId={submitTarget.id}
          docNumber={submitTarget.certificate_number}
          vesselName={submitTarget.vessel_name}
          terminal={submitTarget.terminal}
          onDownload={() => handleDownloadDoc(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete certificate #${deleteTarget.certificate_number} for ${deleteTarget.vessel_name}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📄 Product Receipt Certificates</h1>
          <p className="text-gray-500 mt-1">Create and issue PBPA receipt certificates</p>
        </div>
        <button onClick={() => navigate('/product-receipt-certificates/new')} className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition self-start sm:self-auto">
          + New Certificate
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex gap-2 text-sm"><span>⚠️</span>{error}</div>}

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex gap-2">
        {['','draft','issued'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${statusFilter===s?'gradient-primary text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s===''?'All':s==='draft'?'📝 Draft':'✅ Issued'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : certificates.length > 0 ? (
        <div className="space-y-3">
          {certificates.map(cert => (
            <div key={cert.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-gray-900">#{cert.certificate_number}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cert.status==='issued'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>
                      {cert.status==='issued'?'✅ Issued':'📝 Draft'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-gray-400">Vessel </span><span className="font-medium text-gray-700">{cert.vessel_name}</span></div>
                    <div><span className="text-gray-400">Terminal </span><span className="font-medium text-gray-700">{cert.terminal}</span></div>
                    <div><span className="text-gray-400">Weight </span><span className="font-medium text-gray-700">{Number(cert.total_weight_tonnage||0).toLocaleString()} t</span></div>
                    <div><span className="text-gray-400">Volume </span><span className="font-medium text-gray-700">{Number(cert.total_volume_liters||0).toLocaleString()} L</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button onClick={() => navigate(`/product-receipt-certificates/${cert.id}`)} className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-200">
                    👁 Preview
                  </button>
                  {cert.status === 'issued' && (
                    submittedIds.has(cert.id) ? (
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200">
                        ✓ Submitted
                      </span>
                    ) : (
                      <button onClick={() => setSubmitTarget(cert)} className="bg-[#8B1A1A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#7a1717] transition">
                        ✉ Submit
                      </button>
                    )
                  )}
                  {cert.status === 'draft' && (
                    <button onClick={() => navigate(`/product-receipt-certificates/${cert.id}/edit`)} className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-100 transition border border-amber-200">
                      ✏️ Edit
                    </button>
                  )}
                  {cert.status === 'draft' && (
                    <button onClick={() => handleIssue(cert.id)} className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                      Issue
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(cert)} className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition border border-red-200">
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">📄</p>
          <p className="text-gray-600 font-semibold text-lg">No certificates found</p>
        </div>
      )}
    </div>
  );
};
