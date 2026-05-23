import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import {
  LayoutDashboard, ClipboardList, Shield, Calculator, Award,
  Menu, Bell, Ship, FileText, Package,
  LogOut, X, Droplets, Users, CalendarDays,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

const operationsNavItems = [
  { to: '/inspections',                  label: 'Dip Ticket',                  icon: ClipboardList },
  { to: '/seal-isolation-reports',       label: 'Sealing & Isolation',         icon: Shield },
  { to: '/shore-tank-calculations',      label: 'Shore Tank Calculation',      icon: Calculator },
  { to: '/product-receipt-certificates', label: 'Product Receipt Certificate', icon: Award },
  { to: '/provisional-outturn-reports',  label: 'Provisional Outturn Report',  icon: FileText },
  { to: '/stock-reports',                label: 'Stock Report',                icon: Package },
  { to: '/vessel-reports',               label: 'Vessel Reports',              icon: Ship },
];

const adminNavItems = [
  { to: '/submissions',                  label: 'Inspection Reports',          icon: Bell },
  { to: '/stock-reports',                label: 'Stock Reports',               icon: Package },
  { to: '/provisional-outturn-reports',  label: 'Provisional Outturn Reports', icon: FileText },
  { to: '/vessel-reports',               label: 'Vessel Reports',              icon: Ship },
];

export const Navigation = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isAuthenticated = authService.isAuthenticated();
  const userRole = localStorage.getItem('user_role');
  const username = localStorage.getItem('username') || 'User';
  const initials = username.slice(0, 2).toUpperCase();

  if (!isAuthenticated) return null;

  const handleLogout = () => { authService.logout(); navigate('/login'); };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-white/95 text-[#8B1A1A] shadow-md'
        : 'text-white/75 hover:bg-white/12 hover:text-white'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-inner" style={{background:'rgba(255,255,255,0.2)'}}>
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-sm leading-tight tracking-tight">Smart Reporting</p>
              <p className="text-white/50 text-[10px] capitalize font-medium mt-0.5">{userRole || 'User'} Portal</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        {/* General */}
        <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-1">General</p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Inspector */}
        {userRole === 'inspector' && (
          <>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Operations</p>
            {operationsNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Schedule</p>
            <NavLink to="/roster" className={linkClass} onClick={() => setOpen(false)}>
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>My Roster</span>
            </NavLink>
          </>
        )}

        {/* Supervisor */}
        {userRole === 'supervisor' && (
          <>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Operations</p>
            {operationsNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Admin</p>
            <NavLink to="/submissions" className={linkClass} onClick={() => setOpen(false)}>
              <Bell className="w-4 h-4 shrink-0" />
              <span>Inspection Reports</span>
            </NavLink>
            <NavLink to="/roster" className={linkClass} onClick={() => setOpen(false)}>
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>Inspector Roster</span>
            </NavLink>
          </>
        )}

        {/* Admin */}
        {userRole === 'admin' && (
          <>
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Reports</p>
            {adminNavItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest px-3 mb-1.5 mt-4">Management</p>
            <NavLink to="/roster" className={linkClass} onClick={() => setOpen(false)}>
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span>Inspector Roster</span>
            </NavLink>
            <NavLink to="/users" className={linkClass} onClick={() => setOpen(false)}>
              <Users className="w-4 h-4 shrink-0" />
              <span>User Management</span>
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
            <p className="text-white/40 text-[10px] capitalize">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/75 hover:bg-red-500/20 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 md:hidden gradient-primary text-white p-2.5 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="gradient-primary fixed inset-y-0 left-0 z-40 hidden md:flex flex-col w-60 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close navigation menu" />
          <aside className="gradient-primary relative h-full w-[min(20rem,86vw)] shadow-2xl flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
