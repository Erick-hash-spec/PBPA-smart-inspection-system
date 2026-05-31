import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shoreTankCalculationService } from '../services/api';
import { SubmitModal } from '../components/SubmitModal';
import { Calculator, Plus } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const map = {
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    final: 'bg-green-50 text-green-700 border-green-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
</span>
  );
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 border border-gray-100 dark:border-gray-700">
      <p className="text-gray-800 dark:text-white font-semibold mb-1">Confirm Delete</p>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

export const ShoreTankCalculationListPage = () => {
  const navigate = useNavigate();
  const [calculations, setCalculations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => { fetchCalculations(); }, []); // eslint-disable-line

  const fetchCalculations = async () => {
    try {
      const res = await shoreTankCalculationService.getCalculations();
      setCalculations(res.data.results || res.data);
    } catch { setError('Failed to load shore tank calculations'); }
    finally { setLoading(false); }
  };

  const handleFinalize = async (id) => {
    try { await shoreTankCalculationService.finalizeCalculation(id); fetchCalculations(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to finalize'); }
  };

  const handleDelete = async () => {
    try { await shoreTankCalculationService.deleteCalculation(deleteTarget.id); fetchCalculations(); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); }
    finally { setDeleteTarget(null); }
  };

  const handleDownloadDoc = async (calc) => {
    try {
      const res = await shoreTankCalculationService.generateDocument(calc.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `Shore_Tank_Calc_${calc.calculation_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download document'); }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {submitTarget && (
        <SubmitModal
          docType="Shore Tank Calculation" docTypeKey="shore_tank"
          docId={submitTarget.id} docNumber={submitTarget.calculation_number}
          vesselName={submitTarget.vessel_name} terminal={submitTarget.terminal}
          onDownload={() => handleDownloadDoc(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          message={`Delete calculation #${deleteTarget.calculation_number} for ${deleteTarget.vessel_name}? This cannot be undone.`}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-sm">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shore Tank Calculations</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Terminal volume and weight calculations</p>
          </div>
        </div>
        <button onClick={() => navigate('/shore-tank-calculations/new')}
          className="gradient-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 hover:opacity-90 transition shadow-sm">
          <Plus className="w-4 h-4" />New Calculation
</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-[#8B1A1A]/20 border-t-[#8B1A1A] rounded-full animate-spin" /></div>
      ) : calculations.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center shadow-sm">
          <Calculator className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No calculations found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700">
                  {['Calc No.', 'Vessel', 'Product', 'Terminal', 'Date', 'Std Vol (m³)', 'Weight (MT)', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {calculations.map(calc => (
                  <tr key={calc.id} onClick={() => navigate(`/shore-tank-calculations/${calc.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#8B1A1A] dark:text-red-400 whitespace-nowrap">{calc.calculation_number}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800 dark:text-gray-200">{calc.vessel_name}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{calc.product_name}</td>
                    <td className="px-5 py-3.5 text-gray-600 dark:text-gray-400">{calc.terminal}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{new Date(calc.calculation_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 font-medium">{Number(calc.terminal_standard_volume_m3 || 0).toFixed(3)}</td>
                    <td className="px-5 py-3.5 text-gray-700 dark:text-gray-300 font-medium">{Number(calc.terminal_weight_air_mt || 0).toFixed(3)}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={calc.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="report-actions" onClick={e => e.stopPropagation()}>
                        <button onClick={() => navigate(`/shore-tank-calculations/${calc.id}`)} title="View"
                          className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">View</button>
                        {calc.status === 'draft' && (
                          <button onClick={() => navigate(`/shore-tank-calculations/${calc.id}/edit`)} title="Edit"
                            className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">Edit</button>
                        )}
                        {calc.status === 'draft' && (
                          <button onClick={() => handleFinalize(calc.id)} title="Finalize"
                            className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">Finalize</button>
                        )}
                        {calc.status === 'final' && (
                          <button onClick={() => handleDownloadDoc(calc)} title="Download"
                            className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-700">Download</button>
                        )}
                        {calc.status === 'final' && (
                          submittedIds.has(calc.id)
                            ? <span className="report-action inline-flex items-center gap-1 text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-lg border border-green-200">Sent</span>
                            : <button onClick={() => setSubmitTarget(calc)} title="Submit"
                                className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Submit</button>
                        )}
                        <button onClick={() => setDeleteTarget(calc)} title="Delete"
                          className="report-action px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
