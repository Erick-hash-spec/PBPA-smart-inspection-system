import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { provisionalOuturnService } from '../services/api';
import { ChevronLeft } from 'lucide-react';
import { SubmitModal } from '../components/SubmitModal';

const f3 = (v) => (v == null ? '—' : Number(v).toFixed(3));
const fPct = (v) => (v == null ? '—' : `${Number(v).toFixed(3)}%`);

const TH = ({ children, center, colSpan, rowSpan, className = '' }) => (
  <th
    colSpan={colSpan}
    rowSpan={rowSpan}
    className={`px-3 py-2.5 text-xs font-bold uppercase tracking-wide border border-amber-500 bg-amber-700 text-white ${center ? 'text-center' : 'text-left'} ${className}`}
  >
    {children}
  </th>
);

const TD = ({ children, center, blue, bold, className = '' }) => (
  <td className={`px-3 py-2.5 text-sm border border-gray-200 whitespace-nowrap
    ${center ? 'text-center' : 'text-right'}
    ${blue ? 'text-blue-700 font-semibold bg-blue-50' : 'text-gray-800'}
    ${bold ? 'font-bold' : ''}
    ${className}`}>
    {children}
  </td>
);

const ProvisionalOutturnReportDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => { loadReport(); }, [id]); // eslint-disable-line

  const loadReport = async () => {
    try {
      const data = await provisionalOuturnService.retrieve(id);
      setReport(data);
    } catch (err) {
      setError('Failed to load report: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await provisionalOuturnService.generatePDF(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `POR_${report.report_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download PDF'); }
    finally { setDownloading(false); }
  };

  const handleFinalize = async () => {
    try {
      const data = await provisionalOuturnService.finalize(id);
      setReport(data);
    } catch (err) { setError(err.response?.data?.detail || 'Failed to finalize'); }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-10 h-10 border-4 border-amber-100 border-t-amber-700 rounded-full animate-spin" />
    </div>
  );

  if (!report) return <div className="p-8 text-red-600">{error || 'Report not found'}</div>;

  const items = report.items || [];
  const totals = report.totals || {};
  const isFinal = report.status === 'final';

  const totDiffVol = ((totals.shore_volume || 0) - (totals.ship_volume || 0));
  const totDiffVolPct = totals.ship_volume ? (totDiffVol / totals.ship_volume * 100) : 0;
  const totDiffWt  = ((totals.shore_weight || 0) - (totals.ship_weight || 0));
  const totDiffWtPct = totals.ship_weight ? (totDiffWt / totals.ship_weight * 100) : 0;

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto animate-fade-in">

      {submitOpen && (
        <SubmitModal
          docType="Provisional Outturn Report"
          docTypeKey="provisional_outturn"
          docId={report.id}
          docNumber={report.report_number}
          vesselName={report.vessel_name}
          terminal={report.port || ''}
          onDownload={handleDownloadPdf}
          onClose={() => setSubmitOpen(false)}
        />
      )}

      {/* ── Page header ── */}
      <button onClick={() => navigate('/provisional-outturn-reports')}
        className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline mb-4">
        <ChevronLeft className="w-4 h-4" />Back
</button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Provisional Outturn Report</h1>
          <p className="text-gray-500 text-sm mt-1">
            #{report.report_number} · {report.report_date}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${isFinal ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
            {isFinal ? <>Final</> : <>Draft</>}
</span>
          {!isFinal && (
            <>
              <button onClick={() => navigate(`/provisional-outturn-reports/${id}/edit`)}
                className="bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-amber-100 transition">Edit
</button>
              <button onClick={handleFinalize}
                className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition">Finalize
</button>
            </>
          )}
          <button onClick={handleDownloadPdf} disabled={downloading}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">{downloading ? 'Downloading…' : 'Download'}
</button>
          {isFinal && (
            <button onClick={() => setSubmitOpen(true)}
              className="inline-flex items-center gap-2 bg-[#8B1A1A] hover:bg-[#7a1717] text-white text-sm font-semibold px-4 py-2 rounded-lg transition">Submit
</button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>}

      {/* ── Vessel info ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Vessel', report.vessel_name],
            ['Date',   report.report_date],
            ['Port',   report.port],
            ['Product', report.product],
            ['Captain / Chief Officer', report.captain_name],
            ['PBPA Surveyor', report.surveyor_name],
          ].map(([label, value]) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-bold text-gray-900">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Summary table ── */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest">Provisional Outturn Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <TH rowSpan={2} className="w-40">Terminal / Item</TH>
                <TH colSpan={2} center>Ship Figures</TH>
                <TH colSpan={2} center>Shore Figures</TH>
                <TH colSpan={4} center>Difference</TH>
              </tr>
              <tr>
                <TH center>Vol (m³)</TH>
                <TH center>Wgt (MT)</TH>
                <TH center>Vol (m³)</TH>
                <TH center>Wgt (MT)</TH>
                <TH center>Vol (m³)</TH>
                <TH center>%Diff Vol</TH>
                <TH center>Wgt (MT)</TH>
                <TH center>%Diff Wgt</TH>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                  <td className="px-3 py-2.5 text-sm font-semibold text-gray-800 border border-gray-200 whitespace-nowrap">
                    {item.terminal_name}
                  </td>
                  <TD center>{f3(item.ship_volume_m3)}</TD>
                  <TD center>{f3(item.ship_weight_mt)}</TD>
                  <TD center>{f3(item.shore_volume_m3)}</TD>
                  <TD center>{f3(item.shore_weight_mt)}</TD>
                  <TD center blue>{f3(item.diff_volume_m3)}</TD>
                  <TD center blue>{fPct(item.diff_volume_pct)}</TD>
                  <TD center blue>{f3(item.diff_weight_mt)}</TD>
                  <TD center blue>{fPct(item.diff_weight_pct)}</TD>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-amber-50 border-t-2 border-amber-300">
                <td className="px-3 py-3 text-sm font-bold text-gray-900 border border-gray-300">TOTAL</td>
                <TD center bold>{f3(totals.ship_volume)}</TD>
                <TD center bold>{f3(totals.ship_weight)}</TD>
                <TD center bold>{f3(totals.shore_volume)}</TD>
                <TD center bold>{f3(totals.shore_weight)}</TD>
                <TD center bold blue>{f3(totDiffVol)}</TD>
                <TD center bold blue>{fPct(totDiffVolPct)}</TD>
                <TD center bold blue>{f3(totDiffWt)}</TD>
                <TD center bold blue>{fPct(totDiffWtPct)}</TD>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Signatures ── */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-6">Captain / Chief Officer</p>
            <div className="border-b-2 border-gray-400 mb-2 h-12" />
            <p className="text-sm font-semibold text-gray-700">{report.captain_name || '___________________________'}</p>
            <p className="text-xs text-gray-400">Signature &amp; Stamp</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-6">PBPA Surveyor</p>
            <div className="border-b-2 border-gray-400 mb-2 h-12" />
            <p className="text-sm font-semibold text-gray-700">{report.surveyor_name || '___________________________'}</p>
            <p className="text-xs text-gray-400">Signature &amp; Stamp</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ProvisionalOutturnReportDetailPage;
