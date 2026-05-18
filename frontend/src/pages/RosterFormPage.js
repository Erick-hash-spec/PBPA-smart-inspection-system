import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { rosterService, userService } from '../services/api';
import { CalendarDays, X, CheckCircle, ArrowLeft, Search, Users, ChevronDown } from 'lucide-react';
import './RosterFormPage.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SHIFTS = [{ value: 'day', label: 'Day' }, { value: 'night', label: 'Night' }, { value: 'custom', label: 'Custom' }];
const LOCATIONS = ['KURASINI', 'KIGAMBONI'];

const inputCls = 'w-full min-w-0 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-base sm:text-sm focus:bg-white dark:focus:bg-slate-600 transition outline-none';

const emptyForm = () => ({
  inspectors: [],
  inspector: '',
  week_start_date: '',
  working_days: [],
  shift: 'day',
  location: 'KURASINI',
  terminal: '',
  vessel_name: '',
  task: '',
  notes: '',
  status: 'draft',
});

export const RosterFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [inspectors, setInspectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [inspectorSearch, setInspectorSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    fetchInspectors();
    if (isEdit) fetchRoster();
    else setLoading(false);
  }, []); // eslint-disable-line

  const fetchInspectors = async () => {
    try {
      const res = await userService.getInspectors();
      const all = res.data.results || res.data;
      setInspectors(all.filter(u => u.role === 'inspector'));
    } catch {
      setError('Failed to load inspectors');
    }
  };

  const fetchRoster = async () => {
    try {
      const res = await rosterService.getRosterById(id);
      const r = res.data;
      setForm({
        inspectors: [],
        inspector: r.inspector,
        week_start_date: r.week_start_date || '',
        working_days: r.working_days || [],
        shift: r.shift || 'day',
        location: r.location || 'KURASINI',
        terminal: r.terminal || '',
        vessel_name: r.vessel_name || '',
        task: r.task || '',
        notes: r.notes || '',
        status: r.status || 'draft',
      });
    } catch {
      setError('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day) => {
    setForm(p => ({
      ...p,
      working_days: p.working_days.includes(day)
        ? p.working_days.filter(d => d !== day)
        : [...p.working_days, day],
    }));
  };

  const toggleInspector = (id) => {
    setForm(p => ({
      ...p,
      inspectors: p.inspectors.includes(id)
        ? p.inspectors.filter(i => i !== id)
        : [...p.inspectors, id],
    }));
  };

  const selectAllInspectors = () => {
    const filtered = inspectors.filter(u => {
      const name = [u.user_detail?.first_name, u.user_detail?.last_name, u.user_detail?.username].join(' ').toLowerCase();
      return name.includes(inspectorSearch.toLowerCase());
    });
    const ids = filtered.map(u => String(u.user?.id || u.id));
    setForm(p => ({ ...p, inspectors: ids }));
  };

  const clearAllInspectors = () => setForm(p => ({ ...p, inspectors: [] }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.week_start_date) return setError('Please select a week start date.');
    if (form.working_days.length === 0) return setError('Please select at least one working day.');

    if (isEdit) {
      // Edit: single inspector
      setSaving(true);
      setError('');
      try {
        const payload = { ...form };
        delete payload.inspectors;
        await rosterService.updateRoster(id, payload);
        navigate('/roster', { state: { message: 'Roster updated successfully.' } });
      } catch (err) {
        const data = err.response?.data;
        setError(data ? (data.detail || Object.values(data).flat().join(' ')) : 'Failed to save.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Create: one assignment per selected inspector
    if (form.inspectors.length === 0) return setError('Please select at least one inspector.');
    setSaving(true);
    setError('');
    try {
      await Promise.all(
        form.inspectors.map(inspId => {
          const payload = { ...form, inspector: inspId };
          delete payload.inspectors;
          return rosterService.createRoster(payload);
        })
      );
      navigate('/roster', { 
        state: { 
          message: `${form.inspectors.length} roster assignment${form.inspectors.length > 1 ? 's' : ''} created successfully.` 
        } 
      });
    } catch (err) {
      const data = err.response?.data;
      setError(data ? (data.detail || Object.values(data).flat().join(' ')) : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/roster')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />Back to Roster
</button>

        <div className="flex items-start gap-4 min-w-0">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
              {isEdit ? 'Edit Roster Assignment' : 'New Roster Assignment'}
            </h1>
            <p className="text-gray-500 dark:text-gray-300 mt-1 break-words">
              {isEdit ? 'Update inspector assignment details' : 'Create a new weekly assignment for inspectors'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Assignment Details */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-[#8B1A1A] rounded-full" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest break-words">Assignment Details</p>
          </div>

          <div className="space-y-4">
            {/* Inspector(s) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                {isEdit ? 'Inspector' : 'Inspectors'}
                <span className="text-red-500 ml-0.5">*</span>
              </label>

              {isEdit ? (
                <select
                  value={form.inspector}
                  onChange={e => setForm(p => ({ ...p, inspector: e.target.value }))}
                  required
                  className={inputCls}
                >
                  <option value="">-- Select Inspector --</option>
                  {inspectors.map(u => (
                    <option key={u.id} value={u.user?.id || u.id}>
                      {[u.user_detail?.first_name, u.user_detail?.last_name].filter(Boolean).join(' ') || u.user_detail?.username}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="relative">
                  {/* Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      setDropdownOpen(o => !o);
                      setInspectorSearch('');
                    }}
                    className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2 border rounded-xl bg-white dark:bg-slate-700 text-sm transition ${
                      dropdownOpen
                        ? 'border-[#8B1A1A] ring-2 ring-[#8B1A1A]/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex-1 flex flex-wrap gap-1.5 min-w-0 mr-2">
                      {form.inspectors.length === 0 ? (
                        <span className="text-gray-500 dark:text-gray-300 text-sm whitespace-nowrap">Select Inspectors</span>
                      ) : (
                        <>
                          {form.inspectors.slice(0, 3).map(id => {
                            const u = inspectors.find(i => String(i.user?.id || i.id) === id);
                            const name = u
                              ? [u.user_detail?.first_name, u.user_detail?.last_name].filter(Boolean).join(' ') || u.user_detail?.username
                              : id;
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1 bg-[#8B1A1A]/10 text-[#8B1A1A] text-xs font-semibold px-2 py-1 rounded-lg"
                              >
                                {name}
                                <span
                                  onClick={e => {
                                    e.stopPropagation();
                                    toggleInspector(id);
                                  }}
                                  className="cursor-pointer hover:text-[#6a1414] ml-0.5"
                                >
                                  <X className="w-3 h-3" />
</span>
</span>
                            );
                          })}
                          {form.inspectors.length > 3 && (
                            <span className="inline-flex items-center bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs font-semibold px-2 py-1 rounded-lg">
                              +{form.inspectors.length - 3} more
</span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {form.inspectors.length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#8B1A1A] text-white text-[10px] font-bold flex items-center justify-center">
                          {form.inspectors.length}
</span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
</button>

                  {/* Dropdown panel */}
                  {dropdownOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden">
                      {/* Search + bulk actions */}
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-700">
                        <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={inspectorSearch}
                          onChange={e => setInspectorSearch(e.target.value)}
                          placeholder="Search inspectors..."
                          autoFocus
                          className="flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                        />
                        <button
                          type="button"
                          onClick={selectAllInspectors}
                          className="text-[10px] font-bold text-[#8B1A1A] hover:underline whitespace-nowrap"
                        >All
</button>
                        <span className="text-gray-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={clearAllInspectors}
                          className="text-[10px] font-bold text-gray-400 hover:underline"
                        >Clear
</button>
                      </div>

                      {/* Inspector list */}
                      <div className="max-h-48 overflow-y-auto">
                        {inspectors
                          .filter(u =>
                            [u.user_detail?.first_name, u.user_detail?.last_name, u.user_detail?.username]
                              .join(' ')
                              .toLowerCase()
                              .includes(inspectorSearch.toLowerCase())
                          )
                          .map(u => {
                            const id = String(u.user?.id || u.id);
                            const fullName =
                              [u.user_detail?.first_name, u.user_detail?.last_name].filter(Boolean).join(' ') ||
                              u.user_detail?.username;
                            const isChecked = form.inspectors.includes(id);
                            return (
                              <div
                                key={id}
                                onClick={() => toggleInspector(id)}
                                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${
                                  isChecked ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                    isChecked
                                      ? 'bg-[#8B1A1A] border-[#8B1A1A]'
                                      : 'border-gray-300 dark:border-gray-500'
                                  }`}
                                >
                                  {isChecked && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-xs font-semibold truncate ${
                                      isChecked ? 'text-[#8B1A1A]' : 'text-gray-800 dark:text-gray-200'
                                    }`}
                                  >
                                    {fullName}
                                  </p>
                                  <p className="text-[10px] text-gray-400">{u.user_detail?.username}</p>
                                </div>
                              </div>
                            );
                          })}
                        {inspectors.filter(u =>
                          [u.user_detail?.first_name, u.user_detail?.last_name, u.user_detail?.username]
                            .join(' ')
                            .toLowerCase()
                            .includes(inspectorSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-5 text-center text-xs text-gray-400">
                            <Users className="w-5 h-5 mx-auto mb-1 opacity-40" />
                            No inspectors found
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-slate-700 flex items-center justify-between">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {form.inspectors.length > 0 ? (
                            <span className="font-semibold text-[#8B1A1A]">{form.inspectors.length} selected</span>
                          ) : (
                            'None selected'
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => setDropdownOpen(false)}
                          className="text-xs font-bold text-white bg-[#8B1A1A] px-3 py-1 rounded-lg hover:bg-[#7a1717] transition"
                        >Done
</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Week Start Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Week Start Date <span className="text-xs font-normal text-gray-400">(Monday)</span>{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.week_start_date}
                onChange={e => setForm(p => ({ ...p, week_start_date: e.target.value }))}
                required
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Working Days */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-[#8B1A1A] rounded-full" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest break-words">
              Working Days <span className="text-red-500">*</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="roster-days-grid grid gap-2">
              {DAYS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`flex flex-col items-center py-3 rounded-xl text-xs font-bold transition-all border-2 ${
                    form.working_days.includes(d)
                      ? 'bg-[#8B1A1A] text-white border-[#8B1A1A] shadow-md'
                      : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-[#8B1A1A] hover:text-[#8B1A1A]'
                  }`}
                >
                  <span className="text-[10px] font-normal opacity-70 mb-0.5">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][DAYS.indexOf(d)]}
</span>
                  {d}
</button>
              ))}
            </div>
            {form.working_days.length > 0 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#8B1A1A]" />
                <p className="text-sm text-[#8B1A1A] font-semibold">
                  {form.working_days.length} day{form.working_days.length > 1 ? 's' : ''} selected:{' '}
                  {form.working_days.join(' - ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Shift & Location */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-[#8B1A1A] rounded-full" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest break-words">
              Shift & Location
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Shift</label>
              <select
                value={form.shift}
                onChange={e => setForm(p => ({ ...p, shift: e.target.value }))}
                className={inputCls}
              >
                {SHIFTS.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Location</label>
              <select
                value={form.location}
                onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                className={inputCls}
              >
                {LOCATIONS.map(l => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Vessel & Task */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 min-w-0">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-[#8B1A1A] rounded-full" />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest break-words">
              Vessel & Task
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Terminal</label>
                <input
                  type="text"
                  value={form.terminal}
                  onChange={e => setForm(p => ({ ...p, terminal: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. TIPER"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Vessel Name
                </label>
                <input
                  type="text"
                  value={form.vessel_name}
                  onChange={e => setForm(p => ({ ...p, vessel_name: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. MT SEAODYSSEY"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Task / Duty</label>
              <input
                type="text"
                value={form.task}
                onChange={e => setForm(p => ({ ...p, task: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Dip ticket inspection, Shore tank calculation"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className={inputCls}
                placeholder="Additional instructions or remarks..."
              />
            </div>
          </div>
        </div>

        {/* Section 5: Status */}
        {!isEdit && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 min-w-0">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-6 bg-[#8B1A1A] rounded-full" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest break-words">Dispatch</p>
            </div>

            <div className="flex gap-4 flex-col md:flex-row">
              {[
                {
                  value: 'draft',
                  label: 'Save as Draft',
                  desc: 'Inspector will not be notified yet',
                },
                {
                  value: 'sent',
                  label: 'Send Immediately',
                  desc: 'Inspector will receive this assignment now',
                },
              ].map(opt => (
                <label
                  key={opt.value}
                  className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    form.status === opt.value
                      ? 'border-[#8B1A1A] bg-red-50 dark:bg-red-900/10'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={form.status === opt.value}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="mt-1 accent-[#8B1A1A]"
                  />
                  <div>
                    <p
                      className={`text-sm font-bold ${
                        form.status === opt.value
                          ? 'text-[#8B1A1A]'
                          : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={() => navigate('/roster')}
            className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition"
          >Cancel
</button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#8B1A1A] to-[#a52020] text-white text-sm font-semibold hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              <>
                <CheckCircle className="w-4 h-4" /> Save Changes
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />{' '}
                {form.status === 'sent'
                  ? `Create & Send (${form.inspectors.length || 0})`
                  : `Create Assignment${form.inspectors.length > 1 ? ` (${form.inspectors.length})` : ''}`}
              </>
            )}
</button>
        </div>
      </form>
    </div>
  );
};
