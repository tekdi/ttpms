import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'

export default function Admin() {
  // State for time period selection
  const [selectedPeriod, setSelectedPeriod] = useState({ year: 2025, month: 8, week: 32 })
  
  // State for bench summary
  const [benchSummary, setBenchSummary] = useState({
    fullyBenched: 0,
    partialBenched: 0,
    nonBillable: 0,
    overUtilised: 0
  })
  const [benchSummaryExpanded, setBenchSummaryExpanded] = useState(false)
  const [activeBenchTab, setActiveBenchTab] = useState('full-bench')
  
  // State for projects
  const [allProjects, setAllProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('not_desc')
  const [statusFilter, setStatusFilter] = useState('active')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [filteredProjects, setFilteredProjects] = useState([])
  
  // State for project data
  const [projectUsers, setProjectUsers] = useState([])
  const [weeklyAllocations, setWeeklyAllocations] = useState([])
  
  // State for user management
  const [userCounts, setUserCounts] = useState({
    activeUsers: 0,
    newUsers: 0,
    inactiveUsers: 0
  })
  
  // State for project management
  const [projectCounts, setProjectCounts] = useState({
    activeProjects: 0,
    onHoldProjects: 0,
    completedProjects: 0
  })
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAdminDashboardData()
    loadAllProjects()
    loadUserCounts()
    loadProjectCounts()
    loadBenchSummary()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectUsers(selectedProject.id)
      loadProjectWeeklyAllocations(selectedProject.id)
    }
  }, [selectedProject, selectedPeriod])

  // Helper functions (moved to top to fix reference errors)
  const getDisplayWeeks = () => {
    const weeks = []
    const currentWeek = selectedPeriod.week
    for (let i = 3; i >= 0; i--) {
      const weekNumber = currentWeek - i
      if (weekNumber > 0) {
        weeks.push({
          number: weekNumber,
          display: `Week ${weekNumber}`,
          isCurrentWeek: weekNumber === currentWeek,
          isEditable: true
        })
      }
    }
    return weeks
  }

  const getCurrentWeek = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + start.getDay() + 1) / 7)
  }

  const getWeeksForMonth = (year, month) => {
    const weeks = []
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    // Generate 4-5 weeks for each month
    const startWeek = (month - 1) * 4 + 1
    for (let i = 0; i < 5; i++) {
      const weekNum = startWeek + i
      const startDate = `${monthNames[month]} ${(i * 7) + 1}`
      const endDate = `${monthNames[month]} ${Math.min((i + 1) * 7, 28)}`
      weeks.push({
        number: weekNum,
        dates: `${startDate}-${endDate}`
      })
    }
    
    return weeks
  }

  const getWeekNumber = (date) => {
    const start = new Date(date.getFullYear(), 0, 1)
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + start.getDay() + 1) / 7)
  }

  const getMonthName = (month) => {
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December']
    return monthNames[month]
  }

  const getWeekDisplay = (weekNumber, year) => {
    // Calculate week start date (Monday)
    const startOfYear = new Date(year, 0, 1)
    const firstMonday = new Date(startOfYear)
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1)
    }
    
    const weekStart = new Date(firstMonday)
    weekStart.setDate(weekStart.getDate() + (weekNumber - 1) * 7)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 4) // Friday
    
    const formatDate = (date) => {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }
    
    return {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      dateRange: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
    }
  }

  const getStatusLabel = (status) => {
    const statusMap = {
      1: "Active",
      2: "On Hold", 
      3: "Completed",
      5: "Archived",
      9: "Closed"
    }
    return statusMap[status] || "Unknown"
  }

  const getStatusBadge = (status) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    switch(status.toLowerCase()) {
      case 'active':
        return `<span class="${baseClass} bg-green-100 text-green-800">Active</span>`
      case 'on hold':
        return `<span class="${baseClass} bg-yellow-100 text-yellow-800">On Hold</span>`
      case 'completed':
        return `<span class="${baseClass} bg-gray-100 text-gray-800">Completed</span>`
      case 'archived':
        return `<span class="${baseClass} bg-red-100 text-red-800">Archived</span>`
      default:
        return `<span class="${baseClass} bg-gray-100 text-gray-800">${status}</span>`
    }
  }

  const filterTeamMembers = (users) => {
    const allowedRoles = ['Engineer', 'Jr. Engineer', 'Project Lead / Manager', 'Testing Engineer']
    return users.filter(user => {
      let userRoles = []
      
      if (user.roles && Array.isArray(user.roles)) {
        userRoles = user.roles
      } else if (user.role && Array.isArray(user.role)) {
        userRoles = user.role
      } else if (user.role_name) {
        userRoles = [{ name: user.role_name }]
      } else if (user.role) {
        userRoles = [{ name: user.role }]
      }
      
      return userRoles.some(role => allowedRoles.includes(role.name))
    })
  }

  const getInsights = () => {
    // Calculate totals from allocations
    let totalBillable = 0
    let totalNonBillable = 0
    let totalLeave = 0

    weeklyAllocations.forEach(allocation => {
      totalBillable += parseFloat(allocation.billable_hrs) || 0
      totalNonBillable += parseFloat(allocation.non_billable_hrs) || 0
      totalLeave += parseFloat(allocation.leave_hrs) || 0
    })

    return {
      members: projectUsers.length,
      billable: totalBillable,
      nonBillable: totalNonBillable,
      leave: totalLeave
    }
  }

  // Load admin dashboard data
  const loadAdminDashboardData = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return
      }

      console.log('Loading admin dashboard data')

      const response = await fetch('http://127.0.0.1:8000/api/admin/dashboard-summary', {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Admin dashboard data loaded:', data)
        
        if (data.success && data.data) {
          updateDashboardCounts(data.data)
        }
      } else {
        console.error('Failed to load admin dashboard data:', response.status)
        if (response.status === 403) {
          console.error('Admin access required')
        }
      }
    } catch (error) {
      console.error('Error loading admin dashboard data:', error)
    }
  }

  // Update dashboard counts with real data
  const updateDashboardCounts = (data) => {
    // Update User Management counts
    if (data.user_management) {
      const activeUsers = data.user_management.active_users
      const newUsers = data.user_management.new_users
      const inactiveUsers = data.user_management.inactive_users

      setUserCounts({
        activeUsers: activeUsers.count || 0,
        newUsers: newUsers.count || 0,
        inactiveUsers: inactiveUsers.count || 0
      })
    }

    // Update Project Management counts
    if (data.project_management) {
      const activeProjects = data.project_management.active_projects
      const onHoldProjects = data.project_management.on_hold_projects
      const completedProjects = data.project_management.completed_projects

      setProjectCounts({
        activeProjects: activeProjects.count || 0,
        onHoldProjects: onHoldProjects.count || 0,
        completedProjects: completedProjects.count || 0
      })
    }
  }

  // Load user counts from API
  const loadUserCounts = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return
      }

      console.log('Loading user counts...')
      const response = await fetch('http://127.0.0.1:8000/api/admin/user-counts', {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('User counts data:', data)
        
        if (data.success && data.data) {
          setUserCounts({
            activeUsers: data.data.active_users || 0,
            newUsers: data.data.new_users || 0,
            inactiveUsers: data.data.inactive_users || 0
          })
          console.log('User counts updated successfully')
        }
      } else {
        console.error('Failed to fetch user counts:', response.status)
      }
    } catch (error) {
      console.error('Error fetching user counts:', error)
    }
  }

  // Load project counts
  const loadProjectCounts = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return
      }

      const response = await fetch('http://127.0.0.1:8000/api/admin/project-counts', {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setProjectCounts({
            activeProjects: data.data.active_projects || 0,
            onHoldProjects: data.data.on_hold_projects || 0,
            completedProjects: data.data.completed_projects || 0
          })
        }
      }
    } catch (error) {
      console.error('Error loading project counts:', error)
    }
  }

  // Load bench summary data
  const loadBenchSummary = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return
      }

      console.log(`Loading bench summary for year: ${selectedPeriod.year}, week: ${selectedPeriod.week}`)

      const response = await fetch(`http://127.0.0.1:8000/api/bench/summary?year=${selectedPeriod.year}&week=${selectedPeriod.week}`, {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Bench summary data loaded:', data)
        
        if (data.success && data.data) {
          setBenchSummary({
            fullyBenched: data.data.fully_benched || 0,
            partialBenched: data.data.partial_benched || 0,
            nonBillable: data.data.non_billable || 0,
            overUtilised: data.data.over_utilised || 0
          })
        }
      } else {
        console.error('Failed to load bench summary:', response.status)
      }
    } catch (error) {
      console.error('Error loading bench summary:', error)
    }
  }

  // Load all projects from backend
  const loadAllProjects = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return
      }

      const response = await fetch('http://127.0.0.1:8000/api/projects', {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const projects = data.data || []
        setAllProjects(projects)
        setFilteredProjects(projects)
        console.log('All projects loaded:', projects)
      } else {
        console.error('Failed to load projects:', response.status)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  // Load project users
  const loadProjectUsers = async (projectId) => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/users`, {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const users = data.data?.users || data.users || data.data || []
        const filteredUsers = filterTeamMembers(users)
        setProjectUsers(filteredUsers.length > 0 ? filteredUsers : users)
      } else {
        console.error('Failed to load project users:', response.status)
      }
    } catch (error) {
      console.error('Error loading project users:', error)
    }
  }

  // Load project weekly allocations
  const loadProjectWeeklyAllocations = async (projectId) => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      const params = new URLSearchParams({
        year: selectedPeriod.year,
        weeks: getDisplayWeeks().map(w => w.number).join(',')
      })
      
      const response = await fetch(`http://127.0.0.1:8000/api/projects/${projectId}/weekly-allocations?${params.toString()}`, {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const usersData = data.data?.users || []
        
        let allocationData = []
        const displayWeeks = getDisplayWeeks()
        
        usersData.forEach(user => {
          displayWeeks.forEach(week => {
            const weekKey = `week${week.number}`
            const weekData = user[weekKey]
            
            allocationData.push({
              user_id: user.user_id,
              week: week.number,
              billable_hrs: weekData ? weekData.billable : 0,
              non_billable_hrs: weekData ? weekData.non_billable : 0,
              leave_hrs: weekData ? weekData.leave : 0,
              total_hours: weekData ? weekData.total : 0
            })
          })
        })
        
        setWeeklyAllocations(allocationData)
      } else {
        console.error('Failed to load weekly allocations:', response.status)
      }
    } catch (error) {
      console.error('Error loading weekly allocations:', error)
    }
  }

  // Handle time period changes
  const handleYearChange = (year) => {
    setSelectedPeriod(prev => ({ ...prev, year: parseInt(year) }))
  }

  const handleMonthChange = (month) => {
    setSelectedPeriod(prev => ({ ...prev, month: parseInt(month) }))
  }

  const handleWeekChange = (week) => {
    setSelectedPeriod(prev => ({ ...prev, week: parseInt(week) }))
  }

  // Handle bench summary expansion
  const expandBenchSummary = (tabName) => {
    setBenchSummaryExpanded(true)
    setActiveBenchTab(tabName)
  }

  const toggleBenchSummary = () => {
    setBenchSummaryExpanded(!benchSummaryExpanded)
  }

  // Handle project selection
  const viewProject = (projectId) => {
    const project = allProjects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
    }
  }

  // Handle bench tab switching
  const switchBenchTab = (tabName) => {
    setActiveBenchTab(tabName)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Admin Dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Time Period Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            <i className="fas fa-calendar-alt mr-2 text-purple-600"></i>
            Time Period Selection
          </h2>

          <div className="mb-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Year:</label>
                <select 
                  value={selectedPeriod.year}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Month</h3>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <div
                  key={month}
                  onClick={() => handleMonthChange(month)}
                  className={`time-item text-center py-2 px-1 rounded text-xs cursor-pointer transition-colors ${
                    selectedPeriod.month === month 
                      ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {getMonthName(month).substring(0, 3)}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Weeks in {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {getWeeksForMonth(selectedPeriod.month, selectedPeriod.year).map(week => (
                <div
                  key={week.number}
                  onClick={() => handleWeekChange(week.number)}
                  className={`time-item text-center py-2 px-2 rounded cursor-pointer transition-colors ${
                    selectedPeriod.week === week.number 
                      ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-xs font-medium">Week {week.number}</div>
                  <div className="text-xs text-gray-500">{week.dates}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center text-blue-700">
              <i className="fas fa-calendar-check mr-2"></i>
              <span className="font-medium">Selected Period:</span>
              <span className="ml-2">
                {selectedPeriod.year} • {getMonthName(selectedPeriod.month)} • Week {selectedPeriod.week} ({getWeekDisplay(selectedPeriod.week, selectedPeriod.year).dateRange})
              </span>
            </div>
          </div>
        </div>

        {/* Bench Summary Report */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              <i className="fas fa-chart-pie mr-2 text-purple-600"></i>
              Bench Summary Report
            </h2>
            {benchSummaryExpanded && (
              <div>
                <button 
                  onClick={toggleBenchSummary}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span className="mr-2">Collapse</span>
                  <i className="fas fa-chevron-up text-gray-500"></i>
                </button>
              </div>
            )}
          </div>

          {/* High-Level Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div 
              className="metric-card bg-blue-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors"
              onClick={() => expandBenchSummary('full-bench')}
            >
              <p className="text-4xl font-semibold text-blue-700">{benchSummary.fullyBenched}</p>
              <p className="text-sm font-medium text-blue-600 mt-1">Fully Benched</p>
            </div>
            <div 
              className="metric-card bg-purple-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors"
              onClick={() => expandBenchSummary('partial-bench')}
            >
              <p className="text-4xl font-semibold text-purple-700">{benchSummary.partialBenched}</p>
              <p className="text-sm font-medium text-purple-600 mt-1">Partially Benched</p>
            </div>
            <div 
              className="metric-card bg-green-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer hover:bg-green-200 transition-colors"
              onClick={() => expandBenchSummary('non-billable')}
            >
              <p className="text-4xl font-semibold text-green-700">{benchSummary.nonBillable}</p>
              <p className="text-sm font-medium text-green-600 mt-1">Non-Billable</p>
            </div>
            <div 
              className="metric-card bg-red-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
              onClick={() => expandBenchSummary('over-utilization')}
            >
              <p className="text-4xl font-semibold text-red-700">{benchSummary.overUtilised}</p>
              <p className="text-sm font-medium text-red-600 mt-1">Over-utilization</p>
            </div>
          </div>

          {/* Expandable Content */}
          {benchSummaryExpanded && (
            <div>
              {/* Tab Navigation */}
              <nav className="flex space-x-2 md:space-x-4 mb-6 border-b border-gray-200">
                {[
                  { id: 'full-bench', label: 'Fully Benched Team', color: 'blue' },
                  { id: 'partial-bench', label: 'Partially Benched Team', color: 'purple' },
                  { id: 'non-billable', label: 'Non-Billable Team', color: 'green' },
                  { id: 'over-utilization', label: 'Over-utilization Report', color: 'red' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => switchBenchTab(tab.id)}
                    className={`tab-button px-4 py-2 rounded-t-lg font-medium transition-all duration-200 ${
                      activeBenchTab === tab.id
                        ? `bg-white border-b-2 border-${tab.color}-500 text-${tab.color}-600`
                        : 'text-gray-700 bg-white border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Tab Content */}
              <div className="tab-content">
                {activeBenchTab === 'full-bench' && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Fully Benched Team</h2>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <input 
                        type="text" 
                        placeholder="Search by name or skills..." 
                        className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">Filter by Skills</option>
                        <option value="UI">UI</option>
                        <option value="React JS">React JS</option>
                        <option value="Node JS">Node JS</option>
                        <option value="Angular">Angular</option>
                        <option value="React Native">React Native</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto rounded-lg shadow-md">
                      <table className="min-w-full bg-white border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border-b border-gray-200">Name</th>
                            <th className="py-3 px-4 border-b border-gray-200">On bench since</th>
                            <th className="py-3 px-4 border-b border-gray-200">Days on Bench</th>
                            <th className="py-3 px-4 border-b border-gray-200">Last project owner</th>
                            <th className="py-3 px-4 border-b border-gray-200">Years of exp</th>
                            <th className="py-3 px-4 border-b border-gray-200">Skills</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                <p className="text-lg font-medium">No fully benched team members</p>
                                <p className="text-sm">Click on the metric card above to load data</p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-right">
                      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                        Download CSV
                      </button>
                    </div>
                  </div>
                )}

                {activeBenchTab === 'partial-bench' && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Partially Benched Team</h2>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <input 
                        type="text" 
                        placeholder="Search by name or skills..." 
                        className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                      <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400">
                        <option value="">Filter by Skills</option>
                        <option value="node.js">Node.js</option>
                        <option value="react.js">React.js</option>
                        <option value="UI/UX Designer">UI/UX Designer</option>
                        <option value="DevOps">DevOps</option>
                        <option value="Python">Python</option>
                        <option value="Tech Arch">Tech Arch</option>
                        <option value="QA">QA</option>
                      </select>
                      <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400">
                        <option value="">Filter by % Non Billable</option>
                        <option value="0.25">0-25%</option>
                        <option value="0.5">26-50%</option>
                        <option value="0.75">51-75%</option>
                        <option value="1">76-100%</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto rounded-lg shadow-md">
                      <table className="min-w-full bg-white border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border-b border-gray-200">Name</th>
                            <th className="py-3 px-4 border-b border-gray-200">On partial bench since</th>
                            <th className="py-3 px-4 border-b border-gray-200">% Non Billable</th>
                            <th className="py-3 px-4 border-b border-gray-200">Project owner</th>
                            <th className="py-3 px-4 border-b border-gray-200">Years of exp</th>
                            <th className="py-3 px-4 border-b border-gray-200">Skills</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                <p className="text-lg font-medium">No partially benched team members</p>
                                <p className="text-sm">Click on the metric card above to load data</p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-right">
                      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                        Download CSV
                      </button>
                    </div>
                  </div>
                )}

                {activeBenchTab === 'non-billable' && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Non-Billable Team (On Project)</h2>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-blue-800">
                        <i className="fas fa-info-circle mr-1"></i>
                        <strong>Tip:</strong> Click on any "Reason for non billability" to edit it. Changes are automatically saved to the database.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <input 
                        type="text" 
                        placeholder="Search by name, project or reason..." 
                        className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                      <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400">
                        <option value="">Filter by Skills</option>
                        <option value="React Js">React Js</option>
                        <option value="PHP">PHP</option>
                        <option value="DevOps">DevOps</option>
                        <option value="Java">Java</option>
                        <option value="Angular">Angular</option>
                        <option value="Python">Python</option>
                        <option value="Node JS">Node JS</option>
                        <option value="QA">QA</option>
                        <option value="Business Analyst">Business Analyst</option>
                      </select>
                      <select className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400">
                        <option value="">Filter by Reason</option>
                        <option value="No position available">No position available</option>
                        <option value="Strategic billability planned">Strategic billability planned</option>
                        <option value="Working 40 hrs non-billable">Working 40 hrs non-billable</option>
                        <option value="Working 8 hrs Tekdi infra">Working 8 hrs Tekdi infra</option>
                        <option value="KT initiated">KT initiated</option>
                        <option value="Working 20 hrs Sunbird ALL">Working 20 hrs Sunbird ALL</option>
                        <option value="Working 30hrs DevOps Practices">Working 30hrs DevOps Practices</option>
                        <option value="Working 20 hrs Aspire Leader">Working 20 hrs Aspire Leader</option>
                      </select>
                    </div>
                    <div className="overflow-x-auto rounded-lg shadow-md">
                      <table className="min-w-full bg-white border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border-b border-gray-200">Name</th>
                            <th className="py-3 px-4 border-b border-gray-200">Project on which the person is non billable</th>
                            <th className="py-3 px-4 border-b border-gray-200">Project Owner</th>
                            <th className="py-3 px-4 border-b border-gray-200">Non billable since</th>
                            <th className="py-3 px-4 border-b border-gray-200">Reason for non billability</th>
                            <th className="py-3 px-4 border-b border-gray-200">Years of exp</th>
                            <th className="py-3 px-4 border-b border-gray-200">Skills</th>
                            <th className="py-3 px-4 border-b border-gray-200">% Non Billability</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          <tr>
                            <td colSpan="8" className="py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                <p className="text-lg font-medium">No non-billable team members</p>
                                <p className="text-sm">Click on the metric card above to load data</p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors duration-200 text-sm">
                        <i className="fas fa-bug mr-1"></i>Test API
                      </button>
                      <button className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
                        Download CSV
                      </button>
                    </div>
                  </div>
                )}

                {activeBenchTab === 'over-utilization' && (
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Over-utilization Report</h2>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <input 
                        type="text" 
                        placeholder="Search by name or project..." 
                        className="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <div className="overflow-x-auto rounded-lg shadow-md">
                      <table className="min-w-full bg-white border-collapse">
                        <thead>
                          <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border-b border-gray-200">Name</th>
                            <th className="py-3 px-4 border-b border-gray-200">Current Allocation (Hrs/Week)</th>
                            <th className="py-3 px-4 border-b border-gray-200">Project(s)</th>
                            <th className="py-3 px-4 border-b border-gray-200">Years of Experience</th>
                            <th className="py-3 px-4 border-b border-gray-200">Skills</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          <tr>
                            <td colSpan="5" className="py-8 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                <p className="text-lg font-medium">No over-utilized team members</p>
                                <p className="text-sm">Click on the metric card above to load data</p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-right">
                      <button className="bg-red-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200">
                        Download CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Placeholder for remaining sections */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            <i className="fas fa-cog mr-2 text-purple-600"></i>
            Additional Sections Coming Next...
          </h3>
          <p className="text-gray-600">
            The remaining sections (All Projects List View, Weekly Allocation Table, User Management, Project Management) 
            will be implemented in the next phase to ensure exact functionality matching the HTML admin page.
          </p>
        </div>
      </div>
    </div>
  )
}
