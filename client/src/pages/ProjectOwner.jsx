import React, { useState, useEffect } from 'react'
import { api, get } from '../utils/api'

export default function ProjectOwner() {
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
    
    // Calculate weeks since first Monday
    const daysSinceFirstMonday = Math.floor((now - firstMonday) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.floor(daysSinceFirstMonday / 7) + 1
    
    return Math.max(1, weekNumber)
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
  const [projectDataLoading, setProjectDataLoading] = useState(false)
  const [error, setError] = useState(null)

  // Overallocation modal state
  const [showOverallocationModal, setShowOverallocationModal] = useState(false)
  const [overallocationData, setOverallocationData] = useState({})
  const [lastEditContext, setLastEditContext] = useState(null)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      // Load data sequentially to prevent race conditions
      const loadProjectData = async () => {
        try {
          setProjectDataLoading(true)
          // Loading project data
          
          // First load users
          await loadProjectUsers(selectedProject.id)
          
          // Then load allocations (which will merge with users)
          await loadProjectWeeklyAllocations(selectedProject.id)
          
          // Project data loading completed
        } catch (error) {
          console.error('Error loading project data:', error)
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

  // Helper functions (moved to top to fix reference errors)
  // Get display weeks based on selected period
  const getDisplayWeeks = () => {
    const selectedWeek = selectedPeriod.week
    const currentWeek = getCurrentWeek()
    const weeks = []
    
    // If selected week is current or future, show selected week + previous weeks
    if (selectedWeek >= currentWeek) {
      // Show 4 weeks: selected week and 3 previous weeks
      for (let i = 3; i >= 0; i--) {
        const weekNumber = selectedWeek - i
        if (weekNumber > 0) {
          weeks.push(weekNumber)
        }
      }
    } else {
      // If selected week is in the past, show current week + past weeks
      for (let i = 3; i >= 0; i--) {
        const weekNumber = currentWeek - i
        if (weekNumber > 0) {
          weeks.push(weekNumber)
        }
      }
    }
    
    return weeks
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
    
    // Format dates for backend (YYYY-MM-DD format)
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
      
      console.log('Loading weekly allocations with params:', params.toString())
      
      // Use the correct API endpoint with query parameters
      const data = await get(`/projects/${projectId}/weekly-allocations?${params.toString()}`)
      console.log('Weekly allocations response:', data)
      
      if (data && typeof data === 'object' && data.data?.users) {
        console.log('Setting weekly allocations users:', data.data.users)
        setWeeklyAllocations(data.data.users)
        
        // Update projectUsers with the allocation data - IMPROVED VERSION
        setProjectUsers(prevUsers => {
          if (!prevUsers || prevUsers.length === 0) {
            console.log('No previous users to update, returning allocation data as is')
            return data.data.users
          }

          const updatedUsers = prevUsers.map(user => {
            const userAllocData = data.data.users.find(u => u.user_id === user.id)
            if (userAllocData) {
              console.log(`Merging allocation data for user ${user.id}:`, userAllocData)
              
              // Merge user info with allocation data, preserving both
              const mergedUser = {
                ...user, // Keep original user data (name, role, etc.)
                ...userAllocData, // Add allocation data (week35, week36, etc.)
                id: user.id, // Ensure ID stays consistent
                user_id: user.id // Ensure user_id is set for consistency
              }
              
              console.log(`Merged user ${user.id}:`, mergedUser)
              return mergedUser
            } else {
              console.log(`No allocation data found for user ${user.id}, keeping original data`)
              return user
            }
          })
          
          console.log('Final updated project users:', updatedUsers)
          return updatedUsers
        })
      } else {
        console.log('No allocation data received, keeping current users')
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

  // Check if a week is editable (not in the past)
  const isWeekEditable = (weekNumber) => {
    const currentWeek = getCurrentWeek()
    return weekNumber >= currentWeek // Can edit current week and future weeks
  }

  // Copy from last week functionality
  const copyFromLastWeek = async (targetWeek) => {
    if (!selectedProject || targetWeek <= 1) return

    const sourceWeek = targetWeek - 1
    console.log(`Copying allocations from week ${sourceWeek} to week ${targetWeek} for project ${selectedProject.id}`)

    try {
      // Get all users in the current project
      const allProjectUsers = filterTeamMembers(projectUsers)
      console.log(`Found ${allProjectUsers.length} users in project to copy data for`)

      if (allProjectUsers.length === 0) {
        alert('No team members found in this project.')
        return
      }

      // Confirm with user
      const confirmed = confirm(`Are you sure you want to copy all users' data from Week ${sourceWeek} to Week ${targetWeek}? This will overwrite any existing data in Week ${targetWeek}.`)
      if (!confirmed) {
        console.log('Copy operation cancelled by user')
        return
      }

      let successCount = 0
      let errorCount = 0
      const copyPromises = []

      // Copy data for each user
      for (const user of allProjectUsers) {
        const sourceWeekKey = `week${sourceWeek}`
        const sourceWeekData = user[sourceWeekKey]

        // If user has data for source week, copy it
        if (sourceWeekData && (sourceWeekData.billable > 0 || sourceWeekData.non_billable > 0 || sourceWeekData.leave > 0)) {
          console.log(`Copying data for user ${user.id} from week ${sourceWeek}:`, sourceWeekData)

          const weekInfo = getWeekDisplay(targetWeek, selectedPeriod.year)
          const newAllocation = {
            user_id: parseInt(user.id),
            week: parseInt(targetWeek),
            year: parseInt(selectedPeriod.year),
            week_start: weekInfo.startDate,
            billable_hrs: parseFloat(sourceWeekData.billable) || 0,
            non_billable_hrs: parseFloat(sourceWeekData.non_billable) || 0,
            leave_hrs: parseFloat(sourceWeekData.leave) || 0
          }

          // Use the proper create allocation API
          const copyPromise = api.createAllocation(selectedProject.id, newAllocation)
            .then(() => {
              successCount++
              console.log(`Successfully copied data for user ${user.id}`)
            })
            .catch((error) => {
              errorCount++
              console.error(`Failed to copy data for user ${user.id}:`, error)
            })

          copyPromises.push(copyPromise)
        } else {
          console.log(`No data to copy for user ${user.id} in week ${sourceWeek}`)
        }
      }

      if (copyPromises.length === 0) {
        alert(`No allocation data found for week ${sourceWeek} to copy from.`)
        return
      }

      // Wait for all copy operations to complete
      await Promise.all(copyPromises)

      // Refresh the data to show the copied allocations
      await loadProjectWeeklyAllocations(selectedProject.id)

      // Show results
      if (successCount > 0) {
        alert(`Successfully copied data for ${successCount} users from Week ${sourceWeek} to Week ${targetWeek}!`)
      }
      
      if (errorCount > 0) {
        alert(`Warning: Failed to copy data for ${errorCount} users. Check console for details.`)
      }

    } catch (error) {
      console.error('Error copying from last week:', error)
      alert('Failed to copy allocations. Please try again.')
    }
  }

  // ===== ALLOCATION EDITING FUNCTIONS =====

  // Handle input change (real-time updates)
  const handleAllocationChange = (userId, weekNumber, type, value) => {
    // Handle empty string as 0, but preserve the string for display
    const displayValue = value === '' ? '' : value
    const numValue = value === '' ? 0 : parseFloat(value) || 0
    
    console.log(`handleAllocationChange: user=${userId}, week=${weekNumber}, type=${type}, value="${value}", numValue=${numValue}`)
    
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
          
          console.log(`Updated user ${userId} week ${weekNumber}:`, updatedUser[weekKey])
          
          return updatedUser
        }
        return user
      })
    )
  }

  // Handle input blur (save to database)
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
      console.error('Error handling allocation blur:', error)
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

      const response = await get(`/allocation/check-overallocation?${params.toString()}`)
      return response.data
    } catch (error) {
      console.error('Error checking overallocation:', error)
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
        const isCurrentProject = alloc.project_id === selectedProject.id
        
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
      totalBillable: overallocationCheck.allocations?.reduce((sum, a) => {
        const isCurrentProject = a.project_id === selectedProject.id
        const billableHrs = (isCurrentProject && currentValues) 
          ? currentValues.billableHrs 
          : (parseFloat(a.billable_hrs) || 0)
        return sum + billableHrs
      }, 0) || 0,
      totalNonBillable: overallocationCheck.allocations?.reduce((sum, a) => {
        const isCurrentProject = a.project_id === selectedProject.id
        const nonBillableHrs = (isCurrentProject && currentValues) 
          ? currentValues.nonBillableHrs 
          : (parseFloat(a.non_billable_hrs) || 0)
        return sum + nonBillableHrs
      }, 0) || 0,
      totalLeave: overallocationCheck.allocations?.reduce((sum, a) => {
        const isCurrentProject = a.project_id === selectedProject.id
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
      console.log(`Saving allocation for user ${userId}, week ${weekNumber}, year ${selectedPeriod.year}`)

      // First, try to get existing allocation
      const editableResponse = await get(`/projects/${selectedProject.id}/editable-allocations`)
      const allocation = editableResponse.data.allocations.find(
        a => a.user_id == userId && a.week == weekNumber && a.year == selectedPeriod.year
      )

      if (allocation) {
        // Update existing allocation
        console.log('Updating existing allocation:', allocation.id)
        const updateData = {
          billable_hrs: billableHrs,
          non_billable_hrs: nonBillableHrs,
          leave_hrs: leaveHrs
        }
        
        const response = await api.updateAllocation(allocation.id, updateData)
        console.log('Allocation updated successfully:', response)
        
      } else {
        // Create new allocation
        console.log('Creating new allocation')
        const weekInfo = getWeekDisplay(weekNumber, selectedPeriod.year)
        
        const createData = {
          user_id: parseInt(userId),
          week: parseInt(weekNumber),
          year: parseInt(selectedPeriod.year),
          week_start: weekInfo.startDate,
          billable_hrs: parseFloat(billableHrs) || 0,
          non_billable_hrs: parseFloat(nonBillableHrs) || 0,
          leave_hrs: parseFloat(leaveHrs) || 0
        }
        
        const response = await api.createAllocation(selectedProject.id, createData)
        console.log('Allocation created successfully:', response)
      }

      // Refresh data after save - with a small delay to ensure backend is updated
      setTimeout(async () => {
        await loadProjectWeeklyAllocations(selectedProject.id)
      }, 500)
      
    } catch (error) {
      console.error('Error saving allocation:', error)
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
        console.error('Error saving overallocated allocation:', error)
        alert('Failed to save allocation. Please try again.')
      }
    }
    
    // Close modal
    setShowOverallocationModal(false)
    setLastEditContext(null)
    setOverallocationData({})
  }

  const handleViewBreakdown = async () => {
    if (lastEditContext) {
      try {
        const params = new URLSearchParams({
          user_id: lastEditContext.userId,
          week: lastEditContext.weekNumber,
          year: selectedPeriod.year
        })

        const response = await get(`/allocation/user-week-breakdown?${params.toString()}`)
        console.log('Detailed breakdown:', response.data)
        
        // You can implement a detailed breakdown modal here if needed
        alert('Detailed breakdown logged to console')
        
      } catch (error) {
        console.error('Error getting detailed breakdown:', error)
        alert('Failed to load detailed breakdown')
      }
    }
  }

  // Handle project selection with complete data refresh
  const handleProjectSelect = (project) => {
    console.log('Selecting project:', project.name, 'ID:', project.id)
    
    // Clear all existing data to prevent cached data display
    setProjectUsers([])
    setWeeklyAllocations([])
    setError(null)
    
    // Set the new selected project
    setSelectedProject(project)
    
    // Data will be loaded by useEffect when selectedProject changes
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
                  <tr key={project.id || project.project_id || `project-${Math.random()}`} className={`hover:bg-gray-50 ${
                    selectedProject?.id === project.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                  }`}>
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
                            ? 'bg-purple-600 text-white border border-purple-700 shadow-md'
                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300'
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <i className="fas fa-users-cog mr-2"></i>
              Team Member Allocation - {getMonthName(selectedPeriod.month)} {selectedPeriod.year}
              <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Weekly Breakdown</span>
            </h3>
            <button
              onClick={() => selectedProject && loadProjectWeeklyAllocations(selectedProject.id)}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors flex items-center"
              disabled={!selectedProject}
            >
              <i className="fas fa-sync-alt mr-1"></i>
              Refresh Data
            </button>
          </div>
        </div>

          <div className="overflow-x-auto max-h-[28rem] relative">
            {/* Loading overlay for project data */}
            {projectDataLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-purple-600 text-2xl mb-2"></i>
                  <p className="text-sm text-gray-600">Loading project data...</p>
                </div>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200 table-fixed border-separate border-spacing-0" style={{ isolation: 'isolate' }}>
              <colgroup>
                <col style={{ width: 'var(--col-member)' }} />
                <col style={{ width: 'var(--col-role)' }} />
                {/* Dynamic columns for weeks */}
                {displayWeeks.map((weekNumber, index) => (
                  <React.Fragment key={weekNumber}>
                    <col style={{ width: 'var(--col-bill)' }} />
                    <col style={{ width: 'var(--col-non)' }} />
                    <col style={{ width: 'var(--col-leave)' }} />
                    <col style={{ width: 'var(--col-total)' }} />
                  </React.Fragment>
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
                          {weekNumber === selectedPeriod.week && weekNumber > 1 && isWeekEditable(weekNumber) && (
                            <button 
                              onClick={() => copyFromLastWeek(weekNumber)}
                              className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Copy from Week {weekNumber - 1}
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
                      <React.Fragment key={weekNumber}>
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
                      </React.Fragment>
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
                          const isEditable = isWeekEditable(weekNumber)
                          const weekKey = `week${weekNumber}`
                          const weekData = user[weekKey] || { billable: 0, non_billable: 0, leave: 0, total: 0 }
                          
                          // Ensure we get numbers, not strings
                          const billableHrs = parseFloat(weekData.billable) || 0
                          const nonBillableHrs = parseFloat(weekData.non_billable) || 0
                          const leaveHrs = parseFloat(weekData.leave) || 0
                          const totalHrs = billableHrs + nonBillableHrs + leaveHrs
                          
                          // Add to sums
                          billableSum += billableHrs
                          nonBillableSum += nonBillableHrs
                          leaveSum += leaveHrs
                          
                          return (
                            <React.Fragment key={`${user.id}-week-${weekNumber}`}>
                              {/* Billable hours */}
                              <td className={`px-1 py-3 text-center text-xs allocation-cell ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              } ${!isEditable ? 'bg-gray-100' : ''}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={billableHrs}
                                  onChange={(e) => handleAllocationChange(user.id, weekNumber, 'billable', e.target.value)}
                                  onBlur={(e) => handleAllocationBlur(user.id, weekNumber, 'billable', e.target.value)}
                                  disabled={!isEditable}
                                  className={`w-16 text-center border rounded px-2 py-1 text-sm ${
                                    isEditable 
                                      ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                                      : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title={!isEditable ? `Week ${weekNumber} is in the past and cannot be edited` : ''}
                                />
                              </td>
                              
                              {/* Non-billable hours */}
                              <td className={`px-1 py-3 text-center text-xs allocation-cell ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              } ${!isEditable ? 'bg-gray-100' : ''}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={nonBillableHrs}
                                  onChange={(e) => handleAllocationChange(user.id, weekNumber, 'non_billable', e.target.value)}
                                  onBlur={(e) => handleAllocationBlur(user.id, weekNumber, 'non_billable', e.target.value)}
                                  disabled={!isEditable}
                                  className={`w-16 text-center border rounded px-2 py-1 text-sm ${
                                    isEditable 
                                      ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                                      : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title={!isEditable ? `Week ${weekNumber} is in the past and cannot be edited` : ''}
                                />
                              </td>
                              
                              {/* Leave hours */}
                              <td className={`px-1 py-3 text-center text-xs allocation-cell ${
                                isCurrentWeek ? 'bg-orange-50' : ''
                              } ${!isEditable ? 'bg-gray-100' : ''}`}>
                                <input
                                  type="number"
                                  min="0"
                                  max="40"
                                  value={leaveHrs}
                                  onChange={(e) => handleAllocationChange(user.id, weekNumber, 'leave', e.target.value)}
                                  onBlur={(e) => handleAllocationBlur(user.id, weekNumber, 'leave', e.target.value)}
                                  disabled={!isEditable}
                                  className={`w-16 text-center border rounded px-2 py-1 text-sm ${
                                    isEditable 
                                      ? 'border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500' 
                                      : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                  }`}
                                  title={!isEditable ? `Week ${weekNumber} is in the past and cannot be edited` : ''}
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

      {/* Overallocation Modal */}
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
  )
}
