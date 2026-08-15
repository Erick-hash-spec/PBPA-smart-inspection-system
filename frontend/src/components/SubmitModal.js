import React, { useState } from 'react';
import { Send, X, CheckCircle, AlertCircle } from 'lucide-react';
import { submissionService } from '../services/api';

export const SubmitModal = ({ docType, docTypeKey, docId, docNumber, vesselName, terminal, onDownload, onClose, onSubmitted }) => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const getErrorMessage = (data) => {
    if (!data) return 'Submission failed. Please try again.';
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue)) return firstValue[0];
    if (typeof firstValue === 'string') return firstValue;
    return 'Submission failed. Please try again.';
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await submissionService.createSubmission({
        doc_type:    docTypeKey,
        doc_id:      docId,
        doc_number:  docNumber,
        vessel_name: vesselName,
        terminal:    terminal || '',
      });
      setSubmitted(true);
      if (onSubmitted) onSubmitted(docId);
    } catch (err) {
      setError(getErrorMessage(err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Submit to PBPA</h2>
            <p className="text-sm text-gray-500 mt-0.5">{docType} #{docNumber} — {vesselName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <X className="w-5 h-5 text-gray-500" />
</button>
        </div>

        {!submitted ? (
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-5">This document will be submitted to:</p>
            <div className="space-y-3 mb-5">
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-blue-700">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Terminal Representative</p>
                  <p className="text-xs text-gray-500 mt-0.5">On-site terminal representative at the facility</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-green-700">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">PBPA Admin Dashboard</p>
                  <p className="text-xs text-gray-500 mt-0.5">Admin will receive a notification and can view this document</p>
                  <p className="text-xs text-blue-600 mt-0.5">info@pbpa.go.tz</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <p className="text-xs text-gray-400 mb-5 bg-gray-50 rounded-lg p-3">
              Clicking <strong>Submit</strong> will record this submission in the PBPA admin dashboard.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#8B1A1A] hover:bg-[#7a1717] disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Submitting…' : 'Submit'}
</button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition">Cancel
</button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submitted Successfully</h3>
            <p className="text-sm text-gray-500 mb-6">The document has been submitted to PBPA admin successfully.</p>
            <div className="text-left space-y-2 mb-6">
              <div className="bg-blue-50 rounded-lg px-4 py-2 text-sm font-medium text-blue-800">Terminal Representative</div>
              <div className="bg-green-50 rounded-lg px-4 py-2 text-sm font-medium text-green-800">PBPA Admin Dashboard — notified</div>
            </div>
            <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 transition">Close
</button>
          </div>
        )}
      </div>
    </div>
  );
};
