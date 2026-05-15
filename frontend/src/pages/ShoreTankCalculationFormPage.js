import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shoreTankCalculationService, tankService, astmService } from '../services/api';
import { TerminalSelect, ProductSelect } from '../components/FormOptions';

const inputCls    = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-amber-50 focus:bg-white text-base transition';
const autoCalcCls = 'w-full px-3 py-2.5 border border-blue-200 rounded-xl bg-blue-50 text-blue-800 text-base cursor-not-allowed';
const loadingCls  = 'w-full px-3 py-2.5 border border-blue-100 rounded-xl bg-blue-50 text-blue-400 text-base cursor-not-allowed animate-pulse';

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h2>
    {children}
  </div>
);

const emptyTankItem = () => ({
  tank: '', tank_no: '',
  overall_dip_initial_mm: '', overall_dip_final_mm: '',
  water_dip_initial_mm: '', water_dip_final_mm: '',
  product_dip_initial_mm: '', product_dip_final_mm: '',
  tank_temperature_initial_c: '', tank_temperature_final_c: '',
  sample_temperature_initial_c: '', sample_temperature_final_c: '',
  density_initial_kg_l: '', density_final_kg_l: '',
  gross_observed_initial_m3: '', gross_observed_final_m3: '',
  roof_displacement_initial_m3: '', roof_displacement_final_m3: '',
  water_volume_initial_m3: '', water_volume_final_m3: '',
  vcf_initial: '', vcf_final: '',
  wcf_initial: '', wcf_final: '',
  remarks: '',
});

const emptyAstm = () => ({ d20: null, vcf: null, wcf: null, loading: false });
const opt  = (v) => (v === '' || v == null ? null : Number(v));
const zero = (v) => Number(v || 0);
const nv   = (v) => (v == null ? '' : v);

const formatApiError = (error) => {
  const data = error.response?.data;
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;

  const flatten = (value, path = '') => {
    if (Array.isArray(value)) {
      return value.flatMap((item, index) => flatten(item, path ? `${path}.${index + 1}` : `${index + 1}`));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, item]) => flatten(item, path ? `${path}.${key}` : key));
    }
    return [`${path}: ${value}`];
  };

  return flatten(data).join(' ');
};

