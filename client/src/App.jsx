import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Configure from './pages/Configure'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import { apiFetch } from './api'

function hasExistingSession() {
  return !!localStorage.getItem('sessionId')
}

function WakingUp() {
  const [dots, setDots] = useState('.')
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '.' : d + '.'), 500)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-6">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white font-medium text-sm">Waking up the server{dots}</p>
        <p className="text-[#555566] text-xs max-w-xs">
          The backend is hosted on a free tier and may take up to 30 seconds to start after inactivity.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  // If no sessionId in localStorage, skip the network call — go straight to Landing
  const [hasConfig, setHasConfig] = useState(
    hasExistingSession() ? null : false  // null = need to check, false = no session
  )

  useEffect(() => {
    // Only fetch if there's an existing session to validate
    if (!hasExistingSession()) return

    apiFetch('/api/config')
      .then(r => setHasConfig(r.ok))
      .catch(() => setHasConfig(false))
  }, [])

  if (hasConfig === null) {
    return <WakingUp />
  }

  if (!hasConfig) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Landing onConnected={() => setHasConfig(true)} />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#0f0f13]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/config" element={<Configure onDisconnected={() => setHasConfig(false)} />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
