import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { inspectionService } from '../services/api';
import { ChevronLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const statusConfig = {
  draft:     { label: 'Draft',     icon: Clock,        color: 'gray' },
  submitted: { label: 'Submitted', icon: AlertCircle,  color: 'amber' },
  approved:  { label: 'Approved',  icon: CheckCircle,  color: 'green' },
  rejected:  { label: 'Rejected',  icon: AlertCircle,  color: 'red' },
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl shadow-elevated p-6 md:p-8 max-w-sm w-full mx-4 animate-slide-up">
      <p className="text-lg font-bold text-gray-900 mb-2">Confirm Delete</p>
      <p className="text-gray-600 text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition">Delete</button>
      </div>
    </div>
  </div>
);

const Section = ({ title, subtitle, children }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-base p-4 sm:p-6 md:p-8 mb-6 animate-slide-up min-w-0 border border-transparent dark:border-slate-700">
    {title && (
      <div className="mb-6 pb-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-widest mb-1 break-words">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 break-words">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

const Field = ({ label, value, highlight }) => (
  <div className={`rounded-lg p-3 transition-colors min-w-0 ${highlight ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800' : 'bg-gray-50 dark:bg-slate-700/50'}`}>
    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1 break-words">{label}</p>
    <p className="text-sm font-bold text-gray-900 dark:text-white break-words">{value ?? '-'}</p>
  </div>
);

const TableTH = ({ children }) => (
  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-50 border-b border-gray-200">{children}</th>
);

const TableTD = ({ children, highlight }) => (
  <td className={`px-4 py-3 text-sm border-b border-gray-100 ${highlight ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>{children}</td>
);

const StatBox = ({ label, value, color = 'blue' }) => {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
  };
  
  return (
    <div className={`rounded-lg border p-4 text-center ${colorMap[color]}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold">{value}</p>
    </div>
  );
};

export const InspectionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [actionMsg, setActionMsg]   = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const userRole = localStorage.getItem('user_role');

  useEffect(() => { fetchInspection(); }, [id]); // eslint-disable-line

  const fetchInspection = async () => {
    try { const res = await inspectionService.getInspectionById(id); setInspection(res.data); }
    catch { setError('Failed to load inspection'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try { await inspectionService.deleteInspection(id); navigate('/inspections'); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); setShowDelete(false); }
  };

  const handleApprove = async () => {
    try { await inspectionService.approveInspection(id); setActionMsg('Approved'); fetchInspection(); }
    catch { setActionMsg('Failed to approve'); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try { await inspectionService.rejectInspection(id, { rejection_reason: rejectReason }); setActionMsg('Rejected'); setShowRejectBox(false); fetchInspection(); }
    catch { setActionMsg('Failed to reject'); }
  };

  const handleSubmitForApproval = async () => {
    try { await inspectionService.submitInspection(id); setActionMsg('Submitted'); fetchInspection(); }
    catch { setActionMsg('Failed to submit'); }
  };

  const getInspectionPdf = async () => {
    const res = await inspectionService.generateDocument(id);
    return new Blob([res.data], { type: 'application/pdf' });
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await getInspectionPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dip_Ticket_${inspection.ticket_number || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Failed to download document');
    }
  };

  const handlePrintPdf = async () => {
    try {
      const blob = await getInspectionPdf();
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.onload = () => win.print();
    } catch {
      setError('Failed to print document');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading inspection...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex gap-2">
        <span>{error}</span>
      </div>
    </div>
  );
  
  if (!inspection) return (
    <div className="p-8 text-gray-500">Inspection not found</div>
  );

  const sc = statusConfig[inspection.status] || statusConfig.draft;
  const StatusIcon = sc.icon;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {showDelete && (
        <ConfirmModal
          message={`Delete dip ticket #${inspection.id}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <button onClick={() => navigate('/inspections')} className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />Back
</button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 break-words">
              Inspection
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm md:text-base break-words">
              Ticket #{inspection.ticket_number} • {inspection.vessel_name}
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-xs md:text-sm mt-1 break-words">{inspection.terminal}</p>
          </div>

          {/* Status & Actions */}
          <div className="grid grid-cols-1 sm:flex gap-2 w-full md:w-auto">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border
              ${inspection.status === 'draft' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
              ${inspection.status === 'submitted' ? 'bg-amber-100 text-amber-800 border-amber-200' : ''}
              ${inspection.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' : ''}
              ${inspection.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' : ''}
            `}>
              <StatusIcon className="w-4 h-4" /> {sc.label}
</span>

            {inspection.status === 'draft' && (
              <button onClick={() => navigate(`/inspections/${id}/edit`)} className="px-4 py-2 rounded-lg text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">Edit
</button>
            )}

            <button onClick={() => setShowDelete(true)} className="px-4 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto">Delete
</button>
            <button onClick={handlePrintPdf} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto">Print PDF
</button>
            <button onClick={handleDownloadPdf} className="px-4 py-2 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center justify-center gap-2 w-full sm:w-auto">Download
</button>
            {false && <button onClick={async () => {
              try {
                const res = await inspectionService.generateDocument(id);
                const url = window.URL.createObjectURL(new Blob([res.data]));
                const a = document.createElement('a');
                a.href = url; a.download = `Dip_Ticket_${inspection.ticket_number || id}.pdf`;
                document.body.appendChild(a); a.click();
                window.URL.revokeObjectURL(url); document.body.removeChild(a);
              } catch { setError('Failed to download document'); }
            }} className="px-4 py-2 rounded-lg text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center gap-2">Download
</button>}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {actionMsg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl mb-6 text-sm animate-slide-up">
          {actionMsg}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* HEADER DETAILS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Section title="Dip Ticket Header">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Ticket Number"   value={inspection.ticket_number} highlight />
          <Field label="Tank No"         value={inspection.tank_no} />
          <Field label="Vessel"          value={inspection.vessel_name} />
          <Field label="Product"         value={inspection.product_name || inspection.tank_detail?.product_type} />
          <Field label="Terminal"        value={inspection.terminal} />
          <Field label="Inspection Date" value={new Date(inspection.inspection_date).toLocaleString()} />
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* MEASUREMENTS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Section title="PBPA Dip Measurements">
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TableTH>Particulars</TableTH>
                <TableTH>1st</TableTH>
                <TableTH>2nd</TableTH>
                <TableTH>3rd</TableTH>
                <TableTH>Average</TableTH>
              </tr>
            </thead>
            <tbody>
              {[
                ['Overall Dip (mm)',      'overall_dip_1_mm',       'overall_dip_2_mm',       'overall_dip_3_mm',       'overall_dip_average_mm'],
                ['Product Dip (mm)',      'product_dip_1_mm',       'product_dip_2_mm',       'product_dip_3_mm',       'product_dip_average_mm'],
                ['Product Volume (L)',    'product_volume_1_l',     'product_volume_2_l',     'product_volume_3_l',     'product_volume_average_l'],
                ['Free Water Vol (L)',    'free_water_volume_1_l',  'free_water_volume_2_l',  'free_water_volume_3_l',  'free_water_volume_average_l'],
                ['Tank Temperature (°C)', 'tank_temperature_1_c',   'tank_temperature_2_c',   'tank_temperature_3_c',   'tank_temperature_average_c'],
                ['Specific Gravity',      'specific_gravity_1',     'specific_gravity_2',     'specific_gravity_3',     'specific_gravity_average'],
                ['Sample Temperature (°C)', 'sample_temperature_1_c', 'sample_temperature_2_c', 'sample_temperature_3_c', 'sample_temperature_average_c'],
              ].map(([label, ...fields]) => (
                <tr key={label}>
                  <TableTD highlight>{label}</TableTD>
                  {fields.map((f, i) => <TableTD key={f} highlight={i === 4}>{inspection[f] ?? '—'}</TableTD>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* SEAL & METER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Section title="Seal Position & Meter Readings">
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TableTH>Seal Position</TableTH>
                <TableTH>Seal Number</TableTH>
                <TableTH>Meter Reading</TableTH>
              </tr>
            </thead>
            <tbody>
              {[
                ['Outlet valve seal',   'outlet_valve_seal_number',   `OBS ${inspection.meter_reading_obs ?? '—'}`],
                ['Water valve seal',    'water_valve_seal_number',    `@20 ${inspection.meter_reading_at_20 ?? '—'}`],
                ['Other branches seal', 'other_branches_seal_number', `MTS ${inspection.meter_reading_mts ?? '—'}`],
              ].map(([label, sealField, meter]) => (
                <tr key={label}>
                  <TableTD highlight>{label}</TableTD>
                  <TableTD>{inspection[sealField] || '—'}</TableTD>
                  <TableTD highlight>{meter}</TableTD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* INSPECTION DATA SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {inspection.observations && (
        <Section title="Inspection Data">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Observations</p>
            <p className="text-sm text-gray-700 leading-relaxed">{inspection.observations}</p>
          </div>
        </Section>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* CALCULATIONS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {inspection.calculation && (
        <Section title="Calculations">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Field label="Gross Volume" value={`${inspection.calculation.gross_volume} bbl`} />
            <Field label="Water Volume" value={`${inspection.calculation.water_volume} bbl`} />
            <Field label="Net Volume" value={`${inspection.calculation.net_volume} bbl`} highlight />
            <Field label="Temperature Correction" value={inspection.calculation.temperature_correction_factor} />
            <Field label="Corrected Volume" value={`${inspection.calculation.corrected_volume} bbl`} />
            <StatBox label="NSV" value={inspection.calculation.net_standard_volume} color="blue" />
          </div>
        </Section>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* ACTIONS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Section title="Actions">
        <div className="flex flex-wrap gap-2.5 mb-4">
          {inspection.status === 'draft' && (
            <button onClick={handleSubmitForApproval} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">Submit for Approval
</button>
          )}
          
          {inspection.status === 'submitted' && userRole === 'supervisor' && (
            <>
              <button onClick={handleApprove} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">Approve
</button>
              <button onClick={() => setShowRejectBox(!showRejectBox)} className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">Reject
</button>
            </>
          )}
        </div>

        {showRejectBox && (
          <div className="flex gap-2.5 animate-slide-up">
            <input 
              type="text" 
              placeholder="Enter rejection reason..." 
              value={rejectReason} 
              onChange={e => setRejectReason(e.target.value)} 
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" 
            />
            <button onClick={handleReject} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition">Confirm
</button>
          </div>
        )}
      </Section>
    </div>
  );
};
