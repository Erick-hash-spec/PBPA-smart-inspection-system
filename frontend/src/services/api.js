import axios from 'axios';
import jwtDecode from 'jwt-decode';

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: refreshToken });
        localStorage.setItem('access_token', response.data.access);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// ========== AUTH SERVICE ==========
export const authService = {
  login: (username, password) => axiosInstance.post('/auth/token/', { username, password }),
  register: (userData) => axiosInstance.post('/auth/register/', userData),
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
  },
  getProfile: () => axiosInstance.get('/users/profile/current_user/'),
  getCurrentUser: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try { return jwtDecode(token); } catch { return null; }
  },
  isAuthenticated: () => !!localStorage.getItem('access_token'),
  getUserRole: () => localStorage.getItem('user_role'),
};

// ========== TANK SERVICE ==========
export const tankService = {
  getTanks: (params = {}) => axiosInstance.get('/tanks/', { params }),
  getTankById: (id) => axiosInstance.get(`/tanks/${id}/`),
  getTankHistory: (id, page = 1) => axiosInstance.get(`/tanks/${id}/inspection_history/`, { params: { page } }),
  getTanksSummary: () => axiosInstance.get('/tanks/summary/'),
  createTank: (data) => axiosInstance.post('/tanks/', data),
  updateTank: (id, data) => axiosInstance.put(`/tanks/${id}/`, data),
  deleteTank: (id) => axiosInstance.delete(`/tanks/${id}/`),
};

// ========== INSPECTION (DIP TICKET) SERVICE ==========
export const inspectionService = {
  getInspections: (params = {}) => axiosInstance.get('/inspections/', { params }),
  getInspectionById: (id) => axiosInstance.get(`/inspections/${id}/`),
  createInspection: (data) => axiosInstance.post('/inspections/', data),
  updateInspection: (id, data) => axiosInstance.put(`/inspections/${id}/`, data),
  deleteInspection: (id) => axiosInstance.delete(`/inspections/${id}/`),
  submitInspection: (id) => axiosInstance.post(`/inspections/${id}/submit/`),
  approveInspection: (id) => axiosInstance.post(`/inspections/${id}/approve/`),
  rejectInspection: (id, data) => axiosInstance.post(`/inspections/${id}/reject/`, data),
  getRecentInspections: (limit = 10) => axiosInstance.get('/inspections/recent/', { params: { limit } }),
  getDashboard: () => axiosInstance.get('/inspections/dashboard/'),
  generateDocument: (id) => axiosInstance.get(`/inspections/${id}/generate_document/`, { responseType: 'blob' }),
};

// ========== SEAL SERVICE ==========
export const sealService = {
  getSeals: (inspectionId) => axiosInstance.get('/seals/', { params: { inspection_id: inspectionId } }),
  createSeal: (data) => axiosInstance.post('/seals/', data),
  updateSeal: (id, data) => axiosInstance.put(`/seals/${id}/`, data),
  deleteSeal: (id) => axiosInstance.delete(`/seals/${id}/`),
};

// ========== ISOLATION SERVICE ==========
export const isolationService = {
  getIsolations: (inspectionId) => axiosInstance.get('/isolations/', { params: { inspection_id: inspectionId } }),
  createIsolation: (data) => axiosInstance.post('/isolations/', data),
  updateIsolation: (id, data) => axiosInstance.put(`/isolations/${id}/`, data),
  deleteIsolation: (id) => axiosInstance.delete(`/isolations/${id}/`),
};

// ========== CALCULATION SERVICE ==========
export const calculationService = {
  getCalculation: (inspectionId) => axiosInstance.get(`/calculations/?inspection_id=${inspectionId}`),
};

// ========== REPORT SERVICE ==========
export const reportService = {
  getReports: (inspectionId) => axiosInstance.get('/reports/', { params: { inspection_id: inspectionId } }),
  downloadReport: (id) => axiosInstance.get(`/reports/${id}/report_file/`, { responseType: 'blob' }),
};

// ========== PRODUCT RECEIPT CERTIFICATE SERVICE ==========
export const productReceiptCertificateService = {
  getCertificates: (params = {}) => axiosInstance.get('/product-receipt-certificates/', { params }),
  getCertificateById: (id) => axiosInstance.get(`/product-receipt-certificates/${id}/`),
  createCertificate: (data) => axiosInstance.post('/product-receipt-certificates/', data),
  updateCertificate: (id, data) => axiosInstance.put(`/product-receipt-certificates/${id}/`, data),
  deleteCertificate: (id) => axiosInstance.delete(`/product-receipt-certificates/${id}/`),
  issueCertificate: (id) => axiosInstance.post(`/product-receipt-certificates/${id}/issue/`),
  signDocument: (id) => axiosInstance.post(`/product-receipt-certificates/${id}/sign_document/`, {}, { responseType: 'blob' }),
  downloadCertificatePdf: (id) => axiosInstance.get(`/product-receipt-certificates/${id}/pdf/`, { responseType: 'blob' }),
  generateDocument: (id) => axiosInstance.get(`/product-receipt-certificates/${id}/generate_document/`, { responseType: 'blob' }),
};

