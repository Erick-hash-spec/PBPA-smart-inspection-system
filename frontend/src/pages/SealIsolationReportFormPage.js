import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sealIsolationReportService } from '../services/api';
import { TerminalSelect, ProductSelect } from '../components/FormOptions';

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white text-sm transition';
const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">{title}</h2>
    {children}
  </div>
);

const emptyEntry = () => ({ location: '', seal_number: '', remarks: '' });

export const SealIsolationReportFormPage = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [loading, setLoading]         = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError]             = useState('');

  const [formData, setFormData] = useState({
    vessel_name: '', product_name: '', terminal: '',
    report_date: new Date().toISOString().split('T')[0],
    terminal_representative_name: '', terminal_representative_signature: '',
    pbpa_inspector_name: '', pbpa_inspector_signature: '',
    notes: '', entries: [emptyEntry()],
  });

  useEffect(() => {
    if (isEdit) loadExisting();
  }, [id]); // eslint-disable-line

  const loadExisting = async () => {
    try {
      const res = await sealIsolationReportService.getReportById(id);
      const d = res.data;
      setFormData({
        vessel_name:   d.vessel_name || '',
        product_name:  d.product_name || '',
        terminal:      d.terminal || '',
        report_date:   d.report_date || new Date().toISOString().split('T')[0],
        terminal_representative_name:      d.terminal_representative_name || '',
        terminal_representative_signature: d.terminal_representative_signature || '',
        pbpa_inspector_name:      d.pbpa_inspector_name || '',
        pbpa_inspector_signature: d.pbpa_inspector_signature || '',
        notes: d.notes || '',
        entries: (d.entries || []).map(e => ({ location: e.location || '', seal_number: e.seal_number || '', remarks: e.remarks || '' })),
      });
    } catch { setError('Failed to load report for editing'); }
    finally { setPageLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEntryChange = (i, field, value) => {
    setFormData(prev => {
      const entries = [...prev.entries];
      entries[i] = { ...entries[i], [field]: value };
      return { ...prev, entries };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { ...formData, entries: formData.entries.filter(en => en.location || en.seal_number) };
      if (isEdit) {
        await sealIsolationReportService.updateReport(id, payload);
        navigate(`/seal-isolation-reports/${id}`);
      } else {
        await sealIsolationReportService.createReport(payload);
        navigate('/seal-isolation-reports');
      }
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${isEdit ? 'update' : 'create'} report`);
    } finally { setLoading(false); }
  };

  if (pageLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button onClick={() => navigate(isEdit ? `/seal-isolation-reports/${id}` : '/seal-isolation-reports')} className="text-sm text-blue-600 hover:underline mb-1">← Back</button>
        <h1 className="text-3xl font-bold text-gray-900">{isEdit ? 'Edit Seal & Isolation Report' : 'New Sealing and Isolation Report'}</h1>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 flex gap-2 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Report Header">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Vessel Name<span className="text-red-500 ml-1">*</span></label>
              <input type="text" name="vessel_name" value={formData.vessel_name} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Product<span className="text-red-500 ml-1">*</span></label>
              <ProductSelect value={formData.product_name} onChange={v => setFormData(p=>({...p, product_name: v}))} inputCls={inputCls} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Terminal<span className="text-red-500 ml-1">*</span></label>
              <TerminalSelect value={formData.terminal} onChange={v => setFormData(p=>({...p, terminal: v}))} inputCls={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Report Date<span className="text-red-500 ml-1">*</span></label>
              <input type="date" name="report_date" value={formData.report_date} onChange={handleChange} required className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="Location and Seal Numbers">
          <div className="space-y-3 mb-3">
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
              <span>Location</span><span>Seal Number</span><span>Remarks</span></div>
            {formData.entries.map((entry, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <input placeholder="Location" value={entry.location} onChange={e=>handleEntryChange(i,'location',e.target.value)} className={inputCls} />
                <input placeholder="Seal Number" value={entry.seal_number} onChange={e=>handleEntryChange(i,'seal_number',e.target.value)} className={inputCls} />
                <input placeholder="Remarks" value={entry.remarks} onChange={e=>handleEntryChange(i,'remarks',e.target.value)} className={inputCls} />
                <button type="button" onClick={() => setFormData(prev=>({...prev,entries:prev.entries.filter((_,idx)=>idx!==i)}))} disabled={formData.entries.length===1} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-40">Remove</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setFormData(prev=>({...prev,entries:[...prev.entries,emptyEntry()]}))} className="text-sm text-blue-600 font-semibold hover:underline">+ Add Row</button>
        </Section>

        <Section title="Signatories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Terminal Representative Name','terminal_representative_name'],['PBPA Inspector Name','pbpa_inspector_name'],['Terminal Representative Signature','terminal_representative_signature'],['PBPA Inspector Signature','pbpa_inspector_signature']].map(([label,name]) => (
              <div key={name}>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>
                <input type="text" name={name} value={formData[name]} onChange={handleChange} className={inputCls} />
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
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Report'}
</button>
          <button type="button" onClick={() => navigate(isEdit ? `/seal-isolation-reports/${id}` : '/seal-isolation-reports')} className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">Cancel</button>
        </div>
      </form>
    </div>
  );
};
