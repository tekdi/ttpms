import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ServerError({ 
  title = "Server Temporarily Unavailable", 
  message = "We're experiencing technical difficulties. Please try again in a few moments.",
  errorCode = "500",
  showRetryButton = true,
  onRetry = null,
  autoRetrySeconds = 30
}) {
  const navigate = useNavigate()
  const [retryCountdown, setRetryCountdown] = useState(autoRetrySeconds)
  const [isRetrying, setIsRetrying] = useState(false)

  // Auto-retry countdown
  useEffect(() => {
    if (autoRetrySeconds > 0 && retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (retryCountdown === 0 && onRetry) {
      handleRetry()
    }
  }, [retryCountdown, autoRetrySeconds, onRetry])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      if (onRetry) {
        await onRetry()
      } else {
        // Default retry: reload the page
        window.location.reload()
      }
    } catch (error) {
      console.error('Retry failed:', error)
      // Reset countdown for another attempt
      setRetryCountdown(autoRetrySeconds)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleGoHome = () => {
    const currentRole = sessionStorage.getItem('currentRole')
    if (currentRole === 'Admin') {
      navigate('/admin')
    } else if (currentRole === 'Project Owner') {
      navigate('/po')
    } else {
      navigate('/team')
    }
  }

  const handleReportIssue = () => {
    const errorDetails = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      user: sessionStorage.getItem('currentEmail'),
      role: sessionStorage.getItem('currentRole')
    }
    
    const subject = `Server Error Report - ${errorCode}`
    const body = `Error Details:\n${JSON.stringify(errorDetails, null, 2)}\n\nAdditional Information:\n[Please describe what you were doing when this error occurred]`
    
    window.location.href = `mailto:support@tppms.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 text-center">
        {/* Error Icon and Code */}
        <div className="space-y-4">
          <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
            <i className="fas fa-server text-red-600 text-4xl"></i>
          </div>
          <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium inline-block">
            Error {errorCode}
          </div>
        </div>

        {/* Title and Message */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-900">
            {title}
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Status Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-blue-600 mt-1 mr-3"></i>
            <div className="text-left">
              <h3 className="text-sm font-medium text-blue-800">
                What's happening?
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Our servers are experiencing high load or undergoing maintenance. 
                This is usually temporary and resolves within a few minutes.
              </p>
              {autoRetrySeconds > 0 && retryCountdown > 0 && (
                <p className="text-sm text-blue-700 mt-2 font-medium">
                  <i className="fas fa-clock mr-1"></i>
                  Auto-retry in {retryCountdown} seconds...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {showRetryButton && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
            >
              {isRetrying ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Retrying...
                </>
              ) : (
                <>
                  <i className="fas fa-redo mr-2"></i>
                  Try Again
                </>
              )}
            </button>
          )}
          
          <button
            onClick={handleGoHome}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center"
          >
            <i className="fas fa-home mr-2"></i>
            Go to Dashboard
          </button>

          <button
            onClick={handleReportIssue}
            className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
          >
            <i className="fas fa-bug mr-2"></i>
            Report Issue
          </button>
        </div>

        {/* Additional Help */}
        <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          <p className="mb-2">
            <strong>Need immediate assistance?</strong>
          </p>
          <p>
            Contact our support team at{' '}
            <a href="mailto:support@tppms.com" className="text-purple-600 hover:text-purple-800">
              support@tppms.com
            </a>
          </p>
          <p className="mt-2 text-xs">
            Error ID: {Date.now().toString(36).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  )
}
