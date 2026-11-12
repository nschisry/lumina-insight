
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { getDashboardData } from '../services/api'
import {
  Users,
  CalendarDays,
  Wallet,
  Sun,
  Moon,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

function getDaysUntil(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eventDate = new Date(year, month - 1, day)

  return Math.round(
    (eventDate - today) / (1000 * 60 * 60 * 24)
  )
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)

  return new Date(year, month - 1, day).toLocaleDateString(
    'en-US',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }
  )
}

function Dashboard() {
  const [darkMode, setDarkMode] = useState(false)
  const [showAllAttendance, setShowAllAttendance] = useState(false)

  const [data, setData] = useState({
    members: [],
    events: [],
    attendance: [],
    budget: [],
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchData() {
    setLoading(true)
    setError('')

    try {
      const result = await getDashboardData()
      setData(result)
    } catch (err) {
      console.error(err)
      setError('Unable to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
    }
  }

  // Budget data
  const budgetData = data.budget.map(item => ({
    category: item.category,
    planned: Number(item.planned) || 0,
    spent: Number(item.spent) || 0,
  }))

  // Attendance data for each event
  const attendanceData = data.events.map(event => {
    const presentCount = data.attendance.filter(
      item =>
        item.event_id === event.event_id &&
        item.status?.trim().toLowerCase() === 'present'
    ).length

    const absentCount = data.attendance.filter(
      item =>
        item.event_id === event.event_id &&
        item.status?.trim().toLowerCase() === 'absent'
    ).length

    return {
      event: event.event_name,
      date: event.date,
      present: presentCount,
      absent: absentCount,
    }
  })

  // Completed events only
  const completedAttendanceData = attendanceData.filter(item => {
    if (!item.date) return false

    return getDaysUntil(item.date) < 0
  })

  // Attendance chart: completed events within the last 30 days
  // Exclude events without attendance records
  const recentAttendanceData = completedAttendanceData
    .filter(item => {
      const days = getDaysUntil(item.date)

      return (
        days >= -30 &&
        item.present + item.absent > 0
      )
    })
    .sort((a, b) => {
      return new Date(b.date) - new Date(a.date)
    })

  // Show latest 5 events or all events
  const displayedAttendanceData = showAllAttendance
    ? recentAttendanceData
    : recentAttendanceData.slice(0, 5)

  // Attendance rate from completed events only
  const totalPresent = completedAttendanceData.reduce(
    (sum, item) => sum + item.present,
    0
  )

  const totalAttendance = completedAttendanceData.reduce(
    (sum, item) => sum + item.present + item.absent,
    0
  )

  const attendanceRate = totalAttendance > 0
    ? Math.round((totalPresent / totalAttendance) * 100)
    : 0

  // Budget summary
  const totalPlanned = budgetData.reduce(
    (sum, item) => sum + item.planned,
    0
  )

  const totalSpent = budgetData.reduce(
    (sum, item) => sum + item.spent,
    0
  )

  const budgetPercentage = totalPlanned > 0
    ? Math.round((totalSpent / totalPlanned) * 100)
    : 0

  function getBudgetPercentage(item) {
    return item.planned > 0
      ? Math.round((item.spent / item.planned) * 100)
      : 0
  }

  // Upcoming events
  const upcomingEvents = data.events
    .filter(event => {
      if (!event.date) return false

      const days = getDaysUntil(event.date)
      return days >= 0
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)

  // Budget notifications
  const budgetAlerts = budgetData
    .filter(item =>
      item.planned > 0 && item.spent / item.planned > 0.8
    )
    .map(item => ({
      message: `${item.category} budget used ${getBudgetPercentage(item)}%`,
      type: 'budget',
    }))

  // Upcoming event notifications
  const eventAlerts = data.events
    .filter(event => {
      if (!event.date) return false

      const days = getDaysUntil(event.date)
      return days >= 0 && days <= 3
    })
    .map(event => ({
      message: `${event.event_name} is coming soon (${getDaysUntil(event.date)} day(s) left)`,
      type: 'event',
    }))

  const notifications = [...budgetAlerts, ...eventAlerts]

  // Statistics
  const stats = [
    {
      title: 'Total Members',
      value: data.members.length,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Total Events',
      value: data.events.length,
      icon: CalendarDays,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      title: 'Budget Used',
      value: `${budgetPercentage}%`,
      icon: Wallet,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Attendance Rate',
      value: `${attendanceRate}%`,
      icon: CheckCircle,
      color: 'bg-orange-100 text-orange-600',
    },
  ]

  // Theme
  const textColor = darkMode ? 'text-white' : 'text-slate-800'
  const mutedColor = darkMode ? 'text-slate-400' : 'text-slate-500'
  const cardColor = darkMode ? 'bg-slate-800' : 'bg-white'
  const gridColor = darkMode ? '#475569' : '#e2e8f0'
  const axisColor = darkMode ? '#cbd5e1' : '#64748b'

  const tooltipStyle = {
    backgroundColor: darkMode ? '#1e293b' : '#ffffff',
    border: `1px solid ${gridColor}`,
    borderRadius: '8px',
    color: darkMode ? '#ffffff' : '#1e293b',
  }

  // Loading
  if (loading) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center gap-3 ${
        darkMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
      }`}>
        <RefreshCw className="animate-spin" size={32} />
        <p>Loading dashboard...</p>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center gap-4 p-6 ${
        darkMode ? 'bg-slate-900' : 'bg-slate-100'
      }`}>
        <AlertTriangle className="text-red-500" size={40} />

        <p className={darkMode ? 'text-white' : 'text-slate-800'}>
          {error}
        </p>

        <button
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
        >
          <RefreshCw size={18} />
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 transition-colors sm:p-6 md:p-8 ${
      darkMode ? 'bg-slate-900' : 'bg-slate-100'
    }`}>
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className={`text-2xl font-bold sm:text-3xl ${textColor}`}>
              Lumina Insight
            </h1>

            <p className={`mt-2 ${mutedColor}`}>
              Club Activity Dashboard
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`rounded-lg p-3 ${
                darkMode
                  ? 'bg-slate-700 text-yellow-300 hover:bg-slate-600'
                  : 'bg-white text-slate-700 hover:bg-slate-200'
              }`}
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-500 px-5 py-2 font-medium text-white hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(stat => {
            const Icon = stat.icon

            return (
              <div
                key={stat.title}
                className={`flex items-center gap-4 rounded-xl p-5 shadow-sm sm:p-6 ${cardColor}`}
              >
                <div className={`rounded-xl p-4 ${stat.color}`}>
                  <Icon size={28} />
                </div>

                <div>
                  <p className={`text-sm ${mutedColor}`}>
                    {stat.title}
                  </p>

                  <h2 className={`mt-1 text-2xl font-bold ${textColor}`}>
                    {stat.value}
                  </h2>
                </div>
              </div>
            )
          })}
        </div>

        {/* Notifications */}
        <div className={`mb-8 rounded-xl p-5 shadow-sm sm:p-6 ${cardColor}`}>
          <div className="mb-4 flex items-center gap-2">
            <Bell className={textColor} size={22} />

            <h2 className={`text-lg font-semibold ${textColor}`}>
              Notifications
            </h2>

            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600">
              {notifications.length}
            </span>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg p-4 ${
                    darkMode ? 'bg-slate-700' : 'bg-slate-50'
                  }`}
                >
                  <AlertTriangle
                    size={20}
                    className={`mt-0.5 shrink-0 ${
                      notification.type === 'budget'
                        ? 'text-orange-500'
                        : 'text-blue-500'
                    }`}
                  />

                  <div>
                    <p className={`font-medium ${textColor}`}>
                      {notification.type === 'budget'
                        ? 'Budget Alert'
                        : 'Upcoming Event'}
                    </p>

                    <p className={`mt-1 text-sm ${mutedColor}`}>
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={mutedColor}>
              No notifications at the moment.
            </p>
          )}
        </div>

        {/* Upcoming Events and Budget Progress */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Upcoming Events */}
          <div className={`rounded-xl p-5 shadow-sm sm:p-6 ${cardColor}`}>
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="text-indigo-500" size={22} />

              <h2 className={`text-lg font-semibold ${textColor}`}>
                Upcoming Events
              </h2>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map(event => {
                  const days = getDaysUntil(event.date)

                  return (
                    <div
                      key={event.event_id}
                      className={`flex flex-col gap-2 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between ${
                        darkMode ? 'bg-slate-700' : 'bg-slate-50'
                      }`}
                    >
                      <div>
                        <p className={`font-semibold ${textColor}`}>
                          {event.event_name}
                        </p>

                        <p className={`mt-1 text-sm ${mutedColor}`}>
                          {formatDate(event.date)}
                        </p>
                      </div>

                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        days <= 3 ? 'text-orange-500' : 'text-indigo-500'
                      }`}>
                        <Clock size={16} />

                        {days === 0
                          ? 'Today'
                          : days === 1
                            ? 'Tomorrow'
                            : `${days} days left`}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className={mutedColor}>
                No upcoming events.
              </p>
            )}
          </div>

          {/* Budget Progress */}
          <div className={`rounded-xl p-5 shadow-sm sm:p-6 ${cardColor}`}>
            <div className="mb-5 flex items-center gap-2">
              <Wallet className="text-green-500" size={22} />

              <h2 className={`text-lg font-semibold ${textColor}`}>
                Budget Overview
              </h2>
            </div>

            <div className="mb-6">
              <div className="mb-2 flex justify-between gap-2">
                <span className={`text-sm ${mutedColor}`}>
                  Total Budget Used
                </span>

                <span className={`text-sm font-semibold ${textColor}`}>
                  {budgetPercentage}%
                </span>
              </div>

              <div className={`h-3 overflow-hidden rounded-full ${
                darkMode ? 'bg-slate-700' : 'bg-slate-200'
              }`}>
                <div
                  className={`h-full rounded-full ${
                    budgetPercentage > 80 ? 'bg-orange-500' : 'bg-indigo-500'
                  }`}
                  style={{
                    width: `${Math.min(budgetPercentage, 100)}%`,
                  }}
                />
              </div>

              <p className={`mt-2 text-sm ${mutedColor}`}>
                {totalSpent.toLocaleString()} / {totalPlanned.toLocaleString()}
              </p>
            </div>

            <div className="space-y-5">
              {budgetData.map(item => {
                const percentage = getBudgetPercentage(item)

                return (
                  <div key={item.category}>
                    <div className="mb-2 flex justify-between gap-2">
                      <span className={`text-sm font-medium ${textColor}`}>
                        {item.category}
                      </span>

                      <span className={`text-sm ${mutedColor}`}>
                        {percentage}%
                      </span>
                    </div>

                    <div className={`h-2.5 overflow-hidden rounded-full ${
                      darkMode ? 'bg-slate-700' : 'bg-slate-200'
                    }`}>
                      <div
                        className={`h-full rounded-full ${
                          percentage > 80 ? 'bg-orange-500' : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(percentage, 100)}%`,
                        }}
                      />
                    </div>

                    <p className={`mt-1 text-xs ${mutedColor}`}>
                      {item.spent.toLocaleString()} / {item.planned.toLocaleString()}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Attendance Chart */}
          <div className={`min-w-0 rounded-xl p-5 shadow-sm sm:p-6 ${cardColor}`}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <h2 className={`text-lg font-semibold ${textColor}`}>
                Attendance per Event
              </h2>

              {recentAttendanceData.length > 5 && (
                <button
                  onClick={() => setShowAllAttendance(!showAllAttendance)}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  {showAllAttendance ? 'Show Less' : 'View All'}
                </button>
              )}
            </div>

            {displayedAttendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={displayedAttendanceData}
                  margin={{ bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

                  <XAxis
                    dataKey="event"
                    stroke={axisColor}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={65}
                  />

                  <YAxis stroke={axisColor} allowDecimals={false} />

                  <Tooltip contentStyle={tooltipStyle} />

                  <Legend />

                  <Bar
                    dataKey="present"
                    name="Present"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />

                  <Bar
                    dataKey="absent"
                    name="Absent"
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className={`flex h-[300px] items-center justify-center text-center ${mutedColor}`}>
                No attendance records for completed events in the last 30 days.
              </div>
            )}
          </div>

          {/* Budget Chart */}
          <div className={`min-w-0 rounded-xl p-5 shadow-sm sm:p-6 ${cardColor}`}>
            <h2 className={`mb-6 text-lg font-semibold ${textColor}`}>
              Budget Used vs Planned
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />

                <XAxis
                  dataKey="category"
                  stroke={axisColor}
                  tick={{ fontSize: 11 }}
                />

                <YAxis stroke={axisColor} />

                <Tooltip contentStyle={tooltipStyle} />

                <Legend />

                <Bar
                  dataKey="planned"
                  name="Planned"
                  fill="#a5b4fc"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  dataKey="spent"
                  name="Spent"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Footer */}
        <div className={`mt-8 pb-4 text-center text-sm ${mutedColor}`}>
          Lumina Insight - Club Activity Dashboard
        </div>

      </div>
    </div>
  )
}

export default Dashboard
