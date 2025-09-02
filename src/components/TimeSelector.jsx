import React, { useEffect, useState } from 'react'

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function TimeSelector({ value, onChange }) {
  const now = new Date()
  const [year, setYear] = useState(value?.year || now.getFullYear())
  const [month, setMonth] = useState(value?.month || now.getMonth() + 1)
  const [week, setWeek] = useState(value?.week || 1)

  // Calculate weeks in the selected month
  const getWeeksInMonth = (year, month) => {
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)
    const daysInMonth = lastDay.getDate()
    const firstWeekday = firstDay.getDay()
    
    // Calculate total weeks needed
    const totalWeeks = Math.ceil((daysInMonth + firstWeekday) / 7)
    return Array.from({ length: totalWeeks }, (_, i) => i + 1)
  }

  // Get current week of the year
  const getCurrentWeekOfYear = () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1)
    const days = Math.floor((now - start) / (24 * 60 * 60 * 1000))
    return Math.ceil((days + start.getDay() + 1) / 7)
  }

  // Get current month and year
  const getCurrentPeriod = () => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      week: getCurrentWeekOfYear()
    }
  }

  useEffect(() => {
    // Set current period on component mount
    const currentPeriod = getCurrentPeriod()
    setYear(currentPeriod.year)
    setMonth(currentPeriod.month)
    setWeek(currentPeriod.week)
  }, [])

  useEffect(() => {
    if (onChange) {
      onChange({ year, month, week })
    }
  }, [year, month, week, onChange])

  const handleMonthClick = (monthNum) => {
    setMonth(monthNum)
    // Reset week to 1 when month changes
    setWeek(1)
  }

  const handleWeekClick = (weekNum) => {
    setWeek(weekNum)
  }

  const weeksInMonth = getWeeksInMonth(year, month)
  const currentPeriod = getCurrentPeriod()
  const isCurrentMonth = year === currentPeriod.year && month === currentPeriod.month
  const isCurrentWeek = isCurrentMonth && week === currentPeriod.week

  // Get week date range for display
  const getWeekDateRange = (weekNum) => {
    const firstDay = new Date(year, month - 1, 1)
    const firstWeekday = firstDay.getDay()
    const startDate = new Date(year, month - 1, 1 + (weekNum - 1) * 7 - firstWeekday)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + 6)
    
    const formatDate = (date) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[date.getMonth()]} ${date.getDate()}`
    }
    
    return `${formatDate(startDate)}-${formatDate(endDate)}`
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6 time-selector">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        <i className="fas fa-calendar-alt mr-2 text-purple-600"></i>
        Time Period Selection
      </h2>

      <div className="mb-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Year:</label>
            <select 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {[2023, 2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Month</h3>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1">
          {months.map((m, i) => {
            const idx = i + 1
            const isActive = idx === month
            const isCurrent = idx === currentPeriod.month && year === currentPeriod.year
            
            return (
              <div 
                key={m} 
                onClick={() => handleMonthClick(idx)}
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
                {m}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Weeks in {months[month - 1]} {year}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {weeksInMonth.map(w => {
            const isActive = w === week
            const isCurrent = w === currentPeriod.week && isCurrentMonth
            
            return (
              <div 
                key={w} 
                onClick={() => handleWeekClick(w)}
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
                <div className="text-xs font-medium">Week {w}</div>
                <div className="text-xs text-gray-500">{getWeekDateRange(w)}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center text-purple-700">
          <i className="fas fa-calendar-check mr-2"></i>
          <span className="font-medium">Selected Period:</span>
          <span className="ml-2">
            {year} • {months[month - 1]} • Week {week} ({getWeekDateRange(week)})
          </span>
          {isCurrentWeek && (
            <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
              Current
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
