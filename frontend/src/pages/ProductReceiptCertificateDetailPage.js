import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { productReceiptCertificateService } from '../services/api';
import { ChevronLeft } from 'lucide-react';

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

const Field = ({ label, value, highlight }) => (
  <div className={`rounded-lg p-3 transition-colors ${highlight ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm font-bold text-gray-900">{value ?? '—'}</p>
  </div>
);

const TableTH = ({ children }) => (
  <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-widest bg-gray-50 border-b border-gray-200">{children}</th>
);

const TableTD = ({ children, highlight, total }) => (
  <td className={`px-4 py-3 text-sm border-b border-gray-100 ${total ? 'font-bold text-gray-900 bg-blue-50/50' : highlight ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}>{children}</td>
);

export const ProductReceiptCertificateDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => { fetchCertificate(); }, [id]); // eslint-disable-line

  const fetchCertificate = async () => {
    try { const res = await productReceiptCertificateService.getCertificateById(id); setCertificate(res.data); }
    catch { setError('Failed to load certificate'); }
    finally { setLoading(false); }
  };

  const handleIssue = async () => {
    try { const res = await productReceiptCertificateService.issueCertificate(id); setCertificate(res.data); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to issue certificate'); }
  };

  const handleDelete = async () => {
    try { await productReceiptCertificateService.deleteCertificate(id); navigate('/product-receipt-certificates'); }
    catch (err) { setError(err.response?.data?.detail || 'Failed to delete'); setShowDelete(false); }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await productReceiptCertificateService.downloadCertificatePdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `prc-${certificate.certificate_number}.pdf`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { setError('Failed to download PDF'); }
  };

  const handleDownloadDoc = async () => {
    try {
      const res = await productReceiptCertificateService.generateDocument(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `PRC_${certificate.certificate_number}.docx`);
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
    } catch { setError('Failed to generate document'); }
  };

  const handleSign = async () => {
    try {
      const res = await productReceiptCertificateService.signDocument(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `SIGNED_PRC_${certificate.certificate_number}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      fetchCertificate();
    } catch (err) { setError('Signing failed: ' + (err.response?.data?.detail || err.message)); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Loading certificate...</p>
      </div>
    </div>
  );

  if (!certificate) return (
    <div className="p-8 text-gray-500">{error || 'Certificate not found'}</div>
  );

  const isDraft = certificate.status === 'draft';

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-fade-in">
      {showDelete && (
        <ConfirmModal
          message={`Delete certificate #${certificate.certificate_number} for ${certificate.vessel_name}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <button onClick={() => navigate('/product-receipt-certificates')} className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold text-sm mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />Back
</button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Product Receipt Certificate
            </h1>
            <p className="text-gray-500 text-sm md:text-base">
              #{certificate.certificate_number} • {certificate.vessel_name}
            </p>
            <p className="text-gray-400 text-xs md:text-sm mt-1">{certificate.terminal}</p>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {isDraft ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                Draft
</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">Issued
</span>
            )}

            {isDraft && (
              <button onClick={() => navigate(`/product-receipt-certificates/${id}/edit`)} className="px-4 py-2 rounded-lg text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">Edit
</button>
            )}

            <button onClick={() => setShowDelete(true)} className="px-4 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors inline-flex items-center gap-2">Delete
</button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm flex gap-2 animate-slide-up">
          <span>{error}</span>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* CERTIFICATE HEADER SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Section title="Certificate Header">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Vessel Name" value={certificate.vessel_name} highlight />
          <Field label="Terminal" value={certificate.terminal} />
          <Field label="Receipt Date/Time" value={`${new Date(certificate.receipt_date).toLocaleDateString()} ${certificate.receipt_time}`} highlight />
          <Field label="Flowmeter Quantity" value={`${Number(certificate.quantity_received_through_inlet_flowmeters || 0).toLocaleString()} L`} />
          <Field label="Terminal Representative" value={certificate.terminal_representative_name} />
          <Field label="PBPA Inspector" value={certificate.pbpa_inspector_name} />
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* LINE ITEMS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Section title="Line Items">
        <div className="overflow-x-auto -mx-2 md:mx-0">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <TableTH>Tank No.</TableTH>
                <TableTH>Product</TableTH>
                <TableTH>Weight (t)</TableTH>
                <TableTH>Volume (L)</TableTH>
              </tr>
            </thead>
            <tbody>
              {certificate.items && certificate.items.map(item => (
                <tr key={item.id}>
                  <TableTD highlight>{item.tank_no || '—'}</TableTD>
                  <TableTD>{item.product_name}</TableTD>
                  <TableTD highlight>{Number(item.weight_tonnage).toFixed(3)}</TableTD>
                  <TableTD highlight>{Number(item.volume_liters).toFixed(3)}</TableTD>
                </tr>
              ))}
              <tr>
                <TableTD total>TOTAL</TableTD>
                <TableTD total>—</TableTD>
                <TableTD total>{Number(certificate.total_weight_tonnage).toFixed(3)}</TableTD>
                <TableTD total>{Number(certificate.total_volume_liters).toFixed(3)}</TableTD>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* ADDITIONAL DETAILS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      {(certificate.notes || certificate.terminal_representative_signature || certificate.pbpa_inspector_signature) && (
        <Section title="Additional Details">
          {certificate.notes && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-gray-700 leading-relaxed">{certificate.notes}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Terminal Representative Signature" value={certificate.terminal_representative_signature} />
            <Field label="PBPA Inspector Signature" value={certificate.pbpa_inspector_signature} />
          </div>
        </Section>
      )}

      {/* ────────────────────────────────────────────────────────────────── */}
      {/* ACTIONS SECTION */}
      {/* ────────────────────────────────────────────────────────────────── */}
      <Section title="Actions">
        <div className="flex flex-wrap gap-2.5">
          {isDraft && (
            <button onClick={handleIssue} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">Issue Certificate
</button>
          )}

          <button onClick={handleDownloadPdf} className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">Download
</button>

          <button onClick={handleDownloadDoc} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">Word
</button>

          {!certificate.is_signed ? (
            <button onClick={handleSign} className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">Sign & Download
</button>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-purple-100 text-purple-800 border border-purple-200 cursor-help" title={`Signed by ${certificate.signed_by_name || 'PBPA'}`}>Signed
</span>
          )}
        </div>
      </Section>
    </div>
  );
};
