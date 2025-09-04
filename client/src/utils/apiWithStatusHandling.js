import { config } from '../config/environment.js'

const baseURL = config.api.baseUrl
const headers = { 'Content-Type': 'application/json' }

// Global notification handler - will be set by the app
let globalNotificationHandler = null

export function setGlobalNotificationHandler(handler) {
  globalNotificationHandler = handler
}

// Auto-logout function
function handleAutoLogout() {
  // Clear all session data
  sessionStorage.removeItem('sessionId')
  sessionStorage.removeItem('currentUser')
  sessionStorage.removeItem('currentEmail')
  sessionStorage.removeItem('userData')
  sessionStorage.removeItem('currentRole')
  
  // Show unauthorized notification
  if (globalNotificationHandler) {
    globalNotificationHandler.showUnauthorized()
  }
  
  // Redirect to login after a short delay
  setTimeout(() => {
    window.location.href = '/login'
  }, 2000)
}

// Handle different HTTP status codes
function handleHttpError(error, path) {
  const status = error.status
  
  if (config.debug.enabled && config.debug.consoleLogging) {
    console.error(`❌ API Error: ${status} - ${path}`, error)
  }
  
  switch (status) {
    case 401:
      // Unauthorized - Auto logout
      console.warn('🔒 Unauthorized access - logging out user')
      handleAutoLogout()
      break
      
    case 403:
      // Forbidden - Show permission denied
      if (globalNotificationHandler) {
        const resource = getResourceNameFromPath(path)
        globalNotificationHandler.showForbidden(resource)
      }
      break
      
    case 404:
      // Not Found
      if (globalNotificationHandler) {
        globalNotificationHandler.showError(
          `The requested resource was not found. Please check if the URL is correct.`,
          5000
        )
      }
      break
      
    case 429:
      // Too Many Requests
      if (globalNotificationHandler) {
        globalNotificationHandler.showWarning(
          'Too many requests. Please wait a moment before trying again.',
          6000
        )
      }
      break
      
    case 500:
    case 502:
    case 503:
    case 504:
      // Server Errors
      if (globalNotificationHandler) {
        globalNotificationHandler.showServerError()
      }
      break
      
    default:
      // Generic error
      if (globalNotificationHandler) {
        const message = error.message || `Request failed with status ${status}`
        globalNotificationHandler.showError(message, 5000)
      }
  }
  
  // Re-throw the error for component-level handling
  throw error
}

// Extract resource name from API path for better error messages
function getResourceNameFromPath(path) {
  if (path.includes('/projects')) return 'project data'
  if (path.includes('/allocation')) return 'allocation data'
  if (path.includes('/bench')) return 'bench data'
  if (path.includes('/admin')) return 'admin data'
  if (path.includes('/auth')) return 'authentication'
  return 'this resource'
}

// Enhanced request function with status code handling
async function request(path, options = {}) {
  const sessionId = sessionStorage.getItem('sessionId')
  const requestHeaders = { ...headers }
  
  if (sessionId) {
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
      const err = new Error(data?.detail || data?.message || res.statusText || 'API error')
      err.status = res.status
      err.data = data
      
      // Handle the error based on status code
      handleHttpError(err, path)
      return // handleHttpError will throw, so this won't execute
    }
    
    if (config.debug.enabled && config.debug.consoleLogging) {
      console.log(`✅ API Response: ${path}`, data)
    }
    
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${config.api.timeout}ms`)
      if (globalNotificationHandler) {
        globalNotificationHandler.showNetworkError()
      }
      throw timeoutError
    }
    
    // Network error or other fetch errors
    if (!error.status && globalNotificationHandler) {
      globalNotificationHandler.showNetworkError()
    }
    
    throw error
  }
}

// HTTP method wrappers
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

// Enhanced API object with better error handling
export const apiWithStatusHandling = {
  // Auth
  login: async (email, password) => {
    try {
      const response = await post('/auth/login', { email, password })
      if (globalNotificationHandler && response.success) {
        globalNotificationHandler.showSuccess('Login successful! Welcome back.', 3000)
      }
      return response
    } catch (error) {
      // Login-specific error handling
      if (error.status === 401) {
        if (globalNotificationHandler) {
          globalNotificationHandler.showError(
            'Invalid email or password. Please check your credentials and try again.',
            5000
          )
        }
      }
      throw error
    }
  },
  
  logout: async () => {
    try {
      const response = await post('/auth/logout', {})
      if (globalNotificationHandler) {
        globalNotificationHandler.showInfo('You have been logged out successfully.', 3000)
      }
      return response
    } catch (error) {
      // Even if logout fails on server, clear local session
      sessionStorage.clear()
      throw error
    }
  },
  
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
  
  createAllocation: async (projectId, body) => {
    try {
      const response = await post(`/projects/${projectId}/create-allocation`, body)
      if (globalNotificationHandler) {
        globalNotificationHandler.showSuccess('Allocation created successfully!', 3000)
      }
      return response
    } catch (error) {
      throw error
    }
  },
  
  copyLastWeek: async (projectId) => {
    try {
      const response = await post(`/projects/${projectId}/copy-last-week`, {})
      if (globalNotificationHandler) {
        globalNotificationHandler.showSuccess('Last week data copied successfully!', 3000)
      }
      return response
    } catch (error) {
      throw error
    }
  },

  // Allocation
  getAllocations: (query='') => get(`/allocation${query}`),
  getAllocation: (id) => get(`/allocations/${id}`),
  
  updateAllocation: async (id, body) => {
    try {
      const response = await put(`/allocations/${id}`, body)
      if (globalNotificationHandler) {
        globalNotificationHandler.showSuccess('Allocation updated successfully!', 2000)
      }
      return response
    } catch (error) {
      throw error
    }
  },
  
  deleteAllocation: async (id) => {
    try {
      const response = await del(`/allocations/${id}`)
      if (globalNotificationHandler) {
        globalNotificationHandler.showSuccess('Allocation deleted successfully!', 3000)
      }
      return response
    } catch (error) {
      throw error
    }
  },
  
  saveAllocation: async (body) => {
    try {
      const response = await post('/allocation', body)
      if (globalNotificationHandler) {
        globalNotificationHandler.showSuccess('Allocation saved successfully!', 2000)
      }
      return response
    } catch (error) {
      throw error
    }
  },
  
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
  
  updateWeeklyRemark: async (userId, week, body) => {
    try {
      const response = await put(`/weekly-remark/${userId}/${week}`, body)
      if (globalNotificationHandler) {
        globalNotificationHandler.showSuccess('Remark updated successfully!', 2000)
      }
      return response
    } catch (error) {
      throw error
    }
  },

  // Bench Summary APIs
  getBenchData: (endpoint, year, week) => get(`/bench/${endpoint}?year=${year}&week=${week}`),
}

// Export the original API as well for backward compatibility
export { api } from './api.js'
