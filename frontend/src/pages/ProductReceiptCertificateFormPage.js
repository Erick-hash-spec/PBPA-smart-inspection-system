import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { productReceiptCertificateService, tankService, shoreTankCalculationService } from '../services/api';
import { TerminalSelect, ProductSelect } from '../components/FormOptions';

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-sm transition';
const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h2>
    {children}
  </div>
);

const emptyItem = () => ({ tank: '', tank_no: '', product_name: '', weight_tonnage: '', volume_liters: '' });
const nv = (v) => (v == null ? '' : v);

export const ProductReceiptCertificateFormPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [tanks, setTanks]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError]             = useState('');
  const [searchParams]                = useSearchParams();
  const fromStc                       = searchParams.get('from_stc');

  const [formData, setFormData] = useState({
    vessel_name: '', terminal: '',
    receipt_date: new Date().toISOString().split('T')[0],
    receipt_time: new Date().toTimeString().slice(0, 8),
    quantity_received_through_inlet_flowmeters: '',
    terminal_representative_name: '', terminal_representative_signature: '',
    pbpa_inspector_name: '', pbpa_inspector_signature: '',
    notes: '', items: [emptyItem()],
  });

  useEffect(() => {
    fetchTanks();
    if (isEdit) loadExisting();
    else if (fromStc) prefillFromStc(fromStc);
  }, [id]); // eslint-disable-line

  const prefillFromStc = async (stcId) => {
    setPageLoading(true);
    try {
      const res = await shoreTankCalculationService.getCalculationById(stcId);
      const d = res.data;
      const items = (d.tank_items || []).map(item => ({
        tank: item.tank || '',
        tank_no: item.tank_no || '',
        product_name: item.product_name || d.product_name || '',
        weight_tonnage: item.received_weight_air_mt != null ? Number(item.received_weight_air_mt).toFixed(3) : '',
        volume_liters: item.received_standard_volume_m3 != null ? Number(item.received_standard_volume_m3 * 1000).toFixed(3) : '',
      }));
      setFormData(prev => ({
        ...prev,
        vessel_name: d.vessel_name || '',
        terminal: d.terminal || '',
        receipt_date: d.calculation_date || prev.receipt_date,
        terminal_representative_name: d.terminal_representative_name || '',
        pbpa_inspector_name: d.pbpa_inspector_name || '',
        items: items.length ? items : [emptyItem()],
      }));
    } catch { setError('Failed to load shore tank calculation data'); }
    finally { setPageLoading(false); }
  };

  const fetchTanks = async () => {
    try { const res = await tankService.getTanks(); setTanks(res.data.results || res.data); }
    catch { setError('Failed to load tanks'); }
  };

  const loadExisting = async () => {
    try {
      const res = await productReceiptCertificateService.getCertificateById(id);
      const d = res.data;
      setFormData({
        vessel_name:   d.vessel_name || '',
        terminal:      d.terminal || '',
        receipt_date:  d.receipt_date || new Date().toISOString().split('T')[0],
        receipt_time:  d.receipt_time || new Date().toTimeString().slice(0, 8),
        quantity_received_through_inlet_flowmeters: nv(d.quantity_received_through_inlet_flowmeters),
        terminal_representative_name:      d.terminal_representative_name || '',
        terminal_representative_signature: d.terminal_representative_signature || '',
        pbpa_inspector_name:      d.pbpa_inspector_name || '',
        pbpa_inspector_signature: d.pbpa_inspector_signature || '',
        notes: d.notes || '',
        items: (d.items || []).map(item => ({
          tank: item.tank || '', tank_no: item.tank_no || '',
          product_name: item.product_name || '',
          weight_tonnage: nv(item.weight_tonnage),
          volume_liters:  nv(item.volume_liters),
        })),
      });
    } catch { setError('Failed to load certificate for editing'); }
    finally { setPageLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'tank') {
        const t = tanks.find(t => t.id === Number(value));
        items[index].tank_no      = t ? t.tank_id      : items[index].tank_no;
        items[index].product_name = t ? t.product_type : items[index].product_name;
      }
      return { ...prev, items };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...formData,
        quantity_received_through_inlet_flowmeters: Number(formData.quantity_received_through_inlet_flowmeters || 0),
        items: formData.items
          .filter(item => item.product_name || item.tank_no)
          .map(item => ({ ...item, tank: item.tank ? Number(item.tank) : null, weight_tonnage: Number(item.weight_tonnage || 0), volume_liters: Number(item.volume_liters || 0) })),
      };
      if (isEdit) {
        await productReceiptCertificateService.updateCertificate(id, payload);
        navigate(`/product-receipt-certificates/${id}`);
      } else {
        const res = await productReceiptCertificateService.createCertificate(payload);
        navigate(`/product-receipt-certificates/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} certificate`);
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
        <button onClick={() => navigate(isEdit ? `/product-receipt-certificates/${id}` : '/product-receipt-certificates')} className="text-sm text-blue-600 hover:underline mb-1">← Back</button>
        <h1 className="text-3xl font-bold text-gray-900">{isEdit ? 'Edit Certificate' : 'New Product Receipt Certificate'}</h1>
      </div>

      {fromStc && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-5 flex gap-2 text-sm">
          Pre-filled from Shore Tank Calculation. Review and confirm before saving.
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex gap-2 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Certificate Header">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Vessel Name<span className="text-red-500 ml-1">*</span></label>
              <input type="text" name="vessel_name" value={formData.vessel_name} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Terminal<span className="text-red-500 ml-1">*</span></label>
              <TerminalSelect value={formData.terminal} onChange={v => setFormData(p=>({...p, terminal: v}))} inputCls={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Receipt Date<span className="text-red-500 ml-1">*</span></label>
              <input type="date" name="receipt_date" value={formData.receipt_date} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Receipt Time<span className="text-red-500 ml-1">*</span></label>
              <input type="time" name="receipt_time" value={formData.receipt_time} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Flowmeter Quantity (L)</label>
              <input type="number" step="0.01" min="0" name="quantity_received_through_inlet_flowmeters" value={formData.quantity_received_through_inlet_flowmeters} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="Delivered / Received Quantities">
          <div className="space-y-3 mb-3">
            <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              <span>Tank No.</span><span>Product</span><span>Weight (t)</span><span>Volume (L)</span></div>
            {formData.items.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2">
                <input type="text" placeholder="Tank No." value={item.tank_no} onChange={e=>handleItemChange(i,'tank_no',e.target.value)} className={inputCls} />
                <ProductSelect value={item.product_name} onChange={v=>handleItemChange(i,'product_name',v)} inputCls={inputCls} required />
                <input type="number" step="0.001" min="0" placeholder="0.000" value={item.weight_tonnage} onChange={e=>handleItemChange(i,'weight_tonnage',e.target.value)} required className={inputCls} />
                <input type="number" step="0.001" min="0" placeholder="0.000" value={item.volume_liters} onChange={e=>handleItemChange(i,'volume_liters',e.target.value)} required className={inputCls} />
                <button type="button" onClick={() => setFormData(prev=>({...prev,items:prev.items.filter((_,idx)=>idx!==i)}))} disabled={formData.items.length===1} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setFormData(prev=>({...prev,items:[...prev.items,emptyItem()]}))} className="text-sm text-blue-600 font-semibold hover:underline">+ Add Line</button>
        </Section>

        <Section title="Signatories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Terminal Representative Name','terminal_representative_name',true],['PBPA Inspector Name','pbpa_inspector_name',false],['Terminal Representative Signature','terminal_representative_signature',false],['PBPA Inspector Signature','pbpa_inspector_signature',false]].map(([label,name,req]) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}{req&&<span className="text-red-500 ml-1">*</span>}</label>
                <input type="text" name={name} value={formData[name]} onChange={handleChange} required={req} className={inputCls} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className={inputCls} />
          </div>
        </Section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Certificate'}
</button>
          <button type="button" onClick={() => navigate(isEdit ? `/product-receipt-certificates/${id}` : '/product-receipt-certificates')} className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
        </div>
      </form>
    </div>
  );
};
