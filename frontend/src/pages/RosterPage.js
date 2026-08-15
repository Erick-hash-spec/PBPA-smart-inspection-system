import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { rosterService } from '../services/api';
import { CalendarDays, Plus, X, CheckCircle } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const RosterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('user_role');
  const isAdmin = userRole === 'admin';
  const isTerminalRepOrAdmin = ['terminal_representative', 'admin'].includes(userRole);

  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(location.state?.message ? { type: 'success', msg: location.state.message } : null);

  useEffect(() => {
    fetchRosters();
  }, []); // eslint-disable-line

  const fetchRosters = async () => {
    setLoading(true);
    try {
      const res = await rosterService.getRosters();
      setRosters(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to load rosters:', err);
    } finally {
      setLoading(false);
    }
  };

  const showBanner = (type, msg) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner(null), 4000);
  };

  const openCreate = () => navigate('/roster/new');
  const openEdit = (r) => navigate(`/roster/${r.id}/edit`);

  const handleSend = async (id) => {
    try {
      await rosterService.sendRoster(id);
      showBanner('success', 'Roster sent to inspector.');
      fetchRosters();
    } catch {
      showBanner('error', 'Failed to send roster.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this roster assignment?')) return;
    try {
      await rosterService.deleteRoster(id);
      showBanner('success', 'Deleted.');
      fetchRosters();
    } catch {
      showBanner('error', 'Failed to delete.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this roster assignment?')) return;
    try {
      await rosterService.cancelRoster(id);
      showBanner('success', 'Roster assignment cancelled.');
      fetchRosters();
    } catch {
      showBanner('error', 'Failed to cancel roster.');
    }
  };

  const handleDownloadPdf = async (r) => {
    try {
      const res = await rosterService.downloadPdf(r.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Roster_${r.week_start_date}_${r.inspector_username}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      showBanner('error', 'Failed to download PDF.');
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await rosterService.markRead(id);
      fetchRosters();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roster</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {isTerminalRepOrAdmin ? 'Assign weekly working days to inspectors' : 'Your assigned working schedule'}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        )}
      </div>

      {/* Banner */}
      {banner && (
        <div
          className={`mb-5 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
          {banner.msg}
        </div>
      )}

      {/* Roster List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" />
        </div>
      ) : rosters.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center shadow-sm">
          <CalendarDays className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No roster assignments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rosters.map(r => (
            <div
              key={r.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border shadow-sm p-5 transition hover:shadow-md ${
                !r.is_read && !isTerminalRepOrAdmin
                  ? 'border-l-4 border-[#8B1A1A] border-r border-t border-b border-gray-100'
                  : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  {/* Inspector + status */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                      {r.inspector_name || r.inspector_username}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === 'sent'
                          ? 'bg-green-100 text-green-700'
                          : r.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {r.status === 'sent' ? (
                        <span className="flex items-center gap-1">Sent
                        </span>
                      ) : r.status === 'cancelled' ? (
                        <span className="flex items-center gap-1">Cancelled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          Draft
                        </span>
                      )}
                    </span>
                    {!r.is_read && !isTerminalRepOrAdmin && (
                      <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        New
                      </span>
                    )}
                  </div>

                  {/* Week + days */}
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Week of <strong className="text-gray-700 dark:text-gray-200">{r.week_start_date}</strong>
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">-</span>
                    <div className="flex gap-1">
                      {DAYS.map(d => (
                        <span
                          key={d}
                          className={`w-8 h-6 rounded text-[10px] font-bold flex items-center justify-center ${
                            (r.working_days || []).includes(d)
                              ? 'bg-[#8B1A1A] text-white'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Shift: <strong className="text-gray-700 dark:text-gray-300">{r.shift}</strong>
                    </span>
                    {r.location && (
                      <span>
                        Location: <strong className="text-gray-700 dark:text-gray-300">{r.location}</strong>
                      </span>
                    )}
                    {r.terminal && (
                      <span>
                        Terminal: <strong className="text-gray-700 dark:text-gray-300">{r.terminal}</strong>
                      </span>
                    )}
                    {r.vessel_name && (
                      <span>
                        Vessel: <strong className="text-gray-700 dark:text-gray-300">{r.vessel_name}</strong>
                      </span>
                    )}
                    {r.task && (
                      <span>
                        Task: <strong className="text-gray-700 dark:text-gray-300">{r.task}</strong>
                      </span>
                    )}
                  </div>
                  {r.notes && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{r.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {!isTerminalRepOrAdmin && !r.is_read && (
                    <button
                      onClick={() => handleMarkRead(r.id)}
                      className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition"
                    >
                      Mark Read
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadPdf(r)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700"
                    title="Download"
                  >Download</button>
                  {isTerminalRepOrAdmin && (
                    <>
                      {r.status !== 'cancelled' && (
                        <>
                          {isAdmin && (
                            <button
                              onClick={() => openEdit(r)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700"
                              title="Edit"
                            >Edit</button>
                          )}
                          {r.status === 'draft' && (
                            <button
                              onClick={() => handleSend(r.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition"
                              title="Send to Inspector"
                            >Send
                            </button>
                          )}
                          <button
                            onClick={() => handleCancel(r.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition"
                            title="Cancel Assignment"
                          >Cancel
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700"
                        title="Delete"
                      >Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
