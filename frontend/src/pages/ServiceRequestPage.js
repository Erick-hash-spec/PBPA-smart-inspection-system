import React, { useEffect, useState, useCallback, useRef } from 'react';
import { serviceRequestService, userService } from '../services/api';
import {
  Plus, X, CheckCircle, Clock, Loader, XCircle,
  RefreshCw, Search, Bell, MoreVertical, Pencil, Trash2, Ban, MessageSquare, Send,
} from 'lucide-react';

const OPERATION_TYPES = [
  { value: 'initial_inspection',     label: 'Initial Inspection' },
  { value: 'line_displacement',      label: 'Line Displacement' },
  { value: 'provisional_inspection', label: 'Provisional Inspection' },
  { value: 'final_inspection',       label: 'Final Inspection' },
];

const STATUS_META = {
  pending:      { color: 'bg-amber-100 text-amber-800',   Icon: Clock },
  acknowledged: { color: 'bg-blue-100 text-blue-800',     Icon: CheckCircle },
  in_progress:  { color: 'bg-indigo-100 text-indigo-800', Icon: Loader },
  completed:    { color: 'bg-green-100 text-green-800',   Icon: CheckCircle },
  cancelled:    { color: 'bg-gray-100 text-gray-600',     Icon: XCircle },
};

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${m.color}`}>
      <m.Icon className="w-3 h-3" /> {status?.replace('_', ' ')}
    </span>
  );
};

const EMPTY = {
  operation_type: 'initial_inspection',
  vessel_name: '', terminal: '', product: '',
  requested_date: new Date().toISOString().slice(0, 10),
  requested_time: '', contact_name: '', contact_phone: '', notes: '',
};

// Per-row dropdown menu
const RowMenu = ({ row, role, onEdit, onDelete, onCancel, onAcknowledge, onComplete, onAssign }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const item = (icon, label, onClick, cls = 'text-gray-700 hover:bg-gray-50') => (
    <button
      key={label}
      onClick={() => { setOpen(false); onClick(); }}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm ${cls} transition`}
    >
      {icon} {label}
    </button>
  );

  const canEdit   = ['pending', 'acknowledged'].includes(row.status) && (role === 'terminal_representative' || role === 'admin');
  const canDelete = role === 'admin';
  const canCancel = !['cancelled', 'completed'].includes(row.status) && (role === 'terminal_representative' || role === 'admin');
  const canAck    = role === 'admin' && row.status === 'pending';
  const canAssign = role === 'admin' && ['pending', 'acknowledged'].includes(row.status);
  const canComplete = ['admin', 'inspector'].includes(role) && row.status === 'in_progress';

  const hasItems = canEdit || canDelete || canCancel || canAck || canAssign || canComplete;
  if (!hasItems) return null;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-500"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          {canAck     && item(<CheckCircle className="w-4 h-4 text-blue-500" />,   'Acknowledge', onAcknowledge)}
          {canAssign  && item(<Loader className="w-4 h-4 text-indigo-500" />,      'Assign',      onAssign)}
          {canComplete && item(<CheckCircle className="w-4 h-4 text-green-500" />, 'Complete',    onComplete)}
          {(canAck || canAssign || canComplete) && (canEdit || canDelete || canCancel) && (
            <div className="border-t border-gray-100 my-0.5" />
          )}
          {canEdit   && item(<Pencil className="w-4 h-4 text-gray-400" />,                                     'Edit',   onEdit)}
          {canCancel && item(<Ban    className="w-4 h-4 text-amber-500" />,                                    'Cancel', onCancel, 'text-amber-700 hover:bg-amber-50')}
          {canDelete && item(<Trash2 className="w-4 h-4 text-red-400" />,                                      'Delete', onDelete, 'text-red-600 hover:bg-red-50')}
        </div>
      )}
    </div>
  );
};

