import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inspectionService, notificationService } from '../services/api';
import {
  Activity,
  Award,
  BarChart3,
  Bell,
  Calculator,
  Calendar,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  ConciergeBell,
  FileText,
  FlaskConical,
  FolderOpen,
  LayoutGrid,
  Package,
  Shield,
  Ship,
  Users,
  X,
  XCircle,
  ArrowRight,
} from 'lucide-react';

const BRAND = '#8B1A1A';

const DOC_ROUTE = {
  product_receipt: '/product-receipt-certificates',
  seal_isolation: '/seal-isolation-reports',
  shore_tank: '/shore-tank-calculations',
  dip_ticket: '/inspections',
};

const REPORT_CARD_BY_PATH = {
  '/inspections': {
    key: 'inspections',
    title: 'Dip Ticket',
    href: '/inspections',
    icon: ClipboardList,
    accent: '#2563EB',
  },
  '/seal-isolation-reports': {
    key: 'seal_isolation_reports',
    title: 'Seal & Isolation',
    href: '/seal-isolation-reports',
    icon: Shield,
    accent: '#0F8F71',
  },
  '/shore-tank-calculations': {
    key: 'shore_tank_calculations',
    title: 'Shore Tank Calculation',
    href: '/shore-tank-calculations',
    icon: Calculator,
    accent: '#16839A',
  },
  '/product-receipt-certificates': {
    key: 'product_receipt_certificates',
    title: 'Product Receipt Certificate',
    href: '/product-receipt-certificates',
    icon: Award,
    accent: '#A21CAF',
  },
  '/provisional-outturn-reports': {
    key: 'provisional_outturn_reports',
    title: 'Provisional Outturn Report',
    href: '/provisional-outturn-reports',
    icon: FileText,
    accent: '#D97706',
  },
  '/stock-reports': {
    key: 'stock_reports',
    title: 'Stock Report',
    href: '/stock-reports',
    icon: Package,
    accent: '#5B35B1',
  },
  '/vessel-reports': {
    key: 'vessel_reports',
    title: 'Vessel Reports',
    href: '/vessel-reports',
    icon: Ship,
    accent: '#BE2455',
  },
};

const STATIC_NAV_CARDS = {
  clientDashboard: {
    title: 'Client Dashboard',
    href: '/client-dashboard',
    icon: LayoutGrid,
    accent: '#2563EB',
  },
  submissions: {
    title: 'Submissions Inbox',
    href: '/submissions',
    icon: Bell,
    accent: '#D97706',
  },
  sampling: {
    title: 'Sampling Form',
    href: '/sampling-forms',
    icon: FlaskConical,
    accent: '#0F8F71',
  },
  serviceRequests: {
    title: 'Service Requests',
    href: '/service-requests',
    icon: ConciergeBell,
    accent: '#BE2455',
  },
  roster: {
    title: 'Inspector Roster',
    href: '/roster',
    icon: CalendarDays,
    accent: '#16839A',
  },
  myRoster: {
    title: 'My Roster',
    href: '/roster',
    icon: CalendarDays,
    accent: '#16839A',
  },
  users: {
    title: 'User Management',
    href: '/users',
    icon: Users,
    accent: '#5B35B1',
  },
  analytics: {
    title: 'System Analytics',
    href: '/system-analytics',
    icon: BarChart3,
    accent: '#2563EB',
  },
};

const ADMIN_DASHBOARD_CARDS = [
  STATIC_NAV_CARDS.submissions,
  REPORT_CARD_BY_PATH['/inspections'],
  REPORT_CARD_BY_PATH['/seal-isolation-reports'],
  REPORT_CARD_BY_PATH['/shore-tank-calculations'],
  REPORT_CARD_BY_PATH['/product-receipt-certificates'],
  REPORT_CARD_BY_PATH['/provisional-outturn-reports'],
  REPORT_CARD_BY_PATH['/stock-reports'],
  REPORT_CARD_BY_PATH['/vessel-reports'],
  STATIC_NAV_CARDS.serviceRequests,
  STATIC_NAV_CARDS.roster,
  STATIC_NAV_CARDS.users,
  STATIC_NAV_CARDS.analytics,
];

const INSPECTOR_DASHBOARD_CARDS = [
  REPORT_CARD_BY_PATH['/inspections'],
  { ...REPORT_CARD_BY_PATH['/seal-isolation-reports'], title: 'Sealing & Isolation' },
  REPORT_CARD_BY_PATH['/shore-tank-calculations'],
  REPORT_CARD_BY_PATH['/product-receipt-certificates'],
  REPORT_CARD_BY_PATH['/provisional-outturn-reports'],
  REPORT_CARD_BY_PATH['/stock-reports'],
  REPORT_CARD_BY_PATH['/vessel-reports'],
  STATIC_NAV_CARDS.sampling,
  STATIC_NAV_CARDS.myRoster,
  STATIC_NAV_CARDS.serviceRequests,
];

const TERMINAL_REP_DASHBOARD_CARDS = [
  STATIC_NAV_CARDS.clientDashboard,
  STATIC_NAV_CARDS.serviceRequests,
];

