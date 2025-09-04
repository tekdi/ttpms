import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../utils/api'

export default function Navbar({ onLogout, onRoleChange }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState('')
  const [currentRole, setCurrentRole] = useState('')
  const [currentEmail, setCurrentEmail] = useState('')
  const [availableRoles, setAvailableRoles] = useState([])
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    const user = sessionStorage.getItem('currentUser')
    const role = sessionStorage.getItem('currentRole')
    const email = sessionStorage.getItem('currentEmail')
    const userDataStr = sessionStorage.getItem('userData')
    
    if (user) setCurrentUser(user)
    if (role) setCurrentRole(role)
    if (email) setCurrentEmail(email)
    
    if (userDataStr) {
      try {
        const parsedUserData = JSON.parse(userDataStr)
        setUserData(parsedUserData)
        
        // Build available roles based on user data - exactly like HTML frontend
        const roles = ['Team Member'] // Default role
        if (parsedUserData.user?.PO === true) {
          roles.push('Project Owner')
        }
        if (parsedUserData.user?.admin === true) {
          roles.push('Admin')
        }
        setAvailableRoles(roles)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  const handleRoleChange = (newRole) => {
    // Check if user has permission for this role - exactly like HTML frontend
    let hasPermission = false
    
    if (userData) {
      const isPO = userData.user && userData.user.PO === true
      const isAdmin = userData.user && userData.user.admin === true
      
      switch(newRole) {
        case 'Project Owner':
          hasPermission = isPO
          break
        case 'Admin':
          hasPermission = isAdmin
          break
        case 'Team Member':
          hasPermission = true // Everyone can be Team Member
          break
      }
    }
    
    if (!hasPermission) {
      console.error('User does not have permission for role:', newRole)
      return
    }
    
    setCurrentRole(newRole)
    sessionStorage.setItem('currentRole', newRole)
    
    // Notify parent component about role change
    if (onRoleChange) {
      onRoleChange(newRole)
    }
    
    // Navigate to appropriate page based on new role - exactly like HTML frontend
    if (newRole === 'Admin') {
      navigate('/admin')
    } else if (newRole === 'Project Owner') {
      navigate('/po')
    } else {
      navigate('/team')
    }
  }

  const handleLogout = async () => {
    try {
      await api.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear session storage
      sessionStorage.clear()
      
      // Call parent callback to update authentication state
      if (onLogout) {
        onLogout()
      }
      
      // Navigate to login
      navigate('/login')
    }
  }

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
              <i className="fas fa-chart-line text-white text-sm"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-900">TPPMS</h1>
            <span className="ml-3 text-sm text-gray-500">{currentRole || 'Loading...'}</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Role:</label>
              <select
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                value={currentRole}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                {availableRoles.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <span className="text-sm text-gray-700">{currentUser || 'Loading...'}</span>
            <button 
              onClick={handleLogout} 
              className="text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              <i className="fas fa-sign-out-alt mr-1"></i>Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
