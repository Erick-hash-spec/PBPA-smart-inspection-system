import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  productReceiptCertificateService,
  shoreTankCalculationService,
  sealIsolationReportService,
  inspectionService,
  stockReportService,
  clientSign,
} from '../services/api';
import { SignatureModal } from '../components/SignaturePad';
import {
  ClipboardList, Shield, Calculator, Award, Package,
  PenLine, RefreshCw, FileText, ConciergeBell,
} from 'lucide-react';

const TABS = [
  { key: 'dip',   label: 'Dip Tickets',          icon: ClipboardList, accent: '#2563EB', bg: '#DBEAFE', endpoint: null },
  { key: 'sir',   label: 'Seal & Isolation',      icon: Shield,        accent: '#16A34A', bg: '#DCFCE7', endpoint: 'seal-isolation-reports' },
  { key: 'stc',   label: 'Shore Tank Calcs',      icon: Calculator,    accent: '#0891B2', bg: '#CFFAFE', endpoint: 'shore-tank-calculations' },
  { key: 'prc',   label: 'Product Receipt Certs', icon: Award,         accent: '#9333EA', bg: '#F3E8FF', endpoint: 'product-receipt-certificates' },
  { key: 'stock', label: 'Stock Reports',         icon: Package,       accent: '#7C3AED', bg: '#EDE9FE', endpoint: null },
];

const SIGNABLE = new Set(['sir', 'stc', 'prc']);

const StepBadge = ({ step }) => {
  const map = {
    sent_to_client: { label: 'Awaiting Your Signature', cls: 'bg-amber-100 text-amber-800' },
    client_signed:  { label: 'Signed', cls: 'bg-green-100 text-green-800' },
    draft:          { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  };
  const m = map[step] || { label: step || '—', cls: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${m.cls}`}>{m.label}</span>;
};

export const ClientDashboardPage = () => {
  const navigate = useNavigate();
  const [tab, setTab]               = useState('dip');
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sigTarget, setSigTarget]   = useState(null);
  const [sigLoading, setSigLoading] = useState(false);
  const [error, setError]           = useState('');

  const fetchRows = useCallback(async () => {
    setLoading(true); setError('');
    try {
      let data = [];
      const params = { signing_step: 'sent_to_client' };
      if (tab === 'dip')   { const r = await inspectionService.getInspections(params);                data = r.data.results ?? r.data; }
      if (tab === 'sir')   { const r = await sealIsolationReportService.getReports(params);            data = r.data.results ?? r.data; }
      if (tab === 'stc')   { const r = await shoreTankCalculationService.getCalculations(params);      data = r.data.results ?? r.data; }
      if (tab === 'prc')   { const r = await productReceiptCertificateService.getCertificates(params); data = r.data.results ?? r.data; }
      if (tab === 'stock') { const r = await stockReportService.getReports();                          data = r.data.results ?? r.data; }
      setRows(data);
    } catch { setError('Failed to load documents.'); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  const handleSignConfirm = async (dataUrl) => {
    if (!sigTarget) return;
    setSigLoading(true);
    try {
      const res = await clientSign(sigTarget.endpoint, sigTarget.id, dataUrl);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `Signed_${sigTarget.number}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setSigTarget(null);
      fetchRows();
    } catch (err) {
      setError('Signing failed: ' + (err.response?.data?.detail || err.message));
    } finally { setSigLoading(false); }
  };

  const docNumber = (r) =>
    r.ticket_number || r.report_number || r.calculation_number || r.certificate_number || String(r.id);

  const vesselName = (r) => r.vessel_name || r.tank_no || '—';

  const currentTab = TABS.find(t => t.key === tab);

  return (
    <div className="bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Documents to Sign</h1>
            <p className="text-gray-500 text-sm mt-0.5">Inspection reports sent to you for signature as Terminal Representative</p>
          </div>
          <button
            onClick={() => navigate('/service-requests')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#8B1A1A] hover:bg-[#7a1717] transition"
          >
            <ConciergeBell className="w-4 h-4" /> Request Service
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-5 items-center">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  active ? 'text-white border-transparent shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
                style={active ? { background: t.accent } : {}}>
                <Icon className="w-4 h-4" style={{ color: active ? '#fff' : t.accent }} />
                {t.label}
              </button>
            );
          })}
          <button onClick={fetchRows} className="ml-auto p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
        )}

        {/* Document list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No documents awaiting your signature</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {rows.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: currentTab?.bg }}>
                      {currentTab && <currentTab.icon className="w-4 h-4" style={{ color: currentTab.accent }} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">#{docNumber(r)} — {vesselName(r)}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {r.terminal || ''}{r.terminal ? ' · ' : ''}
                        {r.receipt_date || r.report_date || r.calculation_date || r.inspection_date?.split('T')[0] || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StepBadge step={r.signing_step} />
                    {SIGNABLE.has(tab) && r.signing_step === 'sent_to_client' && (
                      <button
                        onClick={() => setSigTarget({ id: r.id, number: docNumber(r), endpoint: currentTab.endpoint })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#8B1A1A] hover:bg-[#7a1717] transition"
                      >
                        <PenLine className="w-3.5 h-3.5" /> Sign
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SignatureModal
          open={!!sigTarget}
          onClose={() => setSigTarget(null)}
          onConfirm={handleSignConfirm}
          loading={sigLoading}
          title="Sign Document"
          signerLabel={sigTarget ? `${currentTab?.label} #${sigTarget.number}` : ''}
        />
      </div>
    </div>
  );
};
