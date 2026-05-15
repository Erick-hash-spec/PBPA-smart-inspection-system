import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { inspectionService, tankService, sealService, isolationService } from '../services/api';
import { TerminalSelect, ProductSelect } from '../components/FormOptions';

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-sm transition';
const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h2>
    {children}
  </div>
);
const nv = (v) => (v == null ? '' : v);

export const InspectionFormPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);
  const [searchParams] = useSearchParams();
  const tankId = searchParams.get('tank');

  const [tanks, setTanks]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError]             = useState('');

  const emptyForm = () => ({
    tank: tankId ? parseInt(tankId) : '',
    ticket_number: '', vessel_name: '', product_name: '', terminal: '',
    inspection_time: new Date().toTimeString().slice(0, 8),
    dip_reading: '', temperature: '', water_level: '',
    overall_dip_1_mm: '', overall_dip_2_mm: '', overall_dip_3_mm: '',
    product_dip_1_mm: '', product_dip_2_mm: '', product_dip_3_mm: '',
    product_volume_1_l: '', product_volume_2_l: '', product_volume_3_l: '',
    free_water_volume_1_l: '', free_water_volume_2_l: '', free_water_volume_3_l: '',
    tank_temperature_1_c: '', tank_temperature_2_c: '', tank_temperature_3_c: '',
    specific_gravity_1: '', specific_gravity_2: '', specific_gravity_3: '',
    sample_temperature_1_c: '', sample_temperature_2_c: '', sample_temperature_3_c: '',
    outlet_valve_seal_number: '', water_valve_seal_number: '', other_branches_seal_number: '',
    meter_reading_obs: '', meter_reading_at_20: '', meter_reading_mts: '',
    terminal_representative_name: '', terminal_representative_signature: '',
    pbpa_inspector_name: '', pbpa_inspector_signature: '',
    observations: '', tank_condition: '', remarks: '',
    inspection_date: new Date().toISOString().split('T')[0],
  });

  const [formData, setFormData] = useState(emptyForm());
  const [seals, setSeals] = useState([{ seal_number: '', status: 'intact' }]);
  const [isolations, setIsolations] = useState([{ valve_id: '', status: 'closed', is_isolated: true }]);

  useEffect(() => {
    fetchTanks();
    if (isEdit) loadExisting();
  }, [id]); // eslint-disable-line

  const fetchTanks = async () => {
    try { const res = await tankService.getTanks(); setTanks(res.data.results || res.data); }
    catch { setError('Failed to load tanks'); }
  };

  const loadExisting = async () => {
    try {
      const res = await inspectionService.getInspectionById(id);
      const d = res.data;
      setFormData({
        tank: d.tank || '', ticket_number: d.ticket_number || '',
        vessel_name: d.vessel_name || '', product_name: d.product_name || '', terminal: d.terminal || '',
        inspection_time: d.inspection_time || new Date().toTimeString().slice(0, 8),
        dip_reading: nv(d.dip_reading), temperature: nv(d.temperature), water_level: nv(d.water_level),
        overall_dip_1_mm: nv(d.overall_dip_1_mm), overall_dip_2_mm: nv(d.overall_dip_2_mm), overall_dip_3_mm: nv(d.overall_dip_3_mm),
        product_dip_1_mm: nv(d.product_dip_1_mm), product_dip_2_mm: nv(d.product_dip_2_mm), product_dip_3_mm: nv(d.product_dip_3_mm),
        product_volume_1_l: nv(d.product_volume_1_l), product_volume_2_l: nv(d.product_volume_2_l), product_volume_3_l: nv(d.product_volume_3_l),
        free_water_volume_1_l: nv(d.free_water_volume_1_l), free_water_volume_2_l: nv(d.free_water_volume_2_l), free_water_volume_3_l: nv(d.free_water_volume_3_l),
        tank_temperature_1_c: nv(d.tank_temperature_1_c), tank_temperature_2_c: nv(d.tank_temperature_2_c), tank_temperature_3_c: nv(d.tank_temperature_3_c),
        specific_gravity_1: nv(d.specific_gravity_1), specific_gravity_2: nv(d.specific_gravity_2), specific_gravity_3: nv(d.specific_gravity_3),
        sample_temperature_1_c: nv(d.sample_temperature_1_c), sample_temperature_2_c: nv(d.sample_temperature_2_c), sample_temperature_3_c: nv(d.sample_temperature_3_c),
        outlet_valve_seal_number: d.outlet_valve_seal_number || '', water_valve_seal_number: d.water_valve_seal_number || '', other_branches_seal_number: d.other_branches_seal_number || '',
        meter_reading_obs: nv(d.meter_reading_obs), meter_reading_at_20: nv(d.meter_reading_at_20), meter_reading_mts: nv(d.meter_reading_mts),
        terminal_representative_name: d.terminal_representative_name || '', terminal_representative_signature: d.terminal_representative_signature || '',
        pbpa_inspector_name: d.pbpa_inspector_name || '', pbpa_inspector_signature: d.pbpa_inspector_signature || '',
        observations: d.observations || '', tank_condition: d.tank_condition || '', remarks: d.remarks || '',
        inspection_date: d.inspection_date ? d.inspection_date.split('T')[0] : new Date().toISOString().split('T')[0],
      });
    } catch { setError('Failed to load inspection for editing'); }
    finally { setPageLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSealChange = (i, field, value) => {
    const s = [...seals]; s[i][field] = value; setSeals(s);
  };

  const handleIsolationChange = (i, field, value) => {
    const iso = [...isolations];
    iso[i][field] = value;
    iso[i].is_isolated = value === 'closed';
    setIsolations(iso);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const optFields = [
        'overall_dip_1_mm','overall_dip_2_mm','overall_dip_3_mm',
        'product_dip_1_mm','product_dip_2_mm','product_dip_3_mm',
        'product_volume_1_l','product_volume_2_l','product_volume_3_l',
        'free_water_volume_1_l','free_water_volume_2_l','free_water_volume_3_l',
        'tank_temperature_1_c','tank_temperature_2_c','tank_temperature_3_c',
        'specific_gravity_1','specific_gravity_2','specific_gravity_3',
        'sample_temperature_1_c','sample_temperature_2_c','sample_temperature_3_c',
        'meter_reading_obs','meter_reading_at_20','meter_reading_mts',
      ];
      const payload = {
        ...formData,
        tank: Number(formData.tank),
        dip_reading: Number(formData.dip_reading || 0),
        temperature: Number(formData.temperature || 0),
        water_level: Number(formData.water_level || 0),
      };
      optFields.forEach(f => { payload[f] = formData[f] === '' ? null : Number(formData[f]); });

      if (isEdit) {
        await inspectionService.updateInspection(id, payload);
        navigate(`/inspections/${id}`);
      } else {
        const res = await inspectionService.createInspection(payload);
        const inspId = res.data.id;
        for (const seal of seals) { if (seal.seal_number) await sealService.createSeal({ inspection: inspId, ...seal }); }
        for (const iso of isolations) { if (iso.valve_id) await isolationService.createIsolation({ inspection: inspId, ...iso }); }
        navigate(`/inspections/${inspId}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} inspection`);
    } finally { setLoading(false); }
  };

  if (pageLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button onClick={() => navigate(isEdit ? `/inspections/${id}` : '/inspections')} className="text-sm text-blue-600 hover:underline mb-1">← Back</button>
        <h1 className="text-3xl font-bold text-gray-900">{isEdit ? '✏️ Edit Dip Ticket' : '🔍 New Inspection'}</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex gap-2 text-sm">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="🗒️ Dip Ticket Information">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ['Ticket Number', 'ticket_number', 'text'],
              ['Vessel Name',   'vessel_name',   'text'],
            ].map(([label, name, type]) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
                <input type={type} name={name} value={formData[name]} onChange={handleChange} className={inputCls} />
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Product</label>
              <ProductSelect value={formData.product_name} onChange={v => setFormData(p=>({...p, product_name: v}))} inputCls={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Terminal</label>
              <TerminalSelect value={formData.terminal} onChange={v => setFormData(p=>({...p, terminal: v}))} inputCls={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Tank <span className="text-red-500">*</span></label>
              <select name="tank" value={formData.tank} onChange={handleChange} required className={inputCls}>
                <option value="">Select a tank</option>
                {tanks.map(t => <option key={t.id} value={t.id}>{t.tank_name} ({t.tank_id})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Tank Condition</label>
              <input type="text" name="tank_condition" value={formData.tank_condition} onChange={handleChange} className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Dip Reading (m) <span className="text-red-500">*</span></label>
              <input type="number" name="dip_reading" value={formData.dip_reading} onChange={handleChange} required step="0.1" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Temperature (°C) <span className="text-red-500">*</span></label>
              <input type="number" name="temperature" value={formData.temperature} onChange={handleChange} required step="0.1" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Water Level (cm)</label>
              <input type="number" name="water_level" value={formData.water_level} onChange={handleChange} step="0.1" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Inspection Date <span className="text-red-500">*</span></label>
              <input type="date" name="inspection_date" value={formData.inspection_date} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Time <span className="text-red-500">*</span></label>
              <input type="time" step="1" name="inspection_time" value={formData.inspection_time} onChange={handleChange} required className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="📏 Measurements">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">Particulars</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">1st</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">2nd</th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">3rd</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['Overall Dip (mm)',      'overall_dip',       '_mm'],
                  ['Product Dip (mm)',      'product_dip',       '_mm'],
                  ['Product Volume (L)',    'product_volume',    '_l'],
                  ['Free Water Vol (L)',    'free_water_volume', '_l'],
                  ['Tank Temperature',      'tank_temperature',  '_c'],
                  ['Specific Gravity',      'specific_gravity',  ''],
                  ['Sample Temperature',    'sample_temperature','_c'],
                ].map(([label, key, suffix]) => (
                  <tr key={key}>
                    <td className="px-3 py-2 font-medium text-gray-700">{label}</td>
                    {[1, 2, 3].map(n => (
                      <td key={n} className="px-3 py-2">
                        <input type="number" step="0.001" name={`${key}_${n}${suffix}`} value={formData[`${key}_${n}${suffix}`]} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="🔒 Seal Position and Meter Readings">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Seal Position', 'Seal Number', 'Meter Reading'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['Outlet valve seal',    'outlet_valve_seal_number',    'meter_reading_obs',   'OBS'],
                  ['Water valve seal',     'water_valve_seal_number',     'meter_reading_at_20', '@20'],
                  ['Other branches seal',  'other_branches_seal_number',  'meter_reading_mts',   'MTS'],
                ].map(([label, sealF, meterF, meterLabel]) => (
                  <tr key={sealF}>
                    <td className="px-3 py-2 font-medium text-gray-700">{label}</td>
                    <td className="px-3 py-2"><input type="text" name={sealF} value={formData[sealF]} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-8">{meterLabel}</span>
                        <input type="number" step="0.001" name={meterF} value={formData[meterF]} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="📝 Observations & Remarks">
          <div className="space-y-3">
            <textarea name="observations" value={formData.observations} onChange={handleChange} rows="3" placeholder="Observations..." className={inputCls} />
            <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="3" placeholder="Remarks..." className={inputCls} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <input type="text" name="terminal_representative_name" placeholder="Terminal representative name" value={formData.terminal_representative_name} onChange={handleChange} className={inputCls} />
            <input type="text" name="pbpa_inspector_name" placeholder="PBPA inspector name" value={formData.pbpa_inspector_name} onChange={handleChange} className={inputCls} />
            <input type="text" name="terminal_representative_signature" placeholder="Terminal representative signature" value={formData.terminal_representative_signature} onChange={handleChange} className={inputCls} />
            <input type="text" name="pbpa_inspector_signature" placeholder="PBPA inspector signature" value={formData.pbpa_inspector_signature} onChange={handleChange} className={inputCls} />
          </div>
        </Section>

        <Section title="🔐 Seals">
          <div className="space-y-3 mb-3">
            {seals.map((seal, i) => (
              <div key={i} className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="Seal Number" value={seal.seal_number} onChange={e => handleSealChange(i, 'seal_number', e.target.value)} className={inputCls} />
                <select value={seal.status} onChange={e => handleSealChange(i, 'status', e.target.value)} className={inputCls}>
                  <option value="intact">Intact</option>
                  <option value="damaged">Damaged</option>
                  <option value="missing">Missing</option>
                </select>
                <button type="button" onClick={() => setSeals(seals.filter((_, idx) => idx !== i))} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-semibold transition">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setSeals([...seals, { seal_number: '', status: 'intact' }])} className="text-sm text-blue-600 font-semibold hover:underline">+ Add Seal</button>
        </Section>

        <Section title="🔧 Valve Isolation">
          <div className="space-y-3 mb-3">
            {isolations.map((iso, i) => (
              <div key={i} className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="Valve ID" value={iso.valve_id} onChange={e => handleIsolationChange(i, 'valve_id', e.target.value)} className={inputCls} />
                <select value={iso.status} onChange={e => handleIsolationChange(i, 'status', e.target.value)} className={inputCls}>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="unknown">Unknown</option>
                </select>
                <button type="button" onClick={() => setIsolations(isolations.filter((_, idx) => idx !== i))} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-semibold transition">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setIsolations([...isolations, { valve_id: '', status: 'closed', is_isolated: true }])} className="text-sm text-blue-600 font-semibold hover:underline">+ Add Valve</button>
        </Section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? '💾 Save Changes' : '✅ Create Inspection'}
          </button>
          <button type="button" onClick={() => navigate(isEdit ? `/inspections/${id}` : '/inspections')} className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
