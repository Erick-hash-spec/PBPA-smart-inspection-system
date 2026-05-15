import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sealIsolationReportService } from '../services/api';
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

export const SealIsolationReportListPage = () => {
  const navigate = useNavigate();
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    try { const res = await sealIsolationReportService.getReports(); setReports(res.data.results || res.data); }
    catch { setError('Failed to load sealing and isolation reports'); }
    finally { setLoading(false); }
  };

  const handleIssue = async (id) => {
    try { await sealIsolationReportService.issueReport(id); fetchReports(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to issue report'); }
  };

  const handleDownloadDoc = async (report) => {
    try {
      const res = await sealIsolationReportService.generateDocument(report.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `Seal_Isolation_${report.report_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download document'); }
  };

  const handleDelete = async () => {
    try { await sealIsolationReportService.deleteReport(deleteTarget.id); fetchReports(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleteTarget(null); }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Seal & Isolation Report"
          docTypeKey="seal_isolation"
          docId={submitTarget.id}
          docNumber={submitTarget.report_number}
          vesselName={submitTarget.vessel_name}
          terminal={submitTarget.terminal}
          onDownload={() => handleDownloadDoc(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Delete report #${deleteTarget.report_number} for ${deleteTarget.vessel_name}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔒 Sealing and Isolation Reports</h1>
          <p className="text-gray-500 mt-1">Record PBPA seal locations and seal numbers by vessel</p>
        </div>
        <button onClick={() => navigate('/seal-isolation-reports/new')} className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition self-start sm:self-auto">
          + New Report
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex gap-2 text-sm"><span>⚠️</span>{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-gray-900">#{report.report_number}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${report.status==='issued'?'bg-green-100 text-green-800':'bg-amber-100 text-amber-800'}`}>
                      {report.status==='issued'?'✅ Issued':'📝 Draft'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-gray-400">Vessel </span><span className="font-medium text-gray-700">{report.vessel_name}</span></div>
                    <div><span className="text-gray-400">Product </span><span className="font-medium text-gray-700">{report.product_name}</span></div>
                    <div><span className="text-gray-400">Terminal </span><span className="font-medium text-gray-700">{report.terminal}</span></div>
                    <div><span className="text-gray-400">Date </span><span className="font-medium text-gray-700">{new Date(report.report_date).toLocaleDateString()}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button onClick={() => navigate(`/seal-isolation-reports/${report.id}`)} className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-200">
                    👁 Preview
                  </button>
                  {report.status === 'issued' && (
                    submittedIds.has(report.id) ? (
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200">
                        ✓ Submitted
                      </span>
                    ) : (
                      <button onClick={() => setSubmitTarget(report)} className="bg-[#8B1A1A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#7a1717] transition">
                        ✉ Submit
                      </button>
                    )
                  )}
                  {report.status === 'draft' && (
                    <button onClick={() => navigate(`/seal-isolation-reports/${report.id}/edit`)} className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-100 transition border border-amber-200">
                      ✏️ Edit
                    </button>
                  )}
                  {report.status === 'draft' && (
                    <button onClick={() => handleIssue(report.id)} className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                      Issue
                    </button>
                  )}
                  <button onClick={() => setDeleteTarget(report)} className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-100 transition border border-red-200">
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-gray-600 font-semibold text-lg">No reports found</p>
          <button onClick={() => navigate('/seal-isolation-reports/new')} className="mt-4 gradient-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition">
            + New Report
          </button>
        </div>
      )}
    </div>
  );
};
