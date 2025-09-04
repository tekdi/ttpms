import React, { useState, useEffect } from 'react'
import { api, get } from '../utils/api'

export default function Admin() {
  // Get current corporate week (Monday-Friday) - moved to top
  const getCurrentWeek = () => {
    const now = new Date()
    const year = now.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    
    // Find first Monday of the year
    const firstMonday = new Date(startOfYear)
    while (firstMonday.getDay() !== 1) { // 1 = Monday
      firstMonday.setDate(firstMonday.getDate() + 1)
    }
    
    // Calculate week number
    const diffTime = now.getTime() - firstMonday.getTime()
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    
    return Math.max(1, diffWeeks)
  }

  // Get week display with dates - EXACTLY like Team Member page
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
    weekEnd.setDate(weekStart.getDate() + 4) // Friday (5-day week)
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const startMonth = monthNames[weekStart.getMonth()]
    const endMonth = monthNames[weekEnd.getMonth()]
    
    // Format dates for API compatibility
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (startMonth === endMonth) {
      return {
        display: `Week ${weekNumber}`,
        dates: `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}`,
        fullDisplay: `Week ${weekNumber} (${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()})`,
        startDate: formatDate(weekStart),
        endDate: formatDate(weekEnd)
      }
    } else {
      return {
        display: `Week ${weekNumber}`,
        dates: `${startMonth} ${weekStart.getDate()}-${endMonth} ${weekEnd.getDate()}`,
        fullDisplay: `Week ${weekNumber} (${startMonth} ${weekStart.getDate()}-${endMonth} ${weekEnd.getDate()})`,
        startDate: formatDate(weekStart),
        endDate: formatDate(weekEnd)
      }
    }
  }

  // Get weeks for a specific month (corporate weeks - Monday-Friday based)
  const getWeeksForMonth = (year, month) => {
    const weeks = []
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    
    // Find first Monday of the year
    const yearStart = new Date(year, 0, 1)
    const firstMonday = new Date(yearStart)
    while (firstMonday.getDay() !== 1) { // 1 = Monday
      firstMonday.setDate(firstMonday.getDate() + 1)
    }
    
    // Calculate week numbers for the month
    let currentDate = new Date(firstDay)
    while (currentDate <= lastDay) {
      const weekNumber = getWeekNumber(currentDate)
      if (!weeks.includes(weekNumber)) {
        weeks.push(weekNumber)
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return weeks.sort((a, b) => a - b)
  }

  // Get week number for a specific date
  const getWeekNumber = (date) => {
    const year = date.getFullYear()
    const yearStart = new Date(year, 0, 1)
    const firstMonday = new Date(yearStart)
    
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1)
    }
    
    const diffTime = date.getTime() - firstMonday.getTime()
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    
    return Math.max(1, diffWeeks)
  }

  // Get month name
  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December']
    return months[month - 1]
  }

  // Event handlers for time period changes
  const handleYearChange = (year) => {
    setSelectedPeriod(prev => ({ ...prev, year: parseInt(year) }))
  }

  const handleMonthClick = (month) => {
    setSelectedPeriod(prev => ({ ...prev, month: parseInt(month) }))
  }

  const handleWeekClick = (week) => {
    setSelectedPeriod(prev => ({ ...prev, week: parseInt(week) }))
  }

  // Initialize with current period
  const getCurrentPeriod = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // JavaScript months are 0-based
    const currentWeek = getCurrentWeek()
    return { year: currentYear, month: currentMonth, week: currentWeek }
  }
  
  // State for time period selection
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod())
  
  // State for bench summary
  const [benchSummary, setBenchSummary] = useState({
    fullyBenched: 0,
    partialBenched: 0,
    nonBillable: 0,
    overUtilised: 0
  })
  const [currentBenchData, setCurrentBenchData] = useState([])
  const [currentBenchType, setCurrentBenchType] = useState('')
  const [benchSummaryExpanded, setBenchSummaryExpanded] = useState(false)
  const [activeBenchTab, setActiveBenchTab] = useState('full-bench')

  // Helper functions for data transformation
  const calculateDaysOnBench = (benchSince) => {
    if (!benchSince) return 'N/A'
    try {
      const benchDate = new Date(benchSince)
      const currentDate = new Date()
      const diffTime = Math.abs(currentDate - benchDate)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    } catch (error) {
      return 'N/A'
    }
  }

  const calculateNonBillablePercentage = (totalHrs) => {
    if (!totalHrs || totalHrs === 0) return 0
    const nonBillablePercentage = Math.round(((40 - totalHrs) / 40) * 100)
    return Math.max(0, Math.min(100, nonBillablePercentage))
  }

  // Helper function to calculate non-billable percentage for partial bench users
  const calculatePartialNonBillablePercentage = (totalHrs) => {
    if (!totalHrs || totalHrs === 0) return 100
    const billableHrs = Math.min(totalHrs, 40)
    const nonBillablePercentage = Math.round(((40 - billableHrs) / 40) * 100)
    return Math.max(0, Math.min(100, nonBillablePercentage))
  }

  // Helper function to calculate non-billable percentage from non-billable hours
  const calculateNonBillablePercentageFromHours = (nonBillableHrs, totalHrs) => {
    if (!totalHrs || totalHrs === 0) return 0
    if (!nonBillableHrs) return 0
    const percentage = Math.round((nonBillableHrs / 40) * 100)
    return Math.max(0, Math.min(100, percentage))
  }
  
  // State for bench data tables
  const [benchData, setBenchData] = useState({
    fullBench: [],
    partialBench: [],
    nonBillable: [],
    overUtilization: []
  })
  const [benchLoading, setBenchLoading] = useState(false)
  
  // State for projects
  const [allProjects, setAllProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name_asc')
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
  const [projectDataLoading, setProjectDataLoading] = useState(false)
  const [error, setError] = useState(null)

  // Overallocation modal state (same as PO page)
  const [showOverallocationModal, setShowOverallocationModal] = useState(false)
  const [overallocationData, setOverallocationData] = useState({})
  const [lastEditContext, setLastEditContext] = useState(null)



  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Load all initial data in parallel - use allSettled to handle individual failures
        const results = await Promise.allSettled([
          loadAdminDashboardData(),
          loadAllProjects(),
          loadUserCounts(),
          loadProjectCounts(),
          loadBenchSummary()
        ])
        
        // Check if any critical APIs failed
        const failedCount = results.filter(result => result.status === 'rejected').length
        
        if (failedCount > 0) {
          console.warn(`${failedCount} APIs failed to load, but continuing with available data`)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading initial data:', error)
        setError('Failed to load admin dashboard data')
        setLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      // Load data sequentially to prevent race conditions (same as PO page)
      const loadProjectData = async () => {
        try {
          setProjectDataLoading(true)
          console.log('Admin loading project data for project:', selectedProject.id)
          
          // First load users
          await loadProjectUsers(selectedProject.id)
          
          // Then load allocations (which will merge with users)
          await loadProjectWeeklyAllocations(selectedProject.id)
          
          console.log('Admin project data loading completed')
        } catch (error) {
          console.error('Admin error loading project data:', error)
          setError('Failed to load project data. Please try again.')
        } finally {
          setProjectDataLoading(false)
        }
      }
      
      loadProjectData()
    } else {
      setProjectDataLoading(false)
    }
  }, [selectedProject, selectedPeriod])

  // Filter and sort projects based on search, status, and sort criteria
  useEffect(() => {
    let filtered = [...allProjects]
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(project => 
        (project.name || project.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (project.customer_name || project.customer || '').toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => {
        const projectStatus = getStatusLabel(project.status).toLowerCase()
        return projectStatus === statusFilter.toLowerCase()
      })
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'name_asc':
          return (a.name || a.project_name || '').localeCompare(b.name || b.project_name || '')
        case 'name_desc':
          return (b.name || b.project_name || '').localeCompare(a.name || a.project_name || '')
        case 'allocated_asc':
          return (parseFloat(a.allocated_percentage || 0) - parseFloat(b.allocated_percentage || 0))
        case 'allocated_desc':
          return (parseFloat(b.allocated_percentage || 0) - parseFloat(a.allocated_percentage || 0))
        case 'not_asc':
          return (parseFloat(a.not_allocated_percentage || 100) - parseFloat(b.not_allocated_percentage || 100))
        case 'not_desc':
        default:
          return (parseFloat(b.not_allocated_percentage || 100) - parseFloat(a.not_allocated_percentage || 100))
      }
    })
    
    setFilteredProjects(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [allProjects, searchTerm, statusFilter, sortBy])

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
    if (!status || typeof status !== 'string') {
  return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unknown
        </span>
      )
    }
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    switch(status.toLowerCase()) {
      case 'active':
        return (
          <span className={`${baseClass} bg-green-100 text-green-800`}>
            Active
          </span>
        )
      case 'on hold':
        return (
          <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>
            On Hold
          </span>
        )
      case 'completed':
        return (
          <span className={`${baseClass} bg-gray-100 text-gray-800`}>
            Completed
          </span>
        )
      case 'archived':
        return (
          <span className={`${baseClass} bg-red-100 text-red-800`}>
            Archived
          </span>
        )
      default:
        return (
          <span className={`${baseClass} bg-gray-100 text-gray-800`}>
            {status}
          </span>
        )
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
        throw new Error('No session ID found')
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
        return data
      } else {
        console.error('Failed to load admin dashboard data:', response.status)
        if (response.status === 403) {
          console.error('Admin access required')
          throw new Error('Admin access required')
        }
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error loading admin dashboard data:', error)
      // Don't re-throw - let it complete gracefully
      return null
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
        return null
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
        return data
      } else {
        console.error('Failed to fetch user counts:', response.status)
        return null
      }
    } catch (error) {
      console.error('Error fetching user counts:', error)
      return null
    }
  }

  // Load project counts
  const loadProjectCounts = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return null
      }

      // Calculate project counts from allProjects data
      const activeCount = allProjects.filter(p => getStatusLabel(p.status).toLowerCase() === 'active').length
      const onHoldCount = allProjects.filter(p => getStatusLabel(p.status).toLowerCase() === 'on hold').length
      const completedCount = allProjects.filter(p => getStatusLabel(p.status).toLowerCase() === 'completed').length

      setProjectCounts({
        activeProjects: activeCount,
        onHoldProjects: onHoldCount,
        completedProjects: completedCount
      })

      console.log('Project counts loaded successfully')
      return true
    } catch (error) {
      console.error('Error loading project counts:', error)
      return null
    }
  }

  // Load bench summary data
  const loadBenchSummary = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return null
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
            fully_benched: data.data.fully_benched || 0,
            partial_benched: data.data.partial_benched || 0,
            non_billable: data.data.non_billable || 0,
            over_utilised: data.data.over_utilised || 0
          })
        }
        return data
      } else {
        console.error('Failed to load bench summary:', response.status)
        return null
      }
    } catch (error) {
      console.error('Error loading bench summary:', error)
      return null
    }
  }

  // Load all projects from backend
  const loadAllProjects = async () => {
    try {
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return null
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
        return data
      } else {
        console.error('Failed to load projects:', response.status)
        return null
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      return null
    }
  }

  // Load project users
  const loadProjectUsers = async (projectId) => {
    try {
      console.log('Admin loading project users for project:', projectId)
      
      // Admin uses same API as PO - backend should grant admin access to all projects
      const data = await api.getProjectUsers(projectId)
      console.log('Admin project users response:', data)
      
      if (data && data.data?.users) {
        const users = data.data.users
        console.log('Admin setting project users:', users)
        setProjectUsers(users)
      } else if (data && Array.isArray(data)) {
        console.log('Admin setting project users (array format):', data)
        setProjectUsers(data)
      } else {
        console.log('Admin no users data received')
        setProjectUsers([])
      }
    } catch (error) {
      console.error('Admin error loading project users:', error)
      setProjectUsers([])
    }
  }

  // Load project weekly allocations (improved version like PO page)
  const loadProjectWeeklyAllocations = async (projectId) => {
    try {
      const params = new URLSearchParams({
        year: selectedPeriod.year,
        weeks: getDisplayWeeks().map(w => w.number).join(',')
      })
      
      console.log('Admin loading weekly allocations with params:', params.toString())
      
      // Admin uses same API as PO - backend should grant admin access to all projects
      const data = await get(`/projects/${projectId}/weekly-allocations?${params.toString()}`)
      console.log('Admin weekly allocations response:', data)
      
      if (data && typeof data === 'object' && data.data?.users) {
        console.log('Admin setting weekly allocations users:', data.data.users)
        setWeeklyAllocations(data.data.users)
        
        // Update projectUsers with the allocation data - IMPROVED VERSION
        setProjectUsers(prevUsers => {
          if (!prevUsers || prevUsers.length === 0) {
            console.log('Admin no previous users to update, returning allocation data as is')
            return data.data.users
          }

          const updatedUsers = prevUsers.map(user => {
            const userAllocData = data.data.users.find(u => u.user_id === user.id)
            if (userAllocData) {
              console.log(`Admin merging allocation data for user ${user.id}:`, userAllocData)
              
              // Merge user info with allocation data, preserving both
              const mergedUser = {
                ...user, // Keep original user data (name, role, etc.)
                ...userAllocData, // Add allocation data (week35, week36, etc.)
                id: user.id, // Ensure ID stays consistent
                user_id: user.id // Ensure user_id is set for consistency
              }
              
              console.log(`Admin merged user ${user.id}:`, mergedUser)
              return mergedUser
            } else {
              console.log(`Admin no allocation data found for user ${user.id}, keeping original data`)
              return user
            }
          })
          
          console.log('Admin final updated project users:', updatedUsers)
          return updatedUsers
        })
      } else {
        console.log('Admin no allocation data received, keeping current users')
        setWeeklyAllocations([])
      }
    } catch (error) {
      console.error('Admin error loading weekly allocations:', error)
      setWeeklyAllocations([])
    }
  }



  // Load bench detail data for specific tab
  const loadBenchDetailData = async (tabName) => {
    try {
      setBenchLoading(true)
      const sessionId = sessionStorage.getItem('sessionId')
      if (!sessionId) {
        console.error('No session ID found')
        return
      }

      let endpoint = ''
      switch(tabName) {
        case 'full-bench':
          endpoint = '/api/bench/fully-benched'
          break
        case 'partial-bench':
          endpoint = '/api/bench/partial-benched'
          break
        case 'non-billable':
          endpoint = '/api/bench/non-billable'
          break
        case 'over-utilization':
          endpoint = '/api/bench/over-utilised'
          break
        default:
          return
      }

      const response = await fetch(`http://127.0.0.1:8000${endpoint}?year=${selectedPeriod.year}&week=${selectedPeriod.week}`, {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`${tabName} data loaded:`, data)
        
        if (data.success && data.data) {
          // Transform the data to map backend field names to frontend expectations
          const transformedUsers = (data.data.users || data.data || []).map(user => {
            // Calculate percentage based on bench type
            let nonBillablePercentage = 0
            if (tabName === 'partial-bench') {
              nonBillablePercentage = calculatePartialNonBillablePercentage(user.total_hrs)
            } else if (tabName === 'non-billable') {
              nonBillablePercentage = calculateNonBillablePercentageFromHours(user.non_billable_hrs, user.total_hrs)
            }
            
            return {
              ...user,
              // Map field names for different bench types
              bench_since: user.on_bench_since || user.bench_since,
              partial_bench_since: user.on_partial_bench_since || user.partial_bench_since,
              days_on_bench: user.days_on_bench || calculateDaysOnBench(user.on_bench_since || user.on_partial_bench_since),
              non_billable_percentage: user.non_billable_percentage || nonBillablePercentage,
              // Map over-utilization fields
              current_allocation: user.current_allocation || user.total_hrs,
              projects: user.projects || user.project_name || 'N/A'
            }
          })
          
          // Set current bench data for display
          setCurrentBenchData(transformedUsers)
          setCurrentBenchType(tabName)
          
          let key = ''
          switch(tabName) {
            case 'full-bench':
              key = 'fullBench'
              break
            case 'partial-bench':
              key = 'partialBench'
              break
            case 'non-billable':
              key = 'nonBillable'
              break
            case 'over-utilization':
              key = 'overUtilization'
              break
          }
          setBenchData(prev => ({
            ...prev,
            [key]: data.data.users || data.data || []
          }))
        }
      } else {
        console.error(`Failed to load ${tabName} data:`, response.status)
      }
    } catch (error) {
      console.error(`Error loading ${tabName} data:`, error)
    } finally {
      setBenchLoading(false)
    }
  }

  // Handle bench summary expansion
  const expandBenchSummary = (tabName) => {
    setBenchSummaryExpanded(true)
    setActiveBenchTab(tabName)
    loadBenchDetailData(tabName)
  }

  const toggleBenchSummary = () => {
    setBenchSummaryExpanded(!benchSummaryExpanded)
  }

  // Handle project selection with complete data refresh
  const viewProject = (projectId) => {
    const project = allProjects.find(p => p.id === projectId)
    if (project) {
      console.log('Admin selecting project:', project.name, 'ID:', project.id)
      
      // Clear all existing data to prevent cached data display
      setProjectUsers([])
      setWeeklyAllocations([])
      setError(null)
      
      // Set the new selected project
      setSelectedProject(project)
      
      // Data will be loaded by useEffect when selectedProject changes
    }
  }

  // Handle bench tab switching
  const switchBenchTab = (tabName) => {
    setActiveBenchTab(tabName)
    loadBenchDetailData(tabName)
  }

  // ===== ALLOCATION EDITING FUNCTIONS (copied from PO page) =====

  // Handle input change (real-time updates)
  const handleAllocationChange = (userId, weekNumber, type, value) => {
    // Handle empty string as 0, but preserve the string for display
    const displayValue = value === '' ? '' : value
    const numValue = value === '' ? 0 : parseFloat(value) || 0
    
    console.log(`Admin handleAllocationChange: user=${userId}, week=${weekNumber}, type=${type}, value="${value}", numValue=${numValue}`)
    
    // Update the user data in projectUsers state
    setProjectUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.id === userId) {
          const weekKey = `week${weekNumber}`
          const updatedUser = { ...user }
          
          if (!updatedUser[weekKey]) {
            updatedUser[weekKey] = { billable: 0, non_billable: 0, leave: 0, total: 0 }
          }
          
          // Store the actual numeric value for calculations
          updatedUser[weekKey] = {
            ...updatedUser[weekKey],
            [type]: numValue
          }
          
          // Recalculate total
          updatedUser[weekKey].total = 
            (parseFloat(updatedUser[weekKey].billable) || 0) + 
            (parseFloat(updatedUser[weekKey].non_billable) || 0) + 
            (parseFloat(updatedUser[weekKey].leave) || 0)
          
          console.log(`Admin updated user ${userId} week ${weekNumber}:`, updatedUser[weekKey])
          
          return updatedUser
        }
        return user
      })
    )
  }

  // Handle input blur (save to database) - NO PAST WEEK BLOCKING FOR ADMIN
  const handleAllocationBlur = async (userId, weekNumber, type, value) => {
    if (!selectedProject) return

    const user = projectUsers.find(u => u.id === userId)
    if (!user) return

    const weekKey = `week${weekNumber}`
    const weekData = user[weekKey] || { billable: 0, non_billable: 0, leave: 0 }
    
    const billableHrs = parseFloat(weekData.billable) || 0
    const nonBillableHrs = parseFloat(weekData.non_billable) || 0
    const leaveHrs = parseFloat(weekData.leave) || 0

    try {
      // Check overallocation across ALL projects
      const overallocationCheck = await checkOverallocation(userId, weekNumber, billableHrs, nonBillableHrs, leaveHrs)
      
      if (overallocationCheck.is_overallocated) {
        // Store context for modal
        setLastEditContext({
          userId,
          weekNumber,
          type,
          value,
          billableHrs,
          nonBillableHrs,
          leaveHrs,
          user
        })
        
        // Show overallocation modal with current grid values
        await showOverallocationModalWithData(overallocationCheck, user, weekNumber, {
          billableHrs,
          nonBillableHrs, 
          leaveHrs,
          totalHrs: billableHrs + nonBillableHrs + leaveHrs
        })
        return // Don't save yet, wait for user decision
      }

      // No overallocation, save directly
      await saveAllocationToBackend(userId, weekNumber, billableHrs, nonBillableHrs, leaveHrs)
      
    } catch (error) {
      console.error('Admin error handling allocation blur:', error)
      alert('Failed to save allocation. Please try again.')
    }
  }

  // Check overallocation across all projects
  const checkOverallocation = async (userId, weekNumber, billableHrs, nonBillableHrs, leaveHrs) => {
    try {
      const params = new URLSearchParams({
        user_id: userId,
        week: weekNumber,
        year: selectedPeriod.year,
        current_project_id: selectedProject.id,
        new_billable: billableHrs,
        new_non_billable: nonBillableHrs,
        new_leave: leaveHrs
      })

      const sessionId = sessionStorage.getItem('sessionId')
      const response = await fetch(`http://127.0.0.1:8000/api/allocation/check-overallocation?${params.toString()}`, {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.data
      } else {
        throw new Error('API call failed')
      }
    } catch (error) {
      console.error('Admin error checking overallocation:', error)
      // Fallback to simple check
      const total = billableHrs + nonBillableHrs + leaveHrs
      return {
        is_overallocated: total > 40,
        new_total: total,
        over_by: Math.max(0, total - 40),
        allocations: []
      }
    }
  }

  // Show overallocation modal with data
  const showOverallocationModalWithData = async (overallocationCheck, user, weekNumber, currentValues = null) => {
    const userName = `${user.firstname} ${user.lastname}`.trim()
    const weekName = `Week ${weekNumber}`
    
    // Prepare modal data
    const modalData = {
      subtitle: `${userName} — ${weekName}: Total across ALL projects: ${overallocationCheck.new_total}h • Limit: 40h • Over by: ${overallocationCheck.over_by}h`,
      currentProjectSubtitle: `Change made to: ${selectedProject?.name || selectedProject?.project_name || 'Unknown Project'}`,
      allocations: overallocationCheck.allocations?.map(alloc => {
        const isCurrentProject = alloc.project_id === selectedProject?.id
        
        // If this is the current project and we have current values, use them
        if (isCurrentProject && currentValues) {
          return {
            ...alloc,
            isCurrentProject: true,
            billable_hrs: currentValues.billableHrs,
            non_billable_hrs: currentValues.nonBillableHrs,
            leave_hrs: currentValues.leaveHrs,
            total_hours: currentValues.totalHrs
          }
        }
        
        return {
          ...alloc,
          isCurrentProject
        }
      }) || [],
      currentProjectName: selectedProject?.name || selectedProject?.project_name || 'Unknown Project',
      totalBillable: overallocationCheck.allocations?.reduce((sum, a) => {
        const isCurrentProject = a.project_id === selectedProject?.id
        const billableHrs = (isCurrentProject && currentValues) 
          ? currentValues.billableHrs 
          : (parseFloat(a.billable_hrs) || 0)
        return sum + billableHrs
      }, 0) || 0,
      totalNonBillable: overallocationCheck.allocations?.reduce((sum, a) => {
        const isCurrentProject = a.project_id === selectedProject?.id
        const nonBillableHrs = (isCurrentProject && currentValues) 
          ? currentValues.nonBillableHrs 
          : (parseFloat(a.non_billable_hrs) || 0)
        return sum + nonBillableHrs
      }, 0) || 0,
      totalLeave: overallocationCheck.allocations?.reduce((sum, a) => {
        const isCurrentProject = a.project_id === selectedProject?.id
        const leaveHrs = (isCurrentProject && currentValues) 
          ? currentValues.leaveHrs 
          : (parseFloat(a.leave_hrs) || 0)
        return sum + leaveHrs
      }, 0) || 0,
      grandTotal: overallocationCheck.new_total
    }
    
    setOverallocationData(modalData)
    setShowOverallocationModal(true)
  }

  // Save allocation to backend
  const saveAllocationToBackend = async (userId, weekNumber, billableHrs, nonBillableHrs, leaveHrs) => {
    if (!selectedProject) {
      throw new Error('No project selected')
    }

    try {
      console.log(`Admin saving allocation for user ${userId}, week ${weekNumber}, year ${selectedPeriod.year}`)

      // First, try to get existing allocation
      const sessionId = sessionStorage.getItem('sessionId')
      const editableResponse = await fetch(`http://127.0.0.1:8000/api/projects/${selectedProject.id}/editable-allocations`, {
        headers: {
          'X-Session-ID': sessionId,
          'Content-Type': 'application/json'
        }
      })

      if (!editableResponse.ok) {
        throw new Error('Failed to fetch editable allocations')
      }

      const editableData = await editableResponse.json()
      const allocation = editableData.data.allocations.find(
        a => a.user_id == userId && a.week == weekNumber && a.year == selectedPeriod.year
      )

      if (allocation) {
        // Update existing allocation
        console.log('Admin updating existing allocation:', allocation.id)
        const updateData = {
          billable_hrs: billableHrs,
          non_billable_hrs: nonBillableHrs,
          leave_hrs: leaveHrs
        }
        
        const response = await fetch(`http://127.0.0.1:8000/api/allocations/${allocation.id}`, {
          method: 'PUT',
          headers: {
            'X-Session-ID': sessionId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update allocation')
        }

        console.log('Admin allocation updated successfully')
        
      } else {
        // Create new allocation
        console.log('Admin creating new allocation')
        const weekInfo = getWeekDisplay(weekNumber, selectedPeriod.year)
        
        const createData = {
          user_id: parseInt(userId),
          week: parseInt(weekNumber),
          year: parseInt(selectedPeriod.year),
          week_start: weekInfo.startDate || `${selectedPeriod.year}-01-01`, // Fallback date
          billable_hrs: parseFloat(billableHrs) || 0,
          non_billable_hrs: parseFloat(nonBillableHrs) || 0,
          leave_hrs: parseFloat(leaveHrs) || 0
        }
        
        const response = await fetch(`http://127.0.0.1:8000/api/projects/${selectedProject.id}/create-allocation`, {
          method: 'POST',
          headers: {
            'X-Session-ID': sessionId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to create allocation')
        }

        console.log('Admin allocation created successfully')
      }

      // Refresh data after save - with a small delay to ensure backend is updated
      setTimeout(async () => {
        await loadProjectWeeklyAllocations(selectedProject.id)
      }, 500)
      
    } catch (error) {
      console.error('Admin error saving allocation:', error)
      throw error
    }
  }

  // ===== OVERALLOCATION MODAL HANDLERS =====

  const handleRevertOverallocation = () => {
    if (lastEditContext) {
      // Revert the change in UI
      setProjectUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === lastEditContext.userId) {
            const weekKey = `week${lastEditContext.weekNumber}`
            const updatedUser = { ...user }
            
            // Reset to previous values (before the change that caused overallocation)
            if (updatedUser[weekKey]) {
              // Remove the problematic change by setting back to 0 or previous value
              updatedUser[weekKey] = {
                ...updatedUser[weekKey],
                [lastEditContext.type]: 0
              }
              
              // Recalculate total
              updatedUser[weekKey].total = 
                (updatedUser[weekKey].billable || 0) + 
                (updatedUser[weekKey].non_billable || 0) + 
                (updatedUser[weekKey].leave || 0)
            }
            
            return updatedUser
          }
          return user
        })
      )
    }
    
    // Close modal
    setShowOverallocationModal(false)
    setLastEditContext(null)
    setOverallocationData({})
  }

  const handleKeepOverallocation = async () => {
    if (lastEditContext) {
      try {
        // Save the allocation despite overallocation
        await saveAllocationToBackend(
          lastEditContext.userId,
          lastEditContext.weekNumber,
          lastEditContext.billableHrs,
          lastEditContext.nonBillableHrs,
          lastEditContext.leaveHrs
        )
        
        alert('Allocation saved successfully (overallocation allowed)')
      } catch (error) {
        console.error('Admin error saving overallocated allocation:', error)
        alert('Failed to save allocation. Please try again.')
      }
    }
    
    // Close modal
    setShowOverallocationModal(false)
    setLastEditContext(null)
    setOverallocationData({})
  }



  // Handle editing remark for non-billability
  const handleEditRemark = async (userId, currentRemark) => {
    const newRemark = prompt('Edit reason for non-billability:', currentRemark === 'N/A' ? '' : currentRemark)
    
    if (newRemark !== null && newRemark !== currentRemark) {
      try {
        const sessionId = sessionStorage.getItem('sessionId')
        const response = await fetch(`http://127.0.0.1:8000/api/weekly-remark/${userId}/${selectedPeriod.week}`, {
          method: 'PUT',
          headers: {
            'X-Session-ID': sessionId,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            remark: newRemark,
            year: selectedPeriod.year
          })
        })

        if (response.ok) {
          console.log('Remark updated successfully')
          // Refresh the current bench data
          loadBenchDetailData(currentBenchType)
        } else {
          console.error('Failed to update remark:', response.status)
          alert('Failed to update remark. Please try again.')
        }
      } catch (error) {
        console.error('Error updating remark:', error)
        alert('Error updating remark. Please try again.')
      }
    }
  }

  const handleViewBreakdown = async () => {
    if (lastEditContext) {
      try {
        const params = new URLSearchParams({
          user_id: lastEditContext.userId,
          week: lastEditContext.weekNumber,
          year: selectedPeriod.year
        })

        const sessionId = sessionStorage.getItem('sessionId')
        const response = await fetch(`http://127.0.0.1:8000/api/allocation/user-week-breakdown?${params.toString()}`, {
          headers: {
            'X-Session-ID': sessionId,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          console.log('Admin detailed breakdown:', data.data)
          alert('Detailed breakdown logged to console')
        } else {
          throw new Error('Failed to get breakdown')
        }
        
      } catch (error) {
        console.error('Admin error getting detailed breakdown:', error)
        alert('Failed to load detailed breakdown')
      }
    }
  }

  // CSV Download Functionality (based on admin.html)
  const generateCSVFromBenchData = async (benchType) => {
    try {
      console.log(`Generating CSV for bench type: ${benchType}`)
      
      // Get current year and week for filename
      const year = selectedPeriod.year
      const week = selectedPeriod.week
      
      // Generate filename
      const filename = `${benchType}-${year}-week${week}.csv`
      console.log('CSV filename:', filename)
      
      // Use current bench data if it matches the requested type
      let data = []
      if (currentBenchType === benchType && currentBenchData.length > 0) {
        data = currentBenchData
      } else {
        // Load the bench data for this type if not already loaded
        data = await loadBenchDataForTab(benchType, year, week)
      }
      
      if (!data || data.length === 0) {
        alert('No data available for CSV download')
        return
      }
      
      // Generate section-specific CSV content
      let headers = []
      let dataRows = []
      
      switch(benchType) {
        case 'full-bench':
          headers = ['Name', 'On Bench Since', 'Days on Bench', 'Last Project Owner', 'Years of Exp', 'Skills']
          dataRows = data.map(item => [
            `"${item.name || item.user_name || 'N/A'}"`,
            `"${item.bench_since || 'N/A'}"`,
            `"${item.days_on_bench || 'N/A'}"`,
            `"${item.last_project_owner || 'N/A'}"`,
            `"${item.years_of_exp || 'N/A'}"`,
            `"${item.skills || 'N/A'}"`
          ])
          break
          
        case 'partial-bench':
          headers = ['Name', 'Partial Bench Since', 'Non Billable %', 'Project Owner', 'Years of Exp', 'Skills']
          dataRows = data.map(item => [
            `"${item.name || item.user_name || 'N/A'}"`,
            `"${item.partial_bench_since || 'N/A'}"`,
            `"${item.non_billable_percentage || 'N/A'}%"`,
            `"${item.project_owner || 'N/A'}"`,
            `"${item.years_of_exp || 'N/A'}"`,
            `"${item.skills || 'N/A'}"`
          ])
          break
          
        case 'non-billable':
          headers = ['Name', 'Project Name', 'Project Owner', 'Non Billable Since', 'Reason for Non Billability', 'Years of Exp', 'Skills', '% Non Billability']
          dataRows = data.map(item => [
            `"${item.name || item.user_name || 'N/A'}"`,
            `"${item.project_name || 'N/A'}"`,
            `"${item.project_owner || 'N/A'}"`,
            `"${item.non_billable_since || 'N/A'}"`,
            `"${item.reason_for_non_billability || item.reason || 'N/A'}"`,
            `"${item.years_of_exp || 'N/A'}"`,
            `"${item.skills || 'N/A'}"`,
            `"${item.non_billable_percentage || 'N/A'}%"`
          ])
          break
          
        case 'over-utilization':
          headers = ['Name', 'Current Allocation', 'Projects', 'Years of Exp', 'Skills']
          dataRows = data.map(item => [
            `"${item.name || item.user_name || 'N/A'}"`,
            `"${item.current_allocation || 'N/A'} hrs/week"`,
            `"${item.projects || 'N/A'}"`,
            `"${item.years_of_exp || 'N/A'}"`,
            `"${item.skills || 'N/A'}"`
          ])
          break
          
        default:
          headers = ['Name', 'Data']
          dataRows = data.map(item => [
            `"${item.name || item.user_name || 'N/A'}"`,
            `"${JSON.stringify(item)}"`
          ])
      }
      
      const csvRows = [headers.join(','), ...dataRows.map(row => row.join(','))]
      
      // Create and download CSV
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        console.log(`CSV file downloaded: ${filename}`)
      }
    } catch (error) {
      console.error('Error generating CSV:', error)
      alert('Error generating CSV file')
    }
  }

  // Load specific bench data for CSV download
  const loadBenchDataForTab = async (tabName, year, week) => {
    try {
      let endpoint = ''
      switch(tabName) {
        case 'full-bench':
          endpoint = 'fully-benched'
          break
        case 'partial-bench':
          endpoint = 'partial-benched'
          break
        case 'non-billable':
          endpoint = 'non-billable'
          break
        case 'over-utilization':
          endpoint = 'over-utilised'
          break
        default:
          console.error('Unknown tab name:', tabName)
          return []
      }

      const data = await api.getBenchData(endpoint, year, week)
      
      if (data.success && data.data) {
        // Apply the same data transformation for CSV
        const transformedUsers = (data.data.users || data.data || []).map(user => {
          // Calculate percentage based on bench type
          let nonBillablePercentage = 0
          if (tabName === 'partial-bench') {
            nonBillablePercentage = calculatePartialNonBillablePercentage(user.total_hrs)
          } else if (tabName === 'non-billable') {
            nonBillablePercentage = calculateNonBillablePercentageFromHours(user.non_billable_hrs, user.total_hrs)
          }
          
          return {
            ...user,
            // Map field names for different bench types
            bench_since: user.on_bench_since || user.bench_since,
            partial_bench_since: user.on_partial_bench_since || user.partial_bench_since,
            days_on_bench: user.days_on_bench || calculateDaysOnBench(user.on_bench_since || user.on_partial_bench_since),
            non_billable_percentage: user.non_billable_percentage || nonBillablePercentage,
            // Map over-utilization fields
            current_allocation: user.current_allocation || user.total_hrs,
            projects: user.projects || user.project_name || 'N/A'
          }
        })
        return transformedUsers
      }
      return []
    } catch (error) {
      console.error(`Failed to load bench data for ${tabName}:`, error)
      return []
    }
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
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                const isActive = selectedPeriod.month === month
                const isCurrent = month === new Date().getMonth() + 1 && selectedPeriod.year === new Date().getFullYear()
                
                return (
                  <div
                    key={month}
                    onClick={() => handleMonthClick(month)}
                    className={`time-item text-center py-2 px-1 rounded text-xs cursor-pointer transition-all duration-200 ${
                      isActive && isCurrent 
                        ? 'bg-blue-500 text-white border-2 border-orange-400 border-solid' 
                        : isActive 
                        ? 'bg-blue-500 text-white' 
                        : isCurrent 
                        ? 'bg-orange-100 text-orange-800 border-2 border-orange-400 border-dashed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {getMonthName(month).substring(0, 3)}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Weeks in {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {getWeeksForMonth(selectedPeriod.year, selectedPeriod.month).map(weekNum => {
                const weekInfo = getWeekDisplay(weekNum, selectedPeriod.year)
                const isActive = weekNum === selectedPeriod.week
                const isCurrent = weekNum === getCurrentWeek() && selectedPeriod.month === new Date().getMonth() + 1 && selectedPeriod.year === new Date().getFullYear()
                
                return (
                  <div 
                    key={weekNum} 
                    onClick={() => handleWeekClick(weekNum)}
                    className={`time-item text-center py-2 px-2 rounded cursor-pointer transition-all duration-200 ${
                      isActive && isCurrent 
                        ? 'bg-blue-500 text-white border-2 border-orange-400 border-solid' 
                        : isActive 
                        ? 'bg-blue-500 text-white' 
                        : isCurrent 
                        ? 'bg-orange-100 text-orange-800 border-2 border-orange-400 border-dashed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-xs font-medium">Week {weekNum}</div>
                    <div className="text-xs text-gray-500">{weekInfo.dates}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center text-blue-700">
              <i className="fas fa-calendar-check mr-2"></i>
              <span className="font-medium">Selected Period:</span>
              <span className="ml-2">
                {selectedPeriod.year} • {getMonthName(selectedPeriod.month)} • Week {selectedPeriod.week} ({getWeekDisplay(selectedPeriod.week, selectedPeriod.year).dates})
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
              <p className="text-4xl font-semibold text-blue-700">{benchSummary.fully_benched}</p>
            <p className="text-sm font-medium text-blue-600 mt-1">Fully Benched</p>
          </div>
            <div 
              className="metric-card bg-purple-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer hover:bg-purple-200 transition-colors"
              onClick={() => expandBenchSummary('partial-bench')}
            >
              <p className="text-4xl font-semibold text-purple-700">{benchSummary.partial_benched}</p>
            <p className="text-sm font-medium text-purple-600 mt-1">Partially Benched</p>
          </div>
            <div 
              className="metric-card bg-green-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer hover:bg-green-200 transition-colors"
              onClick={() => expandBenchSummary('non-billable')}
            >
              <p className="text-4xl font-semibold text-green-700">{benchSummary.non_billable}</p>
            <p className="text-sm font-medium text-green-600 mt-1">Non-Billable</p>
          </div>
            <div 
              className="metric-card bg-red-100 p-4 rounded-lg shadow-md flex flex-col items-center justify-center cursor-pointer hover:bg-red-200 transition-colors"
              onClick={() => expandBenchSummary('over-utilization')}
            >
              <p className="text-4xl font-semibold text-red-700">{benchSummary.over_utilised}</p>
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
                          {benchLoading ? (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-spinner fa-spin text-2xl mb-2 text-blue-500"></i>
                                  <p>Loading fully benched team data...</p>
                                </div>
                              </td>
                            </tr>
                          ) : currentBenchType === 'full-bench' && currentBenchData.length > 0 ? (
                            currentBenchData.map((member, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-b border-gray-200">{member.name || member.user_name || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.bench_since || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.days_on_bench || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.last_project_owner || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.years_of_exp || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.skills || 'N/A'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                  <p className="text-lg font-medium">No fully benched team members</p>
                                  <p className="text-sm">All team members are currently allocated to projects</p>
                                </div>
                              </td>
                            </tr>
                          )}
            </tbody>
          </table>
        </div>
                    <div className="mt-4 text-right">
                      <button 
                        onClick={() => generateCSVFromBenchData('full-bench')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
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
                          {benchLoading ? (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-spinner fa-spin text-2xl mb-2 text-purple-500"></i>
                                  <p>Loading partially benched team data...</p>
                                </div>
                              </td>
                            </tr>
                          ) : currentBenchType === 'partial-bench' && currentBenchData.length > 0 ? (
                            currentBenchData.map((member, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-b border-gray-200">{member.name || member.user_name || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.partial_bench_since || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.non_billable_percentage || 'N/A'}%</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.project_owner || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.years_of_exp || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.skills || 'N/A'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                  <p className="text-lg font-medium">No partially benched team members</p>
                                  <p className="text-sm">All team members are either fully allocated or fully benched</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
        <div className="mt-4 text-right">
                      <button 
                        onClick={() => generateCSVFromBenchData('partial-bench')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
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
                          {benchLoading ? (
                            <tr>
                              <td colSpan="8" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-spinner fa-spin text-2xl mb-2 text-green-500"></i>
                                  <p>Loading non-billable team data...</p>
                                </div>
                              </td>
                            </tr>
                          ) : currentBenchType === 'non-billable' && currentBenchData.length > 0 ? (
                            currentBenchData.map((member, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-b border-gray-200">{member.name || member.user_name || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.project_name || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.project_owner || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.non_billable_since || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200 max-w-xs">
                                  <span 
                                    className="editable-remark cursor-pointer hover:bg-blue-50 px-2 py-1 rounded border-dashed border-gray-300 transition-colors text-sm break-words"
                                    onClick={() => handleEditRemark(member.user_id, member.reason_for_non_billability || member.reason || 'N/A')}
                                    title="Click to edit reason for non-billability"
                                  >
                                    {member.reason_for_non_billability || member.reason || 'N/A'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.years_of_exp || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.skills || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.non_billable_percentage || 'N/A'}%</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                  <p className="text-lg font-medium">No non-billable team members</p>
                                  <p className="text-sm">All team members are currently billable on their projects</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-right">
                      <button 
                        onClick={() => generateCSVFromBenchData('non-billable')}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                      >
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
                            <th className="py-3 px-4 border-b border-gray-200">Years of exp</th>
                            <th className="py-3 px-4 border-b border-gray-200">Skills</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700">
                          {benchLoading ? (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-spinner fa-spin text-2xl mb-2 text-red-500"></i>
                                  <p>Loading over-utilization data...</p>
                                </div>
                              </td>
                            </tr>
                          ) : currentBenchType === 'over-utilization' && currentBenchData.length > 0 ? (
                            currentBenchData.map((member, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="py-3 px-4 border-b border-gray-200">{member.name || member.user_name || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.current_allocation || 'N/A'} hrs/week</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.projects || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.years_of_exp || 'N/A'}</td>
                                <td className="py-3 px-4 border-b border-gray-200">{member.skills || 'N/A'}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                  <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                                  <p className="text-lg font-medium">No over-utilized team members</p>
                                  <p className="text-sm">All team members are within their 40-hour capacity</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4 text-right">
                      <button 
                        onClick={() => generateCSVFromBenchData('over-utilization')}
                        className="bg-red-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                      >
                        Download CSV
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* All Projects List View - EXACT COPY FROM PO PAGE */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-table mr-2 text-purple-600"></i>All Projects — List View
          </h3>
          
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-1 block">Search</label>
              <div className="relative">
                <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
                <input 
                  type="text" 
                  placeholder="type project…" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Sort by</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="not_desc">Not Allocated ↓</option>
                  <option value="not_asc">Not Allocated ↑</option>
                  <option value="allocated_desc">Allocated ↓</option>
                  <option value="allocated_asc">Allocated ↑</option>
                  <option value="name_asc">Name A–Z</option>
                  <option value="name_desc">Name Z–A</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-md px-3 py-2"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="on hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Rows</label>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                  className="border rounded-md px-3 py-2"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Project Name</th>
                  <th className="px-3 py-2 text-left">Customer Name</th>
                  <th className="px-3 py-2 text-right">Allocated %</th>
                  <th className="px-3 py-2 text-right">Not Allocated %</th>
                  <th className="px-3 py-2 text-left">BU</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-center">Select</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProjects.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage).map((project, index) => (
                  <tr key={project.id || index} className={`hover:bg-gray-50 ${
                    selectedProject?.id === project.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                  }`}>
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{project.name || project.project_name || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{project.customer_name || project.customer || 'N/A'}</td>
                      <td className="px-3 py-2 text-sm text-right text-green-600 font-medium">{project.allocated_percentage || '0'}%</td>
                      <td className="px-3 py-2 text-sm text-right text-orange-600 font-medium">{project.not_allocated_percentage || '100'}%</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{project.bu || project.business_unit || 'N/A'}</td>
                      <td className="px-3 py-2">
                        {getStatusBadge(getStatusLabel(project.status))}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => viewProject(project.id)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            selectedProject?.id === project.id
                              ? 'bg-purple-600 text-white border border-purple-700 shadow-md'
                              : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
                          }`}
                        >
                          {selectedProject?.id === project.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                  </tr>
                ))}
                {filteredProjects.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-project-diagram text-4xl mb-2 text-gray-300"></i>
                        <p className="text-lg font-medium">No projects found</p>
                        <p className="text-sm">Try adjusting your search or filter criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-600">
              Projects: {filteredProjects.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                « Prev
              </button>
              <span>Page {currentPage} of {Math.ceil(filteredProjects.length / rowsPerPage)}</span>
              <button
                onClick={() => setCurrentPage(Math.min(Math.ceil(filteredProjects.length / rowsPerPage), currentPage + 1))}
                disabled={currentPage >= Math.ceil(filteredProjects.length / rowsPerPage)}
                className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next »
              </button>
            </div>
          </div>
        </div>

        {/* Selected Project + Insights */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            <i className="fas fa-project-diagram mr-2 text-purple-600"></i>
            Selected Project: <span className="text-purple-600">{selectedProject ? selectedProject.name || selectedProject.project_name : 'No project selected'}</span>
          </h3>
        </div>

        {selectedProject && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <i className="fas fa-chart-pie mr-2 text-purple-600"></i>
                Insights — <span className="ml-1 text-purple-600">{selectedProject.name || selectedProject.project_name}</span>
              </h3>
              <div className="text-sm text-gray-600">
                Week: <span>Week {selectedPeriod.week}</span> 
                <span className="ml-1 text-gray-500">({getWeekDisplay(selectedPeriod.week, selectedPeriod.year).dateRange})</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{getInsights().members}</div>
                <div className="text-sm text-gray-600">Team Members</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{getInsights().billable}h</div>
                <div className="text-sm text-gray-600">Billable Hours</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{getInsights().nonBillable}h</div>
                <div className="text-sm text-gray-600">Non-Billable Hours</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{getInsights().leave}h</div>
                <div className="text-sm text-gray-600">Leave Hours</div>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Allocation Table */}
        {selectedProject && (
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center">
                <i className="fas fa-users-cog mr-2"></i>
                Team Member Allocation - {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
                <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Weekly Breakdown</span>
              </h3>
            </div>

            <div className="overflow-x-auto max-h-96 relative">
              {/* Loading overlay for project data */}
              {projectDataLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-20">
                  <div className="text-center">
                    <i className="fas fa-spinner fa-spin text-purple-600 text-2xl mb-2"></i>
                    <p className="text-sm text-gray-600">Loading project data...</p>
                  </div>
                </div>
              )}
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-16 bg-gray-50 z-10 border-r border-gray-200">
                      Role
                    </th>
                    {getDisplayWeeks().map(week => (
                      <th key={week.number} colSpan="4" className={`px-2 py-1 text-center text-sm font-semibold text-gray-700 border-r border-gray-300 ${
                        week.isCurrentWeek ? 'bg-orange-100' : ''
                      }`}>
                        <div className="flex flex-col items-center">
                          <div>Week {week.number}</div>
                          <div className="text-xs text-gray-500 mt-1">{getWeekDisplay(week.number, selectedPeriod.year).dateRange}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="sticky left-0 bg-gray-50 z-10 border-r border-gray-200"></th>
                    <th className="sticky left-16 bg-gray-50 z-10 border-r border-gray-200"></th>
                    {getDisplayWeeks().map(week => (
                      <React.Fragment key={week.number}>
                        <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Billable</th>
                        <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Non-Bill.</th>
                        <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Leaves</th>
                        <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-300">Total</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filterTeamMembers(projectUsers).length === 0 ? (
                    <tr>
                      <td colSpan={2 + (getDisplayWeeks().length * 4)} className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                          <p className="text-lg font-medium">No team members found</p>
                          <p className="text-sm">No engineers or technical team members are currently allocated to this project</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filterTeamMembers(projectUsers).map((user) => (
                      <tr key={user.id || user.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                          {`${user.firstname} ${user.lastname}`.trim() || user.name || user.user_name || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 sticky left-16 bg-white z-10 border-r border-gray-200">
                          {user.role_name || user.role || 'N/A'}
                        </td>
                        {getDisplayWeeks().map(week => {
                          const isCurrentWeek = week.number === getCurrentWeek()
                          const weekKey = `week${week.number}`
                          const weekData = user[weekKey] || { billable: 0, non_billable: 0, leave: 0, total: 0 }
                          
                          // Ensure we get numbers, not strings
                          const billableHrs = parseFloat(weekData.billable) || 0
                          const nonBillableHrs = parseFloat(weekData.non_billable) || 0
                          const leaveHrs = parseFloat(weekData.leave) || 0
                          const totalHrs = billableHrs + nonBillableHrs + leaveHrs
                          
                          return (
                            <React.Fragment key={`${user.id}-week-${week.number}`}>
                              {/* Billable hours - ALWAYS EDITABLE FOR ADMIN */}
                              <td className={`px-1 py-3 text-center text-xs ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={billableHrs}
                                  onChange={(e) => handleAllocationChange(user.id, week.number, 'billable', e.target.value)}
                                  onBlur={(e) => handleAllocationBlur(user.id, week.number, 'billable', e.target.value)}
                                  className="w-16 text-center border rounded px-2 py-1 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Non-billable hours - ALWAYS EDITABLE FOR ADMIN */}
                              <td className={`px-1 py-3 text-center text-xs ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={nonBillableHrs}
                                  onChange={(e) => handleAllocationChange(user.id, week.number, 'non_billable', e.target.value)}
                                  onBlur={(e) => handleAllocationBlur(user.id, week.number, 'non_billable', e.target.value)}
                                  className="w-16 text-center border rounded px-2 py-1 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Leave hours - ALWAYS EDITABLE FOR ADMIN */}
                              <td className={`px-1 py-3 text-center text-xs ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={leaveHrs}
                                  onChange={(e) => handleAllocationChange(user.id, week.number, 'leave', e.target.value)}
                                  onBlur={(e) => handleAllocationBlur(user.id, week.number, 'leave', e.target.value)}
                                  className="w-16 text-center border rounded px-2 py-1 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Total hours */}
                              <td className={`px-1 py-3 text-center text-xs font-bold text-blue-600 border-r border-gray-300 ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                {totalHrs}
                              </td>
                            </React.Fragment>
                          )
                        })}
                      </tr>
                    ))
                  )}
                  {projectUsers.length === 0 && (
                    <tr>
                      <td colSpan={2 + (getDisplayWeeks().length * 4)} className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                          <p className="text-lg font-medium">No team members found</p>
                          <p className="text-sm">Select a project to view team allocations</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            <i className="fas fa-users-cog mr-2 text-purple-600"></i>
            User Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-blue-900">Active Users</h3>
                <div className="text-3xl font-bold text-blue-600">{userCounts.activeUsers}</div>
              </div>
              <p className="text-sm text-blue-700 mb-4">users</p>
              <button 
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => console.log('Show active users modal')}
              >
                <i className="fas fa-eye mr-2"></i>View
              </button>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-yellow-900">New Users</h3>
                <div className="text-3xl font-bold text-yellow-600">{userCounts.newUsers}</div>
              </div>
              <p className="text-sm text-yellow-700 mb-4">pending approval</p>
              <button 
                className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                onClick={() => console.log('Show new users modal')}
              >
                <i className="fas fa-check mr-2"></i>Review
              </button>
            </div>
            
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-red-900">Inactive Users</h3>
                <div className="text-3xl font-bold text-red-600">{userCounts.inactiveUsers}</div>
              </div>
              <p className="text-sm text-red-700 mb-4">users</p>
              <button 
                className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                onClick={() => console.log('Show inactive users modal')}
              >
                <i className="fas fa-eye mr-2"></i>Review
              </button>
            </div>
          </div>
        </div>

        {/* Project Management Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            <i className="fas fa-project-diagram mr-2 text-purple-600"></i>
            Project Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-green-900">Active Projects</h3>
                <div className="text-3xl font-bold text-green-600">{projectCounts.activeProjects}</div>
              </div>
              <p className="text-sm text-green-700 mb-4">projects</p>
              <button 
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => console.log('Show active projects modal')}
              >
                <i className="fas fa-eye mr-2"></i>View All
              </button>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-orange-900">On Hold</h3>
                <div className="text-3xl font-bold text-orange-600">{projectCounts.onHoldProjects}</div>
              </div>
              <p className="text-sm text-orange-700 mb-4">projects</p>
              <button 
                className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                onClick={() => console.log('Show on hold projects modal')}
              >
                <i className="fas fa-eye mr-2"></i>Review
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
                <div className="text-3xl font-bold text-gray-600">{projectCounts.completedProjects}</div>
              </div>
              <p className="text-sm text-gray-700 mb-4">projects</p>
              <button 
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                onClick={() => console.log('Show completed projects modal')}
              >
                <i className="fas fa-archive mr-2"></i>Archive
              </button>
            </div>
          </div>
        </div>

        {/* Selected Project Section - Same as PO page */}
        {selectedProject && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-purple-600 mb-2">
              <i className="fas fa-project-diagram mr-2"></i>
              Selected Project: {selectedProject.name || selectedProject.project_name}
            </h3>
            <div className="text-sm text-gray-600">
              <span className="mr-4">Customer: {selectedProject.customer_name || selectedProject.customer || 'N/A'}</span>
              <span className="mr-4">BU: {selectedProject.bu || selectedProject.business_unit || 'N/A'}</span>
              <span>Status: {getStatusBadge(selectedProject.status)}</span>
            </div>
          </div>
        )}

        {/* Insights Section - Same as PO page */}
        {selectedProject && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-600">
                <i className="fas fa-chart-line mr-2"></i>
                Insights — {selectedProject.name || selectedProject.project_name}
              </h3>
              <span className="text-sm text-gray-500">
                Week: Week {selectedPeriod.week} (Sep 1-5)
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {/* Team Members */}
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {filterTeamMembers(projectUsers).length}
                </div>
                <div className="text-sm text-gray-600">Team Members</div>
              </div>
              
              {/* Billable Hours */}
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {filterTeamMembers(projectUsers).reduce((sum, user) => {
                    const weekKey = `week${selectedPeriod.week}`
                    const weekData = user[weekKey] || {}
                    return sum + (parseFloat(weekData.billable) || 0)
                  }, 0)}h
                </div>
                <div className="text-sm text-gray-600">Billable Hours</div>
              </div>
              
              {/* Non-Billable Hours */}
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-1">
                  {filterTeamMembers(projectUsers).reduce((sum, user) => {
                    const weekKey = `week${selectedPeriod.week}`
                    const weekData = user[weekKey] || {}
                    return sum + (parseFloat(weekData.non_billable) || 0)
                  }, 0)}h
                </div>
                <div className="text-sm text-gray-600">Non-Billable Hours</div>
              </div>
              
              {/* Leave Hours */}
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-1">
                  {filterTeamMembers(projectUsers).reduce((sum, user) => {
                    const weekKey = `week${selectedPeriod.week}`
                    const weekData = user[weekKey] || {}
                    return sum + (parseFloat(weekData.leave) || 0)
                  }, 0)}h
                </div>
                <div className="text-sm text-gray-600">Leave Hours</div>
              </div>
            </div>
          </div>
        )}

        {/* Overallocation Modal - Same as PO page */}
        {showOverallocationModal && (
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6">
              <h3 className="text-lg font-semibold mb-1 text-red-600">⚠ Overallocation Detected</h3>
              <p className="text-sm text-gray-600 mb-2">{overallocationData.subtitle}</p>
              {overallocationData.currentProjectSubtitle && (
                <p className="text-sm text-blue-600 font-medium mb-4">
                  <i className="fas fa-arrow-right mr-1"></i>
                  {overallocationData.currentProjectSubtitle}
                </p>
              )}
              
              <div className="overflow-x-auto border rounded-lg mb-4">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Project Details</th>
                      <th className="px-3 py-3 text-right">Billable</th>
                      <th className="px-3 py-3 text-right">Non-Bill.</th>
                      <th className="px-3 py-3 text-right">Leaves</th>
                      <th className="px-3 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {overallocationData.allocations?.map((alloc, index) => (
                      <tr key={index} className={
                        alloc.isCurrentProject 
                          ? 'bg-blue-50 border-l-4 border-blue-500' 
                          : 'hover:bg-gray-50'
                      }>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                                                      <div className={`font-medium ${alloc.isCurrentProject ? 'text-blue-700 font-semibold' : ''}`}>
                            {alloc.isCurrentProject ? '▶ ' : ''}{alloc.project_name}
                            {alloc.isCurrentProject ? ' (Current Project - New Values)' : ''}
                          </div>
                            {alloc.project_id && (
                              <div className="text-xs text-gray-500">ID: {alloc.project_id}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">{alloc.billable_hrs || 0}</td>
                        <td className="px-3 py-2 text-right">{alloc.non_billable_hrs || 0}</td>
                        <td className="px-3 py-2 text-right">{alloc.leave_hrs || 0}</td>
                        <td className="px-3 py-2 text-right font-semibold">{alloc.total_hours}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td className="px-3 py-2 font-semibold">TOTAL ACROSS ALL PROJECTS</td>
                      <td className="px-3 py-2 text-right font-semibold">{overallocationData.totalBillable}</td>
                      <td className="px-3 py-2 text-right font-semibold">{overallocationData.totalNonBillable}</td>
                      <td className="px-3 py-2 text-right font-semibold">{overallocationData.totalLeave}</td>
                      <td className="px-3 py-2 text-right font-bold text-lg text-red-600">{overallocationData.grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center">
                <button 
                  onClick={handleViewBreakdown}
                  className="px-3 py-2 rounded border border-amber-600 text-amber-700 hover:bg-amber-50"
                >
                  View Breakdown
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={handleRevertOverallocation}
                    className="px-3 py-2 rounded border border-gray-300 hover:bg-gray-50"
                  >
                    Revert
                  </button>
                  <button 
                    onClick={handleKeepOverallocation}
                    className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
                  >
                    Keep Anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
