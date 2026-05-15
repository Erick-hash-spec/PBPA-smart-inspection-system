import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { provisionalOuturnService } from '../services/api';
import { SubmitModal } from '../components/SubmitModal';

const ProvisionalOutturnReportListPage = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [submitTarget, setSubmitTarget] = useState(null);
  const [submittedIds, setSubmittedIds] = useState(new Set());

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await provisionalOuturnService.list();
      // Handle paginated response from DRF
      const allReports = response.results || response;
      const filtered = filter === 'all' 
        ? allReports 
        : allReports.filter(r => r.status === filter);
      setReports(filtered);
    } catch (err) {
      setError('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (report) => {
    try {
      const blob = await provisionalOuturnService.generatePDF(report.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `POR_${report.report_number}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { setError('Failed to download PDF'); }
  };

  const handleCreateNew = () => {
    navigate('/provisional-outturn-reports/new');
  };

  const handleEdit = (reportId) => {
    navigate(`/provisional-outturn-reports/${reportId}/edit`);
  };

  const handleView = (reportId) => {
    navigate(`/provisional-outturn-reports/${reportId}`);
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await provisionalOuturnService.delete(reportId);
      setReports(reports.filter(r => r.id !== reportId));
    } catch (err) {
      setError('Failed to delete report: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {submitTarget && (
        <SubmitModal
          docType="Provisional Outturn Report"
          docTypeKey="provisional_outturn"
          docId={submitTarget.id}
          docNumber={submitTarget.report_number}
          vesselName={submitTarget.vessel_name}
          terminal={submitTarget.port || ''}
          onDownload={() => handleDownloadPdf(submitTarget)}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={(id) => { setSubmittedIds(p => new Set(p).add(id)); setSubmitTarget(null); }}
        />
      )}
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Provisional Outturn Reports</h1>
          <p className="text-gray-600 text-sm mt-1">Manage PBPA Provisional Outturn Reports</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-amber-700 hover:bg-amber-800 text-white px-6 py-2 rounded-lg font-medium transition"
        >
          + New Report
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {['all', 'draft', 'final'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded font-medium transition ${
              filter === status
                ? 'bg-amber-700 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-amber-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {' '}
            ({reports.filter(r => status === 'all' || r.status === status).length})
          </button>
        ))}
      </div>

      {/* Reports Table */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">No reports found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Report #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Vessel</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Port</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => (
                <tr
                  key={report.id}
                  className={`border-b border-gray-200 hover:bg-gray-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-amber-700">
                    {report.report_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800">{report.vessel_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{report.product || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{report.port || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDate(report.report_date)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        report.status === 'final'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleView(report.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(report.id)}
                        className="text-amber-600 hover:text-amber-800 text-sm font-medium"
                      >
                        Edit
                      </button>
                      {report.status === 'final' && (
                        submittedIds.has(report.id) ? (
                          <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-lg border border-green-200">
                            ✓ Submitted
                          </span>
                        ) : (
                          <button
                            onClick={() => setSubmitTarget(report)}
                            className="bg-[#8B1A1A] hover:bg-[#7a1717] text-white text-xs font-semibold px-3 py-1 rounded-lg transition"
                          >
                            ✉ Submit
                          </button>
                        )
                      )}
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProvisionalOutturnReportListPage;
