import React, { useState, useEffect } from 'react';
import { userService } from '../services/api';
import {
  Users, Plus, Pencil, Trash2, Eye, EyeOff, X, AlertCircle,
  CheckCircle, Shield, UserCheck, KeyRound, Search,
} from 'lucide-react';

const ROLES = ['inspector', 'supervisor', 'admin'];

const roleBadge = {
  admin:      'bg-purple-100 text-purple-700 border-purple-200',
  supervisor: 'bg-blue-100 text-blue-700 border-blue-200',
  inspector:  'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const EMPTY_FORM = { username: '', email: '', first_name: '', last_name: '', role: 'inspector', password: '', confirm_password: '' };

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700 animate-slide-up">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3.5 py-2.5 border-2 border-gray-100 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:border-[#8B1A1A] focus:bg-white dark:focus:bg-slate-600 transition outline-none";

export const UserManagementPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // 'create' | 'edit' | 'delete' | 'password'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [pwForm, setPwForm] = useState({ password: '', confirm_password: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null); // { type: 'success'|'error', msg }

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers();
      setUsers(res.data.results || res.data);
    } catch { showBanner('error', 'Failed to load users.'); }
    finally { setLoading(false); }
  };

  const showBanner = (type, msg) => {
    setBanner({ type, msg });
    setTimeout(() => setBanner(null), 4000);
  };

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit = (u) => {
    setSelected(u);
    setForm({ username: u.user_detail?.username || '', email: u.user_detail?.email || '', first_name: u.user_detail?.first_name || '', last_name: u.user_detail?.last_name || '', role: u.role || 'inspector', password: '', confirm_password: '' });
    setModal('edit');
  };
  const openDelete = (u) => { setSelected(u); setModal('delete'); };
  const openPassword = (u) => { setSelected(u); setPwForm({ password: '', confirm_password: '' }); setModal('password'); };
  const closeModal = () => { setModal(null); setSelected(null); setSaving(false); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) return showBanner('error', 'Passwords do not match.');
    if (form.password.length < 8) return showBanner('error', 'Password must be at least 8 characters.');
    setSaving(true);
    try {
      await userService.createUser({ username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, password: form.password, confirm_password: form.confirm_password, role: form.role });
      showBanner('success', `User "${form.username}" created successfully.`);
      closeModal(); fetchUsers();
    } catch (err) {
      const data = err.response?.data;
      showBanner('error', data ? Object.values(data).flat().join(' ') : 'Failed to create user.');
    } finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.updateUser(selected.id, { role: form.role, user: { first_name: form.first_name, last_name: form.last_name, email: form.email } });
      showBanner('success', 'User updated successfully.');
      closeModal(); fetchUsers();
    } catch { showBanner('error', 'Failed to update user.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await userService.deleteUser(selected.id);
      showBanner('success', 'User deleted.');
      closeModal(); fetchUsers();
    } catch { showBanner('error', 'Failed to delete user.'); }
    finally { setSaving(false); }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (pwForm.password !== pwForm.confirm_password) return showBanner('error', 'Passwords do not match.');
    if (pwForm.password.length < 8) return showBanner('error', 'Password must be at least 8 characters.');
    setSaving(true);
    try {
      await userService.setPassword(selected.id, pwForm.password);
      showBanner('success', 'Password updated successfully.');
      closeModal();
    } catch { showBanner('error', 'Failed to update password.'); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (u.user_detail?.username || '').toLowerCase().includes(q) ||
      (u.user_detail?.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Admin-only — manage system users</p>
          </div>
        </div>
        <button onClick={openCreate} className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:shadow-lg transition inline-flex items-center gap-2 hover-lift">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Banner */}
      {banner && (
        <div className={`mb-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium animate-slide-up ${banner.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {banner.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {banner.msg}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by username, email or role..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:border-[#8B1A1A] outline-none transition" />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-100 border-t-[#8B1A1A] rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No users found</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                    {['User', 'Email', 'Role', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {filtered.map(u => {
                    const uname = u.user_detail?.username || '—';
                    const fname = [u.user_detail?.first_name, u.user_detail?.last_name].filter(Boolean).join(' ') || null;
                    const initials = uname.slice(0, 2).toUpperCase();
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">{initials}</div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{uname}</p>
                              {fname && <p className="text-xs text-gray-400">{fname}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{u.user_detail?.email || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${roleBadge[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            <Shield className="w-3 h-3" />{u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${u.is_active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            <UserCheck className="w-3 h-3" />{u.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openEdit(u)} title="Edit" className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 transition border border-amber-200 dark:border-amber-700">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openPassword(u)} title="Set Password" className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 transition border border-blue-200 dark:border-blue-700">
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openDelete(u)} title="Delete" className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 transition border border-red-200 dark:border-red-700">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {filtered.map(u => {
                const uname = u.user_detail?.username || '—';
                const initials = uname.slice(0, 2).toUpperCase();
                return (
                  <div key={u.id} className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">{uname}</p>
                          <p className="text-xs text-gray-400">{u.user_detail?.email || '—'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border capitalize ${roleBadge[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{u.role}</span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openEdit(u)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center justify-center gap-1"><Pencil className="w-3 h-3" />Edit</button>
                      <button onClick={() => openPassword(u)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center justify-center gap-1"><KeyRound className="w-3 h-3" />Password</button>
                      <button onClick={() => openDelete(u)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 inline-flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" />Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── CREATE MODAL ── */}
      {modal === 'create' && (
        <Modal title="Add New User" onClose={closeModal}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name"><input className={inputCls} value={form.first_name} onChange={e => setForm(p => ({...p, first_name: e.target.value}))} placeholder="John" /></Field>
              <Field label="Last Name"><input className={inputCls} value={form.last_name} onChange={e => setForm(p => ({...p, last_name: e.target.value}))} placeholder="Doe" /></Field>
            </div>
            <Field label="Username"><input className={inputCls} required value={form.username} onChange={e => setForm(p => ({...p, username: e.target.value}))} placeholder="username" /></Field>
            <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="user@example.com" /></Field>
            <Field label="Role">
              <select className={inputCls} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </Field>
            <Field label="Password">
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={inputCls + ' pr-10'} required minLength={8} value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </Field>
            <Field label="Confirm Password">
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} className={inputCls + ' pr-10'} required value={form.confirm_password} onChange={e => setForm(p => ({...p, confirm_password: e.target.value}))} placeholder="Repeat password" />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:shadow-lg transition disabled:opacity-50">
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── EDIT MODAL ── */}
      {modal === 'edit' && (
        <Modal title={`Edit — ${selected?.user_detail?.username}`} onClose={closeModal}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name"><input className={inputCls} value={form.first_name} onChange={e => setForm(p => ({...p, first_name: e.target.value}))} /></Field>
              <Field label="Last Name"><input className={inputCls} value={form.last_name} onChange={e => setForm(p => ({...p, last_name: e.target.value}))} /></Field>
            </div>
            <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} /></Field>
            <Field label="Role">
              <select className={inputCls} value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:shadow-lg transition disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── SET PASSWORD MODAL ── */}
      {modal === 'password' && (
        <Modal title={`Set Password — ${selected?.user_detail?.username}`} onClose={closeModal}>
          <form onSubmit={handleSetPassword} className="space-y-4">
            <Field label="New Password">
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={inputCls + ' pr-10'} required minLength={8} value={pwForm.password} onChange={e => setPwForm(p => ({...p, password: e.target.value}))} placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </Field>
            <Field label="Confirm Password">
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} className={inputCls + ' pr-10'} required value={pwForm.confirm_password} onChange={e => setPwForm(p => ({...p, confirm_password: e.target.value}))} placeholder="Repeat password" />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:shadow-lg transition disabled:opacity-50">
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── DELETE MODAL ── */}
      {modal === 'delete' && (
        <Modal title="Delete User" onClose={closeModal}>
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-gray-800 dark:text-white font-semibold mb-1">Delete <span className="text-red-600">"{selected?.user_detail?.username}"</span>?</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">This action cannot be undone. All data associated with this user will be removed.</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50">
                {saving ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
