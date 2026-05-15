import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/api';
import {
  BarChart2, FileText, Send, CheckCircle, XCircle, Clock,
  Droplets, Plus, FileCheck, Lock, Ruler, ClipboardList, Database,
  Moon, Sun, TrendingUp, Calendar, Activity, Shield, Calculator, Package, Ship
} from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

const StatCard = ({ icon: Icon, title, value, from, to, accent, onClick }) => {
  const CardTag = onClick ? 'button' : 'div';

  return (
  <CardTag
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    className={`relative w-full text-left bg-gradient-to-br ${from} ${to} rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group overflow-hidden border border-white/60 dark:border-white/5 ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8B1A1A] focus:ring-offset-2' : ''}`}
  >
    {/* Decorative circle */}
    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20" style={{background:accent}} />
    <div className="relative flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest leading-tight">{title}</p>
        <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value ?? '—'}</p>
      </div>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform" style={{background:accent+'22'}}>
        <Icon className="w-5 h-5" style={{color:accent}} />
      </div>
    </div>
  </CardTag>
  );
};

const FilterBadge = ({ label, isActive, onClick }) => (
  <button onClick={onClick} className={`filter-badge ${isActive ? 'active' : ''}`}>
    <Calendar className="w-4 h-4" />
    {label}
  </button>
);

