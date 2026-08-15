import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  Gauge,
  Inbox,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  inspectionService,
  serviceRequestService,
  submissionService,
  userService,
} from '../services/api';

const BRAND = '#8B1A1A';

const PERIODS = [
  ['all', 'All Time'],
  ['daily', 'Today'],
  ['weekly', 'This Week'],
  ['monthly', 'This Month'],
  ['yearly', 'This Year'],
];

const DOCUMENT_LABELS = {
  inspections: 'Dip Tickets',
  product_receipt_certificates: 'Receipt Certs',
  seal_isolation_reports: 'Seal Reports',
  shore_tank_calculations: 'Shore Tanks',
  stock_reports: 'Stock Reports',
  provisional_outturn_reports: 'Outturn Reports',
  vessel_reports: 'Vessel Reports',
};

const CHART_COLORS = ['#2563EB', '#0F8F71', '#D97706', '#A21CAF', '#16839A', '#BE2455', '#5B35B1', '#8B1A1A'];

const getList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const number = (value) => Number(value || 0);
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(number(value));

const totalFromCounts = (counts = {}) =>
  Object.values(counts).reduce((sum, value) => sum + number(value), 0);

const countBy = (items, field, fallback = 'Unknown') =>
  items.reduce((acc, item) => {
    const value = item?.[field] || fallback;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

const toChartRows = (source, labels = {}) =>
  Object.entries(source || {}).map(([key, value]) => ({
    key,
    name: labels[key] || key.replaceAll('_', ' '),
    value: number(value),
  }));

const Card = ({ children, className = '' }) => (
  <section className={`rounded-xl border border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:border-slate-700 dark:bg-slate-800 ${className}`}>
    {children}
  </section>
);

const MetricCard = ({ icon: Icon, label, value, detail, tone = '#2563EB' }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-black leading-none text-slate-950 dark:text-white">{formatNumber(value)}</p>
        {detail && <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{detail}</p>}
      </div>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: `${tone}18` }}>
        <Icon className="h-5 w-5" style={{ color: tone }} />
      </span>
    </div>
  </Card>
);

const ChartShell = ({ title, subtitle, children, className = '' }) => (
  <Card className={`p-5 ${className}`}>
    <div className="mb-4">
      <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    <div className="h-72">{children}</div>
  </Card>
);

const EmptyChart = () => (
  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-semibold text-slate-400 dark:border-slate-700">
    No data available
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const heading = label || payload[0]?.name || payload[0]?.payload?.name;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="font-bold text-slate-800 dark:text-white">{heading}</p>
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="mt-1 font-semibold" style={{ color: item.color }}>
          {item.name}: {formatNumber(item.value)}
        </p>
      ))}
    </div>
  );
};

const AdminOnly = () => (
  <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
    <Card className="p-8 text-center">
      <ShieldCheck className="mx-auto h-10 w-10 text-red-700" />
      <h1 className="mt-4 text-xl font-black text-slate-950 dark:text-white">Admin access required</h1>
      <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        System Analytics is restricted to admin monitoring accounts.
      </p>
    </Card>
  </div>
);

