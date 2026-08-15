import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { authService, serviceRequestService } from '../services/api';
import {
  LayoutDashboard, ClipboardList, Shield, Calculator, Award,
  Menu, Bell, Ship, FileText, Package,
  LogOut, X, Droplets, Users, CalendarDays, FlaskConical, BarChart3,
  LayoutGrid, ConciergeBell, ChevronDown, ChevronRight, FolderOpen,
} from 'lucide-react';

const operationsNavItems = [
  { to: '/inspections',                  label: 'Dip Ticket',                  icon: ClipboardList },
  { to: '/seal-isolation-reports',       label: 'Sealing & Isolation',         icon: Shield },
  { to: '/shore-tank-calculations',      label: 'Shore Tank Calculation',      icon: Calculator },
  { to: '/product-receipt-certificates', label: 'Product Receipt Certificate', icon: Award },
  { to: '/provisional-outturn-reports',  label: 'Provisional Outturn Report',  icon: FileText },
  { to: '/stock-reports',                label: 'Stock Report',                icon: Package },
  { to: '/vessel-reports',               label: 'Vessel Reports',              icon: Ship },
  { to: '/sampling-forms',               label: 'Sampling Form',               icon: FlaskConical },
];

const adminReportItems = [
  { to: '/inspections',                  label: 'Dip Ticket',                  icon: ClipboardList },
  { to: '/seal-isolation-reports',       label: 'Seal & Isolation',            icon: Shield },
  { to: '/shore-tank-calculations',      label: 'Shore Tank Calculation',      icon: Calculator },
  { to: '/product-receipt-certificates', label: 'Product Receipt Cert.',       icon: Award },
  { to: '/provisional-outturn-reports',  label: 'Provisional Outturn',         icon: FileText },
  { to: '/stock-reports',                label: 'Stock Report',                icon: Package },
  { to: '/vessel-reports',               label: 'Vessel Reports',              icon: Ship },
];

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [srCount, setSrCount] = useState(0);
  const isAuthenticated = authService.isAuthenticated();
  const userRole = localStorage.getItem('user_role');
  const username = localStorage.getItem('username') || 'User';
  const initials = username.slice(0, 2).toUpperCase();

  // Auto-expand Inspection Reports group if current path matches any report item
  useEffect(() => {
    const active = adminReportItems.some(item => location.pathname.startsWith(item.to));
    if (active) setReportsOpen(true);
  }, [location.pathname]);

  /* Poll service-request unread count for admin & inspector */
  useEffect(() => {
    if (!isAuthenticated || !['admin', 'inspector'].includes(userRole)) return;
    const fetch = () => serviceRequestService.getUnreadCount().then(r => setSrCount(r.data.count || 0)).catch(() => {});
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, [isAuthenticated, userRole]);

  if (!isAuthenticated) return null;

  const handleLogout = () => { authService.logout(); navigate('/login'); };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-white/95 text-[#8B1A1A] shadow-md'
        : 'text-white/75 hover:bg-white/12 hover:text-white'
    }`;

  const subLinkClass = ({ isActive }) =>
    `flex items-center gap-3 pl-8 pr-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-white/95 text-[#8B1A1A] shadow-md'
        : 'text-white/65 hover:bg-white/10 hover:text-white'
    }`;

  const SrBadge = () => srCount > 0 ? (
    <span className="ml-auto min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
      {srCount > 9 ? '9+' : srCount}
    </span>
  ) : null;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner" style={{background:'rgba(255,255,255,0.2)'}}>
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-sm leading-tight tracking-tight">Smart Reporting</p>
              <p className="text-white/50 text-[10px] capitalize font-medium mt-0.5">{userRole === 'terminal_representative' ? 'Terminal Representative' : userRole} Portal</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {userRole !== 'terminal_representative' && (
          <>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-1">General</p>
            <NavLink to="/dashboard" className={linkClass} onClick={() => setOpen(false)}>
              <LayoutDashboard className="w-4 h-4 shrink-0" /><span>Dashboard</span>
            </NavLink>
          </>
        )}

        {/* ── Inspector ── */}
        {userRole === 'inspector' && (
          <>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Operations</p>
            {operationsNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
                <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{label}</span>
              </NavLink>
            ))}
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Schedule</p>
            <NavLink to="/roster" className={linkClass} onClick={() => setOpen(false)}>
              <CalendarDays className="w-4 h-4 shrink-0" /><span>My Roster</span>
            </NavLink>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Requests</p>
            <NavLink to="/service-requests" className={linkClass} onClick={() => setOpen(false)}>
              <ConciergeBell className="w-4 h-4 shrink-0" /><span className="flex-1">Service Requests</span><SrBadge />
            </NavLink>
          </>
        )}

        {/* ── Terminal Representative (Client) ── */}
        {userRole === 'terminal_representative' && (
          <>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Documents</p>
            <NavLink to="/client-dashboard" className={linkClass} onClick={() => setOpen(false)}>
              <ClipboardList className="w-4 h-4 shrink-0" /><span>Documents to Sign</span>
            </NavLink>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Requests</p>
            <NavLink to="/service-requests" className={linkClass} onClick={() => setOpen(false)}>
              <ConciergeBell className="w-4 h-4 shrink-0" /><span>Service Requests</span>
            </NavLink>
          </>
        )}

        {/* ── Admin ── */}
        {userRole === 'admin' && (
          <>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Reports</p>

            {/* Submissions inbox */}
            <NavLink to="/submissions" className={linkClass} onClick={() => setOpen(false)}>
              <Bell className="w-4 h-4 shrink-0" /><span className="truncate">Submissions Inbox</span>
            </NavLink>

            {/* ── Collapsible Inspection Reports group ── */}
            <button
              onClick={() => setReportsOpen(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/75 hover:bg-white/12 hover:text-white transition-all duration-150"
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Inspection Reports</span>
              {reportsOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
            </button>

            {reportsOpen && (
              <div className="space-y-0.5">
                {adminReportItems.map(({ to, label, icon: Icon }) => (
                  <NavLink key={to} to={to} className={subLinkClass} onClick={() => setOpen(false)}>
                    <Icon className="w-4 h-4 shrink-0" /><span className="truncate">{label}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Requests</p>
            <NavLink to="/service-requests" className={linkClass} onClick={() => setOpen(false)}>
              <ConciergeBell className="w-4 h-4 shrink-0" /><span className="flex-1">Service Requests</span><SrBadge />
            </NavLink>

            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Management</p>
            <NavLink to="/roster" className={linkClass} onClick={() => setOpen(false)}>
              <CalendarDays className="w-4 h-4 shrink-0" /><span>Inspector Roster</span>
            </NavLink>
            <NavLink to="/users" className={linkClass} onClick={() => setOpen(false)}>
              <Users className="w-4 h-4 shrink-0" /><span>User Management</span>
            </NavLink>

            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Analytics</p>
            <NavLink to="/system-analytics" className={linkClass} onClick={() => setOpen(false)}>
              <BarChart3 className="w-4 h-4 shrink-0" /><span>System Analytics</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{background:'rgba(255,255,255,0.2)'}}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{username}</p>
            <p className="text-white/40 text-[10px] capitalize">{userRole === 'terminal_representative' ? 'Terminal Representative' : userRole}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/75 hover:bg-red-500/20 hover:text-white transition-all">
          <LogOut className="w-4 h-4" /><span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Menu toggle button — always visible */}
      <button onClick={() => setOpen(true)}
        className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 gradient-primary text-white p-2.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Open navigation menu">
        <Menu className="w-5 h-5" />
      </button>

      {/* Drawer overlay — shown when open */}
      {open && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close navigation menu" />
          <aside className="gradient-primary relative h-full w-[min(20rem,86vw)] shadow-2xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
