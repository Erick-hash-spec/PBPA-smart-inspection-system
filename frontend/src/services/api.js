import axios from 'axios';
import jwtDecode from 'jwt-decode';

const DEFAULT_LOCAL_API_URL = 'http://localhost:8000/api';
const PRODUCTION_API_URL = 'https://pbpa-smart-inspection-system.onrender.com/api';
const configuredApiUrl = process.env.REACT_APP_API_URL;

export const API_BASE_URL =
  process.env.NODE_ENV === 'production' && (!configuredApiUrl || configuredApiUrl === '/api')
    ? PRODUCTION_API_URL
    : configuredApiUrl || DEFAULT_LOCAL_API_URL;
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const getStoredValue = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);
const setStoredValue = (key, value) => localStorage.setItem(key, value);
export const AUTH_CHANGED_EVENT = 'smart-reporting-auth-changed';
export const notifyAuthChanged = () => window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
const clearAuthStorage = () => {
  [
    'access_token',
    'refresh_token',
    'user_role',
    'user_id',
    'username',
  ].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getStoredValue('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network error (backend down) — redirect to login silently
    if (!error.response) {
      if (getStoredValue('access_token')) {
        clearAuthStorage();
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getStoredValue('refresh_token');
      if (!refreshToken) {
        clearAuthStorage();
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: refreshToken });
        setStoredValue('access_token', response.data.access);
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        return axiosInstance(originalRequest);
      } catch {
        clearAuthStorage();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    if (error.response?.status === 404 && error.response?.data?.detail === 'Not found.') {
      error.response.data.detail = 'This record could not be found, or your account does not have permission to view it.';
    }
    return Promise.reject(error);
  }
);

// ========== AUTH SERVICE ==========
export const authService = {
  login: (username, password) => axiosInstance.post('/auth/token/', { username, password }),
  register: (userData) => axiosInstance.post('/auth/register/', userData),
  logout: () => {
    clearAuthStorage();
    notifyAuthChanged();
  },
  getProfile: () => axiosInstance.get('/users/profile/current_user/'),
  getCurrentUser: () => {
    const token = getStoredValue('access_token');
    if (!token) return null;
    try { return jwtDecode(token); } catch { return null; }
  },
  isAuthenticated: () => !!getStoredValue('access_token'),
  getUserRole: () => getStoredValue('user_role'),
};

// ========== USER MANAGEMENT SERVICE (Admin only) ==========
export const userService = {
  getUsers: () => axiosInstance.get('/users/profile/'),
  getInspectors: () => axiosInstance.get('/users/profile/list_inspectors/'),
  createUser: (data) => axiosInstance.post('/auth/register/', data),
  updateUser: (id, data) => axiosInstance.patch(`/users/profile/${id}/`, data),
  deleteUser: (id) => axiosInstance.delete(`/users/profile/${id}/`),
  setPassword: (id, password) => axiosInstance.post(`/users/profile/${id}/set_password/`, { password }),
};

// ========== ROSTER SERVICE ==========
export const rosterService = {
  getRosters: (params = {}) => axiosInstance.get('/rosters/', { params }),
  getRosterById: (id) => axiosInstance.get(`/rosters/${id}/`),
  createRoster: (data) => axiosInstance.post('/rosters/', data),
  updateRoster: (id, data) => axiosInstance.put(`/rosters/${id}/`, data),
  deleteRoster: (id) => axiosInstance.delete(`/rosters/${id}/`),
  sendRoster: (id) => axiosInstance.post(`/rosters/${id}/send/`),
  cancelRoster: (id) => axiosInstance.post(`/rosters/${id}/cancel/`),
  markRead: (id) => axiosInstance.post(`/rosters/${id}/mark_read/`),
  getUnreadCount: () => axiosInstance.get('/rosters/unread_count/'),
  downloadPdf: (id) => axiosInstance.get(`/rosters/${id}/pdf/`, { responseType: 'blob' }),
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
  getDashboard: (params = {}) => axiosInstance.get('/inspections/dashboard/', { params }),
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

const SIGNING_WORKFLOW = (base) => ({
  inspectorSign:   (id, sig) => axiosInstance.post(`${base}/${id}/inspector_sign/`, { signature: sig }, { responseType: 'blob' }),
  sendToClient:    (id)      => axiosInstance.post(`${base}/${id}/send_to_client/`),
  clientSign:      (id, sig) => axiosInstance.post(`${base}/${id}/client_sign/`, { signature: sig }, { responseType: 'blob' }),
  sendToInspector: (id)      => axiosInstance.post(`${base}/${id}/send_to_inspector/`),
  inspectorVerify: (id)      => axiosInstance.post(`${base}/${id}/inspector_verify/`),
  submitToAdmin:   (id)      => axiosInstance.post(`${base}/${id}/submit_to_admin/`),
});

// ========== PRODUCT RECEIPT CERTIFICATE SERVICE ==========
export const productReceiptCertificateService = {
  getCertificates:       (params = {}) => axiosInstance.get('/product-receipt-certificates/', { params }),
  getCertificateById:    (id) => axiosInstance.get(`/product-receipt-certificates/${id}/`),
  createCertificate:     (data) => axiosInstance.post('/product-receipt-certificates/', data),
  updateCertificate:     (id, data) => axiosInstance.put(`/product-receipt-certificates/${id}/`, data),
  deleteCertificate:     (id) => axiosInstance.delete(`/product-receipt-certificates/${id}/`),
  issueCertificate:      (id) => axiosInstance.post(`/product-receipt-certificates/${id}/issue/`),
  signDocument:          (id) => axiosInstance.post(`/product-receipt-certificates/${id}/sign_document/`, {}, { responseType: 'blob' }),
  signWithImage:         (id, signature) => axiosInstance.post(`/product-receipt-certificates/${id}/sign_with_image/`, { signature }, { responseType: 'blob' }),
  clientSign:            (id, signature) => axiosInstance.post(`/product-receipt-certificates/${id}/client_sign/`, { signature }, { responseType: 'blob' }),
  downloadCertificatePdf:(id) => axiosInstance.get(`/product-receipt-certificates/${id}/pdf/`, { responseType: 'blob' }),
  generateDocument:      (id) => axiosInstance.get(`/product-receipt-certificates/${id}/generate_document/`, { responseType: 'blob' }),
  ...SIGNING_WORKFLOW('/product-receipt-certificates'),
};

// ========== SEAL AND ISOLATION REPORT SERVICE ==========
export const sealIsolationReportService = {
  getReports:      (params = {}) => axiosInstance.get('/seal-isolation-reports/', { params }),
  getReportById:   (id) => axiosInstance.get(`/seal-isolation-reports/${id}/`),
  createReport:    (data) => axiosInstance.post('/seal-isolation-reports/', data),
  updateReport:    (id, data) => axiosInstance.put(`/seal-isolation-reports/${id}/`, data),
  deleteReport:    (id) => axiosInstance.delete(`/seal-isolation-reports/${id}/`),
  issueReport:     (id) => axiosInstance.post(`/seal-isolation-reports/${id}/issue/`),
  signDocument:    (id) => axiosInstance.post(`/seal-isolation-reports/${id}/sign_document/`, {}, { responseType: 'blob' }),
  signWithImage:   (id, signature) => axiosInstance.post(`/seal-isolation-reports/${id}/sign_with_image/`, { signature }, { responseType: 'blob' }),
  clientSign:      (id, signature) => axiosInstance.post(`/seal-isolation-reports/${id}/client_sign/`, { signature }, { responseType: 'blob' }),
  generateDocument:(id) => axiosInstance.get(`/seal-isolation-reports/${id}/generate_document/`, { responseType: 'blob' }),
  ...SIGNING_WORKFLOW('/seal-isolation-reports'),
};

// ========== SHORE TANK CALCULATION SERVICE ==========
export const shoreTankCalculationService = {
  getCalculations:    (params = {}) => axiosInstance.get('/shore-tank-calculations/', { params }),
  getCalculationById: (id) => axiosInstance.get(`/shore-tank-calculations/${id}/`),
  createCalculation:  (data) => axiosInstance.post('/shore-tank-calculations/', data),
  updateCalculation:  (id, data) => axiosInstance.put(`/shore-tank-calculations/${id}/`, data),
  deleteCalculation:  (id) => axiosInstance.delete(`/shore-tank-calculations/${id}/`),
  calculateTankItems: (id) => axiosInstance.post(`/shore-tank-calculations/${id}/calculate/`),
  finalizeCalculation:(id) => axiosInstance.post(`/shore-tank-calculations/${id}/finalize/`),
  signDocument:       (id) => axiosInstance.post(`/shore-tank-calculations/${id}/sign_document/`, {}, { responseType: 'blob' }),
  signWithImage:      (id, signature) => axiosInstance.post(`/shore-tank-calculations/${id}/sign_with_image/`, { signature }, { responseType: 'blob' }),
  clientSign:         (id, signature) => axiosInstance.post(`/shore-tank-calculations/${id}/client_sign/`, { signature }, { responseType: 'blob' }),
  generateDocument:   (id) => axiosInstance.get(`/shore-tank-calculations/${id}/generate_document/`, { responseType: 'blob' }),
  ...SIGNING_WORKFLOW('/shore-tank-calculations'),
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

// ========== SAMPLING FORM SERVICE ==========
export const samplingFormService = {
  getForms:        (params = {}) => axiosInstance.get('/sampling-forms/', { params }),
  getFormById:     (id) => axiosInstance.get(`/sampling-forms/${id}/`),
  createForm:      (data) => axiosInstance.post('/sampling-forms/', data),
  updateForm:      (id, data) => axiosInstance.put(`/sampling-forms/${id}/`, data),
  deleteForm:      (id) => axiosInstance.delete(`/sampling-forms/${id}/`),
  issueForm:       (id) => axiosInstance.post(`/sampling-forms/${id}/issue/`),
  downloadPdf:     (id) => axiosInstance.get(`/sampling-forms/${id}/pdf/`, { responseType: 'blob' }),
  signWithImage:   (id, signature) => axiosInstance.post(`/sampling-forms/${id}/sign_with_image/`, { signature }, { responseType: 'blob' }),
  ...SIGNING_WORKFLOW('/sampling-forms'),
};

// ========== ELECTRONIC SIGNATURE HELPERS (shared across services) ==========
export const signWithImage = (endpoint, id, signature) =>
  axiosInstance.post(`/${endpoint}/${id}/sign_with_image/`, { signature }, { responseType: 'blob' });

export const clientSign = (endpoint, id, signature) =>
  axiosInstance.post(`/${endpoint}/${id}/client_sign/`, { signature }, { responseType: 'blob' });

// ========== SUBMISSION SERVICE ==========
export const submissionService = {
  getSubmissions: (params = {}) => axiosInstance.get('/submissions/', { params }),
  createSubmission: (data) => axiosInstance.post('/submissions/', data),
  markRead: (id) => axiosInstance.post(`/submissions/${id}/mark_read/`),
  markAllRead: () => axiosInstance.post('/submissions/mark_all_read/'),
  getUnreadCount: () => axiosInstance.get('/submissions/unread_count/'),
  deleteSubmission: (id) => axiosInstance.delete(`/submissions/${id}/`),
};

// ========== VESSEL REPORT SERVICE ==========
export const vesselReportService = {
  getReports: (params = {}) => axiosInstance.get('/vessel-reports/', { params }),
  getReportById: (id) => axiosInstance.get(`/vessel-reports/${id}/`),
  createReport: (data) => axiosInstance.post('/vessel-reports/', data),
  updateReport: (id, data) => axiosInstance.put(`/vessel-reports/${id}/`, data),
  deleteReport: (id) => axiosInstance.delete(`/vessel-reports/${id}/`),
  finalizeReport: (id) => axiosInstance.post(`/vessel-reports/${id}/finalize/`),
  cancelReport: (id) => axiosInstance.post(`/vessel-reports/${id}/cancel/`),
  downloadPdf: (id) => axiosInstance.get(`/vessel-reports/${id}/pdf/`, { responseType: 'blob' }),
};

// ========== SERVICE REQUEST SERVICE ==========
export const serviceRequestService = {
  getRequests:    (params = {}) => axiosInstance.get('/service-requests/', { params }),
  getRequestById: (id) => axiosInstance.get(`/service-requests/${id}/`),
  createRequest:  (data) => axiosInstance.post('/service-requests/', data),
  updateRequest:  (id, data) => axiosInstance.put(`/service-requests/${id}/`, data),
  deleteRequest:  (id) => axiosInstance.delete(`/service-requests/${id}/`),
  getUnreadCount: () => axiosInstance.get('/service-requests/unread_count/'),
  markRead:       (id) => axiosInstance.post(`/service-requests/${id}/mark_read/`),
  markAllRead:    () => axiosInstance.post('/service-requests/mark_all_read/'),
  acknowledge:    (id) => axiosInstance.post(`/service-requests/${id}/acknowledge/`),
  assign:         (id, inspector_id) => axiosInstance.post(`/service-requests/${id}/assign/`, { inspector_id }),
  complete:       (id) => axiosInstance.post(`/service-requests/${id}/complete/`),
  cancel:         (id, reason) => axiosInstance.post(`/service-requests/${id}/cancel/`, { reason }),
  getMessages:    (id) => axiosInstance.get(`/service-requests/${id}/messages/`),
  sendMessage:    (id, body) => axiosInstance.post(`/service-requests/${id}/messages/`, { body }),
};

// ========== NOTIFICATION SERVICE ==========
export const notificationService = {
  getNotifications: (params = {}) => axiosInstance.get('/notifications/', { params }),
  getUnreadCount:   (type) => axiosInstance.get('/notifications/unread_count/', type ? { params: { notification_type: type } } : {}),
  markRead:         (id) => axiosInstance.post(`/notifications/${id}/mark_read/`),
  markAllRead:      () => axiosInstance.post('/notifications/mark_all_read/'),
};

// ========== ASTM LOOKUP SERVICE ==========
export const astmService = {
  lookup: (sample_density, sample_temp, tank_temp) =>
    axiosInstance.post('/astm/lookup/', { sample_density, sample_temp, tank_temp }),
};

// ========== ACTIVITY LOG SERVICE ==========
export const activityService = {
  getLogs:   (params = {}) => axiosInstance.get('/activity-logs/', { params }),
  getSummary:(params = {}) => axiosInstance.get('/activity-logs/summary/', { params }),
};

export default axiosInstance;
