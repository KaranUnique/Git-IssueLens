import { useState, useEffect } from 'react'
import RepoConfigForm from '../components/RepoConfigForm'
import { apiFetch } from '../api'

export default function Configure({ onDisconnected }) {
  const [config, setConfig]         = useState(null)
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    apiFetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(data => { setConfig(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await apiFetch('/api/config', { method: 'DELETE' })
      if (onDisconnected) onDisconnected()
    } catch (err) {
      console.error('Disconnect failed:', err.message)
    } finally {
      setDisconnecting(false)
      setConfirming(false)
    }
  }

  function handleUpdated() {
    setEditing(false)
    apiFetch('/api/config')
      .then(r => r.ok ? r.json() : null)
      .then(setConfig)
  }

  if (loading) return (
    <div className="p-8">
      <p className="text-[#555566] text-sm">Loading…</p>
    </div>
  )

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white mb-1">Configure Repository</h1>
        <p className="text-sm text-[#666677]">Manage your connected GitHub repository</p>
      </div>

      {/* Connected repo card */}
      {config && !editing && (
        <div className="bg-[#13131a] border border-[#22222e] rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#22222e] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#888899]" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{config.repoOwner}/{config.repoName}</p>
                <a href={config.repoUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[#555566] hover:text-purple-400 transition-colors">
                  {config.repoUrl}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-500 font-medium">Webhook active</span>
            </div>
          </div>

          {config.repoDescription && (
            <p className="text-xs text-[#666677] mb-4 pl-12">{config.repoDescription}</p>
          )}

          <div className="pl-12">
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium px-4 py-2 rounded-lg border border-[#2a2a3d] text-[#888899] hover:text-white hover:border-[#3a3a50] transition-colors"
            >
              Update connection
            </button>
          </div>
        </div>
      )}

      {/* Show form when editing or no config yet */}
      {editing && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-white">Update repository connection</p>
            <button onClick={() => setEditing(false)} className="text-xs text-[#555566] hover:text-white transition-colors">
              Cancel
            </button>
          </div>
          <RepoConfigForm onSuccess={handleUpdated} />
        </div>
      )}

      {/* Danger Zone */}
      <div className="pt-6 border-t border-[#22222e]">
        <h2 className="text-sm font-medium text-white mb-1">Danger Zone</h2>
        <p className="text-xs text-[#555566] mb-4">
          Removes this repository connection, deregisters the webhook, and deletes all tracked issues for your session.
        </p>

        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="text-xs font-medium px-4 py-2 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/20 transition-colors"
          >
            Disconnect repository
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#888899]">Are you sure? This cannot be undone.</p>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-xs font-medium px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white transition-colors"
            >
              {disconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-[#666677] hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
