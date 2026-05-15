import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/api';
import {
  BarChart2, FileText, Send, CheckCircle, XCircle, Clock,
  Droplets, Plus, FileCheck, Lock, Ruler, ClipboardList, Database,
  Moon, Sun, TrendingUp, Calendar, Activity
} from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

const StatCard = ({ icon: Icon, title, value, from, to, gradientClass }) => (
  <div className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 group hover-lift`}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider opacity-75">{title}</p>
        <p className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
      </div>
      <div className="w-12 h-12 rounded-xl bg-white/20 dark:bg-black/20 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  </div>
);

const FilterBadge = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`filter-badge ${isActive ? 'active' : ''}`}
  >
    <Calendar className="w-4 h-4" />
    {label}
  </button>
);

const QuickAction = ({ href, icon: Icon, label, color }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className={`${color} text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 inline-flex items-center gap-2 whitespace-nowrap hover:scale-105`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
};

export const DashboardPage = () => {
  const { isDarkMode, setIsDarkMode } = useDarkMode();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeFilter, setTimeFilter] = useState('all');
  const username = localStorage.getItem('username') || 'User';

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await inspectionService.getDashboard();
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {data.role === 'inspector' && (
              <>
                <StatCard icon={BarChart2}    title="Total Inspections" value={data.total_inspections} from="from-blue-50 dark:from-blue-900/30"   to="to-blue-100 dark:to-blue-800/30" />
                <StatCard icon={FileText}     title="Draft"             value={data.draft}             from="from-yellow-50 dark:from-yellow-900/30" to="to-yellow-100 dark:to-yellow-800/30" />
                <StatCard icon={Send}         title="Submitted"         value={data.submitted}         from="from-orange-50 dark:from-orange-900/30" to="to-orange-100 dark:to-orange-800/30" />
                <StatCard icon={CheckCircle}  title="Approved"          value={data.approved}          from="from-green-50 dark:from-green-900/30"  to="to-green-100 dark:to-green-800/30" />
              </>
            )}
            {data.role === 'supervisor' && (
              <>
                <StatCard icon={Clock}        title="Pending Approval" value={data.total_pending_approval} from="from-orange-50 dark:from-orange-900/30" to="to-orange-100 dark:to-orange-800/30" />
                <StatCard icon={CheckCircle}  title="Total Approved"   value={data.total_approved}         from="from-green-50 dark:from-green-900/30"  to="to-green-100 dark:to-green-800/30" />
              </>
            )}
            {data.role === 'admin' && (
              <>
                <StatCard icon={Droplets}     title="Total Tanks"       value={data.total_tanks}       from="from-blue-50 dark:from-blue-900/30"   to="to-blue-100 dark:to-blue-800/30" />
                <StatCard icon={BarChart2}    title="Total Inspections" value={data.total_inspections} from="from-indigo-50 dark:from-indigo-900/30" to="to-indigo-100 dark:to-indigo-800/30" />
                <StatCard icon={CheckCircle}  title="Approved"          value={data.approved}          from="from-green-50 dark:from-green-900/30"  to="to-green-100 dark:to-green-800/30" />
                <StatCard icon={XCircle}      title="Rejected"          value={data.rejected}          from="from-red-50 dark:from-red-900/30"    to="to-red-100 dark:to-red-800/30" />
              </>
            )}
          </div>
        </>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* QUICK ACTIONS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-6 md:p-8 hover-lift">
        <h2 className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <QuickAction href="/inspections/new"                  icon={Plus}          label="New Inspection"    color="gradient-primary" />
          <QuickAction href="/product-receipt-certificates/new" icon={FileCheck}     label="New Certificate"   color="gradient-primary" />
          <QuickAction href="/seal-isolation-reports/new"       icon={Lock}          label="Seal Report"       color="gradient-primary" />
          <QuickAction href="/shore-tank-calculations/new"      icon={Ruler}         label="Shore Calculation" color="gradient-primary" />
          <QuickAction href="/inspections"                      icon={ClipboardList} label="All Inspections"   color="gradient-primary" />
          <QuickAction href="/tanks"                            icon={Database}      label="View Tanks"        color="gradient-primary" />
        </div>
      </div>
    </div>
  );
};
