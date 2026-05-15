import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ORIGIN, authService, submissionService } from '../services/api';
import { ChevronDown, LayoutDashboard, Settings, LogOut, User, Bell } from 'lucide-react';

const roleColor = {
  admin:      'bg-purple-100 text-purple-800',
  supervisor: 'bg-blue-100 text-blue-800',
  inspector:  'bg-green-100 text-green-800',
};

export const TopBar = () => {
  const navigate = useNavigate();
  const [open, setOpen]     = useState(false);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const isAuthenticated = authService.isAuthenticated();
  const userRole = localStorage.getItem('user_role') || 'user';
  const username = localStorage.getItem('username') || 'User';

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !['admin', 'supervisor'].includes(userRole)) return;
    const fetchCount = () => submissionService.getUnreadCount().then(r => setUnread(r.data.count || 0)).catch(() => {});
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, userRole]);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 md:left-64 z-30 h-14 bg-white/90 backdrop-blur-md border-b border-gray-100/80 shadow-sm flex items-center justify-between px-4 md:px-6">
      <div className="hidden md:block" />

      <div className="flex items-center gap-2 ml-auto">

        {/* Notification Bell — admin/supervisor only */}
        {['admin', 'supervisor'].includes(userRole) && (
          <button
            onClick={() => navigate('/submissions')}
            className="relative p-2 rounded-xl hover:bg-gray-50 transition"
            title="Inspection Reports"
          >
            <Bell className="w-5 h-5 text-gray-500" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}

        {/* User profile dropdown */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition"
          >
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{username}</p>
              <p className="text-xs text-gray-400 capitalize">{userRole}</p>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fade-in">
              <div className="px-4 py-3 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{username}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${roleColor[userRole] || 'bg-gray-100 text-gray-700'}`}>
                      {userRole}
                    </span>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { navigate('/dashboard'); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-400" /> Dashboard
                </button>
                {userRole === 'admin' && (
                  <a
                    href={`${API_ORIGIN}/admin`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    onClick={() => setOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-gray-400" /> Admin Panel
                  </a>
                )}
              </div>

              <div className="border-t border-gray-50 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition font-medium"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
