import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/api';
import { Plus, AlertCircle, Inbox, ClipboardList, FileText, Send, CheckCircle, XCircle, Search, Filter, Calendar } from 'lucide-react';
import { SubmitModal } from '../components/SubmitModal';
import { useDarkMode } from '../contexts/DarkModeContext';

const statusConfig = {
  draft:     { label: 'Draft',     icon: FileText,    cls: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600' },
  submitted: { label: 'Submitted', icon: Send,        cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-700' },
  approved:  { label: 'Approved',  icon: CheckCircle, cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-700' },
  rejected:  { label: 'Rejected',  icon: XCircle,     cls: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700' },
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-200 dark:border-gray-700">
      <p className="text-gray-800 dark:text-white font-semibold mb-1">Confirm Delete</p>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition hover-lift">Delete</button>
      </div>
    </div>
  </div>
);

export const InspectionListPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [status, setStatus]     = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { fetchInspections(); }, [status, timeFilter]); // eslint-disable-line

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const res = await inspectionService.getInspections(status ? { status } : {});
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

  const filteredInspections = inspections.filter(insp => 
    insp.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insp.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insp.terminal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insp.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Dip Ticket"
          docTypeKey="dip_ticket"
          docId={submitTarget.id}
          docNumber={submitTarget.ticket_number || submitTarget.id}
          vesselName={submitTarget.vessel_name || 'N/A'}
          terminal={submitTarget.terminal || ''}
          onDownload={() => handleDownloadDoc(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete dip ticket ${deleteTarget.ticket_number || '#'+deleteTarget.id} for ${deleteTarget.vessel_name || 'this vessel'}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center hover-scale">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dip Tickets</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">PBPA tank dip ticket register</p>
          </div>
        </div>
        <button onClick={() => navigate('/inspections/new')} className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg transition inline-flex items-center gap-2 hover-lift">
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl mb-6 flex gap-2 text-sm hover-lift">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search by ticket, vessel, terminal, or product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#8B1A1A] dark:focus:border-[#a52020] transition"
        />
      </div>

      {/* Status & Time Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-4 mb-6 space-y-4">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        
        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status</p>
          <div className="flex flex-wrap gap-2">
            {['', 'draft', 'submitted', 'approved', 'rejected'].map((s) => {
              const sc = statusConfig[s];
              const Icon = sc?.icon;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition inline-flex items-center gap-1.5 ${
                    status === s ? 'gradient-primary text-white shadow-md hover-lift' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {s === '' ? 'All' : sc.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Period</p>
          <div className="flex flex-wrap gap-2">
            {[{val:'all',label:'All Time'},{val:'daily',label:'Daily'},{val:'weekly',label:'Weekly'},{val:'monthly',label:'Monthly'},{val:'yearly',label:'Yearly'}].map(({val,label}) => (
              <button
                key={val}
                onClick={() => setTimeFilter(val)}
                className={`filter-badge ${timeFilter === val ? 'active' : ''}`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Counter */}
      <div className="mb-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span className="font-semibold">{filteredInspections.length} Result{filteredInspections.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" />
        </div>
      ) : filteredInspections.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                  {['Ticket No.', 'Vessel', 'Product', 'Terminal', 'Tank', 'Inspector', 'Date & Time', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filteredInspections.map((insp) => {
                  const sc = statusConfig[insp.status] || statusConfig.draft;
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={insp.id} onClick={() => navigate(`/inspections/${insp.id}`)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors">
                      <td className="px-4 py-3 font-bold text-blue-700 dark:text-blue-400">{insp.ticket_number || `#${insp.id}`}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200 font-medium">{insp.vessel_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{insp.product_name || insp.tank_detail?.product_type || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{insp.terminal || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{insp.tank_name || insp.tank_detail?.tank_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{insp.inspector_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(insp.inspection_date).toLocaleDateString()}{' '}
                        <span className="text-gray-400 text-xs">{new Date(insp.inspection_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${sc.cls}`}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={e=>{e.stopPropagation();navigate(`/inspections/${insp.id}`);}} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-blue-100 transition border border-blue-200 dark:border-blue-700">👁</button>
                          {insp.status==='draft'&&<button onClick={e=>{e.stopPropagation();navigate(`/inspections/${insp.id}/edit`);}} className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-amber-100 transition border border-amber-200 dark:border-amber-700">✏️</button>}
                          {insp.status==='approved'&&(submittedIds.has(insp.id)?<span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-lg border border-green-200">✓</span>:<button onClick={e=>{e.stopPropagation();setSubmitTarget(insp);}} className="bg-[#8B1A1A] hover:bg-[#a52020] text-white text-xs font-semibold px-2 py-1 rounded-lg transition">✉</button>)}
                          <button onClick={e=>{e.stopPropagation();setDeleteTarget(insp);}} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-red-100 transition border border-red-200 dark:border-red-700">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filteredInspections.map((insp) => {
              const sc = statusConfig[insp.status] || statusConfig.draft;
              const StatusIcon = sc.icon;
              return (
                <div key={insp.id} onClick={() => navigate(`/inspections/${insp.id}`)} className="p-4 cursor-pointer active:bg-gray-50 dark:active:bg-slate-700">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-bold text-blue-700 dark:text-blue-400 text-sm">{insp.ticket_number || `#${insp.id}`}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${sc.cls}`}>
                      <StatusIcon className="w-3 h-3" /> {sc.label}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 font-medium text-sm">{insp.vessel_name || '—'}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{insp.product_name || insp.tank_detail?.product_type || '—'}</span>
                    <span>{insp.terminal || '—'}</span>
                    <span>{new Date(insp.inspection_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/inspections/${insp.id}`)} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700">View</button>
                    {insp.status==='draft'&&<button onClick={() => navigate(`/inspections/${insp.id}/edit`)} className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-700">Edit</button>}
                    {insp.status==='approved'&&(submittedIds.has(insp.id)?<span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200">Sent ✓</span>:<button onClick={() => setSubmitTarget(insp)} className="bg-[#8B1A1A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Submit</button>)}
                    <button onClick={() => setDeleteTarget(insp)} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-700">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-16 text-center hover-lift">
          <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 font-semibold text-lg">No dip tickets found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 mb-6">
            {searchQuery ? 'No matching results' : status ? `No ${status} dip tickets` : 'Create your first dip ticket to get started'}
          </p>
          <button onClick={() => navigate('/inspections/new')} className="gradient-primary text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg transition inline-flex items-center gap-2 hover-lift">
            <Plus className="w-4 h-4" /> New Dip Ticket
          </button>
        </div>
      )}
    </div>
  );
};
