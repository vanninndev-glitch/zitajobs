// src/js/api.js - Cliente API centralizado

const API_BASE = globalThis.ZITAJOBS_API_URL || 'https://zitajobs-api.onrender.com/api';

// ─── TOKEN MANAGEMENT ─────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem('zitajobs_token');
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('zitajobs_user') || 'null'); }
  catch { return null; }
};
export const setAuth = (token, user) => {
  localStorage.setItem('zitajobs_token', token);
  localStorage.setItem('zitajobs_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('zitajobs_token');
  localStorage.removeItem('zitajobs_user');
};
export const isLoggedIn = () => !!getToken();
export const isEmpresa = () => getUser()?.role === 'empresa';
export const isCandidato = () => getUser()?.role === 'candidato';
export const isAdmin = () => !!getUser()?.isAdmin;

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────
const authHeaders = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra
});

async function request(method, endpoint, body = null, isFormData = false) {
  const opts = {
    method,
    headers: isFormData
      ? { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) }
      : authHeaders()
  };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    const data = await res.json();
    if (!res.ok) throw { status: res.status, message: data.message || 'Error de servidor', data };
    return data;
  } catch (err) {
    if (err.status) throw err;
    throw { status: 0, message: 'No se pudo conectar con el servidor. Verifica tu conexión.' };
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data) => request('POST', '/auth/register', data),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  forgotPassword: (email) => request('POST', '/auth/forgot-password', { email }),
  resetPassword: (token, password) => request('POST', '/auth/reset-password', { token, password }),
};

// ─── JOBS ─────────────────────────────────────────────────────────────────────
export const jobs = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request('GET', `/jobs${qs ? '?' + qs : ''}`);
  },
  getOne: (id) => request('GET', `/jobs/${id}`),
  create: (data) => request('POST', '/jobs', data),
  update: (id, data) => request('PUT', `/jobs/${id}`, data),
  delete: (id) => request('DELETE', `/jobs/${id}`),
  getMy: () => request('GET', '/jobs/my'),
  getLocations: () => request('GET', '/jobs/locations'),
  report: (id, reason, details) => request('POST', `/jobs/${id}/report`, { reason, details }),
};

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────
export const applications = {
  apply: (jobId, coverLetter, cvFile) => {
    const fd = new FormData();
    fd.append('jobId', jobId);
    if (coverLetter) fd.append('coverLetter', coverLetter);
    if (cvFile) fd.append('cv', cvFile);
    return request('POST', '/applications', fd, true);
  },
  getMy: () => request('GET', '/applications/my'),
  getForJob: (jobId) => request('GET', `/applications/job/${jobId}`),
  updateStatus: (appId, status) => request('PATCH', `/applications/${appId}/status`, { status }),
};

// ─── USERS ────────────────────────────────────────────────────────────────────
export const users = {
  getProfile: () => request('GET', '/users/profile'),
  updateProfile: (data) => request('PUT', '/users/profile', data),
  uploadCV: (file) => {
    const fd = new FormData(); fd.append('cv', file);
    return request('POST', '/users/upload-cv', fd, true);
  },
  uploadLogo: (file) => {
    const fd = new FormData(); fd.append('logo', file);
    return request('POST', '/users/upload-logo', fd, true);
  },
  getCompanies: (q) => request('GET', `/users/companies${q ? '?q=' + encodeURIComponent(q) : ''}`),
};

// ─── ADMIN (moderación) ───────────────────────────────────────────────────────
export const admin = {
  overview: () => request('GET', '/admin/overview'),
  jobs: (status) => request('GET', `/admin/jobs${status ? '?status=' + encodeURIComponent(status) : ''}`),
  moderateJob: (id, status, note) => request('PATCH', `/admin/jobs/${id}/moderation`, { status, note }),
  reports: (status) => request('GET', `/admin/reports${status ? '?status=' + status : ''}`),
  updateReport: (id, status) => request('PATCH', `/admin/reports/${id}`, { status }),
  companies: (params = {}) => {
    const qs = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString();
    return request('GET', `/admin/companies${qs ? '?' + qs : ''}`);
  },
  verifyCompany: (id, verified) => request('PATCH', `/admin/companies/${id}/verify`, { verified }),
};

// ─── UPLOADS URL ──────────────────────────────────────────────────────────────
export const uploadsUrl = (filename) => filename ? `${API_BASE.replace(/\/api$/, '')}/uploads/${filename}` : null;

export const openOwnCv = async () => {
  const tab = window.open('about:blank', '_blank');
  try { const data = await request('GET', '/users/cv'); if (tab) tab.location.href = data.url; }
  catch (err) { if (tab) tab.close(); throw err; }
};

export const openApplicationCv = async (applicationId) => {
  const tab = window.open('about:blank', '_blank');
  try { const data = await request('GET', `/applications/${applicationId}/cv`); if (tab) tab.location.href = data.url; }
  catch (err) { if (tab) tab.close(); throw err; }
};
