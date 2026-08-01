import React, { useState } from 'react';
import { CheckCircle, Send, ArrowLeft, ShieldCheck, Upload, Clock } from 'lucide-react';
import { SignatureModal } from './SignaturePad';

/*
  Signing flow:
    draft            → [inspector signs]           → inspector_signed
    inspector_signed → [inspector sends to term rep]→ sent_to_client
    sent_to_client   → [terminal rep signs + sends] → sent_to_inspector
    sent_to_inspector→ [inspector submits]          → submitted
*/

const STEP_LABELS = {
  draft:             { label: 'Not Signed',             color: 'bg-gray-100 text-gray-600' },
  inspector_signed:  { label: 'Inspector Signed',       color: 'bg-blue-100 text-blue-700' },
  sent_to_client:    { label: 'Sent to Terminal Rep',   color: 'bg-indigo-100 text-indigo-700' },
  client_signed:     { label: 'Terminal Rep Signed',    color: 'bg-purple-100 text-purple-700' },
  sent_to_inspector: { label: 'Ready to Submit',        color: 'bg-amber-100 text-amber-800' },
  verified:          { label: 'Ready to Submit',        color: 'bg-amber-100 text-amber-800' },
  submitted:         { label: 'Submitted to Admin',     color: 'bg-green-100 text-green-700' },
};

function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const SigningActions = ({
  doc,
  role,
  service,
  docLabel,
  onRefresh,
  setError,
  counterpartyLabel = 'Client',
  counterpartySendLabel = 'Client',
}) => {
  const step = doc?.signing_step || 'draft';
  const [sigModal, setSigModal] = useState(null); // 'inspector' | 'client'
  const [loading, setLoading]   = useState(false);

  const docNum = doc?.report_number || doc?.certificate_number || doc?.calculation_number || doc?.form_number || doc?.id;

  const run = async (fn, successMsg) => {
    setLoading(true);
    try {
      await fn();
      await onRefresh();
    } catch (err) {
      setError(err.response?.data?.detail || successMsg + ' failed.');
    } finally { setLoading(false); }
  };

  const handleInspectorSign = async (sigDataUrl) => {
    setLoading(true);
    try {
      const res = await service.inspectorSign(doc.id, sigDataUrl);
      downloadBlob(res.data, `InspectorSigned_${docNum}.pdf`);
      setSigModal(null);
      await onRefresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Inspector signing failed.');
    } finally { setLoading(false); }
  };

  const handleClientSign = async (sigDataUrl) => {
    setLoading(true);
    try {
      const res = await service.clientSign(doc.id, sigDataUrl);
      downloadBlob(res.data, `ClientSigned_${docNum}.pdf`);
      setSigModal(null);
      await onRefresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Client signing failed.');
    } finally { setLoading(false); }
  };

  const stepMeta = { ...(STEP_LABELS[step] || STEP_LABELS.draft) };
  if (counterpartyLabel !== 'Client') {
    if (step === 'sent_to_client') stepMeta.label = `Sent to ${counterpartyLabel}`;
    if (step === 'client_signed') stepMeta.label = `${counterpartyLabel} Signed`;
  }

  return (
    <div>
      {/* Step badge */}
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-gray-400" />
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${stepMeta.color}`}>
          Signing: {stepMeta.label}
        </span>
      </div>

      {/* Step-aware buttons */}
      <div className="flex flex-wrap gap-2">

        {/* STEP 1 — Inspector signs */}
        {step === 'draft' && role === 'inspector' && (
          <button
            onClick={() => setSigModal('inspector')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition"
          >
            <ShieldCheck className="w-4 h-4" /> Sign as Inspector
          </button>
        )}

        {/* STEP 2 — Inspector sends to terminal rep */}
        {step === 'inspector_signed' && role === 'inspector' && (
          <button
            onClick={() => run(() => service.sendToClient(doc.id), `Send to ${counterpartySendLabel.toLowerCase()}`)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Send className="w-4 h-4" /> Send to {counterpartySendLabel}
          </button>
        )}

        {/* STEP 3 — Terminal rep signs then immediately sends back */}
        {step === 'sent_to_client' && role === 'terminal_representative' && (
          <button
            onClick={() => setSigModal('client')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition"
          >
            <ShieldCheck className="w-4 h-4" /> Sign &amp; Send Back to Inspector
          </button>
        )}

        {/* STEP 4 — Inspector submits to Admin (+ terminal rep notified) */}
        {(step === 'sent_to_inspector' || step === 'verified') && role === 'inspector' && (
          <button
            onClick={() => run(() => service.submitToAdmin(doc.id), 'Submit to admin')}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition"
          >
            <Upload className="w-4 h-4" /> Submit to Admin
          </button>
        )}

        {/* TERMINAL — submitted */}
        {step === 'submitted' && (
          <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle className="w-4 h-4" /> Submitted to Admin
          </span>
        )}

        {/* Waiting indicators */}
        {step === 'sent_to_client' && role === 'inspector' && (
          <span className="text-sm text-gray-500 italic py-2">Awaiting {counterpartyLabel.toLowerCase()} signature...</span>
        )}
        {(step === 'inspector_signed' || step === 'sent_to_inspector' || step === 'verified') && role === 'terminal_representative' && (
          <span className="text-sm text-gray-500 italic py-2">Awaiting inspector action…</span>
        )}
      </div>

      {/* Signature modals */}
      <SignatureModal
        open={sigModal === 'inspector'}
        onClose={() => setSigModal(null)}
        onConfirm={handleInspectorSign}
        loading={loading}
        title="Inspector Signature"
        signerLabel={`${docLabel} ${docNum}`}
      />
      <SignatureModal
        open={sigModal === 'client'}
        onClose={() => setSigModal(null)}
        onConfirm={handleClientSign}
        loading={loading}
        title={`${counterpartyLabel} Signature`}
        signerLabel={`${docLabel} ${docNum}`}
      />
    </div>
  );
};

