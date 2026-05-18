import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  vesselReportService,
  submissionService,
  inspectionService,
  sealIsolationReportService,
  shoreTankCalculationService,
  productReceiptCertificateService,
} from '../services/api';
import { Ship, Plus, Eye, CheckCircle, Clock, Zap, Search, Download, Printer, XCircle } from 'lucide-react';
import { useDarkMode } from '../contexts/DarkModeContext';

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-600 text-sm transition';

const Section = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-6 hover-lift">
    <h2 className="text-base font-bold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">{title}</h2>
    {children}
  </div>
);

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

const printBlob = (blob) => {
  const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.focus();
      win.print();
    };
  }
};

/* ─── List Page ─────────────────────────────────────────────────────────── */
export const VesselReportListPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLoading(true);
    vesselReportService.getReports().then(r => setReports(r.data.results || r.data)).finally(() => setLoading(false));
  }, []);

  const filteredReports = reports.filter(r =>
    r.vessel_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.report_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.terminal?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownloadPdf = async (report) => {
    const res = await vesselReportService.downloadPdf(report.id);
    downloadBlob(res.data, `Vessel_Report_${report.report_number}.pdf`);
  };

  const handlePrintPdf = async (report) => {
    const res = await vesselReportService.downloadPdf(report.id);
    printBlob(res.data);
  };

  const handleCancelReport = async (report) => {
    if (!window.confirm('Cancel this vessel report?')) return;
    const res = await vesselReportService.cancelReport(report.id);
    setReports(prev => prev.map(r => (r.id === report.id ? res.data : r)));
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Ship className="w-8 h-8 text-[#8B1A1A]" />
            Vessel Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Discharge summary reports per vessel</p>
        </div>
        <button onClick={() => navigate('/vessel-reports/new')} className="inline-flex items-center gap-2 bg-gradient-to-r from-[#8B1A1A] to-[#a52020] hover:shadow-lg text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition hover-lift">
          <Plus className="w-4 h-4" />New Report
</button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search by vessel, report, terminal, or product..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-[#8B1A1A] dark:focus:border-[#a52020] transition"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" /></div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm dark:shadow-lg border border-gray-100 dark:border-gray-700 p-16 text-center hover-lift">
          <Ship className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No vessel reports found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{searchQuery ? 'No matching results' : 'Create your first vessel report to get started'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReports.map(r => (
            <div key={r.id} className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl shadow-sm dark:shadow-lg border border-blue-200 dark:border-blue-700 p-6 hover-lift cursor-pointer group" onClick={() => navigate(`/vessel-reports/${r.id}`)}>
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8B1A1A] to-[#a52020] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Ship className="w-6 h-6 text-white" />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                  r.status === 'final'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : r.status === 'cancelled'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                }`}>
                  {r.status === 'final' ? <>Final</> : r.status === 'cancelled' ? <>Cancelled</> : <>Draft</>}
</span>
              </div>
              <div className="mb-3">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{r.vessel_name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">#{r.report_number}</p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-gray-700 dark:text-gray-300"><strong>Terminal:</strong> {r.terminal}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Product:</strong> {r.product_name}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Date:</strong> {r.discharge_date}</p>
                <p className="text-gray-600 dark:text-gray-400 text-xs"><strong>Weight:</strong> {r.total_weight_mt} MT · <strong>Volume:</strong> {r.total_volume_m3} m³</p>
              </div>
              <div className="flex gap-2 mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <button onClick={(e) => {e.stopPropagation();navigate(`/vessel-reports/${r.id}`);}} className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition hover-scale">View
</button>
                <button onClick={(e) => {e.stopPropagation();handleDownloadPdf(r);}} className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition hover-scale">PDF
</button>
                <button onClick={(e) => {e.stopPropagation();handlePrintPdf(r);}} className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition hover-scale">Print
</button>
                {r.status === 'draft' && (
                  <button onClick={(e) => {e.stopPropagation();navigate(`/vessel-reports/${r.id}/edit`);}} className="flex-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition hover-scale">Edit
</button>
                )}
                {r.status !== 'cancelled' && (
                  <button onClick={(e) => {e.stopPropagation();handleCancelReport(r);}} className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition hover-scale">Cancel
</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Form Page ─────────────────────────────────────────────────────────── */
export const VesselReportFormPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const { isDarkMode } = useDarkMode();

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError]             = useState('');
  const [autoFilling, setAutoFilling] = useState(false);

  const [form, setForm] = useState({
    vessel_name: '', terminal: '', product_name: '',
    discharge_date: new Date().toISOString().split('T')[0],
    total_weight_mt: '', total_volume_m3: '', remarks: '',
    dip_ticket_ids: [], seal_report_ids: [], shore_calc_ids: [], cert_ids: [],
  });

  useEffect(() => {
    submissionService.getSubmissions().then(r => setSubmissions(r.data.results || r.data));
    if (isEdit) {
      vesselReportService.getReportById(id).then(r => {
        const d = r.data;
        setForm({
          vessel_name: d.vessel_name, terminal: d.terminal, product_name: d.product_name,
          discharge_date: d.discharge_date, total_weight_mt: d.total_weight_mt,
          total_volume_m3: d.total_volume_m3, remarks: d.remarks,
          dip_ticket_ids: d.dip_ticket_ids, seal_report_ids: d.seal_report_ids,
          shore_calc_ids: d.shore_calc_ids, cert_ids: d.cert_ids,
        });
      }).finally(() => setPageLoading(false));
    }
  }, [id]); // eslint-disable-line

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const toggleId = (field, docId) => {
    setForm(p => {
      const arr = p[field];
      return { ...p, [field]: arr.includes(docId) ? arr.filter(x => x !== docId) : [...arr, docId] };
    });
  };

  const handleAutoFill = async () => {
    const linkedCount =
      form.dip_ticket_ids.length +
      form.seal_report_ids.length +
      form.shore_calc_ids.length +
      form.cert_ids.length;

    if (linkedCount === 0) {
      setError('Please link at least one submitted document first.');
      return;
    }

    setError('');
    setAutoFilling(true);

    try {
      let vessel_name = '', terminal = '', product_name = '';
      let total_weight_mt = 0, total_volume_m3 = 0;
      let loadedCount = 0;
      const failedDocs = [];

      const applyCommonFields = (d = {}) => {
        if (!vessel_name && d.vessel_name) vessel_name = d.vessel_name;
        if (!terminal && d.terminal) terminal = d.terminal;
        if (!product_name && d.product_name) product_name = d.product_name;
      };

      submissions
        .filter(sub => {
          const field = fieldForType[sub.doc_type];
          return field && form[field].includes(sub.doc_id);
        })
        .forEach(applyCommonFields);

      const fetchDocs = async (ids, fetcher, applyDoc) => {
        for (const docId of ids) {
          try {
            const res = await fetcher(docId);
            loadedCount += 1;
            applyDoc(res.data || {});
          } catch {
            failedDocs.push(docId);
            // Continue with the other linked documents; one missing source should not block autofill.
          }
        }
      };

      await fetchDocs(form.dip_ticket_ids, inspectionService.getInspectionById, (d) => {
        applyCommonFields(d);
        if (Number(d.meter_reading_mts || 0) > 0) total_weight_mt += Number(d.meter_reading_mts || 0);
        if (Number(d.meter_reading_at_20 || 0) > 0) total_volume_m3 += Number(d.meter_reading_at_20 || 0);
      });

      await fetchDocs(form.seal_report_ids, sealIsolationReportService.getReportById, applyCommonFields);

      await fetchDocs(form.shore_calc_ids, shoreTankCalculationService.getCalculationById, (d) => {
        applyCommonFields(d);
        total_weight_mt += Number(d.terminal_weight_air_mt || 0);
        total_volume_m3 += Number(d.terminal_standard_volume_m3 || 0);
      });

      await fetchDocs(form.cert_ids, productReceiptCertificateService.getCertificateById, (d) => {
        applyCommonFields(d);
        if (!product_name && Array.isArray(d.items)) {
          product_name = d.items.find(item => item.product_name)?.product_name || '';
        }
        total_weight_mt += Number(d.total_weight_tonnage || 0);
        total_volume_m3 += Number(d.total_volume_liters || 0) / 1000;
      });

      if (loadedCount === 0 && !vessel_name && !terminal && !product_name) {
        setError('Auto-fill could not load the linked documents. Please check the selected submissions.');
        return;
      }

      setForm(p => ({
        ...p,
        vessel_name:     vessel_name  || p.vessel_name,
        terminal:        terminal     || p.terminal,
        product_name:    product_name || p.product_name,
        total_weight_mt: total_weight_mt > 0 ? total_weight_mt.toFixed(3) : p.total_weight_mt,
        total_volume_m3: total_volume_m3 > 0 ? total_volume_m3.toFixed(3) : p.total_volume_m3,
      }));

      if (failedDocs.length > 0 && loadedCount === 0) {
        setError('Auto-filled vessel details from the selected submissions, but totals could not be loaded from the source documents.');
      }
    } catch {
      setError('Auto-fill failed. Please fill manually.');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...form, total_weight_mt: Number(form.total_weight_mt || 0), total_volume_m3: Number(form.total_volume_m3 || 0) };
      if (isEdit) { await vesselReportService.updateReport(id, payload); navigate(`/vessel-reports/${id}`); }
      else { const r = await vesselReportService.createReport(payload); navigate(`/vessel-reports/${r.data.id}`); }
    } catch (err) { setError(err.response?.data?.detail || 'Failed to save vessel report'); }
    finally { setLoading(false); }
  };

  const byType = (type) => submissions.filter(s => s.doc_type === type);
  const fieldForType = { dip_ticket: 'dip_ticket_ids', seal_isolation: 'seal_report_ids', shore_tank: 'shore_calc_ids', product_receipt: 'cert_ids' };

  if (pageLoading) return <div className="flex justify-center items-center min-h-screen"><div className="w-10 h-10 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button onClick={() => navigate('/vessel-reports')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 flex items-center gap-1">← Back to Reports</button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">{isEdit ? 'Edit Vessel Report' : 'New Vessel Report'}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Create a discharge summary report after a vessel completes its discharge</p>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl mb-5 text-sm flex gap-2 hover-lift">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Link Submitted Documents">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Select the submitted documents for this vessel, then click <strong>Auto-Fill</strong> to populate vessel details automatically:</p>
          {[
            ['dip_ticket',      'Dip Tickets'],
            ['seal_isolation',  'Seal & Isolation Reports'],
            ['shore_tank',      'Shore Tank Calculations'],
            ['product_receipt', 'Product Receipt Certificates'],
          ].map(([type, label]) => {
            const docs = byType(type);
            const field = fieldForType[type];
            if (docs.length === 0) return null;
            return (
              <div key={type} className="mb-4">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">{label}</p>
                <div className="space-y-1.5">
                  {docs.map(sub => (
                    <label key={sub.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                      <input type="checkbox" checked={form[field].includes(sub.doc_id)} onChange={() => toggleId(field, sub.doc_id)} className="w-4 h-4 accent-[#8B1A1A]" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">#{sub.doc_number} — {sub.vessel_name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {submissions.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 italic">No submitted documents found.</p>}
        </Section>

        <Section title="Vessel Details">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">Link documents first, then click Auto-Fill to populate fields automatically.</p>
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={autoFilling || (
                form.dip_ticket_ids.length === 0 &&
                form.seal_report_ids.length === 0 &&
                form.shore_calc_ids.length === 0 &&
                form.cert_ids.length === 0
              )}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition hover-lift"
            >
              <Zap className="w-3.5 h-3.5" />
              {autoFilling ? 'Filling…' : 'Auto-Fill'}
</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Vessel Name','vessel_name','text',true],['Terminal','terminal','text',true],['Product','product_name','text',false],['Discharge Date','discharge_date','date',true]].map(([label,name,type,req]) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{label}{req && <span className="text-red-500 ml-1">*</span>}</label>
                <input type={type} name={name} value={form[name]} onChange={handleChange} required={req} className={inputCls} />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Total Weight (MT)</label>
              <input type="number" step="0.001" name="total_weight_mt" value={form.total_weight_mt} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Total Volume (m³)</label>
              <input type="number" step="0.001" name="total_volume_m3" value={form.total_volume_m3} onChange={handleChange} className={inputCls} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Remarks</label>
            <textarea name="remarks" value={form.remarks} onChange={handleChange} rows="3" className={inputCls} />
          </div>
        </Section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-gradient-to-r from-[#8B1A1A] to-[#a52020] hover:shadow-lg text-white px-8 py-3 rounded-xl font-semibold disabled:opacity-50 transition hover-lift">
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Report'}
</button>
          <button type="button" onClick={() => navigate('/vessel-reports')} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition">Cancel</button>
        </div>
      </form>
    </div>
  );
};

/* ─── Detail Page ───────────────────────────────────────────────────────── */
export const VesselReportDetailPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const { isDarkMode } = useDarkMode();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vesselReportService.getReportById(id).then(r => setReport(r.data)).finally(() => setLoading(false));
  }, [id]);

  const handleFinalize = async () => {
    await vesselReportService.finalizeReport(id);
    setReport(p => ({ ...p, status: 'final' }));
  };

  const handleCancelReport = async () => {
    if (!window.confirm('Cancel this vessel report?')) return;
    const res = await vesselReportService.cancelReport(id);
    setReport(res.data);
  };

  const handleDownloadPdf = async () => {
    const res = await vesselReportService.downloadPdf(id);
    downloadBlob(res.data, `Vessel_Report_${report.report_number}.pdf`);
  };

  const handlePrintPdf = async () => {
    const res = await vesselReportService.downloadPdf(id);
    printBlob(res.data);
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-10 h-10 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin" /></div>;
  if (!report) return <div className="p-8 text-gray-500 dark:text-gray-400">Report not found</div>;

  const Field = ({ label, value }) => (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-100 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">{value || '—'}</p>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => navigate('/vessel-reports')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 flex items-center gap-1">← Back to Reports</button>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Ship className="w-8 h-8 text-[#8B1A1A]" />
            Vessel Report
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">#{report.report_number} · {report.vessel_name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDownloadPdf} className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition hover-lift">Download
</button>
          <button onClick={handlePrintPdf} className="inline-flex items-center gap-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition hover-lift">Print
</button>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
            report.status === 'final'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
              : report.status === 'cancelled'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
          }`}>
            {report.status === 'final' ? <>Final</> : report.status === 'cancelled' ? <>Cancelled</> : <>Draft</>}
</span>
          {report.status === 'draft' && (
            <>
              <button onClick={() => navigate(`/vessel-reports/${id}/edit`)} className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition hover-lift">Edit</button>
              <button onClick={handleFinalize} className="bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:shadow-lg transition hover-lift">Finalize</button>
            </>
          )}
          {report.status !== 'cancelled' && (
            <button onClick={handleCancelReport} className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition hover-lift">Cancel
</button>
          )}
        </div>
      </div>

      <Section title="Vessel Details">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Vessel Name"    value={report.vessel_name} />
          <Field label="Terminal"       value={report.terminal} />
          <Field label="Product"        value={report.product_name} />
          <Field label="Discharge Date" value={report.discharge_date} />
          <Field label="Total Weight"   value={`${report.total_weight_mt} MT`} />
          <Field label="Total Volume"   value={`${report.total_volume_m3} m³`} />
        </div>
        {report.remarks && (
          <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Remarks</p>
            <p className="text-sm text-blue-900 dark:text-blue-100">{report.remarks}</p>
          </div>
        )}
      </Section>

      <Section title="Linked Documents">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {label: 'Dip Tickets', ids: report.dip_ticket_ids, color: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'},
            {label: 'Seal Reports', ids: report.seal_report_ids, color: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20'},
            {label: 'Shore Calcs', ids: report.shore_calc_ids, color: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20'},
            {label: 'Certificates', ids: report.cert_ids, color: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20'}
          ].map(({label, ids, color}) => (
            <div key={label} className={`bg-gradient-to-br ${color} rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 hover-lift`}>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{ids?.length || 0}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{label}</p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};