// ========== SEAL AND ISOLATION REPORT SERVICE ==========
export const sealIsolationReportService = {
  getReports: (params = {}) => axiosInstance.get('/seal-isolation-reports/', { params }),
  getReportById: (id) => axiosInstance.get(`/seal-isolation-reports/${id}/`),
  createReport: (data) => axiosInstance.post('/seal-isolation-reports/', data),
  updateReport: (id, data) => axiosInstance.put(`/seal-isolation-reports/${id}/`, data),
  deleteReport: (id) => axiosInstance.delete(`/seal-isolation-reports/${id}/`),
  issueReport: (id) => axiosInstance.post(`/seal-isolation-reports/${id}/issue/`),
  signDocument: (id) => axiosInstance.post(`/seal-isolation-reports/${id}/sign_document/`, {}, { responseType: 'blob' }),
  generateDocument: (id) => axiosInstance.get(`/seal-isolation-reports/${id}/generate_document/`, { responseType: 'blob' }),
};

// ========== SHORE TANK CALCULATION SERVICE ==========
export const shoreTankCalculationService = {
  getCalculations: (params = {}) => axiosInstance.get('/shore-tank-calculations/', { params }),
  getCalculationById: (id) => axiosInstance.get(`/shore-tank-calculations/${id}/`),
  createCalculation: (data) => axiosInstance.post('/shore-tank-calculations/', data),
  updateCalculation: (id, data) => axiosInstance.put(`/shore-tank-calculations/${id}/`, data),
  deleteCalculation: (id) => axiosInstance.delete(`/shore-tank-calculations/${id}/`),
  calculateTankItems: (id) => axiosInstance.post(`/shore-tank-calculations/${id}/calculate/`),
  finalizeCalculation: (id) => axiosInstance.post(`/shore-tank-calculations/${id}/finalize/`),
  signDocument: (id) => axiosInstance.post(`/shore-tank-calculations/${id}/sign_document/`, {}, { responseType: 'blob' }),
  generateDocument: (id) => axiosInstance.get(`/shore-tank-calculations/${id}/generate_document/`, { responseType: 'blob' }),
};

// ========== STOCK REPORT SERVICE ==========
export const stockReportService = {
  getReports:    (params = {}) => axiosInstance.get('/stock-reports/', { params }),
  getReportById: (id) => axiosInstance.get(`/stock-reports/${id}/`),
  createReport:  (data) => axiosInstance.post('/stock-reports/', data),
  updateReport:  (id, data) => axiosInstance.put(`/stock-reports/${id}/`, data),
  deleteReport:  (id) => axiosInstance.delete(`/stock-reports/${id}/`),
  finalizeReport:(id) => axiosInstance.post(`/stock-reports/${id}/finalize/`),
  downloadPdf:   (id) => axiosInstance.get(`/stock-reports/${id}/pdf/`, { responseType: 'blob' }),
};

// ========== PROVISIONAL OUTTURN REPORT SERVICE ==========
export const provisionalOuturnService = {
  list:         (params = {}) => axiosInstance.get('/provisional-outturn-reports/', { params }).then(r => r.data),
  retrieve:     (id) => axiosInstance.get(`/provisional-outturn-reports/${id}/`).then(r => r.data),
  create:       (data) => axiosInstance.post('/provisional-outturn-reports/', data).then(r => r.data),
  update:       (id, data) => axiosInstance.put(`/provisional-outturn-reports/${id}/`, data).then(r => r.data),
  delete:       (id) => axiosInstance.delete(`/provisional-outturn-reports/${id}/`).then(r => r.data),
  finalize:     (id) => axiosInstance.post(`/provisional-outturn-reports/${id}/finalize/`).then(r => r.data),
  generatePDF:  (id) => axiosInstance.get(`/provisional-outturn-reports/${id}/pdf/`, { responseType: 'blob' }).then(r => r.data),
  generateDocx: (id) => axiosInstance.get(`/provisional-outturn-reports/${id}/docx/`, { responseType: 'blob' }).then(r => r.data),
};

// ========== SUBMISSION SERVICE ==========
export const submissionService = {
  getSubmissions: (params = {}) => axiosInstance.get('/submissions/', { params }),
  createSubmission: (data) => axiosInstance.post('/submissions/', data),
  markRead: (id) => axiosInstance.post(`/submissions/${id}/mark_read/`),
  markAllRead: () => axiosInstance.post('/submissions/mark_all_read/'),
  getUnreadCount: () => axiosInstance.get('/submissions/unread_count/'),
};

// ========== VESSEL REPORT SERVICE ==========
export const vesselReportService = {
  getReports: (params = {}) => axiosInstance.get('/vessel-reports/', { params }),
  getReportById: (id) => axiosInstance.get(`/vessel-reports/${id}/`),
  createReport: (data) => axiosInstance.post('/vessel-reports/', data),
  updateReport: (id, data) => axiosInstance.put(`/vessel-reports/${id}/`, data),
  deleteReport: (id) => axiosInstance.delete(`/vessel-reports/${id}/`),
  finalizeReport: (id) => axiosInstance.post(`/vessel-reports/${id}/finalize/`),
  downloadPdf: (id) => axiosInstance.get(`/vessel-reports/${id}/pdf/`, { responseType: 'blob' }),
};

// ========== ASTM LOOKUP SERVICE ==========
export const astmService = {
  lookup: (sample_density, sample_temp, tank_temp) =>
    axiosInstance.post('/astm/lookup/', { sample_density, sample_temp, tank_temp }),
};

export default axiosInstance;
