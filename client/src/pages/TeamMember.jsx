import React, { useState, useEffect } from 'react'
import { api } from '../utils/api'

export default function TeamMember() {
  const [selectedPeriod, setSelectedPeriod] = useState({ year: 2025, month: 8, week: 32 })
  const [allocations, setAllocations] = useState([])
  const [myProjects, setMyProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedPeriod.year && selectedPeriod.month) {
      loadUserAllocations()
    }
  }, [selectedPeriod])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load user projects first (this is what the HTML frontend does)
      console.log('Loading user projects...')
      const projectsData = await api.getMyProjects()
      console.log('Projects API response:', projectsData)
      
      if (Array.isArray(projectsData)) {
        setMyProjects(projectsData)
      } else if (projectsData && typeof projectsData === 'object') {
        // The HTML frontend expects data.data.projects
        const projects = projectsData.data?.projects || []
        console.log('Extracted projects:', projects)
        setMyProjects(projects)
      } else {
        console.warn('Unexpected projects data format:', projectsData)
        setMyProjects([])
      }
      
      // Load allocations for current period
      await loadUserAllocations()
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data. Please try again.')
      setMyProjects([])
      setAllocations([])
    } finally {
      setLoading(false)
    }
  }

  const loadUserAllocations = async () => {
    try {
      // Get weeks for the selected month
      const monthWeeks = getWeeksForMonth(selectedPeriod.year, selectedPeriod.month)
      console.log('Loading allocations for weeks:', monthWeeks)
      
      // Load allocation data for the month weeks (exactly like HTML frontend)
      const params = new URLSearchParams({
        year: selectedPeriod.year,
        weeks: monthWeeks.join(',')
      })
      
      const queryString = `?${params.toString()}`
      console.log('API call URL:', `/api/allocation${queryString}`)
      
      const data = await api.getAllocations(queryString)
      console.log('Allocation API response:', data)
      
      // The HTML frontend expects data.data.allocations
      if (data && typeof data === 'object' && data.data?.allocations) {
        const allocationsData = data.data.allocations
        console.log('Extracted allocations:', allocationsData)
        setAllocations(allocationsData)
      } else if (Array.isArray(data)) {
        // Fallback if direct array
        setAllocations(data)
      } else {
        console.warn('Unexpected allocation data format:', data)
        setAllocations([])
      }
    } catch (error) {
      console.error('Error loading allocations:', error)
      setAllocations([])
    }
  }

  // Get current corporate week (Monday-Friday)
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
  const getWeekDisplay = (weekNumber, year, month) => {
    const firstDay = new Date(year, month - 1, 1)
    const firstWeekday = firstDay.getDay()
    const startDate = new Date(year, month - 1, 1 + (weekNumber - 1) * 7 - firstWeekday)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    
    const formatDate = (date) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[date.getMonth()]} ${date.getDate()}`
    }
    
    return {
      display: `Week ${weekNumber}`,
      dates: `${formatDate(startDate)}-${formatDate(endDate)}`,
      fullDisplay: `Week ${weekNumber} (${formatDate(startDate)}-${formatDate(endDate)})`
    }
  }

  const handleYearChange = (year) => {
    setSelectedPeriod(prev => ({ ...prev, year: parseInt(year) }))
  }

  const handleMonthClick = (month) => {
    setSelectedPeriod(prev => ({ ...prev, month: month, week: 1 }))
  }

  const handleWeekClick = (week) => {
    setSelectedPeriod(prev => ({ ...prev, week: week }))
  }

  // Group allocations by project
  const getProjectGroups = () => {
    const projectGroups = {}
    
    if (allocations && allocations.length > 0) {
      allocations.forEach(allocation => {
        if (!projectGroups[allocation.project_id]) {
          projectGroups[allocation.project_id] = {
            project_name: allocation.project_name,
            role_name: allocation.role_name || 'Team Member',
            allocations: []
          }
        }
        projectGroups[allocation.project_id].allocations.push(allocation)
      })
    }
    
    return projectGroups
  }

  // Calculate summary statistics
  const getSummaryStats = () => {
    if (!allocations || allocations.length === 0) {
      return { total: 0, billable: 0, nonBillable: 0, leave: 0, projects: myProjects.length }
    }
    
    const totalBillable = allocations.reduce((sum, a) => sum + (a.billable_hrs || 0), 0)
    const totalNonBillable = allocations.reduce((sum, a) => sum + (a.non_billable_hrs || 0), 0)
    const totalLeave = allocations.reduce((sum, a) => sum + (a.leave_hrs || 0), 0)
    
    return {
      total: totalBillable + totalNonBillable + totalLeave,
      billable: totalBillable,
      nonBillable: totalNonBillable,
      leave: totalLeave,
      projects: myProjects.length
    }
  }

  const monthWeeks = getWeeksForMonth(selectedPeriod.year, selectedPeriod.month)
  const projectGroups = getProjectGroups()
  const summaryStats = getSummaryStats()

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-600 mr-3"></i>
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Data</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <i className="fas fa-redo mr-2"></i>Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Period Selection - EXACTLY like HTML frontend */}
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
            {[2023, 2024, 2025, 2026, 2027].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        {/* Month Selection Grid - EXACTLY like HTML frontend */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Month</h3>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, index) => {
              const monthNum = index + 1
              const isActive = monthNum === selectedPeriod.month
              const isCurrent = monthNum === new Date().getMonth() + 1 && selectedPeriod.year === new Date().getFullYear()
              
              return (
                <div 
                  key={month} 
                  onClick={() => handleMonthClick(monthNum)}
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
                  {month}
                </div>
              )
            })}
          </div>
        </div>

        {/* Week Selection Grid - EXACTLY like HTML frontend */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Weeks in {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {monthWeeks.map(weekNum => {
              const weekInfo = getWeekDisplay(weekNum, selectedPeriod.year, selectedPeriod.month)
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
                  <div className="text-xs font-medium">{weekInfo.display}</div>
                  <div className="text-xs text-gray-500">{weekInfo.dates}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected Period Summary - EXACTLY like HTML frontend */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center text-blue-700">
            <i className="fas fa-calendar-check mr-2"></i>
            <span className="font-medium">Selected Period:</span>
            <span className="ml-2">
              {selectedPeriod.year} • {getMonthName(selectedPeriod.month)} • {getWeekDisplay(selectedPeriod.week, selectedPeriod.year, selectedPeriod.month).fullDisplay}
            </span>
          </div>
        </div>
      </div>

      {/* Allocation Table - EXACTLY like HTML frontend */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="week-header px-6 py-3">
          <h3 className="text-lg font-semibold flex items-center">
            <i className="fas fa-calendar-alt mr-2"></i>
            <span>Time Allocation - {getMonthName(selectedPeriod.month)} {selectedPeriod.year}</span>
            <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Weekly Breakdown</span>
          </h3>
        </div>

        <div className="overflow-x-auto max-h-[28rem] relative">
          <table className="min-w-full divide-y divide-gray-200 table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: 'var(--col-member)' }} />
              {monthWeeks.map((_, index) => (
                <React.Fragment key={index}>
                  <col style={{ width: 'var(--col-bill)' }} />
                  <col style={{ width: 'var(--col-non)' }} />
                  <col style={{ width: 'var(--col-leave)' }} />
                  <col style={{ width: 'var(--col-total)' }} />
                </React.Fragment>
              ))}
              <col style={{ width: 'var(--col-bill)' }} />
              <col style={{ width: 'var(--col-non)' }} />
              <col style={{ width: 'var(--col-leave)' }} />
              <col style={{ width: 'var(--col-total)' }} />
            </colgroup>
            
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left sticky left-0 bg-gray-50 z-20 sticky-project">Project & Role</th>
                {monthWeeks.map(weekNum => {
                  const weekInfo = getWeekDisplay(weekNum, selectedPeriod.year, selectedPeriod.month)
                  const isCurrentWeek = weekNum === selectedPeriod.week
                  
                  return (
                    <React.Fragment key={weekNum}>
                      <th className={`px-1 py-3 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                        {weekInfo.display}
                      </th>
                      <th className={`px-1 py-3 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                        {weekInfo.display}
                      </th>
                      <th className={`px-1 py-3 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                        {weekInfo.display}
                      </th>
                      <th className={`px-1 py-3 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                        {weekInfo.display}
                      </th>
                    </React.Fragment>
                  )
                })}
                <th className="px-1 py-3 text-center text-xs font-medium bg-gray-50 border-l-2 border-gray-300">Billable</th>
                <th className="px-1 py-3 text-center text-xs font-medium bg-gray-50">Non-Bill.</th>
                <th className="px-1 py-3 text-center text-xs font-medium bg-gray-50">Leaves</th>
                <th className="px-1 py-3 text-center text-xs font-medium bg-gray-50">Total</th>
              </tr>
              
              <tr>
                <th className="px-4 py-2 text-left sticky left-0 bg-gray-50 z-20 sticky-project"></th>
                {monthWeeks.map(weekNum => {
                  const weekInfo = getWeekDisplay(weekNum, selectedPeriod.year, selectedPeriod.month)
                  const isCurrentWeek = weekNum === selectedPeriod.week
                  
                  return (
                    <React.Fragment key={weekNum}>
                      <th className={`px-1 py-2 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>B</th>
                      <th className={`px-1 py-2 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>N</th>
                      <th className={`px-1 py-2 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>L</th>
                      <th className={`px-1 py-2 text-center text-xs font-medium ${isCurrentWeek ? 'bg-orange-50' : ''}`}>T</th>
                    </React.Fragment>
                  )
                })}
                <th className="px-1 py-2 text-center text-xs font-medium bg-gray-50 border-l-2 border-gray-300">Sum</th>
                <th className="px-1 py-2 text-center text-xs font-medium bg-gray-50">Sum</th>
                <th className="px-1 py-2 text-center text-xs font-medium bg-gray-50">Sum</th>
                <th className="px-1 py-2 text-center text-xs font-medium bg-gray-50">Sum</th>
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4 + monthWeeks.length * 4} className="px-4 py-4 text-center text-gray-500">
                    <i className="fas fa-spinner fa-spin mr-2"></i>Loading allocation data...
                  </td>
                </tr>
              ) : myProjects.length === 0 ? (
                <tr>
                  <td colSpan={4 + monthWeeks.length * 4} className="px-4 py-4 text-center text-gray-500">
                    No projects available
                  </td>
                </tr>
              ) : (
                myProjects.map(project => {
                  const projectGroup = projectGroups[project.id] || {
                    project_name: project.name || project.project_name,
                    role_name: project.role_name || project.role || 'Team Member',
                    allocations: []
                  }
                  
                  // Calculate totals for this project
                  const totalBillable = projectGroup.allocations.reduce((sum, a) => sum + (a.billable_hrs || 0), 0)
                  const totalNonBillable = projectGroup.allocations.reduce((sum, a) => sum + (a.non_billable_hrs || 0), 0)
                  const totalLeave = projectGroup.allocations.reduce((sum, a) => sum + (a.leave_hrs || 0), 0)
                  const grandTotal = totalBillable + totalNonBillable + totalLeave
                  
                  return (
                    <tr key={project.id || project.project_id} className="hover:bg-gray-50">
                      {/* Project name and role cell (sticky) */}
                      <td className="px-4 py-4 whitespace-nowrap sticky-project">
                        <div className="text-sm font-medium text-gray-900">{projectGroup.project_name}</div>
                        <div className="text-xs text-gray-500 mt-1">{projectGroup.role_name}</div>
                      </td>
                      
                      {/* Week columns */}
                      {monthWeeks.map(weekNum => {
                        const isCurrentWeek = weekNum === selectedPeriod.week
                        const weekAllocation = projectGroup.allocations.find(a => a.week === weekNum) || {
                          billable_hrs: 0,
                          non_billable_hrs: 0,
                          leave_hrs: 0
                        }
                        
                        const totalHours = (weekAllocation.billable_hrs || 0) + (weekAllocation.non_billable_hrs || 0) + (weekAllocation.leave_hrs || 0)
                        
                        return (
                          <React.Fragment key={weekNum}>
                            <td className={`px-1 py-3 text-center text-xs font-medium text-gray-900 ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                              {weekAllocation.billable_hrs || 0}
                            </td>
                            <td className={`px-1 py-3 text-center text-xs font-medium text-gray-900 ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                              {weekAllocation.non_billable_hrs || 0}
                            </td>
                            <td className={`px-1 py-3 text-center text-xs font-medium text-gray-900 ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                              {weekAllocation.leave_hrs || 0}
                            </td>
                            <td className={`px-1 py-3 text-center text-xs font-bold text-blue-600 border-r border-gray-300 ${isCurrentWeek ? 'bg-orange-50' : ''}`}>
                              {totalHours}
                            </td>
                          </React.Fragment>
                        )
                      })}
                      
                      {/* Vertical sum columns */}
                      <td className="px-1 py-3 text-center text-xs font-bold text-gray-900 bg-gray-50 border-l-2 border-gray-300">
                        {totalBillable}
                      </td>
                      <td className="px-1 py-3 text-center text-xs font-bold text-gray-900 bg-gray-50">
                        {totalNonBillable}
                      </td>
                      <td className="px-1 py-3 text-center text-xs font-bold text-gray-900 bg-gray-50">
                        {totalLeave}
                      </td>
                      <td className="px-1 py-3 text-center text-xs font-bold text-gray-900 bg-gray-50">
                        {grandTotal}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Summary - EXACTLY like HTML frontend */}
      <div className="mt-6 bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="text-center">
          <h4 className="text-lg font-semibold text-blue-900 mb-2">
            <i className="fas fa-chart-bar mr-2"></i>
            {getMonthName(selectedPeriod.month)} {selectedPeriod.year} Summary (Full Month)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{summaryStats.total}h</div>
              <div className="text-sm text-gray-600">Total Hours</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{summaryStats.billable}h</div>
              <div className="text-sm text-gray-600">Billable Hours</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">{summaryStats.nonBillable}h</div>
              <div className="text-sm text-gray-600">Non-Billable Hours</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-red-600">{summaryStats.leave}h</div>
              <div className="text-sm text-gray-600">Leave Hours</div>
            </div>
            <div className="bg-white rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{summaryStats.projects}</div>
              <div className="text-sm text-gray-600">Projects</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
