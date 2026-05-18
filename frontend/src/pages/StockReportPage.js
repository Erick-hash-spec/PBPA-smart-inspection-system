import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { stockReportService } from '../services/api';
import { TERMINAL_OPTIONS, PRODUCT_OPTIONS } from '../components/FormOptions';
import { SubmitModal } from '../components/SubmitModal';
import { Plus } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:bg-white text-sm transition';

const emptyItem = (sn) => ({
  sn, depot_name: '', date: new Date().toISOString().split('T')[0],
  product: '', local_ltrs: '', bps_transit_ltrs: '', non_bps_transit_ltrs: '',
  mining_ltrs: '', transshipment_ltrs: '', awaiting_outturn_ltrs: '',
});

const fmt = (v) => v ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—';
const rowTotal = (item) =>
  (Number(item.local_ltrs) || 0) +
  (Number(item.bps_transit_ltrs) || 0) +
  (Number(item.non_bps_transit_ltrs) || 0) +
  (Number(item.mining_ltrs) || 0) +
  (Number(item.transshipment_ltrs) || 0) +
  (Number(item.awaiting_outturn_ltrs) || 0);

/* ─── List Page ─────────────────────────────────────────────────────────── */
export const StockReportListPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => {
    stockReportService.getReports()
      .then(r => setReports(r.data.results || r.data))
      .catch(() => setError('Failed to load stock reports'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this stock report?')) return;
    await stockReportService.deleteReport(id);
    setReports(p => p.filter(r => r.id !== id));
  };

  const handleDownload = async (report) => {
    try {
      const res = await stockReportService.downloadPdf(report.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `StockReport_${report.report_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download PDF'); }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Stock Report"
          docTypeKey="stock_report"
          docId={submitTarget.id}
          docNumber={submitTarget.report_number}
          vesselName={`Date: ${submitTarget.report_date}`}
          terminal=""
          onDownload={() => handleDownload(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Reports</h1>
          <p className="text-gray-500 text-sm mt-1">PBPA daily petroleum stock reports</p>
        </div>
        <button onClick={() => navigate('/stock-reports/new')}
          className="inline-flex items-center gap-2 bg-[#8B1A1A] hover:bg-[#7a1717] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition">
          <Plus className="w-4 h-4" />New Stock Report
</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <p className="text-5xl mb-4"></p>
          <p className="text-gray-500 font-semibold">No stock reports yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap hover:shadow-md transition">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-900">#{r.report_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {r.status === 'final' ? 'Final' : 'Draft'}
</span>
                </div>
                <p className="text-sm text-gray-500">Date: {r.report_date} · Total: {Number(r.total_ltrs || 0).toLocaleString()} Ltrs</p>
                <p className="text-xs text-gray-400">By {r.created_by_name || 'Inspector'}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => navigate(`/stock-reports/${r.id}`)}
                  className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">View
</button>
                {r.status === 'draft' && (
                  <button onClick={() => navigate(`/stock-reports/${r.id}/edit`)}
                    className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-100 transition">Edit
</button>
                )}
                <button onClick={() => handleDownload(r)}
                  className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition">PDF
</button>
                {r.status === 'final' && (
                    submittedIds.has(r.id) ? (
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200">Submitted
</span>
                    ) : (
                      <button onClick={() => setSubmitTarget(r)}
                        className="bg-[#8B1A1A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#7a1717] transition">Submit
</button>
                    )
                  )}
                <button onClick={() => handleDelete(r.id)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Form Page ─────────────────────────────────────────────────────────── */
export const StockReportFormPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes]           = useState('');
  const [items, setItems]           = useState([emptyItem(1)]);
  const [loading, setLoading]       = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!isEdit) return;
    stockReportService.getReportById(id).then(r => {
      const d = r.data;
      setReportDate(d.report_date || new Date().toISOString().split('T')[0]);
      setNotes(d.notes || '');
      setItems(d.items.length ? d.items.map(i => ({
        sn: i.sn, depot_name: i.depot_name, date: i.date, product: i.product,
        local_ltrs: i.local_ltrs || '', bps_transit_ltrs: i.bps_transit_ltrs || '',
        non_bps_transit_ltrs: i.non_bps_transit_ltrs || '', mining_ltrs: i.mining_ltrs || '',
        transshipment_ltrs: i.transshipment_ltrs || '', awaiting_outturn_ltrs: i.awaiting_outturn_ltrs || '',
      })) : [emptyItem(1)]);
    }).catch(() => setError('Failed to load report')).finally(() => setPageLoading(false));
  }, [id]); // eslint-disable-line

  const addRow = () => setItems(p => [...p, emptyItem(p.length + 1)]);
  const removeRow = (i) => setItems(p => p.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, sn: idx + 1 })));
  const updateItem = (i, field, value) => setItems(p => { const n = [...p]; n[i] = { ...n[i], [field]: value }; return n; });

  const grandTotal = items.reduce((s, item) => s + rowTotal(item), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = {
        report_date: reportDate, notes,
        items: items.map(item => ({
          ...item,
          local_ltrs: Number(item.local_ltrs) || 0,
          bps_transit_ltrs: Number(item.bps_transit_ltrs) || 0,
          non_bps_transit_ltrs: Number(item.non_bps_transit_ltrs) || 0,
          mining_ltrs: Number(item.mining_ltrs) || 0,
          transshipment_ltrs: Number(item.transshipment_ltrs) || 0,
          awaiting_outturn_ltrs: Number(item.awaiting_outturn_ltrs) || 0,
        })),
      };
      if (isEdit) { await stockReportService.updateReport(id, payload); navigate(`/stock-reports/${id}`); }
      else { const r = await stockReportService.createReport(payload); navigate(`/stock-reports/${r.data.id}`); }
    } catch (err) { setError(err.response?.data?.detail || 'Failed to save'); }
    finally { setLoading(false); }
  };

  if (pageLoading) return <div className="flex justify-center items-center min-h-screen"><div className="w-10 h-10 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto animate-fade-in">
      <div className="mb-5">
        <button onClick={() => navigate('/stock-reports')} className="text-sm text-blue-600 hover:underline mb-2">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Stock Report' : 'New Stock Report'}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Report Date *</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} required className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} placeholder="Optional notes" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1100px]">
              <thead>
                <tr className="bg-yellow-400 text-black">
                  <th className="px-2 py-2 font-bold border border-gray-300 w-8">S/N</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-36">DEPOT NAME</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-24">DATE</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-28">PRODUCT</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-24">LOCAL (LTRS)</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-24" colSpan={2}>
                    <div className="border border-black px-1 py-0.5 text-center">TRANSIT (LTRS)</div>
                  </th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-24">MINING (LTRS)</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-28">TRANSSHIPMENT (LTRS)</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-28">AWAITING FOR OUTTURN (LTRS)</th>
                  <th className="px-2 py-2 font-bold border border-gray-300 w-24">TOTAL (LTRS)</th>
                  <th className="px-2 py-2 border border-gray-300 w-8"></th>
                </tr>
                <tr className="bg-yellow-300 text-black">
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 font-bold border border-gray-300">BPS TRANSIT</th>
                  <th className="px-2 py-1 font-bold border border-gray-300">NON-BPS TRANSIT</th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                  <th className="px-2 py-1 border border-gray-300"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-yellow-50'}>
                    <td className="px-2 py-1 border border-gray-200 text-center font-semibold">{item.sn}</td>
                    <td className="px-1 py-1 border border-gray-200">
                      <select value={item.depot_name} onChange={e => updateItem(i, 'depot_name', e.target.value)}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs bg-white">
                        <option value="">-- Select --</option>
                        {TERMINAL_OPTIONS.filter(t => t !== 'Other (type below)').map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1 border border-gray-200">
                      <input type="date" value={item.date} onChange={e => updateItem(i, 'date', e.target.value)}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs" />
                    </td>
                    <td className="px-1 py-1 border border-gray-200">
                      <select value={item.product} onChange={e => updateItem(i, 'product', e.target.value)}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs bg-white">
                        <option value="">-- Select --</option>
                        {PRODUCT_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    {['local_ltrs','bps_transit_ltrs','non_bps_transit_ltrs','mining_ltrs','transshipment_ltrs','awaiting_outturn_ltrs'].map(field => (
                      <td key={field} className="px-1 py-1 border border-gray-200">
                        <input type="number" step="1" min="0" value={item[field]}
                          onChange={e => updateItem(i, field, e.target.value)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right" />
                      </td>
                    ))}
                    <td className="px-2 py-1 border border-gray-200 text-center font-semibold text-xs">
                      {rowTotal(item).toLocaleString()}
                    </td>
                    <td className="px-1 py-1 border border-gray-200 text-center">
                      <button type="button" onClick={() => removeRow(i)} disabled={items.length === 1}
                        className="text-red-500 hover:text-red-700 disabled:opacity-30 font-bold text-sm">Remove</button>
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="bg-yellow-100 font-bold">
                  <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center text-xs font-bold">TOTAL</td>
                  <td colSpan={8} className="border border-gray-300"></td>
                  <td className="px-2 py-2 border border-gray-300 text-center text-xs font-bold">
                    {grandTotal.toLocaleString()}
                  </td>
                  <td className="border border-gray-300"></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <button type="button" onClick={addRow}
              className="inline-flex items-center gap-2 text-sm text-blue-600 font-semibold hover:underline">
              <Plus className="w-4 h-4" />Add Row
</button>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-[#8B1A1A] hover:bg-[#7a1717] text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50 transition">
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Report'}
</button>
          <button type="button" onClick={() => navigate('/stock-reports')}
            className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
        </div>
      </form>
    </div>
  );
};

/* ─── Detail Page ───────────────────────────────────────────────────────── */
export const StockReportDetailPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    stockReportService.getReportById(id).then(r => setReport(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleFinalize = async () => {
    await stockReportService.finalizeReport(id);
    setReport(p => ({ ...p, status: 'final' }));
  };

  const handleDownload = async () => {
    const res = await stockReportService.downloadPdf(id);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `StockReport_${report.report_number}.pdf`;
    document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-10 h-10 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" /></div>;
  if (!report) return <div className="p-8 text-gray-500">Report not found</div>;

  const grandTotal = report.items.reduce((s, i) => s + (i.total_ltrs || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto animate-fade-in">
      <button onClick={() => navigate('/stock-reports')} className="text-sm text-blue-600 hover:underline mb-4">← Back</button>

      {submitOpen && (
        <SubmitModal
          docType="Stock Report"
          docTypeKey="stock_report"
          docId={report.id}
          docNumber={report.report_number}
          vesselName={`Date: ${report.report_date}`}
          terminal=""
          onDownload={handleDownload}
          onClose={() => setSubmitOpen(false)}
        />
      )}

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Report #{report.report_number}</h1>
          <p className="text-gray-500 text-sm mt-1">Date: {report.report_date} · By {report.created_by_name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${report.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {report.status === 'final' ? <>Final</> : <>Draft</>}
</span>
          {report.status === 'draft' && (
            <>
              <button onClick={() => navigate(`/stock-reports/${id}/edit`)}
                className="bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-100 transition">Edit</button>
              <button onClick={handleFinalize}
                className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition">Finalize</button>
            </>
          )}
          <button onClick={handleDownload}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition">Download PDF
</button>
          {report.status === 'final' && (
            <button onClick={() => setSubmitOpen(true)}
              className="inline-flex items-center gap-2 bg-[#8B1A1A] hover:bg-[#7a1717] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Submit
</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead>
              <tr className="bg-yellow-400 text-black">
                <th className="px-3 py-2 font-bold border border-gray-300">S/N</th>
                <th className="px-3 py-2 font-bold border border-gray-300">DEPOT NAME</th>
                <th className="px-3 py-2 font-bold border border-gray-300">DATE</th>
                <th className="px-3 py-2 font-bold border border-gray-300">PRODUCT</th>
                <th className="px-3 py-2 font-bold border border-gray-300">LOCAL (LTRS)</th>
                <th className="px-3 py-2 font-bold border border-gray-300">
                  <div className="border border-black px-1 py-0.5">BPS TRANSIT</div>
                </th>
                <th className="px-3 py-2 font-bold border border-gray-300">NON-BPS TRANSIT</th>
                <th className="px-3 py-2 font-bold border border-gray-300">MINING (LTRS)</th>
                <th className="px-3 py-2 font-bold border border-gray-300">TRANSSHIPMENT (LTRS)</th>
                <th className="px-3 py-2 font-bold border border-gray-300">AWAITING FOR OUTTURN (LTRS)</th>
                <th className="px-3 py-2 font-bold border border-gray-300">TOTAL (LTRS)</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-yellow-50'}>
                  <td className="px-3 py-2 border border-gray-200 text-center">{item.sn}</td>
                  <td className="px-3 py-2 border border-gray-200 font-medium">{item.depot_name}</td>
                  <td className="px-3 py-2 border border-gray-200 text-center">{item.date}</td>
                  <td className="px-3 py-2 border border-gray-200 text-center">{item.product}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{fmt(item.local_ltrs)}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{fmt(item.bps_transit_ltrs)}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{fmt(item.non_bps_transit_ltrs)}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{fmt(item.mining_ltrs)}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{fmt(item.transshipment_ltrs)}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{fmt(item.awaiting_outturn_ltrs)}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right font-bold">{fmt(item.total_ltrs)}</td>
                </tr>
              ))}
              <tr className="bg-yellow-100 font-bold">
                <td colSpan={2} className="px-3 py-2 border border-gray-300 text-center">TOTAL</td>
                <td colSpan={8} className="border border-gray-300"></td>
                <td className="px-3 py-2 border border-gray-300 text-right font-bold">{grandTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {report.notes && (
        <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700">{report.notes}</p>
        </div>
      )}
    </div>
  );
};
