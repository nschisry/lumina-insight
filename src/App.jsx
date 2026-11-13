
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './services/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <p>Loading...</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={session ? <Dashboard /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login />}
        />

        <Route
          path="/register"
          element={session ? <Navigate to="/" replace /> : <Register />}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App