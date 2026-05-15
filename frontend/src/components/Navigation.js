import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { API_ORIGIN, authService } from '../services/api';
import {
  LayoutDashboard, ClipboardList, Shield, Calculator, Award,
  Database, Settings, Menu, Bell, Ship, FileText, Package,
  Moon, Sun, LogOut,
} from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

const navItems = [
  { to: '/dashboard',                    label: 'Dashboard',                    icon: LayoutDashboard },
  { to: '/tanks',                        label: 'Tanks',                        icon: Database },
];

const operationsNavItems = [
  { to: '/inspections',                  label: 'Dip Ticket',                   icon: ClipboardList },
  { to: '/seal-isolation-reports',       label: 'Sealing & Isolation Report',   icon: Shield },
  { to: '/shore-tank-calculations',      label: 'Shore Tank Calculation',       icon: Calculator },
  { to: '/product-receipt-certificates', label: 'Product Receipt Certificate',  icon: Award },
  { to: '/provisional-outturn-reports',  label: 'Provisional Outturn Report',   icon: FileText },
  { to: '/stock-reports',                label: 'Stock Report',                 icon: Package },
  { to: '/vessel-reports',               label: 'Vessel Reports',               icon: Ship },
];

export const Navigation = () => {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useDarkMode();
  const [open, setOpen] = useState(false);
  const isAuthenticated = authService.isAuthenticated();
  const userRole = localStorage.getItem('user_role');
  const canReviewSubmissions = ['admin', 'supervisor'].includes(userRole);
  const visibleNavItems = [...navItems, ...operationsNavItems];

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-white/95 text-[#8B1A1A] shadow-md dark:bg-slate-700 dark:text-white'
        : 'text-white/80 hover:bg-white/15 dark:hover:bg-white/10 hover:text-white'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 mb-1 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shadow-inner hover:bg-white/30 transition-colors">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-extrabold text-sm leading-tight tracking-tight">Smart Reporting</p>
            <p className="text-white/60 text-xs capitalize mt-0.5">{userRole || 'User'} Portal</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
            <Icon className="w-5 h-5 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
        {canReviewSubmissions && (
            <NavLink to="/submissions" className={linkClass} onClick={() => setOpen(false)}>
              <Bell className="w-5 h-5 shrink-0" />
              <span>Inspection Reports</span>
            </NavLink>
        )}
        {userRole === 'admin' && (
            <a
              href={`${API_ORIGIN}/admin`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/15 hover:text-white transition-all"
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span>Admin Panel</span>
            </a>
        )}
      </nav>

      {/* Footer - Dark Mode Toggle & Logout */}
      <div className="px-3 py-3 space-y-2 border-t border-white/10">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/15 transition-all"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-5 h-5 text-yellow-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5 text-blue-200" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-red-600/20 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-3.5 z-50 md:hidden gradient-primary text-white p-2 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="gradient-primary dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800 fixed inset-y-0 left-0 z-40 hidden md:flex flex-col w-64 shadow-xl dark:shadow-2xl dark:border-r dark:border-gray-700">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/50 dark:bg-black/70" onClick={() => setOpen(false)} />
          <aside className="gradient-primary dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-800 relative h-full w-64 shadow-xl flex flex-col dark:shadow-2xl dark:border-r dark:border-gray-700">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
