import { config } from '../config/environment.js'

const baseURL = config.api.baseUrl
const headers = { 'Content-Type': 'application/json' }

async function request(path, options = {}) {
  const sessionId = sessionStorage.getItem('sessionId')
  const requestHeaders = { ...headers }
  
  if (sessionId) {
    // The HTML frontend sends the session ID in a custom header
    // This matches exactly how the HTML frontend works
    requestHeaders['X-Session-ID'] = sessionId
  }
  
  // Add timeout and debug logging
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), config.api.timeout)
  
  if (config.debug.enabled && config.debug.consoleLogging) {
    console.log(`🌐 API Request: ${options.method || 'GET'} ${baseURL + path}`)
  }
  
  try {
    const res = await fetch(baseURL + path, { 
      ...options, 
      headers: requestHeaders,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    const text = await res.text()
    let data = null
    try { data = text ? JSON.parse(text) : null } catch (e) { data = text }
    
    if (!res.ok) {
      if (config.debug.enabled && config.debug.consoleLogging) {
        console.error(`❌ API Error: ${res.status} ${res.statusText} - ${path}`, data)
      }
      const err = new Error(data?.detail || data?.message || res.statusText || 'API error')
      err.status = res.status
      err.data = data
      throw err
    }
    
    if (config.debug.enabled && config.debug.consoleLogging) {
      console.log(`✅ API Response: ${path}`, data)
    }
    
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${config.api.timeout}ms`)
    }
    throw error
  }
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
  saveAllocation: (body) => post('/allocation', body),
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
  
  // Note: Admin uses same APIs as PO - backend grants admin access to all projects

  // Weekly remark
  getWeeklyRemark: (userId, week) => get(`/weekly-remark/${userId}/${week}`),
  updateWeeklyRemark: (userId, week, body) => put(`/weekly-remark/${userId}/${week}`, body),

  // Bench Summary APIs
  getBenchSummary: (year, week) => get(`/bench/summary?year=${year}&week=${week}`),
  getBenchData: (endpoint, year, week) => get(`/bench/${endpoint}?year=${year}&week=${week}`),
  getAdminDashboardSummary: () => get('/admin/dashboard-summary'),
}
