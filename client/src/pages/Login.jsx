import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

export default function Login({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    // Load Google OAuth script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    // Initialize Google OAuth
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '345815634197-lnmt33p2v0af7n9uptojsi2e3m0cvogk.apps.googleusercontent.com',
        callback: handleGoogleSignIn
      })
      window.google.accounts.id.renderButton(
        document.getElementById('googleSignIn'),
        { 
          theme: 'outline', 
          size: 'large',
          text: 'sign_in_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        }
      )
    }
  }, [])

  const decodeJwtResponse = (token) => {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload)
  }

  const handleGoogleSignIn = async (response) => {
    console.log("Google Sign-In initiated")
    showNotification('Authenticating with Google...', 'info')
    
    try {
      const responsePayload = decodeJwtResponse(response.credential)
      console.log("Google user info:", responsePayload)
      
      const loginResponse = await api.login(responsePayload.email, 'google_oauth_user')
      
      if (loginResponse.success) {
        await handleSuccessfulLogin(loginResponse.data)
        showNotification('Google OAuth successful! Redirecting...', 'success')
      } else {
        const errorMessage = loginResponse.detail || 'Google OAuth failed. Please try again.'
        showNotification(errorMessage, 'error')
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
      showNotification('Network error. Please check your connection.', 'error')
    }
  }

  const handleSuccessfulLogin = async (data) => {
    // Store session ID
    sessionStorage.setItem('sessionId', data.session_id)
    
    // Store user information
    sessionStorage.setItem('currentUser', `${data.user.firstname} ${data.user.lastname}`)
    sessionStorage.setItem('currentEmail', data.user.login)
    sessionStorage.setItem('userData', JSON.stringify(data))
    
    // Determine the appropriate role based on user's roles
    let userRole = 'Team Member' // Default role
    if (data.roles && data.roles.length > 0) {
      const hasProjectOwnerRole = data.roles.some(role => 
        role.name === 'Project Owner' || role.name === 'Project Creator'
      )
      if (hasProjectOwnerRole) {
        userRole = 'Project Owner'
      } else if (data.user.admin) {
        userRole = 'Admin'
      }
    }
    
    sessionStorage.setItem('currentRole', userRole)
    
    // Immediately update parent component state
    if (onLogin) {
      onLogin()
    }
    
    // Redirect to appropriate page based on role
    setTimeout(() => {
      if (userRole === 'Project Owner') {
        navigate('/po')
      } else if (userRole === 'Admin') {
        navigate('/admin')
      } else {
        navigate('/team')
      }
    }, 1000)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.login(email, password)
      
      if (response.success) {
        await handleSuccessfulLogin(response.data)
        showNotification('Login successful! Redirecting...', 'success')
      } else {
        const errorMessage = response.detail || 'Login failed. Please try again.'
        showNotification(errorMessage, 'error')
      }
    } catch (err) {
      console.error('Login error', err)
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-purple-600 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-users-cog text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">TPPMS</h2>
            <p className="text-gray-600 mt-2">Team Project & People Management System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-envelope mr-2 text-purple-600"></i>Email Address
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your email" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <i className="fas fa-lock mr-2 text-purple-600"></i>Password
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your password" 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>Signing In...</>
              ) : (
                <><i className="fas fa-sign-in-alt mr-2"></i>Sign In</>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <div id="googleSignIn" className="w-full"></div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-info-circle mr-2 text-blue-600"></i>Test Credentials
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div><strong>Email:</strong> bhavesh.korane@tekditechnologies.com</div>
              <div><strong>Password:</strong> any password (ignored)</div>
              <div><strong>Role:</strong> Team Member (default)</div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div><strong>Google OAuth:</strong> Will use same backend flow</div>
                <div><strong>Auto Role Detection:</strong> Based on user's actual roles</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 
          notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}
