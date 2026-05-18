import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/api';
import {
  FileText, XCircle, ClipboardList,
  Moon, Sun, TrendingUp, Calendar, Activity, Shield, Calculator, Package, Ship, Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useDarkMode } from '../contexts/DarkModeContext';

const StatCard = ({ icon: Icon, title, value, accent, onClick }) => {
  const CardTag = onClick ? 'button' : 'div';

  return (
  <CardTag
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    className={`relative w-full min-h-[112px] sm:min-h-[124px] text-left rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 group overflow-hidden border bg-white dark:bg-slate-800 ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900' : ''}`}
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
        <p className="text-[10px] sm:text-[11px] font-extrabold text-slate-600 dark:text-slate-300 mb-3 uppercase leading-snug">{title}</p>
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

const formatCount = (value) => Number(value || 0).toLocaleString();
const RADIAN = Math.PI / 180;

const renderInsidePieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
  if (!value) return null;

  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-extrabold"
    >
      {formatCount(value)}
    </text>
  );
};

const ChartPanel = ({ title, subtitle, children, contentClassName = 'h-64' }) => (
  <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <h3 className="text-base font-extrabold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
    <div className={contentClassName}>
      {children}
    </div>
  </section>
);

const EmptyChart = () => (
  <div className="h-full flex items-center justify-center text-sm font-semibold text-gray-400 dark:text-gray-500">
    No data available
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg">
      <p className="text-xs font-bold text-gray-900 dark:text-white">{label || payload[0].name}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {formatCount(payload[0].value)} record{Number(payload[0].value) === 1 ? '' : 's'}
      </p>
    </div>
  );
};

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

  const documentChartData = documentCountCards.map(({ key, title, href, accent }) => ({
    name: title.replace(' Reports', '').replace(' Calculations', '').replace(' Certificates', ''),
    label: title,
    href,
    value: Number(data?.document_counts?.[key] || 0),
    color: accent,
  }));
  const hasDocumentData = documentChartData.some(item => item.value > 0);
  const totalOperationInspections = documentChartData.reduce((total, item) => total + item.value, 0);
  const activityData = data?.activity_overview || [];
  const showActivityCharts = ['admin', 'supervisor'].includes(data?.role) && activityData.length > 0;
  const hasActivityData = activityData.some(item => Number(item.value || 0) > 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* ────────────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION WITH DARK MODE TOGGLE */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          className="self-start p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover-scale sm:self-auto"
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
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

          <div className="grid grid-cols-1 gap-5 mb-10">
            <ChartPanel
              title="Analytical Chart"
              subtitle="Live inspection counts by operation"
              contentClassName="min-h-[520px] sm:min-h-[500px] lg:min-h-[360px]"
            >
              {hasDocumentData ? (
                <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center">
                  <div className="relative h-[320px] sm:h-[360px] lg:h-[340px] rounded-2xl border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-900/30">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={documentChartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={72}
                          outerRadius={128}
                          paddingAngle={3}
                          label={renderInsidePieLabel}
                          labelLine={false}
                        >
                          {documentChartData.map(entry => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-2xl font-extrabold text-gray-900 dark:text-white">
                          {formatCount(totalOperationInspections)}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          Total
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:content-center">
                    {documentChartData.map(item => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => navigate(item.href)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left hover:shadow-md transition bg-white dark:bg-slate-900"
                        style={{ borderColor: `${item.color}55` }}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                          <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
                            {item.label}
                          </span>
                        </span>
                        <span className="text-base font-black text-gray-900 dark:text-white">
                          {formatCount(item.value)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : <EmptyChart />}
            </ChartPanel>
          </div>

          {showActivityCharts && (
            <>
              <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security & Audit Activity
              </h2>
              <div className="mb-12">
                <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5">
                  <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Activity Control Monitor</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Live operational, audit, and security events for privileged oversight</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      {activityData.slice(0, 4).map(item => (
                        <div key={item.activity} className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.activity}</p>
                          <p className="mt-0.5 text-lg font-black text-slate-900 dark:text-white">{formatCount(item.value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="h-[360px] rounded-2xl border border-slate-100 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-900/30">
                    {hasActivityData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={activityData} layout="vertical" margin={{ top: 14, right: 30, left: 34, bottom: 14 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e5e7eb'} horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: isDarkMode ? '#cbd5e1' : '#475569' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="activity" width={160} tick={{ fontSize: 12, fontWeight: 700, fill: isDarkMode ? '#e2e8f0' : '#334155' }} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={22}>
                            {activityData.map(entry => (
                              <Cell key={entry.activity} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <EmptyChart />}
                  </div>
                </section>
              </div>
            </>
          )}
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
    </div>
  );
};
