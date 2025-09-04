import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function PermissionDenied({ 
  title = "Access Denied", 
  message = "You don't have permission to access this resource.",
  showBackButton = true,
  showHomeButton = true,
  customActions = null 
}) {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate(-1)
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

  const handleContactSupport = () => {
    // You can customize this based on your support system
    window.location.href = 'mailto:support@tppms.com?subject=Access Permission Request'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="mx-auto h-24 w-24 bg-red-100 rounded-full flex items-center justify-center">
          <i className="fas fa-shield-alt text-red-600 text-4xl"></i>
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

        {/* Additional Info */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-yellow-600 mt-1 mr-3"></i>
            <div className="text-left">
              <h3 className="text-sm font-medium text-yellow-800">
                Need Access?
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                If you believe you should have access to this resource, please contact your administrator or support team.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {customActions ? (
            customActions
          ) : (
            <>
              {showBackButton && (
                <button
                  onClick={handleGoBack}
                  className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Go Back
                </button>
              )}
              
              {showHomeButton && (
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center"
                >
                  <i className="fas fa-home mr-2"></i>
                  Go to Dashboard
                </button>
              )}

              <button
                onClick={handleContactSupport}
                className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium flex items-center justify-center"
              >
                <i className="fas fa-envelope mr-2"></i>
                Contact Support
              </button>
            </>
          )}
        </div>

        {/* User Info */}
        <div className="text-sm text-gray-500 pt-4 border-t border-gray-200">
          <p>
            <i className="fas fa-user mr-2"></i>
            Logged in as: {sessionStorage.getItem('currentEmail') || 'Unknown User'}
          </p>
          <p className="mt-1">
            <i className="fas fa-user-tag mr-2"></i>
            Role: {sessionStorage.getItem('currentRole') || 'Unknown Role'}
          </p>
        </div>
      </div>
    </div>
  )
}