const documentCountCards = [
  { key: 'inspections',              title: 'Dip Tickets',              href: '/inspections',                     icon: ClipboardList, from: 'from-blue-50 dark:from-blue-900/20',    to: 'to-sky-50 dark:to-sky-900/10',      accent: '#3b82f6' },
  { key: 'seal_isolation_reports',   title: 'Seal & Isolation Reports', href: '/seal-isolation-reports',          icon: Shield,        from: 'from-emerald-50 dark:from-emerald-900/20', to: 'to-teal-50 dark:to-teal-900/10',  accent: '#10b981' },
  { key: 'shore_tank_calculations',  title: 'Shore Tank Calculations',  href: '/shore-tank-calculations',         icon: Calculator,    from: 'from-cyan-50 dark:from-cyan-900/20',    to: 'to-blue-50 dark:to-blue-900/10',    accent: '#06b6d4' },
  { key: 'stock_reports',            title: 'Stock Reports',            href: '/stock-reports',                   icon: Package,       from: 'from-violet-50 dark:from-violet-900/20', to: 'to-purple-50 dark:to-purple-900/10', accent: '#8b5cf6' },
  { key: 'provisional_outturn_reports', title: 'Provisional Outturn Reports', href: '/provisional-outturn-reports', icon: FileText,    from: 'from-amber-50 dark:from-amber-900/20',  to: 'to-yellow-50 dark:to-yellow-900/10', accent: '#f59e0b' },
  { key: 'vessel_reports',           title: 'Vessel Reports',           href: '/vessel-reports',                  icon: Ship,          from: 'from-rose-50 dark:from-rose-900/20',    to: 'to-pink-50 dark:to-pink-900/10',    accent: '#f43f5e' },
];

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { isDarkMode, setIsDarkMode } = useDarkMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const username = localStorage.getItem('username') || 'User';

  useEffect(() => { fetchDashboard(); }, [timeFilter]); // eslint-disable-line

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await inspectionService.getDashboard(timeFilter === 'all' ? {} : { period: timeFilter });
      setData(res.data);
    } catch {
      setError('Failed to load dashboard. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center animate-fade-in">
          <div className="w-14 h-14 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto mt-12 animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 flex gap-4">
          <XCircle className="w-6 h-6 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-200 mb-1">Dashboard Error</p>
            <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
            <button onClick={fetchDashboard} className="mt-3 text-sm text-red-700 dark:text-red-300 font-semibold underline hover:no-underline">Try again</button>
          </div>
        </div>
      </div>
    );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION WITH DARK MODE TOGGLE */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {username}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover-scale"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TIME FILTER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
          <TrendingUp className="w-4 h-4" />
          <span>Filter by Period:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterBadge label="All Time" isActive={timeFilter === 'all'} onClick={() => setTimeFilter('all')} />
          <FilterBadge label="Daily" isActive={timeFilter === 'daily'} onClick={() => setTimeFilter('daily')} />
          <FilterBadge label="Weekly" isActive={timeFilter === 'weekly'} onClick={() => setTimeFilter('weekly')} />
          <FilterBadge label="Monthly" isActive={timeFilter === 'monthly'} onClick={() => setTimeFilter('monthly')} />
          <FilterBadge label="Yearly" isActive={timeFilter === 'yearly'} onClick={() => setTimeFilter('yearly')} />
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* STATS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {data && (
        <>
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
            {documentCountCards.map(({ key, title, href, icon, from, to, accent }) => (
              <StatCard
                key={key}
                icon={icon}
                title={title}
                value={data.document_counts?.[key] ?? 0}
                from={from}
                to={to}
                accent={accent}
                onClick={() => navigate(href)}
              />
            ))}

            {data.role === 'inspector' && (
              <>
                <StatCard icon={BarChart2}   title="Total Inspections" value={data.total_inspections} from="from-blue-50 dark:from-blue-900/20"   to="to-sky-50 dark:to-sky-900/10"     accent="#3b82f6" onClick={() => navigate('/inspections')} />
                <StatCard icon={FileText}    title="Draft"             value={data.draft}             from="from-yellow-50 dark:from-yellow-900/20" to="to-amber-50 dark:to-amber-900/10" accent="#f59e0b" onClick={() => navigate('/inspections?status=draft')} />
                <StatCard icon={Send}        title="Submitted"         value={data.submitted}         from="from-orange-50 dark:from-orange-900/20" to="to-red-50 dark:to-red-900/10"    accent="#f97316" onClick={() => navigate('/inspections?status=submitted')} />
                <StatCard icon={CheckCircle} title="Approved"          value={data.approved}          from="from-green-50 dark:from-green-900/20"  to="to-emerald-50 dark:to-emerald-900/10" accent="#22c55e" onClick={() => navigate('/inspections?status=approved')} />
              </>
            )}
            {data.role === 'supervisor' && (
              <>
                <StatCard icon={Clock}       title="Pending Approval" value={data.total_pending_approval} from="from-orange-50 dark:from-orange-900/20" to="to-red-50 dark:to-red-900/10"    accent="#f97316" onClick={() => navigate('/inspections?status=submitted')} />
                <StatCard icon={CheckCircle} title="Total Approved"   value={data.total_approved}         from="from-green-50 dark:from-green-900/20"  to="to-emerald-50 dark:to-emerald-900/10" accent="#22c55e" onClick={() => navigate('/inspections?status=approved')} />
              </>
            )}
            {data.role === 'admin' && (
              <>
                <StatCard icon={Droplets}    title="Total Tanks"       value={data.total_tanks}       from="from-blue-50 dark:from-blue-900/20"    to="to-sky-50 dark:to-sky-900/10"     accent="#3b82f6" onClick={() => navigate('/tanks')} />
                <StatCard icon={BarChart2}   title="Total Inspections" value={data.total_inspections} from="from-indigo-50 dark:from-indigo-900/20" to="to-blue-50 dark:to-blue-900/10"   accent="#6366f1" onClick={() => navigate('/inspections')} />
                <StatCard icon={CheckCircle} title="Approved"          value={data.approved}          from="from-green-50 dark:from-green-900/20"  to="to-emerald-50 dark:to-emerald-900/10" accent="#22c55e" onClick={() => navigate('/inspections?status=approved')} />
                <StatCard icon={XCircle}     title="Rejected"          value={data.rejected}          from="from-red-50 dark:from-red-900/20"      to="to-rose-50 dark:to-rose-900/10"   accent="#ef4444" onClick={() => navigate('/inspections?status=rejected')} />
              </>
            )}
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* QUICK ACTIONS SECTION */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-6 md:p-8">
        <h2 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href:'/inspections/new',                  icon:Plus,          label:'New Inspection',    color:'#3b82f6' },
            { href:'/product-receipt-certificates/new', icon:FileCheck,     label:'New Certificate',   color:'#8b5cf6' },
            { href:'/seal-isolation-reports/new',       icon:Lock,          label:'Seal Report',       color:'#10b981' },
            { href:'/shore-tank-calculations/new',      icon:Ruler,         label:'Shore Calc',        color:'#f59e0b' },
            { href:'/inspections',                      icon:ClipboardList, label:'All Inspections',   color:'#6366f1' },
            { href:'/tanks',                            icon:Database,      label:'View Tanks',        color:'#8B1A1A' },
          ].map(({ href, icon: Icon, label, color }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 hover:border-transparent hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group bg-white dark:bg-slate-700"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{background:color+'18'}}>
                <Icon className="w-5 h-5" style={{color}} />
              </div>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
