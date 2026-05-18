import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  inspectionService,
  productReceiptCertificateService,
  provisionalOuturnService,
  sealIsolationReportService,
  shoreTankCalculationService,
  stockReportService,
  submissionService,
} from '../services/api';
import { Bell, CheckCheck, Download, Eye, FileText, Lock, Printer, Ruler, ClipboardList, Package, ShipWheel } from 'lucide-react';

const DOC_TYPE_CONFIG = {
  dip_ticket:      { label: 'Dip Ticket',               icon: ClipboardList, color: 'text-blue-600',   bg: 'bg-blue-50',   href: (id) => `/inspections/${id}` },
  seal_isolation:  { label: 'Seal & Isolation Report',  icon: Lock,          color: 'text-purple-600', bg: 'bg-purple-50', href: (id) => `/seal-isolation-reports/${id}` },
  product_receipt: { label: 'Product Receipt Cert.',    icon: FileText,      color: 'text-amber-600',  bg: 'bg-amber-50',  href: (id) => `/product-receipt-certificates/${id}` },
  shore_tank:      { label: 'Shore Tank Calculation',   icon: Ruler,         color: 'text-teal-600',   bg: 'bg-teal-50',   href: (id) => `/shore-tank-calculations/${id}` },
  stock_report:    { label: 'Stock Report',             icon: Package,       color: 'text-emerald-600', bg: 'bg-emerald-50', href: (id) => `/stock-reports/${id}` },
  provisional_outturn: { label: 'Provisional Outturn',   icon: ShipWheel,     color: 'text-indigo-600', bg: 'bg-indigo-50', href: (id) => `/provisional-outturn-reports/${id}` },
};

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

export const SubmissionsInboxPage = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState('');

  useEffect(() => { fetchSubmissions(); }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await submissionService.getSubmissions();
      setSubmissions(res.data.results || res.data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleMarkRead = async (id) => {
    await submissionService.markRead(id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, is_read: true } : s));
  };

  const handleMarkAllRead = async () => {
    await submissionService.markAllRead();
    setSubmissions(prev => prev.map(s => ({ ...s, is_read: true })));
  };

  const handleView = async (sub) => {
    if (!sub.is_read) await handleMarkRead(sub.id);
    const cfg = DOC_TYPE_CONFIG[sub.doc_type];
    if (cfg) navigate(cfg.href(sub.doc_id));
  };

  const fetchSubmissionPdf = async (sub) => {
    if (sub.doc_type === 'dip_ticket') {
      const res = await inspectionService.generateDocument(sub.doc_id);
      return res.data;
    }
    if (sub.doc_type === 'seal_isolation') {
      const res = await sealIsolationReportService.generateDocument(sub.doc_id);
      return res.data;
    }
    if (sub.doc_type === 'shore_tank') {
      const res = await shoreTankCalculationService.generateDocument(sub.doc_id);
      return res.data;
    }
    if (sub.doc_type === 'product_receipt') {
      const res = await productReceiptCertificateService.downloadCertificatePdf(sub.doc_id);
      return res.data;
    }
    if (sub.doc_type === 'stock_report') {
      const res = await stockReportService.downloadPdf(sub.doc_id);
      return res.data;
    }
    if (sub.doc_type === 'provisional_outturn') {
      return provisionalOuturnService.generatePDF(sub.doc_id);
    }
    throw new Error('No printable document is available for this submission type.');
  };

  const handleDownload = async (sub) => {
    try {
      const blob = await fetchSubmissionPdf(sub);
      if (!sub.is_read) await handleMarkRead(sub.id);
      downloadBlob(blob, `${sub.doc_type}_${sub.doc_number || sub.doc_id}.pdf`);
    } catch {
      window.alert('Failed to download this report.');
    }
  };

  const handlePrint = async (sub) => {
    try {
      const blob = await fetchSubmissionPdf(sub);
      if (!sub.is_read) await handleMarkRead(sub.id);
      printBlob(blob);
    } catch {
      window.alert('Failed to print this report.');
    }
  };

  const filtered = filter ? submissions.filter(s => s.doc_type === filter) : submissions;
  const unread   = submissions.filter(s => !s.is_read).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-gray-900">Inspection Reports</h1>
            {unread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">{unread}</span>
            )}
          </div>
          <p className="text-gray-500 text-sm">Documents submitted by inspectors for PBPA review</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={handleMarkAllRead} className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition">
              <CheckCheck className="w-4 h-4" />Mark all read
</button>
          )}
          <button onClick={() => navigate('/vessel-reports/new')} className="inline-flex items-center gap-2 bg-[#8B1A1A] hover:bg-[#7a1717] text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
            + New Vessel Report
</button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-2xl shadow-sm p-3 mb-6 flex flex-wrap gap-2">
        {[['', 'All'], ['dip_ticket', 'Dip Tickets'], ['seal_isolation', 'Seal & Isolation'], ['product_receipt', 'Certificates'], ['shore_tank', 'Shore Tank'], ['stock_report', 'Stock'], ['provisional_outturn', 'Outturn']].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === key ? 'bg-[#8B1A1A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-semibold">No submissions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(sub => {
            const cfg = DOC_TYPE_CONFIG[sub.doc_type] || DOC_TYPE_CONFIG.dip_ticket;
            const Icon = cfg.icon;
            return (
              <div key={sub.id} className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 transition hover:shadow-md ${!sub.is_read ? 'border-l-4 border-[#8B1A1A]' : ''}`}>
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900">{cfg.label}</span>
                    <span className="text-xs text-gray-400">#{sub.doc_number}</span>
                    {!sub.is_read && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">New</span>}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{sub.vessel_name} {sub.terminal ? `— ${sub.terminal}` : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Submitted by {sub.submitted_by_name || 'Inspector'} · {new Date(sub.submitted_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleView(sub)} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">View
</button>
                  <button onClick={() => handleDownload(sub)} className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 transition">PDF
</button>
                  <button onClick={() => handlePrint(sub)} className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Print
</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