export const SystemAnalyticsPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [trend, setTrend] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const role = localStorage.getItem('user_role');

  useEffect(() => {
    if (role === 'admin') fetchAnalytics();
  }, [period, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const dashboardParams = period === 'all' ? {} : { period };
      const [dashboardRes, usersRes, submissionsRes, serviceRequestsRes, ...trendResponses] = await Promise.all([
        inspectionService.getDashboard(dashboardParams),
        userService.getUsers(),
        submissionService.getSubmissions(),
        serviceRequestService.getRequests(),
        ...PERIODS.filter(([key]) => key !== 'all').map(([key]) => inspectionService.getDashboard({ period: key })),
      ]);

      setDashboard(dashboardRes.data);
      setUsers(getList(usersRes.data));
      setSubmissions(getList(submissionsRes.data));
      setServiceRequests(getList(serviceRequestsRes.data));
      setTrend(
        trendResponses.map((response, index) => {
          const [, label] = PERIODS[index + 1];
          const counts = response.data?.system_document_counts || response.data?.document_counts || {};
          const statusCounts = response.data?.system_status_counts || {};
          return {
            name: label,
            documents: totalFromCounts(counts),
            pending: number(statusCounts.submitted ?? response.data?.submitted ?? response.data?.awaiting_review ?? response.data?.total_pending_approval),
            approved: number(statusCounts.approved ?? response.data?.approved ?? response.data?.total_approved),
          };
        })
      );
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load system analytics.');
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const counts = dashboard?.system_document_counts || dashboard?.document_counts || {};
    const statusCounts = dashboard?.system_status_counts || {};
    const totalDocuments = totalFromCounts(counts);
    const activeUsers = users.filter((user) => user.is_active !== false).length;
    const roleCounts = countBy(users, 'role');
    const requestStatusCounts = countBy(serviceRequests, 'status');
    const unreadSubmissions = submissions.filter((item) => item.is_read === false).length;
    const openRequests = serviceRequests.filter((item) => !['completed', 'cancelled'].includes(item.status)).length;
    const approved = number(statusCounts.approved ?? dashboard?.approved ?? dashboard?.total_approved);
    const rejected = number(statusCounts.rejected ?? dashboard?.rejected);
    const submitted = number(statusCounts.submitted ?? dashboard?.submitted ?? dashboard?.awaiting_review ?? dashboard?.total_pending_approval);
    const draft = number(statusCounts.draft ?? dashboard?.draft);
    const reviewed = approved + rejected;
    const completionRate = totalDocuments ? Math.round((reviewed / Math.max(reviewed + submitted + draft, 1)) * 100) : 0;

    return {
      counts,
      totalDocuments,
      activeUsers,
      roleRows: toChartRows(roleCounts, { terminal_representative: 'Clients', inspector: 'Inspectors', admin: 'Admins' }),
      requestRows: toChartRows(requestStatusCounts),
      unreadSubmissions,
      openRequests,
      completionRate,
      documentRows: toChartRows(counts, DOCUMENT_LABELS).sort((a, b) => b.value - a.value),
      statusRows: [
        { name: 'Draft', value: draft },
        { name: 'Submitted', value: submitted },
        { name: 'Approved', value: approved },
        { name: 'Rejected', value: rejected },
      ],
      activityRows: dashboard?.activity_overview || [],
    };
  }, [dashboard, users, submissions, serviceRequests]);

  if (role !== 'admin') return <AdminOnly />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-red-100 border-t-[#8B1A1A]" />
          <p className="text-sm font-semibold text-slate-500">Loading system analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] px-4 py-6 dark:bg-slate-900 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${BRAND}18` }}>
                <BarChart3 className="h-6 w-6" style={{ color: BRAND }} />
              </span>
              <div>
                <h1 className="text-3xl font-black uppercase leading-tight text-slate-950 dark:text-white md:text-4xl">
                  System Analytics
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Admin monitoring for documents, users, requests, workflow health, and system activity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPeriod(key)}
                className={`rounded-lg px-3 py-2 text-xs font-black uppercase transition ${
                  period === key
                    ? 'text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
                style={period === key ? { background: BRAND } : undefined}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={fetchAnalytics}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <Card className="mb-6 flex gap-3 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-800 dark:text-red-200">Analytics error</p>
              <p className="text-sm font-medium text-red-600 dark:text-red-300">{error}</p>
            </div>
          </Card>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Database} label="Total Documents" value={analytics.totalDocuments} detail="Across all report modules" tone={BRAND} />
          <MetricCard icon={Users} label="Active Users" value={analytics.activeUsers} detail={`${formatNumber(users.length)} registered profiles`} tone="#2563EB" />
          <MetricCard icon={Inbox} label="Unread Submissions" value={analytics.unreadSubmissions} detail={`${formatNumber(submissions.length)} total submissions`} tone="#D97706" />
          <MetricCard icon={Gauge} label="Open Requests" value={analytics.openRequests} detail={`${formatNumber(serviceRequests.length)} service requests`} tone="#0F8F71" />
          <MetricCard icon={ClipboardList} label="Pending Review" value={analytics.statusRows.find((row) => row.name === 'Submitted')?.value} detail="Submitted inspection workflow" tone="#BE2455" />
          <MetricCard icon={CheckCircle2} label="Approved" value={analytics.statusRows.find((row) => row.name === 'Approved')?.value} detail="Completed review outcomes" tone="#16A34A" />
          <MetricCard icon={AlertTriangle} label="Rejected" value={analytics.statusRows.find((row) => row.name === 'Rejected')?.value} detail="Items needing correction" tone="#DC2626" />
          <MetricCard icon={PackageCheck} label="Completion Rate" value={analytics.completionRate} detail="Reviewed versus active workflow" tone="#5B35B1" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <ChartShell title="Document Histogram" subtitle="Volume by document type" className="xl:col-span-2">
            {analytics.documentRows.some((row) => row.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.documentRows} margin={{ top: 8, right: 12, left: -12, bottom: 36 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-22} textAnchor="end" interval={0} height={58} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Documents" radius={[6, 6, 0, 0]}>
                    {analytics.documentRows.map((entry, index) => (
                      <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartShell>

          <ChartShell title="User Roles" subtitle="Admin, inspector, and client accounts">
            {analytics.roleRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.roleRows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                    {analytics.roleRows.map((entry, index) => (
                      <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartShell>

          <ChartShell title="Workflow Status" subtitle="Inspection review status">
            {analytics.statusRows.some((row) => row.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.statusRows} layout="vertical" margin={{ top: 8, right: 20, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Items" radius={[0, 6, 6, 0]} fill={BRAND} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartShell>

          <ChartShell title="Period Trend" subtitle="Documents, pending review, and approvals" className="xl:col-span-2">
            {trend.some((row) => row.documents > 0 || row.pending > 0 || row.approved > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 20, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="documents" name="Documents" stroke={BRAND} strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="pending" name="Pending" stroke="#D97706" strokeWidth={2} />
                  <Line type="monotone" dataKey="approved" name="Approved" stroke="#0F8F71" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartShell>

          <ChartShell title="Service Requests" subtitle="Operational request workload">
            {analytics.requestRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.requestRows} margin={{ top: 8, right: 12, left: -12, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={48} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Requests" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart />}
          </ChartShell>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="p-5 xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-white">Activity Monitoring</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-700">
                    <th className="py-3 pr-4">Activity</th>
                    <th className="py-3 pr-4">Count</th>
                    <th className="py-3 pr-4">Why monitored</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.activityRows.map((row) => (
                    <tr key={row.activity} className="border-b border-slate-50 dark:border-slate-700/70">
                      <td className="py-3 pr-4 font-bold text-slate-800 dark:text-white">{row.activity}</td>
                      <td className="py-3 pr-4 font-black text-slate-950 dark:text-white">{formatNumber(row.value)}</td>
                      <td className="py-3 pr-4 font-medium text-slate-500 dark:text-slate-400">{row.why}</td>
                    </tr>
                  ))}
                  {!analytics.activityRows.length && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center font-semibold text-slate-400">No activity metrics available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-800 dark:text-white">System Snapshot</h2>
            </div>
            <div className="space-y-3">
              {[
                ['Tanks in service', dashboard?.total_tanks],
                ['Registered users', users.length],
                ['Active users', analytics.activeUsers],
                ['Submissions', submissions.length],
                ['Service requests', serviceRequests.length],
                ['Last refresh', new Date().toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {typeof value === 'number' ? formatNumber(value) : value || '0'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
