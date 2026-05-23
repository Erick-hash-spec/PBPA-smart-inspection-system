import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/api';
import {
  FileText, XCircle, ClipboardList,
  TrendingUp, Calendar, Activity, Shield, Calculator, Package, Ship, Award
} from 'lucide-react';

const StatCard = ({ icon: Icon, title, value, accent, onClick }) => {
  const CardTag = onClick ? 'button' : 'div';

  return (
  <CardTag
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    className={`dashboard-stat-card relative w-full min-h-[112px] sm:min-h-[124px] text-left rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group overflow-hidden border bg-white dark:bg-slate-800 ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900' : ''}`}
    style={{
      borderColor: `${accent}66`,
      boxShadow: `0 10px 28px ${accent}18`,
      '--tw-ring-color': accent,
    }}
  >
    <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
    <div className="absolute -right-10 -bottom-12 w-28 h-28 rounded-full opacity-10" style={{ background: accent }} />
    <div className="relative flex h-full items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <p className="text-[11px] sm:text-[11px] font-extrabold text-slate-700 dark:text-slate-200 mb-3 uppercase leading-snug">{title}</p>
        <p className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight leading-none">{value ?? '--'}</p>
      </div>
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform" style={{background:accent}}>
        <Icon className="w-5 h-5 text-white" />
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
  { key: 'inspections',              title: 'Dip Tickets',              href: '/inspections',                     icon: ClipboardList, from: 'from-blue-50 dark:from-blue-900/20',       to: 'to-sky-50 dark:to-sky-900/10',       accent: '#2563eb' },
  { key: 'product_receipt_certificates', title: 'Product Receipt Certificates', href: '/product-receipt-certificates', icon: Award, from: 'from-fuchsia-50 dark:from-fuchsia-900/20', to: 'to-pink-50 dark:to-pink-900/10', accent: '#c026d3' },
  { key: 'seal_isolation_reports',   title: 'Seal & Isolation Reports', href: '/seal-isolation-reports',          icon: Shield,        from: 'from-green-50 dark:from-green-900/20',     to: 'to-emerald-50 dark:to-emerald-900/10', accent: '#16a34a' },
  { key: 'shore_tank_calculations',  title: 'Shore Tank Calculations',  href: '/shore-tank-calculations',         icon: Calculator,    from: 'from-cyan-50 dark:from-cyan-900/20',       to: 'to-teal-50 dark:to-teal-900/10',      accent: '#0891b2' },
  { key: 'stock_reports',            title: 'Stock Reports',            href: '/stock-reports',                   icon: Package,       from: 'from-violet-50 dark:from-violet-900/20',   to: 'to-purple-50 dark:to-purple-900/10',  accent: '#7c3aed' },
  { key: 'provisional_outturn_reports', title: 'Provisional Outturn Reports', href: '/provisional-outturn-reports', icon: FileText,    from: 'from-amber-50 dark:from-amber-900/20',  to: 'to-yellow-50 dark:to-yellow-900/10', accent: '#f59e0b' },
  { key: 'vessel_reports',           title: 'Vessel Reports',           href: '/vessel-reports',                  icon: Ship,          from: 'from-rose-50 dark:from-rose-900/20',       to: 'to-pink-50 dark:to-pink-900/10',      accent: '#e11d48' },
];

export const DashboardPage = () => {
  const navigate = useNavigate();
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
      {/* HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {username}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TIME FILTER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
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
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
            {documentCountCards.map(({ key, title, href, icon, accent }) => (
              <StatCard
                key={key}
                icon={icon}
                title={title}
                value={data.document_counts?.[key] ?? 0}
                accent={accent}
                onClick={() => navigate(href)}
              />
            ))}
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
    </div>
  );
};
