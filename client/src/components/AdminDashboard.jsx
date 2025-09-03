import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AdminDashboard({ summary, userCounts, activeUsers, newUsers, inactiveUsers, activeProjects, onHoldProjects, completedProjects }) {
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Bench Summary Overview',
      },
    },
  }

  const benchData = {
    labels: ['Fully Benched', 'Partially Benched', 'Non-Billable', 'Over-utilized'],
    datasets: [
      {
        label: 'Count',
        data: [
          summary?.fullyBenchedCount || 0,
          summary?.partialBenchedCount || 0,
          summary?.nonBillableCount || 0,
          summary?.overUtilisedCount || 0,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(147, 51, 234, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(147, 51, 234, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const userData = {
    labels: ['Active Users', 'New Users', 'Inactive Users'],
    datasets: [
      {
        data: [
          userCounts?.activeUsers || 0,
          userCounts?.newUsers || 0,
          userCounts?.inactiveUsers || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  }

  const projectData = {
    labels: ['Active', 'On Hold', 'Completed'],
    datasets: [
      {
        label: 'Projects',
        data: [
          activeProjects?.length || 0,
          onHoldProjects?.length || 0,
          completedProjects?.length || 0,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-100 p-4 rounded-lg shadow-md">
          <div className="text-4xl font-semibold text-blue-700">{summary?.fullyBenchedCount ?? 0}</div>
          <div className="text-sm font-medium text-blue-600 mt-1">Fully Benched</div>
        </div>
        <div className="bg-purple-100 p-4 rounded-lg shadow-md">
          <div className="text-4xl font-semibold text-purple-700">{summary?.partialBenchedCount ?? 0}</div>
          <div className="text-sm font-medium text-purple-600 mt-1">Partially Benched</div>
        </div>
        <div className="bg-green-100 p-4 rounded-lg shadow-md">
          <div className="text-4xl font-semibold text-green-700">{summary?.nonBillableCount ?? 0}</div>
          <div className="text-sm font-medium text-green-600 mt-1">Non-Billable</div>
        </div>
        <div className="bg-red-100 p-4 rounded-lg shadow-md">
          <div className="text-4xl font-semibold text-red-700">{summary?.overUtilisedCount ?? 0}</div>
          <div className="text-sm font-medium text-red-600 mt-1">Over-utilization</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bench Summary Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bench Summary</h3>
          <Bar options={chartOptions} data={benchData} />
        </div>

        {/* User Distribution Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
          <Doughnut 
            data={userData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'bottom',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Projects Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Overview</h3>
        <Bar 
          data={projectData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                display: false,
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  stepSize: 1,
                },
              },
            },
          }}
        />
      </div>

      {/* User Counts */}
      {userCounts && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{userCounts.totalUsers || 0}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{userCounts.activeUsers || 0}</div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{userCounts.newUsers || 0}</div>
              <div className="text-sm text-gray-600">New Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{userCounts.inactiveUsers || 0}</div>
              <div className="text-sm text-gray-600">Inactive Users</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
