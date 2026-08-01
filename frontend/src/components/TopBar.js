import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, rosterService, submissionService, serviceRequestService, notificationService } from '../services/api';
import { ChevronDown, LayoutDashboard, LogOut, Bell, Settings, ConciergeBell, FileCheck, MessageSquare } from 'lucide-react';

const roleBadge = {
  admin:      { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  terminal_representative: { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300' },
  inspector:  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
};

const roleLabel = (role) => role === 'terminal_representative' ? 'Terminal Representative' : role;

export const TopBar = () => {
  const navigate = useNavigate();
  const [open, setOpen]     = useState(false);
  const [unread, setUnread] = useState(0);
  const [srUnread, setSrUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [srMsgUnread, setSrMsgUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [srMsgOpen, setSrMsgOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [srMsgNotifications, setSrMsgNotifications] = useState([]);
  const srMsgRef = useRef(null);
  const notifRef = useRef(null);
  const ref = useRef(null);

  const isAuthenticated = authService.isAuthenticated();
  const userRole = localStorage.getItem('user_role') || 'user';
  const username = localStorage.getItem('username') || 'User';
  const initials = username.slice(0, 2).toUpperCase();

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'terminal_representative', 'inspector'].includes(userRole)) return;
    const fetchCount = () => {
      // inspector: roster unread | admin: submissions unread | terminal_representative: documents to sign count
      let req;
      if (userRole === 'inspector') req = rosterService.getUnreadCount();
      else if (userRole === 'admin') req = submissionService.getUnreadCount();
      else return; // terminal_representative has no bell for submissions
      req.then(r => setUnread(r.data.count || 0)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userRole]);

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'inspector'].includes(userRole)) return;
    const fetchSr = () => serviceRequestService.getUnreadCount().then(r => setSrUnread(r.data.count || 0)).catch(() => {});
    fetchSr();
    const iv = setInterval(fetchSr, 30000);
    return () => clearInterval(iv);
  }, [isAuthenticated, userRole]);

  /* Poll in-app notifications for admin/inspector (report_submitted/ready_to_submit) */
  useEffect(() => {
    if (!isAuthenticated || !['admin', 'inspector'].includes(userRole)) return;
    const fetchNotif = () =>
      notificationService.getUnreadCount().then(r => setNotifUnread(r.data.count || 0)).catch(() => {});
    fetchNotif();
    const iv = setInterval(fetchNotif, 30000);
    return () => clearInterval(iv);
  }, [isAuthenticated, userRole]);

  /* Poll SR message notifications for all roles */
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchSrMsg = () =>
      notificationService.getUnreadCount('sr_message').then(r => setSrMsgUnread(r.data.count || 0)).catch(() => {});
    fetchSrMsg();
    const iv = setInterval(fetchSrMsg, 10000);
    return () => clearInterval(iv);
  }, [isAuthenticated]);

  /* Close notif panels on outside click */
  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (srMsgRef.current && !srMsgRef.current.contains(e.target)) setSrMsgOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openNotifications = () => {
    if (!notifOpen) {
      notificationService.getNotifications({ page_size: 20 })
        .then(r => setNotifications(r.data.results || r.data || []))
        .catch(() => {});
    }
    setNotifOpen(v => !v);
    setSrMsgOpen(false);
  };

  const openSrMessages = () => {
    if (!srMsgOpen) {
      notificationService.getNotifications({ notification_type: 'sr_message', page_size: 20 })
        .then(r => setSrMsgNotifications(r.data.results || r.data || []))
        .catch(() => {});
    }
    setSrMsgOpen(v => !v);
    setNotifOpen(false);
  };

  const markNotifRead = (id) => {
    notificationService.markRead(id).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setSrMsgNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setNotifUnread(v => Math.max(0, v - 1));
      setSrMsgUnread(v => Math.max(0, v - 1));
    }).catch(() => {});
  };

  const markAllNotifRead = () => {
    notificationService.markAllRead().then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setSrMsgNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setNotifUnread(0);
      setSrMsgUnread(0);
    }).catch(() => {});
  };

  if (!isAuthenticated) return null;

  const handleLogout = () => { authService.logout(); navigate('/login'); };
  const rb = roleBadge[userRole] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between pl-16 pr-3 md:px-6"
      style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(0,0,0,0.06)',boxShadow:'0 1px 12px rgba(0,0,0,0.06)'}}>
      <div className="hidden md:block" />

      <div className="flex items-center gap-1.5 ml-auto">
        {/* In-app notifications bell — admin (report submitted) + inspector (ready_to_submit) */}
        {['admin', 'inspector'].includes(userRole) && (
          <div className="relative" ref={notifRef}>
            <button
              onClick={openNotifications}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all"
              title={userRole === 'admin' ? 'Report Submission Notifications' : 'Ready to Submit Alerts'}
            >
              <FileCheck className="w-5 h-5 text-gray-500" />
              {notifUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {notifUnread > 9 ? '9+' : notifUnread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-800">
                    {userRole === 'admin' ? 'Submitted Reports' : 'Ready to Submit'}
                  </span>
                  {notifUnread > 0 && (
                    <button onClick={markAllNotifRead} className="text-xs text-blue-600 hover:underline font-medium">Mark all read</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-400 text-center">No notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} onClick={() => !n.is_read && markNotifRead(n.id)}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${n.is_read ? 'opacity-60' : 'bg-green-50/60'}`}>
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submissions bell — admin only → goes to submissions inbox */}
        {userRole === 'admin' && (
          <button onClick={() => navigate('/submissions')}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all" title="Submissions Inbox">
            <Bell className="w-5 h-5 text-gray-500" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}

        {/* Roster bell — inspector only → goes to roster */}
        {userRole === 'inspector' && (
          <button onClick={() => navigate('/roster')}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all" title="My Roster">
            <Bell className="w-5 h-5 text-gray-500" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}

        {/* Documents to sign bell — terminal_representative only → goes to client dashboard */}
        {userRole === 'terminal_representative' && (
          <button onClick={() => navigate('/client-dashboard')}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all" title="Documents to Sign">
            <FileCheck className="w-5 h-5 text-gray-500" />
          </button>
        )}

        {/* Service Request Bell — admin & inspector */}
        {['admin', 'inspector'].includes(userRole) && (
          <button onClick={() => navigate('/service-requests')}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all" title="Service Requests">
            <ConciergeBell className="w-5 h-5 text-gray-500" />
            {srUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {srUnread > 9 ? '9+' : srUnread}
              </span>
            )}
          </button>
        )}

        {/* Service Request bell — terminal_representative: their own requests */}
        {userRole === 'terminal_representative' && (
          <button onClick={() => navigate('/service-requests')}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all" title="My Service Requests">
            <ConciergeBell className="w-5 h-5 text-gray-500" />
          </button>
        )}

        {/* SR message notifications bell - all roles */}
        {isAuthenticated && (
          <div className="relative" ref={srMsgRef}>
            <button
              onClick={openSrMessages}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-all"
              title="Service Request Messages"
            >
              <MessageSquare className="w-5 h-5 text-gray-500" />
              {srMsgUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {srMsgUnread > 9 ? '9+' : srMsgUnread}
                </span>
              )}
            </button>
            {srMsgOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-800">Service Request Messages</span>
                  {srMsgUnread > 0 && (
                    <button onClick={markAllNotifRead} className="text-xs text-blue-600 hover:underline font-medium">Mark all read</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {srMsgNotifications.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-gray-400 text-center">No messages</p>
                  ) : srMsgNotifications.map(n => (
                    <div key={n.id}
                      onClick={() => { if (!n.is_read) markNotifRead(n.id); navigate('/service-requests'); setNotifOpen(false); }}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition ${n.is_read ? 'opacity-60' : 'bg-blue-50/60'}`}>
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{n.title}</p>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* User profile dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
          >
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{username}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize font-medium">{roleLabel(userRole)}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-[min(15rem,calc(100vw-1.5rem))] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 animate-fade-in"
              style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)'}}>
              {/* Profile header */}
              <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow">
                    <span className="text-white text-sm font-bold">{initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{username}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${rb.bg} ${rb.text}`}>
                      {roleLabel(userRole)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-1.5 px-1.5">
                <button
                  onClick={() => { navigate('/dashboard'); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition font-medium"
                >
                  <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                    <LayoutDashboard className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  Dashboard
                </button>
                {userRole === 'admin' && (
                  <button
                    onClick={() => { navigate('/system-analytics'); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition font-medium"
                  >
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    System Analytics
                  </button>
                )}
              </div>

              <div className="border-t border-gray-100 pt-1.5 px-1.5">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition font-semibold"
                >
                  <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
