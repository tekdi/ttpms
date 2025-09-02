import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'
import ProjectOwner from './pages/ProjectOwner.jsx'
import TeamMember from './pages/TeamMember.jsx'

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-red-600 text-6xl mb-4">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please refresh the page or try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <i className="fas fa-redo mr-2"></i>Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentRole, setCurrentRole] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      const role = sessionStorage.getItem('currentRole')
      
      if (sessionId && role) {
        setIsAuthenticated(true)
        setCurrentRole(role)
      } else {
        setIsAuthenticated(false)
        setCurrentRole('')
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setIsAuthenticated(false)
      setCurrentRole('')
    } finally {
      setIsLoading(false)
    }
  }

  // Listen for storage changes (logout from other tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      checkAuthStatus()
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const getDefaultPath = () => {
    if (!isAuthenticated) return '/login'
    if (currentRole === 'Admin') return '/admin'
    if (currentRole === 'Project Owner') return '/po'
    return '/team'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-purple-600 mb-4"></i>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {isAuthenticated && <Navbar onLogout={() => setIsAuthenticated(false)} />}
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Navigate to={getDefaultPath()} replace />} />
            <Route path="/login" element={
              isAuthenticated ? <Navigate to={getDefaultPath()} replace /> : <Login onLogin={checkAuthStatus} />
            } />
            <Route path="/admin" element={
              isAuthenticated && currentRole === 'Admin' ? <Admin /> : <Navigate to="/login" replace />
            } />
            <Route path="/po" element={
              isAuthenticated && currentRole === 'Project Owner' ? <ProjectOwner /> : <Navigate to="/login" replace />
            } />
            <Route path="/team" element={
              isAuthenticated ? <TeamMember /> : <Navigate to="/login" replace />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  )
}
