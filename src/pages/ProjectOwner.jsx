import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'

export default function ProjectOwner() {
  // State for time period selection
  const [selectedPeriod, setSelectedPeriod] = useState({ year: 2025, month: 8, week: 32 })
  
  // State for projects
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('not_desc')
  const [statusFilter, setStatusFilter] = useState('active')
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  
  // State for project data
  const [projectUsers, setProjectUsers] = useState([])
  const [weeklyAllocations, setWeeklyAllocations] = useState([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadProjectUsers(selectedProject.id)
      loadProjectWeeklyAllocations(selectedProject.id)
    }
  }, [selectedProject, selectedPeriod])

  // Helper functions (moved to top to fix reference errors)
  // Get display weeks (current week + past 3 weeks)
  const getDisplayWeeks = () => {
    const currentWeek = getCurrentWeek()
    const weeks = []
    for (let i = 3; i >= 0; i--) {
      const weekNumber = currentWeek - i
      if (weekNumber > 0) {
        weeks.push(weekNumber)
      }
    }
    return weeks
  }

  // Get current corporate week (Monday-Friday based)
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

  // Get week number for a specific date (corporate week calculation)
  const getWeekNumber = (date) => {
    const year = date.getFullYear()
    const yearStart = new Date(year, 0, 1)
    const firstMonday = new Date(yearStart)
    
    while (firstMonday.getDay() !== 1) { // 1 = Monday
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

  // Get week display info
  const getWeekDisplay = (weekNumber, year) => {
    const yearStart = new Date(year, 0, 1)
    const firstMonday = new Date(yearStart)
    
    while (firstMonday.getDay() !== 1) {
      firstMonday.setDate(firstMonday.getDate() + 1)
    }
    
    const weekStart = new Date(firstMonday)
    weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7)
    
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 4) // Friday (5-day week)
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const startMonth = monthNames[weekStart.getMonth()]
    const endMonth = monthNames[weekEnd.getMonth()]
    
    if (startMonth === endMonth) {
      return {
        display: `Week ${weekNumber}`,
        dates: `${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()}`,
        fullDisplay: `Week ${weekNumber} (${startMonth} ${weekStart.getDate()}-${weekEnd.getDate()})`
      }
    } else {
      return {
        display: `Week ${weekNumber}`,
        dates: `${startMonth} ${weekStart.getDate()}-${endMonth} ${weekEnd.getDate()}`,
        fullDisplay: `Week ${weekNumber} (${startMonth} ${weekStart.getDate()}-${endMonth} ${weekEnd.getDate()})`
      }
    }
  }

  // Get status label from status number
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

  // Get status badge HTML
  const getStatusBadge = (status) => {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
    switch(status.toLowerCase()) {
      case 'active':
        return <span className={`${baseClass} bg-green-100 text-green-800`}>Active</span>
      case 'on hold':
        return <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>On Hold</span>
      case 'completed':
        return <span className={`${baseClass} bg-gray-100 text-gray-800`}>Completed</span>
      case 'archived':
        return <span className={`${baseClass} bg-red-100 text-red-800`}>Archived</span>
      default:
        return <span className={`${baseClass} bg-gray-100 text-gray-800`}>{status}</span>
    }
  }

  // Filter team members (same as HTML frontend)
  const filterTeamMembers = (users) => {
    return users.filter(user => {
      const role = user.role_name?.toLowerCase() || ''
      
      // Only include specific roles: Engineer, Jr. Engineer, Project Lead / Manager, Testing Engineer
      const isEngineer = role.includes('engineer')
      const isJrEngineer = role.includes('jr. engineer') || role.includes('jr engineer')
      const isProjectLeadManager = role.includes('project lead') && role.includes('manager')
      const isTestingEngineer = role.includes('testing engineer')
      
      // Include only these specific roles
      return isEngineer || isJrEngineer || isProjectLeadManager || isTestingEngineer
    })
  }

  // Calculate insights
  const getInsights = () => {
    const filteredUsers = filterTeamMembers(projectUsers)
    const displayWeeks = getDisplayWeeks()
    
    let totalBillable = 0
    let totalNonBillable = 0
    let totalLeave = 0
    
    // Calculate totals from weekly allocations
    weeklyAllocations.forEach(user => {
      displayWeeks.forEach(weekNumber => {
        const weekKey = `week${weekNumber}`
        const weekData = user[weekKey]
        if (weekData) {
          totalBillable += parseFloat(weekData.billable) || 0
          totalNonBillable += parseFloat(weekData.non_billable) || 0
          totalLeave += parseFloat(weekData.leave) || 0
        }
      })
    })
    
    return {
      members: filteredUsers.length,
      billable: totalBillable,
      nonBillable: totalNonBillable,
      leave: totalLeave
    }
  }

  // Load PO projects
  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getMyPoProjectsSimple()
      
      if (data && typeof data === 'object' && data.data?.projects) {
        setProjects(data.data.projects)
        // Select first project by default
        if (data.data.projects.length > 0) {
          setSelectedProject(data.data.projects[0])
        }
      } else if (Array.isArray(data)) {
        setProjects(data)
        if (data.length > 0) {
          setSelectedProject(data[0])
        }
      } else {
        setProjects([])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
      setError('Failed to load projects. Please try again.')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Load project users
  const loadProjectUsers = async (projectId) => {
    try {
      const data = await api.getProjectUsers(projectId)
      if (data && typeof data === 'object' && data.data?.users) {
        setProjectUsers(data.data.users)
      } else {
        setProjectUsers([])
      }
    } catch (error) {
      console.error('Error loading project users:', error)
      setProjectUsers([])
    }
  }

  // Load project weekly allocations
  const loadProjectWeeklyAllocations = async (projectId) => {
    try {
      const params = new URLSearchParams({
        year: selectedPeriod.year,
        weeks: getDisplayWeeks().join(',')
      })
      
      const data = await api.getProjectWeeklyAllocations(`${projectId}?${params.toString()}`)
      if (data && typeof data === 'object' && data.data?.users) {
        setWeeklyAllocations(data.data.users)
      } else {
        setWeeklyAllocations([])
      }
    } catch (error) {
      console.error('Error loading weekly allocations:', error)
      setWeeklyAllocations([])
    }
  }

  // Handle time period changes
  const handleYearChange = (year) => {
    setSelectedPeriod(prev => ({ ...prev, year: parseInt(year) }))
  }

  const handleMonthClick = (month) => {
    setSelectedPeriod(prev => ({ ...prev, month: month, week: 1 }))
  }

  const handleWeekClick = (week) => {
    setSelectedPeriod(prev => ({ ...prev, week: week }))
  }

  // Handle project selection
  const handleProjectSelect = (project) => {
    setSelectedProject(project)
  }

  // Filter and sort projects
  const filteredProjects = projects.filter(project => {
    if (!project || typeof project !== 'object') return false
    
    const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.role_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || getStatusLabel(project.status).toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc':
        return (a.name || '').localeCompare(b.name || '')
      case 'name_desc':
        return (b.name || '').localeCompare(a.name || '')
      case 'alloc_desc':
        return (b.allocated_percentage || 0) - (a.allocated_percentage || 0)
      case 'alloc_asc':
        return (a.allocated_percentage || 0) - (b.allocated_percentage || 0)
      case 'not_desc':
        return (b.not_allocated_percentage || 0) - (a.not_allocated_percentage || 0)
      case 'not_asc':
        return (a.not_allocated_percentage || 0) - (b.not_allocated_percentage || 0)
      default:
        return 0
    }
  })

  // Pagination
  const totalPages = Math.ceil(sortedProjects.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const paginatedProjects = sortedProjects.slice(startIndex, startIndex + rowsPerPage)

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-600 mr-3"></i>
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Projects</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadProjects}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>Try Again
          </button>
        </div>
      </div>
    )
  }

  const insights = getInsights()
  const displayWeeks = getDisplayWeeks()
  const monthWeeks = getWeeksForMonth(selectedPeriod.year, selectedPeriod.month)

  return (
    <div className="space-y-6">
      {/* Time Period Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <i className="fas fa-calendar-alt mr-2 text-purple-600"></i>Time Period Selection
        </h2>
        
        <div className="flex items-center gap-4 mb-2">
          <label className="text-sm font-medium text-gray-700">Year:</label>
          <select 
            value={selectedPeriod.year}
            onChange={(e) => handleYearChange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value={2023}>2023</option>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>
        </div>

        {/* Month Selection Grid */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Month</h3>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
              const isActive = month === selectedPeriod.month
              const isCurrent = month === new Date().getMonth() + 1 && selectedPeriod.year === new Date().getFullYear()
              
              return (
                <div
                  key={month}
                  onClick={() => handleMonthClick(month)}
                  className={`time-item text-center py-2 px-1 rounded bg-gray-100 text-xs cursor-pointer hover:bg-gray-200 transition-colors ${
                    isActive ? 'active' : ''
                  } ${isCurrent ? 'current' : ''}`}
                >
                  {getMonthName(month).substring(0, 3)}
                </div>
              )
            })}
          </div>
        </div>

        {/* Week Selection Grid */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Weeks in {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {monthWeeks.map(weekNum => {
              const weekInfo = getWeekDisplay(weekNum, selectedPeriod.year)
              const isActive = weekNum === selectedPeriod.week
              const isCurrent = weekNum === getCurrentWeek() && selectedPeriod.month === new Date().getMonth() + 1 && selectedPeriod.year === new Date().getFullYear()
              
              return (
                <div
                  key={weekNum}
                  onClick={() => handleWeekClick(weekNum)}
                  className={`time-item text-center py-2 px-2 rounded bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors ${
                    isActive ? 'active' : ''
                  } ${isCurrent ? 'current' : ''}`}
                >
                  <div className="text-xs font-medium">{weekInfo.display}</div>
                  <div className="text-xs text-gray-500">{weekInfo.dates}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Period Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <div className="flex items-center text-blue-700 text-sm">
            <i className="fas fa-calendar-check mr-2"></i>
            <span className="font-medium">Selected Period:</span>
            <span className="ml-2">
              {selectedPeriod.year} • {getMonthName(selectedPeriod.month)} • {getWeekDisplay(selectedPeriod.week, selectedPeriod.year).fullDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* My Projects — List View */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-table mr-2 text-purple-600"></i>My Projects — List View
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
                <option value="alloc_desc">Allocated ↓</option>
                <option value="alloc_asc">Allocated ↑</option>
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
                <option value="onhold">On Hold</option>
                <option value="completed">Completed</option>
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
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-3 py-4 text-center text-gray-500">
                    <i className="fas fa-spinner fa-spin mr-2"></i>Loading projects...
                  </td>
                </tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-4 text-center text-gray-500">
                    {projects.length === 0 ? 'No projects found' : 'No projects match your filters'}
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr key={project.id || project.project_id || `project-${Math.random()}`} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">{project.name || project.project_name || 'N/A'}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{project.description ? project.description.substring(0, 30) + '...' : 'N/A'}</td>
                    <td className="px-3 py-2 text-sm text-right text-green-600 font-medium">0%</td>
                    <td className="px-3 py-2 text-sm text-right text-orange-600 font-medium">100%</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{project.role_name || 'N/A'}</td>
                    <td className="px-3 py-2">
                      {getStatusBadge(getStatusLabel(project.status))}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleProjectSelect(project)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                          selectedProject?.id === project.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {selectedProject?.id === project.id ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-gray-600">Projects: {filteredProjects.length}</div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              « Prev
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Next »
            </button>
          </div>
        </div>
      </div>

      {/* Selected Project */}
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          <i className="fas fa-project-diagram mr-2 text-purple-600"></i>
          Selected Project: <span className="text-purple-600">{selectedProject?.name || 'No project selected'}</span>
        </h3>
      </div>

      {/* Insights */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow p-6 mb-6" id="insights">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <i className="fas fa-chart-pie mr-2 text-purple-600"></i>
              Insights — <span className="ml-1">{selectedProject.name}</span>
            </h3>
            <div className="text-sm text-gray-600">
              Week: <span>Week {selectedPeriod.week}</span> <span className="ml-1 text-gray-500">({getWeekDisplay(selectedPeriod.week, selectedPeriod.year).dates})</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{insights.members}</div>
              <div className="text-sm text-gray-600">Team Members</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{insights.billable}h</div>
              <div className="text-sm text-gray-600">Billable Hours</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{insights.nonBillable}h</div>
              <div className="text-sm text-gray-600">Non-Billable Hours</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{insights.leave}h</div>
              <div className="text-sm text-gray-600">Leave Hours</div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Allocation Table */}
      {selectedProject && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="week-header px-6 py-3 sticky top-0">
            <h3 className="text-lg font-semibold flex items-center">
              <i className="fas fa-users-cog mr-2"></i>
              Team Member Allocation - {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Weekly Breakdown</span>
            </h3>
          </div>

          <div className="overflow-x-auto max-h-[28rem] relative">
            <table className="min-w-full divide-y divide-gray-200 table-fixed border-separate border-spacing-0" style={{ isolation: 'isolate' }}>
              <colgroup>
                <col style={{ width: 'var(--col-member)' }} />
                <col style={{ width: 'var(--col-role)' }} />
                {/* Dynamic columns for weeks */}
                {displayWeeks.map(() => (
                  <>
                    <col style={{ width: 'var(--col-bill)' }} />
                    <col style={{ width: 'var(--col-non)' }} />
                    <col style={{ width: 'var(--col-leave)' }} />
                    <col style={{ width: 'var(--col-total)' }} />
                  </>
                ))}
                {/* Sum columns */}
                <col style={{ width: 'var(--col-bill)' }} />
                <col style={{ width: 'var(--col-non)' }} />
                <col style={{ width: 'var(--col-leave)' }} />
                <col style={{ width: 'var(--col-total)' }} />
              </colgroup>
              
              <thead className="bg-gray-50 sticky top-0">
                {/* Row 1: Week headers */}
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 top-0 bg-gray-50 z-40 border-r border-gray-200" rowSpan={3}>
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-16 top-0 bg-gray-50 z-40 border-r border-gray-200" rowSpan={3}>
                    Role
                  </th>
                  
                  {displayWeeks.map((weekNumber) => {
                    const isCurrentWeek = weekNumber === getCurrentWeek()
                    const weekInfo = getWeekDisplay(weekNumber, selectedPeriod.year)
                    
                    return (
                      <th 
                        key={weekNumber}
                        className={`px-2 py-1 text-center text-sm font-semibold text-gray-700 border-r border-gray-300 ${
                          isCurrentWeek ? 'bg-orange-100' : ''
                        }`}
                        colSpan={4}
                      >
                        <div className="flex flex-col items-center">
                          <div>{weekInfo.display}</div>
                          {isCurrentWeek && (
                            <button 
                              onClick={() => {/* TODO: Implement copy last week */}}
                              className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Copy Last Week
                            </button>
                          )}
                        </div>
                      </th>
                    )
                  })}
                  
                  {/* Sum header */}
                  <th className="px-2 py-1 text-center text-sm font-semibold text-gray-700 bg-gray-100 border-l-2 border-gray-300" colSpan={4}>
                    Total
                  </th>
                </tr>
                
                {/* Row 2: Week dates */}
                <tr>
                  {displayWeeks.map((weekNumber) => {
                    const isCurrentWeek = weekNumber === getCurrentWeek()
                    const weekInfo = getWeekDisplay(weekNumber, selectedPeriod.year)
                    
                    return (
                      <th 
                        key={weekNumber}
                        className={`px-2 py-1 text-center text-xs font-medium text-gray-400 border-r border-gray-300 ${
                          isCurrentWeek ? 'bg-orange-100' : ''
                        }`}
                        colSpan={4}
                      >
                        {weekInfo.dates}
                      </th>
                    )
                  })}
                  
                  {/* Sum date header */}
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-400 bg-gray-100 border-l-2 border-gray-300" colSpan={4}>
                    All Weeks
                  </th>
                </tr>
                
                {/* Row 3: Column headers */}
                <tr>
                  {displayWeeks.map((weekNumber) => {
                    const isCurrentWeek = weekNumber === getCurrentWeek()
                    const bgClass = isCurrentWeek ? 'bg-orange-50' : ''
                    
                    return (
                      <>
                        <th className={`px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide ${bgClass}`}>
                          Billable
                        </th>
                        <th className={`px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide ${bgClass}`}>
                          Non-Bill.
                        </th>
                        <th className={`px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide ${bgClass}`}>
                          Leaves
                        </th>
                        <th className={`px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide ${bgClass} border-r border-gray-300`}>
                          Total
                        </th>
                      </>
                    )
                  })}
                  
                  {/* Sum column headers */}
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-100 border-l-2 border-gray-300">
                    Billable
                  </th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-100">
                    Non-Bill.
                  </th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-100">
                    Leaves
                  </th>
                  <th className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-100 border-r border-gray-300">
                    Total
                  </th>
                </tr>
              </thead>
              
              <tbody className="bg-white divide-y divide-gray-200">
                {filterTeamMembers(projectUsers).length === 0 ? (
                  <tr>
                    <td colSpan={4 + (displayWeeks.length * 4)} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-users text-4xl mb-2 text-gray-300"></i>
                        <p className="text-lg font-medium">No team members found</p>
                        <p className="text-sm">No engineers or technical team members are currently allocated to this project</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filterTeamMembers(projectUsers).map((user) => {
                    // Calculate sums for this user across all weeks
                    let billableSum = 0
                    let nonBillableSum = 0
                    let leaveSum = 0
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        {/* Member name */}
                        <td className="px-4 py-4 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">
                            {`${user.firstname} ${user.lastname}`.trim()}
                          </div>
                        </td>
                        
                        {/* Role */}
                        <td className="px-4 py-4 whitespace-nowrap sticky left-16 bg-white z-10 border-r border-gray-200">
                          <div className="text-xs text-gray-700">{user.role_name}</div>
                        </td>
                        
                        {/* Weekly allocation cells */}
                        {displayWeeks.map((weekNumber) => {
                          const isCurrentWeek = weekNumber === getCurrentWeek()
                          const weekKey = `week${weekNumber}`
                          const weekData = user[weekKey]
                          
                          const billableHrs = weekData ? parseFloat(weekData.billable) || 0 : 0
                          const nonBillableHrs = weekData ? parseFloat(weekData.non_billable) || 0 : 0
                          const leaveHrs = weekData ? parseFloat(weekData.leave) || 0 : 0
                          const totalHrs = billableHrs + nonBillableHrs + leaveHrs
                          
                          // Add to sums
                          billableSum += billableHrs
                          nonBillableSum += nonBillableHrs
                          leaveSum += leaveHrs
                          
                          return (
                            <>
                              {/* Billable hours */}
                              <td className={`px-1 py-3 text-center text-xs allocation-cell ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={billableHrs}
                                  onChange={(e) => {/* TODO: Implement allocation update */}}
                                  className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Non-billable hours */}
                              <td className={`px-1 py-3 text-center text-xs allocation-cell ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={nonBillableHrs}
                                  onChange={(e) => {/* TODO: Implement allocation update */}}
                                  className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Leave hours */}
                              <td className={`px-1 py-3 text-center text-xs allocation-cell ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={leaveHrs}
                                  onChange={(e) => {/* TODO: Implement allocation update */}}
                                  className="w-16 text-center border border-gray-300 rounded px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Total hours */}
                              <td className={`px-1 py-3 text-center text-xs font-bold text-blue-600 border-r border-gray-300 ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              }`}>
                                {totalHrs}
                              </td>
                            </>
                          )
                        })}
                        
                        {/* Vertical sum columns */}
                        <td className="px-1 py-3 text-center text-xs font-bold text-gray-900 bg-gray-50 border-l-2 border-gray-300">
                          {billableSum}
                        </td>
                        <td className="px-1 py-3 text-center text-xs font-bold text-gray-900 bg-gray-50">
                          {nonBillableSum}
                        </td>
                        <td className="px-1 py-3 text-center text-xs font-bold text-gray-900 bg-gray-50">
                          {leaveSum}
                        </td>
                        <td className="px-1 py-3 text-center text-xs font-bold text-blue-600 bg-gray-50 border-r border-gray-300">
                          {billableSum + nonBillableSum + leaveSum}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading state when no project is selected */}
      {!selectedProject && !loading && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <i className="fas fa-folder-open text-4xl text-gray-300 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-gray-600">Please select a project from the list above to view allocations and insights.</p>
        </div>
      )}
    </div>
  )
}
