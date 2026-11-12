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

function Dashboard() {
  const [darkMode, setDarkMode] = useState(false)
  const [data, setData] = useState({
    members: [],
    events: [],
    attendance: [],
    budget: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getDashboardData()
        setData(result)
      } catch (err) {
        console.error(err)
        setError('Unable to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  const budgetData = data.budget.map(item => ({
    category: item.category,
    planned: Number(item.planned) || 0,
    spent: Number(item.spent) || 0,
  }))

  // Attendance data
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
      present: presentCount,
      absent: absentCount,
    }
  })

  const totalPlanned = budgetData.reduce(
    (sum, item) => sum + item.planned, 0
  )

  const totalSpent = budgetData.reduce(
    (sum, item) => sum + item.spent, 0
  )

  const budgetPercentage = totalPlanned > 0
    ? Math.round((totalSpent / totalPlanned) * 100)
    : 0

  // Budget notifications
  const budgetAlerts = budgetData
    .filter(item =>
      item.planned > 0 && item.spent / item.planned > 0.8
    )
    .map(item => ({
      message: `${item.category} budget used ${Math.round(
        (item.spent / item.planned) * 100
      )}%`,
      type: 'budget',
    }))

  // Upcoming event notifications
  const eventAlerts = data.events
    .filter(event => {
      const days = getDaysUntil(event.date)
      return days >= 0 && days <= 3
    })
    .map(event => ({
      message: `${event.event_name} is coming soon (${getDaysUntil(event.date)} day(s) left)`,
      type: 'event',
    }))

  const notifications = [...budgetAlerts, ...eventAlerts]

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
  ]

  const textColor = darkMode ? 'text-white' : 'text-slate-800'
  const mutedColor = darkMode ? 'text-slate-400' : 'text-slate-500'
  const cardColor = darkMode ? 'bg-slate-800' : 'bg-white'
  const gridColor = darkMode ? '#475569' : '#e2e8f0'
  const axisColor = darkMode ? '#cbd5e1' : '#64748b'

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        Loading dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-6 transition-colors md:p-8 ${
      darkMode ? 'bg-slate-900' : 'bg-slate-100'
    }`}>
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold ${textColor}`}>
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
        <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon

            return (
              <div
                key={stat.title}
                className={`flex items-center gap-4 rounded-xl p-6 shadow-sm ${cardColor}`}
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
        <div className={`mb-8 rounded-xl p-6 shadow-sm ${cardColor}`}>
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
                  className={`flex items-center gap-3 rounded-lg p-4 ${
                    darkMode ? 'bg-slate-700' : 'bg-slate-50'
                  }`}
                >
                  <AlertTriangle
                    size={20}
                    className={
                      notification.type === 'budget'
                        ? 'text-orange-500'
                        : 'text-blue-500'
                    }
                  />

                  <p className={textColor}>
                    {notification.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={mutedColor}>
              No notifications at the moment.
            </p>
          )}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* Attendance Chart */}
          <div className={`rounded-xl p-6 shadow-sm ${cardColor}`}>
            <h2 className={`mb-6 text-lg font-semibold ${textColor}`}>
              Attendance per Event
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="event" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip />
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
          </div>

          {/* Budget Chart */}
          <div className={`rounded-xl p-6 shadow-sm ${cardColor}`}>
            <h2 className={`mb-6 text-lg font-semibold ${textColor}`}>
              Budget Used vs Planned
            </h2>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="category" stroke={axisColor} />
                <YAxis stroke={axisColor} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="planned"
                  name="Planned"
                  fill="#a5b4fc"
                />
                <Bar
                  dataKey="spent"
                  name="Spent"
                  fill="#6366f1"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Dashboard