export const ShoreTankCalculationFormPage = () => {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const isEdit     = Boolean(id);

  const [tanks, setTanks]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError]           = useState('');

  const [formData, setFormData] = useState({
    vessel_name: '', product_name: '', terminal: '',
    calculation_date: new Date().toISOString().split('T')[0],
    vessel_density_kg_m3: '', vessel_temperature_c: '',
    vessel_observed_volume_m3: '', vessel_standard_volume_m3: '',
    vessel_weight_air_mt: '', meter_quantity_m3: '',
    pbpa_inspector_name: '', terminal_representative_name: '',
    remarks: '', tank_items: [emptyTankItem()],
  });

  const [astmData, setAstmData] = useState([{ initial: emptyAstm(), final: emptyAstm() }]);
  const [finalLabels, setFinalLabels] = useState(['L.DISPL / PROV / FINAL']);
  const timers = useRef({});

  // ── ASTM lookup ──────────────────────────────────────────────────────────
  // defined first so loadExisting can reference it directly
  const triggerAstmLookup = useCallback((itemIndex, state, item) => {
    const density    = state === 'initial' ? item.density_initial_kg_l   : item.density_final_kg_l;
    const sampleTemp = item[`sample_temperature_${state}_c`];
    const tankTemp   = item[`tank_temperature_${state}_c`];

    if (timers.current[itemIndex]?.[state]) clearTimeout(timers.current[itemIndex][state]);

    if (!density || !sampleTemp || !tankTemp) {
      setAstmData(prev => { const n=[...prev]; n[itemIndex]={...n[itemIndex],[state]:emptyAstm()}; return n; });
      return;
    }
    setAstmData(prev => { const n=[...prev]; n[itemIndex]={...n[itemIndex],[state]:{...n[itemIndex][state],loading:true}}; return n; });

    if (!timers.current[itemIndex]) timers.current[itemIndex] = {};
    timers.current[itemIndex][state] = setTimeout(async () => {
      try {
        const res = await astmService.lookup(Number(density), Number(sampleTemp), Number(tankTemp));
        const { density_at_20, vcf, wcf } = res.data;
        setAstmData(prev => { const n=[...prev]; n[itemIndex]={...n[itemIndex],[state]:{d20:density_at_20,vcf,wcf,loading:false}}; return n; });
      } catch {
        setAstmData(prev => { const n=[...prev]; n[itemIndex]={...n[itemIndex],[state]:{d20:null,vcf:null,wcf:null,loading:false}}; return n; });
      }
    }, 400);
  }, []);

  useEffect(() => {
    fetchTanks();
    if (isEdit) loadExisting();
  }, [id]); // eslint-disable-line

  const fetchTanks = async () => {
    try {
      const res = await tankService.getTanks();
      setTanks(res.data.results || res.data);
    } catch { setError('Failed to load tanks'); }
  };

  const loadExisting = async () => {
    try {
      const res = await shoreTankCalculationService.getCalculationById(id);
      const d = res.data;
      const items = (d.tank_items || []).map(item => ({
        tank: item.tank || '',
        tank_no: item.tank_no || '',
        overall_dip_initial_mm:       nv(item.overall_dip_initial_mm),
        overall_dip_final_mm:         nv(item.overall_dip_final_mm),
        water_dip_initial_mm:         nv(item.water_dip_initial_mm),
        water_dip_final_mm:           nv(item.water_dip_final_mm),
        product_dip_initial_mm:       nv(item.product_dip_initial_mm),
        product_dip_final_mm:         nv(item.product_dip_final_mm),
        tank_temperature_initial_c:   nv(item.tank_temperature_initial_c),
        tank_temperature_final_c:     nv(item.tank_temperature_final_c),
        sample_temperature_initial_c: nv(item.sample_temperature_initial_c),
        sample_temperature_final_c:   nv(item.sample_temperature_final_c),
        density_initial_kg_l:         nv(item.density_initial_kg_l),
        density_final_kg_l:           nv(item.density_final_kg_l),
        gross_observed_initial_m3:    nv(item.gross_observed_initial_m3),
        gross_observed_final_m3:      nv(item.gross_observed_final_m3),
        roof_displacement_initial_m3: nv(item.roof_displacement_initial_m3),
        roof_displacement_final_m3:   nv(item.roof_displacement_final_m3),
        water_volume_initial_m3:      nv(item.water_volume_initial_m3),
        water_volume_final_m3:        nv(item.water_volume_final_m3),
        vcf_initial: nv(item.vcf_initial), vcf_final: nv(item.vcf_final),
        wcf_initial: nv(item.wcf_initial), wcf_final: nv(item.wcf_final),
        remarks: item.remarks || '',
      }));
      setFormData({
        vessel_name:                  d.vessel_name || '',
        product_name:                 d.product_name || '',
        terminal:                     d.terminal || '',
        calculation_date:             d.calculation_date || new Date().toISOString().split('T')[0],
        vessel_density_kg_m3:         nv(d.vessel_density_kg_m3),
        vessel_temperature_c:         nv(d.vessel_temperature_c),
        vessel_observed_volume_m3:    nv(d.vessel_observed_volume_m3),
        vessel_standard_volume_m3:    nv(d.vessel_standard_volume_m3),
        vessel_weight_air_mt:         nv(d.vessel_weight_air_mt),
        meter_quantity_m3:            nv(d.meter_quantity_m3),
        pbpa_inspector_name:          d.pbpa_inspector_name || '',
        terminal_representative_name: d.terminal_representative_name || '',
        remarks:                      d.remarks || '',
        tank_items: items.length ? items : [emptyTankItem()],
      });
      setAstmData(Array(items.length || 1).fill(null).map(() => ({ initial: emptyAstm(), final: emptyAstm() })));
      setFinalLabels(Array(items.length || 1).fill('L.DISPL / PROV / FINAL'));
      // trigger ASTM lookup for all loaded items immediately
      items.forEach((item, idx) => {
        ['initial', 'final'].forEach(state => triggerAstmLookup(idx, state, item));
      });
    } catch { setError('Failed to load calculation for editing'); }
    finally { setPageLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (i, field, value) => {
    setFormData(prev => {
      const tank_items = [...prev.tank_items];
      tank_items[i] = { ...tank_items[i], [field]: value };
      if (field === 'tank') {
        const t = tanks.find(t => t.id === Number(value));
        tank_items[i].tank_no = t ? t.tank_id : tank_items[i].tank_no;
      }
      const astmFields = ['density_initial_kg_l','sample_temperature_initial_c','tank_temperature_initial_c','density_final_kg_l','sample_temperature_final_c','tank_temperature_final_c'];
      if (astmFields.includes(field)) {
        const state = field.includes('initial') ? 'initial' : 'final';
        setTimeout(() => triggerAstmLookup(i, state, tank_items[i]), 0);
      }
      return { ...prev, tank_items };
    });
  };

  const addTank = () => {
    setFormData(prev => ({ ...prev, tank_items: [...prev.tank_items, emptyTankItem()] }));
    setAstmData(prev => [...prev, { initial: emptyAstm(), final: emptyAstm() }]);
    setFinalLabels(prev => [...prev, 'L.DISPL / PROV / FINAL']);
  };

  const removeTank = (i) => {
    setFormData(prev => ({ ...prev, tank_items: prev.tank_items.filter((_, idx) => idx !== i) }));
    setAstmData(prev => prev.filter((_, idx) => idx !== i));
    setFinalLabels(prev => prev.filter((_, idx) => idx !== i));
  };

  const buildPayload = () => ({
    ...formData,
    vessel_density_kg_m3:      opt(formData.vessel_density_kg_m3),
    vessel_temperature_c:      opt(formData.vessel_temperature_c),
    vessel_observed_volume_m3: zero(formData.vessel_observed_volume_m3),
    vessel_standard_volume_m3: zero(formData.vessel_standard_volume_m3),
    vessel_weight_air_mt:      zero(formData.vessel_weight_air_mt),
    meter_quantity_m3:         opt(formData.meter_quantity_m3),
    tank_items: formData.tank_items
      .filter(item => item.tank || item.tank_no || item.gross_observed_final_m3)
      .map((item, i) => {
        const ai = astmData[i] || { initial: emptyAstm(), final: emptyAstm() };
        return {
          ...item,
          tank: item.tank ? Number(item.tank) : null,
          overall_dip_initial_mm:       opt(item.overall_dip_initial_mm),
          overall_dip_final_mm:         opt(item.overall_dip_final_mm),
          water_dip_initial_mm:         zero(item.water_dip_initial_mm),
          water_dip_final_mm:           zero(item.water_dip_final_mm),
          product_dip_initial_mm:       opt(item.product_dip_initial_mm),
          product_dip_final_mm:         opt(item.product_dip_final_mm),
          tank_temperature_initial_c:   opt(item.tank_temperature_initial_c),
          tank_temperature_final_c:     opt(item.tank_temperature_final_c),
          sample_temperature_initial_c: opt(item.sample_temperature_initial_c),
          sample_temperature_final_c:   opt(item.sample_temperature_final_c),
          density_initial_kg_l:         opt(item.density_initial_kg_l),
          density_final_kg_l:           opt(item.density_final_kg_l),
          gross_observed_initial_m3:    zero(item.gross_observed_initial_m3),
          gross_observed_final_m3:      zero(item.gross_observed_final_m3),
          roof_displacement_initial_m3: zero(item.roof_displacement_initial_m3),
          roof_displacement_final_m3:   zero(item.roof_displacement_final_m3),
          water_volume_initial_m3:      zero(item.water_volume_initial_m3),
          water_volume_final_m3:        zero(item.water_volume_final_m3),
          vcf_initial: ai.initial.vcf ?? opt(item.vcf_initial),
          vcf_final:   ai.final.vcf   ?? opt(item.vcf_final),
          wcf_initial: ai.initial.wcf ?? opt(item.wcf_initial),
          wcf_final:   ai.final.wcf   ?? opt(item.wcf_final),
        };
      }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = buildPayload();
      if (isEdit) {
        await shoreTankCalculationService.updateCalculation(id, payload);
        navigate(`/shore-tank-calculations/${id}`);
      } else {
        await shoreTankCalculationService.createCalculation(payload);
        navigate('/shore-tank-calculations');
      }
    } catch (err) {
      setError(formatApiError(err) || `Failed to ${isEdit ? 'update' : 'create'} calculation`);
    } finally { setLoading(false); }
  };

  const autoField = (value, isLoading, decimals = 6) => (
    <input readOnly
      value={isLoading ? '' : (value != null ? Number(value).toFixed(decimals) : '')}
      placeholder={isLoading ? 'fetching…' : 'auto'}
      className={isLoading ? loadingCls : autoCalcCls} />
  );

  const novValue = (item, state) => {
    const g = Number(item[`gross_observed_${state}_m3`] || 0);
    const r = Number(item[`roof_displacement_${state}_m3`] || 0);
    const w = Number(item[`water_volume_${state}_m3`] || 0);
    const v = g - r - w;
    return v !== 0 ? v.toFixed(3) : '';
  };

  if (pageLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button onClick={() => navigate(isEdit ? `/shore-tank-calculations/${id}` : '/shore-tank-calculations')} className="text-sm text-blue-600 hover:underline mb-1">← Back</button>
        <h1 className="text-3xl font-bold text-gray-900">{isEdit ? '✏️ Edit Shore Tank Calculation' : '📐 New Shore Tank Calculation'}</h1>
        <p className="text-xs text-blue-500 mt-1">Density @20°C and VCF are fetched live from ASTM Table 59B / 60B</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex gap-2 text-sm"><span>⚠️</span>{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="📋 Workbook Header">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Vessel Name<span className="text-red-500 ml-1">*</span></label>
              <input type="text" name="vessel_name" value={formData.vessel_name} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Product<span className="text-red-500 ml-1">*</span></label>
              <ProductSelect value={formData.product_name} onChange={v => setFormData(p=>({...p, product_name: v}))} inputCls={inputCls} required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Terminal<span className="text-red-500 ml-1">*</span></label>
              <TerminalSelect value={formData.terminal} onChange={v => setFormData(p=>({...p, terminal: v}))} inputCls={inputCls} />
            </div>
            {[['Calculation Date','calculation_date','date',true],['Vessel Density (kg/m³)','vessel_density_kg_m3','number',false],['Vessel Temperature (°C)','vessel_temperature_c','number',false]].map(([label,name,type,req]) => (
              <div key={name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{label}{req && <span className="text-red-500 ml-1">*</span>}</label>
                <input type={type} step={type==='number'?'0.001':undefined} name={name} value={formData[name]} onChange={handleChange} required={req} className={inputCls} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="🛢️ Tank Measurements">
          <div className="space-y-4 mb-3">
            {formData.tank_items.map((item, i) => {
              const ai = astmData[i] || { initial: emptyAstm(), final: emptyAstm() };
              return (
                <div key={i} className="border border-gray-100 rounded-2xl p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">Tank {i + 1}</span>
                    <button type="button" onClick={() => removeTank(i)} disabled={formData.tank_items.length === 1} className="text-red-500 hover:text-red-700 text-sm font-semibold disabled:opacity-40">✕ Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Tank No.</label>
                      <input placeholder="Tank No." value={item.tank_no} onChange={e => handleItemChange(i,'tank_no',e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="mb-2 text-xs text-gray-400 flex gap-4">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>Manual</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>ASTM table</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['initial','final'].map(state => {
                      const astate = ai[state];
                      return (
                        <div key={state} className="space-y-2">
                          <p className="text-sm font-bold text-gray-800 mb-3">
                            {state === 'initial' ? 'INITIAL' : (
                              <select
                                value={finalLabels[i] || 'L.DISPL / PROV / FINAL'}
                                onChange={e => setFinalLabels(prev => { const n=[...prev]; n[i]=e.target.value; return n; })}
                                className="bg-transparent font-bold text-sm text-gray-800 cursor-pointer outline-none border-none -ml-0.5"
                              >
                                <option>L.DISPL / PROV / FINAL</option>
                                <option>L.DISPL</option>
                                <option>PROVISIONAL</option>
                                <option>FINAL</option>
                              </select>
                            )}
                          </p>

                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Section A – Measured Dips</p>
                          {[['Overall Dip (mm)',`overall_dip_${state}_mm`,'0.001'],['Water Dip (mm)',`water_dip_${state}_mm`,'0.001'],['Product Dip (mm)',`product_dip_${state}_mm`,'0.001']].map(([label,field,step]) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1">{label}</label>
                              <input type="number" step={step} value={item[field]} onChange={e=>handleItemChange(i,field,e.target.value)} className={inputCls} />
                            </div>
                          ))}

                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Section B – Temperature &amp; Density</p>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Tank Temp (°C)</label>
                            <input type="number" step="0.1" value={item[`tank_temperature_${state}_c`]} onChange={e=>handleItemChange(i,`tank_temperature_${state}_c`,e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Sample Temp (°C)</label>
                            <input type="number" step="0.1" value={item[`sample_temperature_${state}_c`]} onChange={e=>handleItemChange(i,`sample_temperature_${state}_c`,e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Specific Gravity (kg/L)</label>
                            <input type="number" step="0.0001" value={state==='initial'?item.density_initial_kg_l:item.density_final_kg_l} onChange={e=>handleItemChange(i,state==='initial'?'density_initial_kg_l':'density_final_kg_l',e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-xs text-blue-500 mb-1">Density @20°C (kg/L) <span className="text-blue-400">[ASTM Table 59B]</span></label>
                            {autoField(astate.d20, astate.loading, 4)}
                          </div>

                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Section C – Correction Factors</p>
                          <div>
                            <label className="block text-xs text-blue-500 mb-1">VCF <span className="text-blue-400">[ASTM Table 60B]</span></label>
                            {autoField(astate.vcf, astate.loading, 4)}
                          </div>
                          <div>
                            <label className="block text-xs text-blue-500 mb-1">WCF = D@20 − 0.0011 <span className="text-blue-400">[auto]</span></label>
                            {autoField(astate.wcf, astate.loading, 4)}
                          </div>

                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Section D – Volume Calculations</p>
                          {[['GOV (m³)',`gross_observed_${state}_m3`,'0.001'],['Roof Displacement (m³)',`roof_displacement_${state}_m3`,'0.001'],['Water Volume (m³)',`water_volume_${state}_m3`,'0.001']].map(([label,field,step]) => (
                            <div key={field}>
                              <label className="block text-xs text-gray-500 mb-1">{label}</label>
                              <input type="number" step={step} value={item[field]} onChange={e=>handleItemChange(i,field,e.target.value)} className={inputCls} />
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs text-blue-500 mb-1">Net Obs Vol (m³) = GOV − Roof − Water <span className="text-blue-400">[auto]</span></label>
                            <input readOnly value={novValue(item,state)} className={autoCalcCls} placeholder="auto" />
                          </div>
                          <div>
                            <label className="block text-xs text-blue-500 mb-1">Std Vol @20°C (m³) = NOV × VCF <span className="text-blue-400">[auto]</span></label>
                            <input readOnly value={(() => { const n=parseFloat(novValue(item,state)); const v=astate.vcf==null?null:parseFloat(astate.vcf.toFixed(4)); return (!n||v==null)?'':(n*v).toFixed(3); })()} className={autoCalcCls} placeholder="auto" />
                          </div>
                          <div>
                            <label className="block text-xs text-blue-500 mb-1">Weight in Air (MT) = StdVol × WCF <span className="text-blue-400">[auto]</span></label>
                            <input readOnly value={(() => { const n=parseFloat(novValue(item,state)); const v=astate.vcf==null?null:parseFloat(astate.vcf.toFixed(4)); const w=astate.wcf==null?null:parseFloat(astate.wcf.toFixed(4)); return (!n||v==null||w==null)?'':(n*v*w).toFixed(3); })()} className={autoCalcCls} placeholder="auto" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
                    <input placeholder="Remarks" value={item.remarks} onChange={e=>handleItemChange(i,'remarks',e.target.value)} className={inputCls} />
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" onClick={addTank} className="text-sm text-blue-600 font-semibold hover:underline">+ Add Tank</button>
        </Section>

        <Section title="⚖️ Vessel and Meter Quantities">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[['Vessel Obs Vol (m³)','vessel_observed_volume_m3'],['Vessel Std Vol (m³)','vessel_standard_volume_m3'],['Vessel Weight in Air (MT)','vessel_weight_air_mt'],['Meter Quantity (m³)','meter_quantity_m3']].map(([label,name]) => (
              <div key={name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{label}</label>
                <input type="number" step="0.001" name={name} value={formData[name]} onChange={handleChange} className={inputCls} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="✍️ Signatories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['PBPA Inspector Name','pbpa_inspector_name'],['Terminal Representative Name','terminal_representative_name']].map(([label,name]) => (
              <div key={name}>
                <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">{label}</label>
                <input type="text" name={name} value={formData[name]} onChange={handleChange} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wide">Remarks</label>
            <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="3" className={inputCls} />
          </div>
        </Section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? '💾 Save Changes' : '✅ Create Calculation'}
          </button>
          <button type="button" onClick={() => navigate(isEdit ? `/shore-tank-calculations/${id}` : '/shore-tank-calculations')} className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
        </div>
      </form>
    </div>
  );
};
