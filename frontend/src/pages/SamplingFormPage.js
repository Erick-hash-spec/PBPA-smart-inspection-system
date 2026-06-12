import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { samplingFormService } from '../services/api';
import { FlaskConical, Plus, Search, Inbox, AlertCircle } from 'lucide-react';
import { TerminalSelect, ProductSelect } from '../components/FormOptions';

const inputCls = 'w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-sm transition outline-none focus:border-[#8B1A1A] focus:ring-2 focus:ring-[#8B1A1A]/10';

const statusCls = {
  draft:  'bg-gray-50 text-gray-600 border-gray-200',
  issued: 'bg-green-50 text-green-700 border-green-200',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusCls[status] || statusCls.draft}`}>
    {status === 'issued' ? 'Issued' : 'Draft'}
  </span>
);

/* ── List ──────────────────────────────────────────────────────────────── */
export const SamplingFormListPage = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchForms(); }, []); // eslint-disable-line

  const fetchForms = async () => {
    setLoading(true);
    try {
      const res = await samplingFormService.getForms();
      setForms(res.data.results || res.data);
    } catch { setError('Failed to load sampling forms'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sampling form?')) return;
    await samplingFormService.deleteForm(id);
    setForms(p => p.filter(f => f.id !== id));
  };

  const handleDownload = async (form) => {
    try {
      const res = await samplingFormService.downloadPdf(form.id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `Sampling_Form_${form.form_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download PDF'); }
  };

  const filtered = forms.filter(f =>
    f.form_number?.toLowerCase().includes(search.toLowerCase()) ||
    f.vessel_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.terminal?.toLowerCase().includes(search.toLowerCase()) ||
    f.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vessel Sampling Forms</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">PBPA vessel cargo tank sampling records</p>
          </div>
        </div>
        <button onClick={() => navigate('/sampling-forms/new')}
          className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition shadow-sm">
          <Plus className="w-4 h-4" />New Sampling Form
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex gap-2 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
        </div>
      )}

      <div className="relative mb-5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by form no., vessel, terminal or product..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-[#8B1A1A] transition" />
      </div>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {filtered.length} result{filtered.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#8B1A1A]/20 border-t-[#8B1A1A] rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                  {['Form No.','Vessel','Product','Terminal','Date','Inspector','Status',''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {filtered.map(f => (
                  <tr key={f.id} onClick={() => navigate(`/sampling-forms/${f.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#8B1A1A] dark:text-red-400 whitespace-nowrap">{f.form_number || `#${f.id}`}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{f.vessel_name || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{f.product_name || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{f.terminal || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{f.sampling_date ? new Date(f.sampling_date).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{f.pbpa_inspector_name || '—'}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={f.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/sampling-forms/${f.id}`)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition">View</button>
                        {f.status === 'draft' && <button onClick={() => navigate(`/sampling-forms/${f.id}/edit`)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 transition">Edit</button>}
                        <button onClick={() => handleDownload(f)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-green-50 text-green-700 border-green-200 hover:bg-green-100 transition">PDF</button>
                        <button onClick={() => handleDelete(f.id)} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile */}
          <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(f => (
              <div key={f.id} onClick={() => navigate(`/sampling-forms/${f.id}`)} className="p-4 cursor-pointer active:bg-gray-50 dark:active:bg-slate-700">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-bold text-[#8B1A1A] dark:text-red-400 text-sm">{f.form_number || `#${f.id}`}</span>
                  <StatusBadge status={f.status} />
                </div>
                <p className="text-gray-800 dark:text-gray-200 font-medium text-sm">{f.vessel_name || '—'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span>{f.product_name || '—'}</span>
                  <span>{f.terminal || '—'}</span>
                  <span>{f.sampling_date ? new Date(f.sampling_date).toLocaleDateString() : '—'}</span>
                </div>
                <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => navigate(`/sampling-forms/${f.id}`)} className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200">View</button>
                  {f.status === 'draft' && <button onClick={() => navigate(`/sampling-forms/${f.id}/edit`)} className="bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-200">Edit</button>}
                  <button onClick={() => handleDownload(f)} className="bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200">PDF</button>
                  <button onClick={() => handleDelete(f.id)} className="bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center shadow-sm">
          <Inbox className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No sampling forms found</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {search ? 'No matching results' : 'Create your first vessel sampling form to get started'}
          </p>
        </div>
      )}
    </div>
  );
};

/* ── Form (Create / Edit) ──────────────────────────────────────────────── */
export const SamplingFormFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const empty = () => ({
    vessel_name: '', product_name: '', terminal: '',
    sampling_date: new Date().toISOString().split('T')[0],
    sampling_time: '',
    voyage_no: '', bill_of_lading_no: '',
    cargo_tank_no: '', sample_location: '',
    sample_reference: '', sample_quantity: '',
    sample_container: '', number_of_samples: '',
    seal_number_before: '', seal_number_after: '',
    temperature: '', density_observed: '',
    colour: '', appearance: '',
    sampled_by: '', witnessed_by: '',
    remarks: '',
    terminal_representative_name: '', terminal_representative_signature: '',
    pbpa_inspector_name: '', pbpa_inspector_signature: '',
  });

  const [form, setForm] = useState(empty());
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    samplingFormService.getFormById(id)
      .then(res => {
        const d = res.data;
        setForm({
          vessel_name: d.vessel_name || '', product_name: d.product_name || '',
          terminal: d.terminal || '',
          sampling_date: d.sampling_date || new Date().toISOString().split('T')[0],
          sampling_time: d.sampling_time ? d.sampling_time.slice(0,5) : '',
          voyage_no: d.voyage_no || '', bill_of_lading_no: d.bill_of_lading_no || '',
          cargo_tank_no: d.cargo_tank_no || '', sample_location: d.sample_location || '',
          sample_reference: d.sample_reference || '', sample_quantity: d.sample_quantity || '',
          sample_container: d.sample_container || '',
          number_of_samples: d.number_of_samples ?? '',
          seal_number_before: d.seal_number_before || '', seal_number_after: d.seal_number_after || '',
          temperature: d.temperature ?? '', density_observed: d.density_observed ?? '',
          colour: d.colour || '', appearance: d.appearance || '',
          sampled_by: d.sampled_by || '', witnessed_by: d.witnessed_by || '',
          remarks: d.remarks || '',
          terminal_representative_name: d.terminal_representative_name || '',
          terminal_representative_signature: d.terminal_representative_signature || '',
          pbpa_inspector_name: d.pbpa_inspector_name || '',
          pbpa_inspector_signature: d.pbpa_inspector_signature || '',
        });
      })
      .catch(() => setError('Failed to load form'))
      .finally(() => setPageLoading(false));
  }, [id]); // eslint-disable-line

  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = {
        ...form,
        temperature: form.temperature === '' ? null : Number(form.temperature),
        density_observed: form.density_observed === '' ? null : Number(form.density_observed),
        number_of_samples: form.number_of_samples === '' ? null : Number(form.number_of_samples),
        sampling_time: form.sampling_time || null,
      };
      if (isEdit) {
        await samplingFormService.updateForm(id, payload);
        navigate(`/sampling-forms/${id}`);
      } else {
        const res = await samplingFormService.createForm(payload);
        navigate(`/sampling-forms/${res.data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally { setLoading(false); }
  };

  const Section = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 md:p-6">
      <h2 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );

  if (pageLoading) return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <button onClick={() => navigate(isEdit ? `/sampling-forms/${id}` : '/sampling-forms')} className="text-sm text-blue-600 hover:underline mb-1">← Back</button>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white">
          {isEdit ? 'Edit Vessel Sampling Form' : 'New Vessel Sampling Form'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Petroleum sample drawn from vessel cargo tank(s)</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">

        <Section title="Vessel Information">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Vessel Name <span className="text-red-500">*</span></label>
              <input name="vessel_name" value={form.vessel_name} onChange={handleChange} required className={inputCls} placeholder="MV Example" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Product <span className="text-red-500">*</span></label>
              <ProductSelect value={form.product_name} onChange={v => setForm(p => ({ ...p, product_name: v }))} inputCls={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Terminal <span className="text-red-500">*</span></label>
              <TerminalSelect value={form.terminal} onChange={v => setForm(p => ({ ...p, terminal: v }))} inputCls={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sampling Date <span className="text-red-500">*</span></label>
              <input type="date" name="sampling_date" value={form.sampling_date} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sampling Time</label>
              <input type="time" name="sampling_time" value={form.sampling_time} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Voyage No.</label>
              <input name="voyage_no" value={form.voyage_no} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Bill of Lading No.</label>
              <input name="bill_of_lading_no" value={form.bill_of_lading_no} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="Sampling Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Cargo Tank No.</label>
              <input name="cargo_tank_no" value={form.cargo_tank_no} onChange={handleChange} className={inputCls} placeholder="e.g. Tank 1, 2, 3" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sample Location</label>
              <input name="sample_location" value={form.sample_location} onChange={handleChange} className={inputCls} placeholder="e.g. Upper, Middle, Lower, Bottom, Composite, Manifold" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sample Reference</label>
              <input name="sample_reference" value={form.sample_reference} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sample Quantity</label>
              <input name="sample_quantity" value={form.sample_quantity} onChange={handleChange} className={inputCls} placeholder="e.g. 1 Litre composite" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sample Container</label>
              <input name="sample_container" value={form.sample_container} onChange={handleChange} className={inputCls} placeholder="e.g. 1L glass bottle" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Number of Samples</label>
              <input type="number" min="1" name="number_of_samples" value={form.number_of_samples} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Seal No. Before Sampling</label>
              <input name="seal_number_before" value={form.seal_number_before} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Seal No. After Sampling</label>
              <input name="seal_number_after" value={form.seal_number_after} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Sampled By</label>
              <input name="sampled_by" value={form.sampled_by} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Witnessed By</label>
              <input name="witnessed_by" value={form.witnessed_by} onChange={handleChange} className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="Physical Properties">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Temperature (°C)</label>
              <input type="number" step="0.01" name="temperature" value={form.temperature} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Observed Density (kg/L)</label>
              <input type="number" step="0.0001" name="density_observed" value={form.density_observed} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Colour</label>
              <input name="colour" value={form.colour} onChange={handleChange} className={inputCls} placeholder="e.g. Amber" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Appearance</label>
              <input name="appearance" value={form.appearance} onChange={handleChange} className={inputCls} placeholder="e.g. Clear and bright" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Remarks</label>
              <textarea name="remarks" value={form.remarks} onChange={handleChange} rows="2" className={inputCls} />
            </div>
          </div>
        </Section>

        <Section title="Signatories">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="terminal_representative_name" placeholder="Terminal / Ship representative name" value={form.terminal_representative_name} onChange={handleChange} className={inputCls} />
            <input name="pbpa_inspector_name" placeholder="PBPA inspector name" value={form.pbpa_inspector_name} onChange={handleChange} className={inputCls} />
            <input name="terminal_representative_signature" placeholder="Terminal / Ship representative signature" value={form.terminal_representative_signature} onChange={handleChange} className={inputCls} />
            <input name="pbpa_inspector_signature" placeholder="PBPA inspector signature" value={form.pbpa_inspector_signature} onChange={handleChange} className={inputCls} />
          </div>
        </Section>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="gradient-primary text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Sampling Form'}
          </button>
          <button type="button" onClick={() => navigate(isEdit ? `/sampling-forms/${id}` : '/sampling-forms')}
            className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

/* ── Detail ────────────────────────────────────────────────────────────── */
export const SamplingFormDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    samplingFormService.getFormById(id)
      .then(res => setForm(res.data))
      .catch(() => setError('Failed to load sampling form'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleIssue = async () => {
    await samplingFormService.issueForm(id);
    setForm(p => ({ ...p, status: 'issued' }));
  };

  const handleDownload = async () => {
    const res = await samplingFormService.downloadPdf(id);
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url; a.download = `Sampling_Form_${form.form_number}.pdf`;
    document.body.appendChild(a); a.click();
    window.URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const Field = ({ label, value }) => (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{value != null && value !== '' ? value : '—'}</p>
    </div>
  );

  const SectionCard = ({ title, children }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-transparent dark:border-slate-700 shadow-sm p-4 sm:p-6">
      <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">{title}</h2>
      {children}
    </div>
  );

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (error || !form) return <div className="p-8 text-red-600">{error || 'Form not found'}</div>;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
      <button onClick={() => navigate('/sampling-forms')} className="text-sm text-blue-600 hover:underline mb-4 inline-flex items-center gap-1">← Back</button>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Vessel Sampling Form</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{form.form_number} · {form.vessel_name}</p>
        </div>
        <div className="grid grid-cols-1 sm:flex gap-2 w-full md:w-auto">
          <StatusBadge status={form.status} />
          {form.status === 'draft' && (
            <button onClick={() => navigate(`/sampling-forms/${id}/edit`)} className="px-4 py-2 rounded-lg text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition">Edit</button>
          )}
          {form.status === 'draft' && (
            <button onClick={handleIssue} className="px-4 py-2 rounded-lg text-sm font-semibold text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition">Issue</button>
          )}
          <button onClick={handleDownload} className="px-4 py-2 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition">Download PDF</button>
        </div>
      </div>

      <div className="space-y-5">
        <SectionCard title="Vessel Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Vessel Name" value={form.vessel_name} />
            <Field label="Product" value={form.product_name} />
            <Field label="Terminal" value={form.terminal} />
            <Field label="Sampling Date" value={form.sampling_date ? new Date(form.sampling_date).toLocaleDateString() : ''} />
            <Field label="Sampling Time" value={form.sampling_time} />
            <Field label="Voyage No." value={form.voyage_no} />
            <Field label="Bill of Lading No." value={form.bill_of_lading_no} />
          </div>
        </SectionCard>

        <SectionCard title="Sampling Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Cargo Tank No." value={form.cargo_tank_no} />
            <Field label="Sample Location" value={form.sample_location} />
            <Field label="Sample Reference" value={form.sample_reference} />
            <Field label="Sample Quantity" value={form.sample_quantity} />
            <Field label="Sample Container" value={form.sample_container} />
            <Field label="No. of Samples" value={form.number_of_samples} />
            <Field label="Seal No. Before" value={form.seal_number_before} />
            <Field label="Seal No. After" value={form.seal_number_after} />
            <Field label="Sampled By" value={form.sampled_by} />
            <Field label="Witnessed By" value={form.witnessed_by} />
          </div>
        </SectionCard>

        <SectionCard title="Physical Properties">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="Temperature (°C)" value={form.temperature} />
            <Field label="Observed Density (kg/L)" value={form.density_observed} />
            <Field label="Colour" value={form.colour} />
            <Field label="Appearance" value={form.appearance} />
            {form.remarks && <div className="sm:col-span-2 md:col-span-3"><Field label="Remarks" value={form.remarks} /></div>}
          </div>
        </SectionCard>

        <SectionCard title="Signatories">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Terminal / Ship Representative" value={form.terminal_representative_name} />
            <Field label="PBPA Inspector" value={form.pbpa_inspector_name} />
            <Field label="Terminal / Ship Signature" value={form.terminal_representative_signature} />
            <Field label="Inspector Signature" value={form.pbpa_inspector_signature} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
};
