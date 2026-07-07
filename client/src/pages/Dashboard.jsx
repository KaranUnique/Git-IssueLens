import { useEffect, useState } from 'react'
import IssueCard from '../components/IssueCard'
import { apiFetch } from '../api'

export default function Dashboard() {
  const [issues, setIssues]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [resetting, setResetting] = useState(false)

  function loadIssues() {
    setLoading(true)
    apiFetch('/api/issues')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setIssues(data) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadIssues() }, [])

  async function handleReset() {
    setResetting(true)
    try {
      await apiFetch('/api/issues/reset-status', { method: 'POST' })
      loadIssues()
    } finally {
      setResetting(false)
    }
  }

  const filtered = issues.filter(i => {
    if (filter === 'all') return true
    return i.analysisStatus === filter
  })

  const counts = {
    all:      issues.length,
    pending:  issues.filter(i => i.analysisStatus === 'pending').length,
    complete: issues.filter(i => i.analysisStatus === 'complete').length,
    error:    issues.filter(i => i.analysisStatus === 'error').length,
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="border-b border-[#22222e] px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-white">All Issues</h1>
          <p className="text-xs text-[#555566] mt-0.5">{counts.all} issues · {counts.pending} awaiting analysis</p>
        </div>
        {counts.error > 0 && (
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-xs text-[#666677] hover:text-white border border-[#2a2a3d] hover:border-[#3a3a50] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {resetting ? 'Resetting…' : `Reset ${counts.error} failed → pending`}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="border-b border-[#22222e] px-8 flex gap-1 shrink-0">
        {[
          { key: 'all',      label: 'All',      count: counts.all      },
          { key: 'pending',  label: 'Pending',  count: counts.pending  },
          { key: 'complete', label: 'Analyzed', count: counts.complete },
          { key: 'error',    label: 'Failed',   count: counts.error    },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
              filter === tab.key
                ? 'border-purple-500 text-white'
                : 'border-transparent text-[#666677] hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
              filter === tab.key ? 'bg-purple-600/30 text-purple-300' : 'bg-[#22222e] text-[#666677]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <p className="text-[#555566] text-sm">Loading issues…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📭</p>
            <p className="text-sm text-[#555566]">No issues here yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(issue => (
              <IssueCard key={issue._id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
