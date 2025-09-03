const baseURL = 'http://127.0.0.1:8000/api'
const headers = { 'Content-Type': 'application/json' }

async function request(path, options = {}) {
  const sessionId = sessionStorage.getItem('sessionId')
  const requestHeaders = { ...headers }
  
  if (sessionId) {
    // The HTML frontend sends the session ID in a custom header
    // This matches exactly how the HTML frontend works
    requestHeaders['X-Session-ID'] = sessionId
  }
  
  const res = await fetch(baseURL + path, { 
    ...options, 
    headers: requestHeaders
  })
  
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch (e) { data = text }
  if (!res.ok) {
    const err = new Error(data?.detail || data?.message || res.statusText || 'API error')
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

export function get(path) {
  return request(path, { method: 'GET' })
}

export function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) })
}

export function put(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body) })
}

export function del(path) {
  return request(path, { method: 'DELETE' })
}

export const api = {
  // Auth
  login: (email, password) => post('/auth/login', { email, password }),
  logout: () => post('/auth/logout', {}),
  me: () => get('/auth/me'),

  // Projects
  getAllProjects: () => get('/projects'),
  getMyProjects: () => get('/projects/my-projects'),
  getMyPoProjects: () => get('/projects/my-po-projects'),
  getMyPoProjectsSimple: () => get('/projects/my-po-projects-simple'),
  getMyPoDashboard: () => get('/projects/my-po-dashboard'),
  getProjectUsers: (projectId) => get(`/projects/${projectId}/users`),
  getProjectWeeklyAllocations: (projectId) => get(`/projects/${projectId}/weekly-allocations`),
  getProjectEditableAllocations: (projectId) => get(`/projects/${projectId}/editable-allocations`),
  createAllocation: (projectId, body) => post(`/projects/${projectId}/create-allocation`, body),
  copyLastWeek: (projectId) => post(`/projects/${projectId}/copy-last-week`, {}),

  // Allocation
  getAllocations: (query='') => get(`/allocation${query}`),
  getAllocation: (id) => get(`/allocations/${id}`),
  updateAllocation: (id, body) => put(`/allocations/${id}`, body),
  deleteAllocation: (id) => del(`/allocations/${id}`),
  checkOverallocation: () => get('/allocation/check-overallocation'),
  getUserWeekBreakdown: () => get('/allocation/user-week-breakdown'),

  // Bench
  getBenchSummary: () => get('/bench/summary'),
  getBenchDebug: () => get('/bench/debug'),
  getFullyBenched: () => get('/bench/fully-benched'),
  getPartialBenched: () => get('/bench/partial-benched'),
  getNonBillable: () => get('/bench/non-billable'),
  getOverUtilised: () => get('/bench/over-utilised'),

  // Admin
  getAdminDashboardSummary: () => get('/admin/dashboard-summary'),
  getAdminUserCounts: () => get('/admin/user-counts'),
  getAdminUsersActive: () => get('/admin/users/active'),
  getAdminUsersNew: () => get('/admin/users/new'),
  getAdminUsersInactive: () => get('/admin/users/inactive'),
  getAdminProjectsActive: () => get('/admin/projects/active'),
  getAdminProjectsOnHold: () => get('/admin/projects/on-hold'),
  getAdminProjectsCompleted: () => get('/admin/projects/completed'),

  // Weekly remark
  getWeeklyRemark: (userId, week) => get(`/weekly-remark/${userId}/${week}`),
  updateWeeklyRemark: (userId, week, body) => put(`/weekly-remark/${userId}/${week}`, body),
}