// Chat panel for a single service request
const ChatPanel = ({ request, currentUserId, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [body, setBody]         = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef(null);
  const pollRef                 = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await serviceRequestService.getMessages(request.id);
      setMessages(res.data);
    } catch {}
  }, [request.id]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await serviceRequestService.sendMessage(request.id, body.trim());
      setBody('');
      await fetchMessages();
    } catch {}
    finally { setSending(false); }
  };

  const ROLE_COLOR = { terminal_representative: 'bg-amber-100 text-amber-800', admin: 'bg-red-100 text-red-800', inspector: 'bg-blue-100 text-blue-800' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ height: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{request.request_number} — {request.vessel_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{request.operation_type_display}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-400 mt-8">No messages yet. Start the conversation.</p>
          )}
          {messages.map(msg => {
            const isMine = msg.sender === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-center gap-1.5 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{msg.sender_name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_COLOR[msg.sender_role] || 'bg-gray-100 text-gray-600'}`}>{msg.sender_role}</span>
                </div>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMine
                    ? 'bg-[#8B1A1A] text-white rounded-tr-sm'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-tl-sm'
                }`}>
                  {msg.body}
                </div>
                <span className="text-[10px] text-gray-400 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 px-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30"
          />
          <button type="submit" disabled={sending || !body.trim()}
            className="p-2.5 rounded-xl bg-[#8B1A1A] text-white hover:bg-[#7a1717] disabled:opacity-40 transition">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export const ServiceRequestPage = () => {
  const role = localStorage.getItem('user_role') || 'inspector';
  const currentUserId = Number(localStorage.getItem('user_id'));
  const [chatTarget, setChatTarget] = useState(null);
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState(null); // request being edited
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [inspectors, setInspectors]     = useState([]);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignInspector, setAssignInspector] = useState('');
  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling]     = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const r = await serviceRequestService.getRequests(filterStatus ? { status: filterStatus } : {});
      setRequests(r.data.results ?? r.data);
      if (['admin', 'inspector'].includes(role)) {
        await serviceRequestService.markAllRead().catch(() => {});
      }
    } catch { setError('Failed to load service requests.'); }
    finally { setLoading(false); }
  }, [filterStatus, role]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (role === 'admin') {
      userService.getInspectors()
        .then(r => setInspectors(Array.isArray(r.data) ? r.data : (r.data.results ?? [])))
        .catch(() => setError('Failed to load inspectors.'));
    }
  }, [role]);

  const openNew = () => { setEditTarget(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (r) => {
    setEditTarget(r.id);
    setForm({
      operation_type: r.operation_type,
      vessel_name:    r.vessel_name    || '',
      terminal:       r.terminal       || '',
      product:        r.product        || '',
      requested_date: r.requested_date || new Date().toISOString().slice(0, 10),
      requested_time: r.requested_time || '',
      contact_name:   r.contact_name   || '',
      contact_phone:  r.contact_phone  || '',
      notes:          r.notes          || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editTarget) {
        await serviceRequestService.updateRequest(editTarget, form);
      } else {
        await serviceRequestService.createRequest(form);
      }
      setShowForm(false); setForm(EMPTY); setEditTarget(null);
      await fetchRequests();
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to submit request.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service request?')) return;
    try { await serviceRequestService.deleteRequest(id); await fetchRequests(); }
    catch { setError('Delete failed.'); }
  };

  const handleCancelSubmit = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await serviceRequestService.cancel(cancelTarget, { reason: cancelReason });
      setCancelTarget(null); setCancelReason('');
      await fetchRequests();
    } catch (err) {
      setError('Cancel failed: ' + (err.response?.data?.detail || err.message));
    } finally { setCancelling(false); }
  };

  const handleAcknowledge = async (id) => {
    try { await serviceRequestService.acknowledge(id); await fetchRequests(); } catch { setError('Action failed.'); }
  };

  const handleComplete = async (id) => {
    try { await serviceRequestService.complete(id); await fetchRequests(); } catch { setError('Action failed.'); }
  };

  const handleAssign = async () => {
    if (!assignTarget || !assignInspector) return;
    try {
      await serviceRequestService.assign(assignTarget, Number(assignInspector));
      setAssignTarget(null); setAssignInspector('');
      await fetchRequests();
    } catch (err) {
      setError('Assignment failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return (
      (r.vessel_name || '').toLowerCase().includes(q) ||
      (r.terminal || '').toLowerCase().includes(q) ||
      (r.request_number || '').toLowerCase().includes(q) ||
      (r.operation_type_display || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 animate-fade-in">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B1A1A]/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#8B1A1A]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Service Requests</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                {role === 'terminal_representative' ? 'Submit inspection operation requests' : 'Manage incoming client requests'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRequests} className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {role === 'terminal_representative' && (
              <button onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition"
                style={{ background: '#8B1A1A' }}>
                <Plus className="w-4 h-4" /> New Request
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4 flex justify-between items-start">
            <span>{error}</span>
            <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requests…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
            <option value="">All Statuses</option>
            {Object.keys(STATUS_META).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>

        {/* Operation type chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {OPERATION_TYPES.map(op => {
            const count = requests.filter(r => r.operation_type === op.value).length;
            return (
              <div key={op.value} className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{op.label}</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Request #', 'Operation', 'Vessel', 'Terminal', 'Date', 'Contact', 'Status', ''].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400">No service requests found</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.request_number}</td>
                    <td className="px-4 py-3"><span className="font-semibold text-gray-800">{r.operation_type_display}</span></td>
                    <td className="px-4 py-3 text-gray-700">{r.vessel_name}</td>
                    <td className="px-4 py-3 text-gray-500">{r.terminal}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.requested_date}</td>
                    <td className="px-4 py-3 text-gray-500">
                      <div>{r.contact_name}</div>
                      {r.contact_phone && <div className="text-xs text-gray-400">{r.contact_phone}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onMouseDown={e => e.stopPropagation()}
                          onClick={() => setChatTarget(r)}
                          title="Messages"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition relative"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <RowMenu
                        row={r}
                        role={role}
                        onEdit={() => openEdit(r)}
                        onDelete={() => handleDelete(r.id)}
                        onCancel={() => { setCancelTarget(r.id); setCancelReason(''); }}
                        onAcknowledge={() => handleAcknowledge(r.id)}
                        onComplete={() => handleComplete(r.id)}
                        onAssign={() => { setAssignTarget(r.id); setAssignInspector(''); }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cancel with reason modal */}
        {cancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-base font-bold text-gray-900 mb-1">Cancel Request</h3>
              <p className="text-xs text-gray-500 mb-4">Provide a reason for cancellation.</p>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Reason (optional)…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400/30 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCancelTarget(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                  Back
                </button>
                <button onClick={handleCancelSubmit} disabled={cancelling}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition">
                  {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign modal */}
        {assignTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-base font-bold text-gray-900 mb-4">Assign Inspector</h3>
              <select value={assignInspector} onChange={e => setAssignInspector(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl mb-4 focus:outline-none">
                <option value="">Select inspector…</option>
                {inspectors.map(i => {
                  const uid  = i.user?.id ?? i.user;
                  const name = (i.user?.first_name && i.user?.last_name)
                    ? `${i.user.first_name} ${i.user.last_name}`
                    : i.user?.username || `User ${uid}`;
                  return <option key={uid} value={uid}>{name}</option>;
                })}
              </select>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAssignTarget(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">Cancel</button>
                <button onClick={handleAssign} disabled={!assignInspector}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition">
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat panel */}
        {chatTarget && (
          <ChatPanel
            request={chatTarget}
            currentUserId={currentUserId}
            onClose={() => setChatTarget(null)}
          />
        )}

        {/* New / Edit request form modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">{editTarget ? 'Edit Service Request' : 'New Service Request'}</h3>
                <button onClick={() => { setShowForm(false); setEditTarget(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                {error && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>}

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Operation Type *</label>
                  <select required value={form.operation_type} onChange={e => setForm(f => ({ ...f, operation_type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20">
                    {OPERATION_TYPES.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                </div>

                {[
                  { key: 'vessel_name',   label: 'Vessel Name *',  required: true },
                  { key: 'terminal',      label: 'Terminal *',     required: true },
                  { key: 'product',       label: 'Product',        required: false },
                  { key: 'contact_name',  label: 'Contact Name',   required: false },
                  { key: 'contact_phone', label: 'Contact Phone',  required: false },
                ].map(({ key, label, required }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                    <input required={required} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Requested Date *</label>
                    <input type="date" required value={form.requested_date} onChange={e => setForm(f => ({ ...f, requested_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Requested Time</label>
                    <input type="time" value={form.requested_time} onChange={e => setForm(f => ({ ...f, requested_time: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none" />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => { setShowForm(false); setEditTarget(null); setError(''); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition disabled:opacity-50"
                    style={{ background: '#8B1A1A' }}>
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
