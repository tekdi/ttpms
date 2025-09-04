import React, { createContext, useContext, useState, useCallback } from 'react'

// Notification Context
const NotificationContext = createContext()

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
}

// Notification Provider Component
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = useCallback((message, type = NOTIFICATION_TYPES.INFO, duration = 5000, persistent = false) => {
    const id = Date.now() + Math.random()
    const notification = {
      id,
      message,
      type,
      persistent,
      timestamp: new Date()
    }

    setNotifications(prev => [...prev, notification])

    // Auto-remove non-persistent notifications
    if (!persistent && duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, duration)
    }

    return id
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Specific notification methods
  const showSuccess = useCallback((message, duration = 4000) => {
    return addNotification(message, NOTIFICATION_TYPES.SUCCESS, duration)
  }, [addNotification])

  const showError = useCallback((message, duration = 6000, persistent = false) => {
    return addNotification(message, NOTIFICATION_TYPES.ERROR, duration, persistent)
  }, [addNotification])

  const showWarning = useCallback((message, duration = 5000) => {
    return addNotification(message, NOTIFICATION_TYPES.WARNING, duration)
  }, [addNotification])

  const showInfo = useCallback((message, duration = 4000) => {
    return addNotification(message, NOTIFICATION_TYPES.INFO, duration)
  }, [addNotification])

  // HTTP Status specific notifications
  const showUnauthorized = useCallback(() => {
    return showError(
      'Your session has expired. Please log in again.',
      0, // No auto-dismiss
      true // Persistent
    )
  }, [showError])

  const showForbidden = useCallback((resource = 'this resource') => {
    return showError(
      `Access denied. You don't have permission to access ${resource}.`,
      8000
    )
  }, [showError])

  const showServerError = useCallback(() => {
    return showError(
      'Server is temporarily unavailable. Please try again later or contact support if the problem persists.',
      10000
    )
  }, [showError])

  const showNetworkError = useCallback(() => {
    return showError(
      'Network connection failed. Please check your internet connection and try again.',
      8000
    )
  }, [showError])

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showUnauthorized,
    showForbidden,
    showServerError,
    showNetworkError
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

// Hook to use notifications
export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

// Notification Container Component
function NotificationContainer() {
  const { notifications, removeNotification } = useNotification()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

// Individual Notification Item
function NotificationItem({ notification, onClose }) {
  const { type, message, persistent } = notification

  const getNotificationStyles = () => {
    const baseStyles = "p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform animate-slide-in-right max-w-sm"
    
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return `${baseStyles} bg-green-50 border-green-500 text-green-800`
      case NOTIFICATION_TYPES.ERROR:
        return `${baseStyles} bg-red-50 border-red-500 text-red-800`
      case NOTIFICATION_TYPES.WARNING:
        return `${baseStyles} bg-yellow-50 border-yellow-500 text-yellow-800`
      case NOTIFICATION_TYPES.INFO:
      default:
        return `${baseStyles} bg-blue-50 border-blue-500 text-blue-800`
    }
  }

  const getIcon = () => {
    switch (type) {
      case NOTIFICATION_TYPES.SUCCESS:
        return <i className="fas fa-check-circle text-green-600"></i>
      case NOTIFICATION_TYPES.ERROR:
        return <i className="fas fa-exclamation-circle text-red-600"></i>
      case NOTIFICATION_TYPES.WARNING:
        return <i className="fas fa-exclamation-triangle text-yellow-600"></i>
      case NOTIFICATION_TYPES.INFO:
      default:
        return <i className="fas fa-info-circle text-blue-600"></i>
    }
  }

  return (
    <div className={getNotificationStyles()}>
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-5">
            {message}
          </p>
        </div>
        <div className="flex-shrink-0 ml-3">
          <button
            onClick={onClose}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-150"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>
      </div>
      {persistent && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <i className="fas fa-info-circle mr-1"></i>
            This message will remain until dismissed
          </p>
        </div>
      )}
    </div>
  )
}