const PERIODS = [
  ['all', 'All Time'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
];

const PeriodDropdown = ({ value, onChange }) => (
  <div className="relative inline-flex min-w-[9.5rem] items-center">
    <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-white" />
    <select
      aria-label="Filter by period"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-0 w-full appearance-none rounded-full border-0 py-2 pl-9 pr-9 text-xs font-bold text-white shadow-sm outline-none"
      style={{ background: BRAND, boxShadow: '0 8px 18px rgba(139, 26, 26, 0.22)' }}
    >
      {PERIODS.map(([periodValue, label]) => (
        <option key={periodValue} value={periodValue} className="bg-white text-slate-900">
          {label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-white" />
  </div>
);

const DashboardCard = ({ card, value, subValue, onClick }) => {
  const Icon = card.icon;
  const displayValue = value ?? card.valueLabel;
  const hasDisplayValue = displayValue !== undefined && displayValue !== null;
  const valueClass = typeof displayValue === 'number'
    ? 'text-4xl font-black'
    : 'text-lg font-black uppercase tracking-wide';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative min-h-[132px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white px-6 py-5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_30px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <span
        className="absolute left-0 right-0 top-0 h-1 rounded-t-xl"
        style={{ background: card.accent }}
      />
      <div className="flex h-full items-start justify-between gap-4 pt-1">
        <div className="min-w-0">
          <p className="max-w-[14rem] text-xs font-black uppercase leading-snug text-slate-700 dark:text-slate-300">
            {card.title}
          </p>
          {hasDisplayValue && (
            <p className={`mt-4 leading-none text-slate-950 dark:text-white ${valueClass}`}>
              {displayValue}
            </p>
          )}
          {subValue !== undefined && (
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                {subValue.unread} Unread
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                {subValue.read} Read
              </span>
            </div>
          )}
        </div>
        <span
          className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition group-hover:scale-105"
          style={{ background: card.accent }}
        >
          <Icon className="h-6 w-6 text-white" />
        </span>
      </div>
    </button>
  );
};

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('daily');
  const [readyAlerts, setReadyAlerts] = useState([]);
  const role     = localStorage.getItem('user_role') || 'admin';
  const username  = localStorage.getItem('username') || 'User';

  useEffect(() => {
    fetchDashboard();
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (['inspector', 'admin'].includes(role)) fetchReadyAlerts();
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReadyAlerts = async () => {
    try {
      const res = await notificationService.getNotifications({ notification_type: 'ready_to_submit' });
      const items = res.data.results || res.data;
      setReadyAlerts(items.filter((notification) => !notification.is_read));
    } catch {
      // Alerts are helpful, but should not block the dashboard.
    }
  };

  const dismissAlert = async (id) => {
    try {
      await notificationService.markRead(id);
    } catch {
      // Keep the UI responsive even if the read receipt fails.
    }
    setReadyAlerts((previous) => previous.filter((notification) => notification.id !== id));
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await inspectionService.getDashboard(period === 'all' ? {} : { period });
      setData(res.data);
      setError('');
    } catch {
      setError('Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const counts = data?.document_counts || {};
  const pendingSubmissions = data?.pending_submissions ?? 0;
  const submittedReportsCount = data?.submitted_reports_count ?? 0;
  const recentSubmissions = data?.recent_submissions || [];
  const dashboardCards =
    role === 'admin'
      ? ADMIN_DASHBOARD_CARDS
      : role === 'inspector'
        ? INSPECTOR_DASHBOARD_CARDS
        : TERMINAL_REP_DASHBOARD_CARDS;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-red-100 border-t-[#8B1A1A]" />
          <p className="text-sm font-semibold text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-16 max-w-lg p-8">
        <div className="flex gap-4 rounded-xl border border-red-200 bg-red-50 p-6">
          <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
          <div>
            <p className="mb-1 font-semibold text-red-800">Dashboard Error</p>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchDashboard}
              className="mt-3 text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f6f7fb] px-4 py-6 dark:bg-slate-900 md:px-8 md:py-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-7 text-center">
          <h1 className="text-3xl font-black uppercase leading-tight text-slate-950 dark:text-white md:text-4xl">
            {role === 'inspector' ? `Welcome, ${username}` : role === 'admin' ? 'Administration Dashboard' : 'Dashboard'}
          </h1>
          <div className="mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <PeriodDropdown value={period} onChange={setPeriod} />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Activity className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xl font-black uppercase tracking-wide text-slate-700 dark:text-slate-300 md:text-2xl">
              System Overview
            </h2>
          </div>
        </header>

        {role === 'inspector' && readyAlerts.length > 0 && (
          <div className="mb-7 space-y-2">
            {readyAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amber-900">{alert.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-amber-700">{alert.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {alert.doc_type && alert.doc_id && (
                    <button
                      type="button"
                      onClick={() => navigate(`${DOC_ROUTE[alert.doc_type] || '/'}/${alert.doc_id}`)}
                      className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
                    aria-label="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <section>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {dashboardCards.map((card) => (
              <DashboardCard
                key={`${card.href}-${card.title}`}
                card={card}
                value={card.href === '/submissions' ? (pendingSubmissions + (submittedReportsCount - pendingSubmissions)) : card.key ? counts[card.key] || 0 : undefined}
                subValue={card.href === '/submissions' ? { unread: pendingSubmissions, read: submittedReportsCount - pendingSubmissions } : undefined}
                onClick={() => navigate(card.href)}
              />
            ))}
          </div>
        </section>

        {role === 'admin' && (
          <section className="mt-8">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Submitted Reports</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Latest reports submitted for admin review.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/submissions')}
                className="inline-flex items-center rounded-full bg-[#8B1A1A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6e1414]"
              >
                View all submissions
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recentSubmissions.length > 0 ? recentSubmissions.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => navigate('/submissions')}
                  className="text-left rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 transition"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{submission.doc_type.replace('_', ' ')}</p>
                  <p className="mt-3 text-base font-semibold text-slate-900 dark:text-white truncate">{submission.vessel_name || 'Unnamed Vessel'}</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate">{submission.doc_number}</p>
                  <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
                  {!submission.is_read && (
                    <span className="mt-4 inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">New</span>
                  )}
                </button>
              )) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No recent submissions yet. New reports will appear here as inspectors submit them.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
