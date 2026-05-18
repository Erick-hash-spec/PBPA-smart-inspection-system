import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sealIsolationReportService } from '../services/api';
import { SubmitModal } from '../components/SubmitModal';
import { Shield, Plus } from 'lucide-react';

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

export const SealIsolationReportListPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { fetchReports(); }, []); // eslint-disable-line

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await sealIsolationReportService.getReports();
      setReports(res.data.results || res.data);
    } catch { setError('Failed to load sealing and isolation reports'); }
    finally { setLoading(false); }
  };

  const handleIssue = async (id) => {
    try { await sealIsolationReportService.issueReport(id); fetchReports(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to issue report'); }
  };

  const handleDelete = async () => {
    try { await sealIsolationReportService.deleteReport(deleteTarget.id); fetchReports(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleteTarget(null); }
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Seal & Isolation Report" docTypeKey="seal_isolation"
          docId={submitTarget.id} docNumber={submitTarget.report_number}
          vesselName={submitTarget.vessel_name} terminal={submitTarget.terminal}
          onDownload={() => handleDownloadDoc(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete report #${deleteTarget.report_number} for ${deleteTarget.vessel_name}? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sealing & Isolation Reports</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">PBPA seal location and number records</p>
          </div>
        </div>
        <button onClick={() => navigate('/seal-isolation-reports/new')}
          className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition shadow-sm">
          <Plus className="w-4 h-4" />New Report
</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#8B1A1A]/20 border-t-[#8B1A1A] rounded-full animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center shadow-sm">
          <Shield className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No reports found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                  {['Report No.', 'Vessel', 'Product', 'Terminal', 'Date', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {reports.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/seal-isolation-reports/${r.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#8B1A1A] dark:text-red-400 whitespace-nowrap">{r.report_number}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{r.vessel_name}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{r.product_name}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{r.terminal}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{new Date(r.report_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/seal-isolation-reports/${r.id}`)} title="View"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">View</button>
                        {r.status === 'draft' && (
                          <button onClick={() => navigate(`/seal-isolation-reports/${r.id}/edit`)} title="Edit"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">Edit</button>
                        )}
                        {r.status === 'draft' && (
                          <button onClick={() => handleIssue(r.id)} title="Issue"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">Issue</button>
                        )}
                        {r.status === 'issued' && (
                          submittedIds.has(r.id)
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-lg border border-green-200">Sent</span>
                            : <button onClick={() => setSubmitTarget(r)} title="Submit"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Submit</button>
                        )}
                        <button onClick={() => setDeleteTarget(r)} title="Delete"
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
