import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { provisionalOuturnService } from '../services/api';
import { SubmitModal } from '../components/SubmitModal';
import { Plus } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    final: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
</span>
  );
};

const ProvisionalOutturnReportListPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { loadReports(); }, []); // eslint-disable-line

  const loadReports = async () => {
    setLoading(true); setError(null);
    try {
      const response = await provisionalOuturnService.list();
      const all = response.results || response;
      setReports(all);
    } catch (err) { setError('Failed to load reports: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleDownloadPdf = async (report) => {
    try {
      const blob = await provisionalOuturnService.generatePDF(report.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `POR_${report.report_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download PDF'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return;
    try { await provisionalOuturnService.delete(id); setReports(reports.filter(r => r.id !== id)); }
    catch (err) { setError('Failed to delete: ' + err.message); }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Provisional Outturn Report" docTypeKey="provisional_outturn"
          docId={submitTarget.id} docNumber={submitTarget.report_number}
          vesselName={submitTarget.vessel_name} terminal={submitTarget.port || ''}
          onDownload={() => handleDownloadPdf(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm"></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Provisional Outturn Reports</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">PBPA vessel outturn summary records</p>
          </div>
        </div>
        <button onClick={() => navigate('/provisional-outturn-reports/new')}
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
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No reports found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                  {['Report No.', 'Vessel', 'Product', 'Port', 'Date', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {reports.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/provisional-outturn-reports/${r.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#8B1A1A] dark:text-red-400 whitespace-nowrap">{r.report_number}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{r.vessel_name}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{r.product || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{r.port || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 dark:text-gray-500 whitespace-nowrap">{new Date(r.report_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="report-actions" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/provisional-outturn-reports/${r.id}`)} title="View"
                          className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">View</button>
                        <button onClick={() => navigate(`/provisional-outturn-reports/${r.id}/edit`)} title="Edit"
                          className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">Edit</button>
                        {r.status === 'final' && (
                          submittedIds.has(r.id)
                            ? <span className="report-action inline-flex items-center gap-1 text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-lg border border-green-200">Sent</span>
                            : <button onClick={() => setSubmitTarget(r)} title="Submit"
                                className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Submit</button>
                        )}
                        <button onClick={() => handleDelete(r.id)} title="Delete"
                          className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Delete</button>
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

export default ProvisionalOutturnReportListPage;
