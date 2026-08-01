import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shoreTankCalculationService } from '../services/api';
import { ChevronLeft } from 'lucide-react';
import { SigningActions } from '../components/SigningActions';

const f  = (v, d = 3) => (v == null || v === '') ? '—' : Number(v).toFixed(d);
const f4 = (v) => f(v, 4);
const f3 = (v) => f(v, 3);

// ── shared sub-components ────────────────────────────────────────────────────

const Card = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-2xl shadow-base p-6 md:p-8 mb-6 animate-slide-up">
    {title && (
      <div className="mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-1">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const HField = ({ label, value, blue, highlight }) => (
  <div className={`rounded-lg p-3 transition-colors ${highlight ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
    <p className={`text-sm font-bold ${blue ? 'text-blue-700' : 'text-gray-900'}`}>{value ?? '—'}</p>
  </div>
);

// ── table cell helpers ───────────────────────────────────────────────────────

const TH = ({ children, right }) => (
  <th className={`px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-50 border-b border-gray-200 ${right ? 'text-right' : 'text-left'}`}>
    {children}
  </th>
);

const TD = ({ children, blue, bold, center, right, sub, highlight }) => (
  <td className={`px-4 py-3 text-sm border-b border-gray-100 transition-colors
    ${blue   ? 'text-blue-700 font-semibold' : 'text-gray-700'}
    ${bold   ? 'font-bold text-gray-900' : ''}
    ${right  ? 'text-right' : ''}
    ${center ? 'text-center' : ''}
    ${sub    ? 'text-xs text-gray-500 uppercase tracking-widest bg-gray-50 font-bold' : ''}
    ${highlight ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}
  `}>
    {children}
  </td>
);

const SummaryBox = ({ label, value, color = 'blue' }) => {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    red: 'bg-red-50 border-red-100 text-red-700',
  };
  
  return (
    <div className={`rounded-lg border p-4 text-center ${colorMap[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-2">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};

// ── main component ───────────────────────────────────────────────────────────

export const ShoreTankCalculationDetailPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [calc, setCalc]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const userRole = localStorage.getItem('user_role');

  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const load = async () => {
    setLoading(true);
    try { const res = await shoreTankCalculationService.getCalculationById(id); setCalc(res.data); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to load calculation'); }
    finally { setLoading(false); }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    try { await shoreTankCalculationService.finalizeCalculation(id); load(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to finalize'); }
    finally { setFinalizing(false); }
  };

  const handleDoc = async () => {
    try {
      const res = await shoreTankCalculationService.generateDocument(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `Shore_Tank_Calc_${calc.calculation_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to generate document'); }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading calculation...</p>
      </div>
    </div>
  );

  if (!calc) return (
    <div className="p-8 max-w-4xl mx-auto">
      <p className="text-red-600 mb-4">{error || 'Calculation not found'}</p>
      <button onClick={() => navigate('/shore-tank-calculations')} className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold">
        <ChevronLeft className="w-4 h-4" />Back
</button>
    </div>
  );

  const items = calc.tank_items || [];
  const isFinal = calc.status === 'final';
  const isDraft = calc.status === 'draft';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <button onClick={() => navigate('/shore-tank-calculations')} className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />Back
</button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Shore Tank Calculation
            </h1>
            <p className="text-gray-500 text-sm md:text-base">
              #{calc.calculation_number} • {calc.vessel_name} • {calc.product_name}
            </p>
            <p className="text-gray-400 text-xs md:text-sm mt-1">{calc.terminal}</p>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {isFinal ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">Finalized
</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Draft
</span>
            )}

            {isDraft && (
              <button onClick={() => navigate(`/shore-tank-calculations/${id}/edit`)} className="px-4 py-2 rounded-lg text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">Edit
</button>
            )}
            
            {isDraft && (
              <button onClick={handleFinalize} disabled={finalizing} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors">
                {finalizing ? 'Finalizing…' : 'Finalize'}
</button>
            )}

            {isFinal && (
              <button
                onClick={() => navigate(`/product-receipt-certificates/new?from_stc=${id}`)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              >Create Certificate
</button>
            )}

            <button onClick={handleDoc} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors inline-flex items-center gap-2">Document
</button>

            {calc.is_signed && (
              <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200 cursor-help" title={`Signed by ${calc.signed_by_name || 'PBPA'} on ${calc.signed_at ? new Date(calc.signed_at).toLocaleString() : ''}`}>Signed</span>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* WORKBOOK HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Card title="Workbook Header">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HField label="Calculation No." value={calc.calculation_number} />
          <HField label="Date" value={calc.calculation_date} />
          <HField label="Vessel" value={calc.vessel_name} highlight />
          <HField label="Product" value={calc.product_name} highlight />
          <HField label="Terminal" value={calc.terminal} />
          <HField label="PBPA Inspector" value={calc.pbpa_inspector_name} />
          <HField label="Terminal Rep." value={calc.terminal_representative_name} />
          <HField label="Created By" value={calc.created_by_name} />
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* TANK MEASUREMENTS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {items.map((item, idx) => {
        const rows = [
          ['SECTION A – DIPS', null, null, null, false, 'sub'],
          ['Overall Dip (mm)',    item.overall_dip_initial_mm,       item.overall_dip_final_mm,       f3, false],
          ['Water Dip (mm)',      item.water_dip_initial_mm,         item.water_dip_final_mm,         f3, false],
          ['Product Dip (mm)',    item.product_dip_initial_mm,       item.product_dip_final_mm,       f3, false],
          ['SECTION B – TEMPERATURE & DENSITY', null, null, null, false, 'sub'],
          ['Tank Temp (°C)',      item.tank_temperature_initial_c,   item.tank_temperature_final_c,   f3, false],
          ['Sample Temp (°C)',    item.sample_temperature_initial_c, item.sample_temperature_final_c, f3, false],
          ['Specific Gravity (kg/L)', item.density_initial_kg_l,         item.density_final_kg_l,         f4, false],
          ['Density @20°C (kg/L) [Table 59B]', item.density_initial_kg_l,  item.density_final_kg_l,         f4, true],
          ['SECTION C – CORRECTION FACTORS', null, null, null, false, 'sub'],
          ['VCF [Table 60B]',    item.effective_vcf_initial,              item.effective_vcf_final,                  f4, true],
          ['WCF = D@20 − 0.0011',item.effective_wcf_initial,              item.effective_wcf_final,                  f4, true],
          ['SECTION D – VOLUMES', null, null, null, false, 'sub'],
          ['GOV (m³)',            item.gross_observed_initial_m3,          item.gross_observed_final_m3,              f3, false],
          ['Roof Displacement (m³)', item.roof_displacement_initial_m3,   item.roof_displacement_final_m3,           f3, false],
          ['Water Volume (m³)',   item.water_volume_initial_m3,            item.water_volume_final_m3,                f3, false],
          ['Net Obs Vol (m³)',    item.net_observed_initial_m3,            item.net_observed_final_m3,                f3, true],
          ['Std Vol @20°C (m³)',  item.standard_volume_initial_m3,         item.standard_volume_final_m3,             f3, true],
          ['Weight in Air (MT)',  item.weight_air_initial_mt,              item.weight_air_final_mt,                  f3, true],
        ];

        return (
          <Card key={item.id} title={`Tank ${idx + 1}`} subtitle={item.tank_no ? `Tank ID: ${item.tank_no}` : undefined}>
            {/* Measurements Table */}
            <div className="overflow-x-auto mb-6 -mx-2 md:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <TH>Particulars</TH>
                    <TH right>Initial</TH>
                    <TH right>Final</TH>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([label, vi, vf, fmt, blue, type], ri) => {
                    if (type === 'sub') {
                      return (
                        <tr key={ri} className="bg-gray-50">
                          <td colSpan={3} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase tracking-widest border-b border-gray-200">
                            {label}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={ri}>
                        <TD>{label}</TD>
                        <TD blue={blue} right highlight={blue}>{fmt(vi)}</TD>
                        <TD blue={blue} right highlight={blue}>{fmt(vf)}</TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Received Summary Boxes */}
            <div className="grid grid-cols-3 gap-3">
              <SummaryBox 
                label="Received Obs Vol" 
                value={f3(item.received_observed_volume_m3)}
                color="blue"
              />
              <SummaryBox 
                label="Received Std Vol" 
                value={f3(item.received_standard_volume_m3)}
                color="blue"
              />
              <SummaryBox 
                label="Received Weight" 
                value={f3(item.received_weight_air_mt)}
                color="blue"
              />
            </div>
          </Card>
        );
      })}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SUMMARY SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Card title="Summary">
        <div className="overflow-x-auto -mx-2 md:mx-0 mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TH>Status</TH>
                <TH right>Obs Vol (m³)</TH>
                <TH right>Std Vol (m³)</TH>
                <TH right>Weight (MT)</TH>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-blue-50/50">
                <TD bold>Terminal</TD>
                <TD right>{f3(calc.terminal_observed_volume_m3)}</TD>
                <TD blue bold right highlight>{f3(calc.terminal_standard_volume_m3)}</TD>
                <TD blue bold right highlight>{f3(calc.terminal_weight_air_mt)}</TD>
              </tr>
              <tr className="bg-green-50/50">
                <TD bold>Vessel</TD>
                <TD right>{f3(calc.vessel_observed_volume_m3)}</TD>
                <TD right><span className="text-green-700 font-bold">{f3(calc.vessel_standard_volume_m3)}</span></TD>
                <TD right><span className="text-green-700 font-bold">{f3(calc.vessel_weight_air_mt)}</span></TD>
              </tr>
              <tr className="bg-amber-50/50">
                <TD bold>Meter Quantity</TD>
                <TD right>—</TD>
                <TD right><span className="text-amber-700 font-bold">{f3(calc.meter_quantity_m3)}</span></TD>
                <TD right>—</TD>
              </tr>
              <tr className="bg-red-50/50 border-t-2 border-gray-200">
                <TD bold>Difference</TD>
                <TD bold right>{f3(calc.difference_observed_volume_m3)}</TD>
                <TD right><span className="text-red-700 font-bold">{f3(calc.difference_standard_volume_m3)}</span></TD>
                <TD right><span className="text-red-700 font-bold">{f3(calc.difference_weight_air_mt)}</span></TD>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryBox label="Terminal Obs" value={f3(calc.terminal_observed_volume_m3)} color="blue" />
          <SummaryBox label="Vessel Std" value={f3(calc.vessel_standard_volume_m3)} color="green" />
          <SummaryBox label="Difference" value={f3(calc.difference_standard_volume_m3)} color="red" />
          <SummaryBox label="Meter Qty" value={f3(calc.meter_quantity_m3)} color="amber" />
        </div>
      </Card>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* REMARKS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {calc.remarks && (
        <Card title="Remarks">
          <p className="text-gray-700 leading-relaxed">{calc.remarks}</p>
        </Card>
      )}

      <div className="bg-white rounded-2xl shadow-base p-6 md:p-8 mb-6 animate-slide-up">
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-1">Signing Workflow</h2>
        </div>
        <SigningActions
          doc={calc}
          role={userRole}
          service={shoreTankCalculationService}
          docLabel="STC"
          onRefresh={load}
          setError={setError}
        />
      </div>
    </div>
  );
};
