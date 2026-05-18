import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ORIGIN, authService, rosterService, submissionService } from '../services/api';
import { ChevronDown, LayoutDashboard, Settings, LogOut, Bell } from 'lucide-react';

const roleBadge = {
  admin:      { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
  supervisor: { bg: 'bg-blue-100 dark:bg-blue-900/40',   text: 'text-blue-700 dark:text-blue-300' },
  inspector:  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
};

export const TopBar = () => {
  const navigate = useNavigate();
  const [open, setOpen]     = useState(false);
  const [unread, setUnread] = useState(0);
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
    if (!isAuthenticated || !['admin', 'supervisor', 'inspector'].includes(userRole)) return;
    const fetchCount = () => {
      const countRequest = userRole === 'inspector'
        ? rosterService.getUnreadCount()
        : submissionService.getUnreadCount();
      countRequest.then(r => setUnread(r.data.count || 0)).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userRole]);

  if (!isAuthenticated) return null;

  const handleLogout = () => { authService.logout(); navigate('/login'); };
  const rb = roleBadge[userRole] || { bg: 'bg-gray-100', text: 'text-gray-700' };

  return (
    <header className="fixed top-0 left-0 right-0 md:left-64 z-30 h-14 flex items-center justify-between pl-16 pr-3 md:px-6"
      style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(0,0,0,0.06)',boxShadow:'0 1px 12px rgba(0,0,0,0.06)'}}>
      <div className="hidden md:block" />

      <div className="flex items-center gap-1.5 ml-auto">
        {/* Notification Bell */}
        {['admin', 'supervisor', 'inspector'].includes(userRole) && (
          <button
            onClick={() => navigate(userRole === 'inspector' ? '/roster' : '/submissions')}
            className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
            title={userRole === 'inspector' ? 'Roster Notifications' : 'Inspection Reports'}
          >
            <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
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
              <p className="text-[10px] text-gray-400 dark:text-gray-500 capitalize font-medium">{userRole}</p>
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
                      {userRole}
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
                  <a
                    href={`${API_ORIGIN}/admin`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition font-medium"
                    onClick={() => setOpen(false)}
                  >
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    Admin Panel
                  </a>
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
