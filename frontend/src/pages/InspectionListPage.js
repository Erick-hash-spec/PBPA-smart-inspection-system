import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/api';
import { Plus, AlertCircle, Inbox, ClipboardList, Search } from 'lucide-react';
import { SubmitModal } from '../components/SubmitModal';

const statusConfig = {
  draft:     { label: 'Draft',     cls: 'bg-gray-50 text-gray-600 border-gray-200' },
  submitted: { label: 'Submitted', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:  { label: 'Approved',  cls: 'bg-green-50 text-green-700 border-green-200' },
  rejected:  { label: 'Rejected',  cls: 'bg-red-50 text-red-700 border-red-200' },
};

const StatusBadge = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.draft;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>{cfg.label}</span>;
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

export const InspectionListPage = () => {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { fetchInspections(); }, []); // eslint-disable-line

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await inspectionService.getInspections();
      setInspections(res.data.results || res.data);
    } catch { setError('Failed to load dip tickets'); }
    finally { setLoading(false); }
  };

  const handleDownloadDoc = async (insp) => {
    try {
      const res = await inspectionService.generateDocument(insp.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `Dip_Ticket_${insp.ticket_number || insp.id}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download document'); }
  };

  const handleDelete = async () => {
    try { await inspectionService.deleteInspection(deleteTarget.id); fetchInspections(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleteTarget(null); }
  };

  const filtered = inspections.filter(insp =>
    insp.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insp.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insp.terminal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insp.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Dip Ticket" docTypeKey="dip_ticket"
          docId={submitTarget.id} docNumber={submitTarget.ticket_number || submitTarget.id}
          vesselName={submitTarget.vessel_name || 'N/A'} terminal={submitTarget.terminal || ''}
          onDownload={() => handleDownloadDoc(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete dip ticket ${deleteTarget.ticket_number || '#' + deleteTarget.id} for ${deleteTarget.vessel_name || 'this vessel'}? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dip Tickets</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">PBPA tank dip ticket register</p>
          </div>
        </div>
        <button onClick={() => navigate('/inspections/new')}
          className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition shadow-sm">
          <Plus className="w-4 h-4" />New Ticket
</button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by ticket, vessel, terminal or product..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#8B1A1A] transition" />
      </div>

      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#8B1A1A]/20 border-t-[#8B1A1A] rounded-full animate-spin" /></div>
      ) : filtered.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                  {['Ticket No.', 'Vessel', 'Product', 'Terminal', 'Tank', 'Inspector', 'Date', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map(insp => (
                  <tr key={insp.id} onClick={() => navigate(`/inspections/${insp.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#8B1A1A] dark:text-red-400 whitespace-nowrap">{insp.ticket_number || `#${insp.id}`}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{insp.vessel_name || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{insp.product_name || insp.tank_detail?.product_type || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{insp.terminal || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{insp.tank_name || insp.tank_detail?.tank_name || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{insp.inspector_name || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{new Date(insp.inspection_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={insp.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/inspections/${insp.id}`)} title="View"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">View</button>
                        {insp.status === 'draft' && (
                          <button onClick={() => navigate(`/inspections/${insp.id}/edit`)} title="Edit"
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">Edit</button>
                        )}
                        {insp.status === 'approved' && (
                          submittedIds.has(insp.id)
                            ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-lg border border-green-200">Sent</span>
                            : <button onClick={() => setSubmitTarget(insp)} title="Submit"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Submit</button>
                        )}
                        <button onClick={() => setDeleteTarget(insp)} title="Delete"
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(insp => (
              <div key={insp.id} onClick={() => navigate(`/inspections/${insp.id}`)} className="p-4 cursor-pointer active:bg-gray-50 dark:active:bg-slate-700">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-bold text-[#8B1A1A] dark:text-red-400 text-sm">{insp.ticket_number || `#${insp.id}`}</span>
                  <StatusBadge status={insp.status} />
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-medium text-sm">{insp.vessel_name || '—'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{insp.product_name || '—'}</span>
                  <span>{insp.terminal || '—'}</span>
                  <span>{new Date(insp.inspection_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/inspections/${insp.id}`)} className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200">View</button>
                  {insp.status === 'draft' && <button onClick={() => navigate(`/inspections/${insp.id}/edit`)} className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200">Edit</button>}
                  {insp.status === 'approved' && (submittedIds.has(insp.id) ? <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200">Sent</span> : <button onClick={() => setSubmitTarget(insp)} className="bg-[#8B1A1A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Submit</button>)}
                  <button onClick={() => setDeleteTarget(insp)} className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center shadow-sm">
          <Inbox className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No dip tickets found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-6">
            {searchQuery ? 'No matching results' : 'Create your first dip ticket to get started'}
          </p>
        </div>
      )}
    </div>
  );
};
