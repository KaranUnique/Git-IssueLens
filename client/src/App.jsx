import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Home from './pages/Home'
import Configure from './pages/Configure'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import { apiFetch } from './api'

export default function App() {
  const [hasConfig, setHasConfig] = useState(null) // null = loading

  useEffect(() => {
    apiFetch('/api/config')
      .then(r => setHasConfig(r.ok))
      .catch(() => setHasConfig(false))
  }, [])

  if (hasConfig === null) {
    return (
      <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center">
        <p className="text-[#555566] text-sm">Loading…</p>
      </div>
    )
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
