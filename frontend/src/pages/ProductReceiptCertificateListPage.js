import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productReceiptCertificateService } from '../services/api';
import { SubmitModal } from '../components/SubmitModal';
import { Award, Plus } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    draft:  'bg-amber-50 text-amber-700 border-amber-200',
    issued: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
</span>
  );
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-700">
      <p className="text-gray-800 dark:text-white font-semibold mb-1">Confirm Delete</p>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

export const ProductReceiptCertificateListPage = () => {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { fetchCertificates(); }, []); // eslint-disable-line

  const fetchCertificates = async () => {
    setLoading(true); setError('');
    try {
      const res = await productReceiptCertificateService.getCertificates();
      setCertificates(res.data.results || res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load certificates.');
    } finally { setLoading(false); }
  };

  const handleIssue = async (id) => {
    try { await productReceiptCertificateService.issueCertificate(id); fetchCertificates(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to issue certificate'); }
  };

  const handleDelete = async () => {
    try { await productReceiptCertificateService.deleteCertificate(deleteTarget.id); fetchCertificates(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleteTarget(null); }
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Product Receipt Certificate" docTypeKey="product_receipt"
          docId={submitTarget.id} docNumber={submitTarget.certificate_number}
          vesselName={submitTarget.vessel_name} terminal={submitTarget.terminal}
          onDownload={() => handleDownloadDoc(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete certificate #${deleteTarget.certificate_number} for ${deleteTarget.vessel_name}? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Receipt Certificates</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">PBPA product delivery receipt records</p>
          </div>
        </div>
        <button onClick={() => navigate('/product-receipt-certificates/new')}
          className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition shadow-sm">
          <Plus className="w-4 h-4" />New Certificate
</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#8B1A1A]/20 border-t-[#8B1A1A] rounded-full animate-spin" /></div>
      ) : certificates.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center shadow-sm">
          <Award className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No certificates found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                  {['Cert No.', 'Vessel', 'Terminal', 'Date', 'Weight (t)', 'Volume (L)', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {certificates.map(cert => (
                  <tr key={cert.id} onClick={() => navigate(`/product-receipt-certificates/${cert.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#8B1A1A] dark:text-red-400 whitespace-nowrap">{cert.certificate_number}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{cert.vessel_name}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{cert.terminal}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{cert.receipt_date ? new Date(cert.receipt_date).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 font-medium">{Number(cert.total_weight_tonnage || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 font-medium">{Number(cert.total_volume_liters || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={cert.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/product-receipt-certificates/${cert.id}`)} title="View"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">View</button>
                        {cert.status === 'draft' && (
                          <button onClick={() => navigate(`/product-receipt-certificates/${cert.id}/edit`)} title="Edit"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">Edit</button>
                        )}
                        {cert.status === 'draft' && (
                          <button onClick={() => handleIssue(cert.id)} title="Issue"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">Issue</button>
                        )}
                        {cert.status === 'issued' && (
                          submittedIds.has(cert.id)
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-lg border border-green-200">Sent</span>
                            : <button onClick={() => setSubmitTarget(cert)} title="Submit"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Submit</button>
                        )}
                        <button onClick={() => setDeleteTarget(cert)} title="Delete"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
