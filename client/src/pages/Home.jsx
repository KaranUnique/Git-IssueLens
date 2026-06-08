import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiUrl } from '../api'

export default function Home() {
  const [config, setConfig]   = useState(null)
  const [issues, setIssues]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [cfgRes, issuesRes] = await Promise.all([
          fetch(apiUrl('/api/config')),
          fetch(apiUrl('/api/issues'))
        ])
        if (cfgRes.ok) setConfig(await cfgRes.json())
        if (issuesRes.ok) setIssues(await issuesRes.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const total     = issues.length
  const accepted  = issues.filter(i => i.maintainerDecision === 'Accepted').length
  const rejected  = issues.filter(i => i.maintainerDecision === 'Rejected').length
  const pending   = issues.filter(i => i.maintainerDecision === 'Pending').length
  const analyzed  = issues.filter(i => i.analysisStatus === 'complete').length
  const awaitingAI = issues.filter(i => i.analysisStatus === 'pending').length
  const failed    = issues.filter(i => i.analysisStatus === 'error').length

  // Issue type breakdown
  const byType = issues
    .filter(i => i.issueType)
    .reduce((acc, i) => { acc[i.issueType] = (acc[i.issueType] || 0) + 1; return acc }, {})

  // Worthiness breakdown
  const byWorthiness = issues
    .filter(i => i.issueWorthiness)
    .reduce((acc, i) => { acc[i.issueWorthiness] = (acc[i.issueWorthiness] || 0) + 1; return acc }, {})

  // Recent issues
  const recent = [...issues].slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center h-full p-16">
      <p className="text-[#555566] text-sm">Loading…</p>
    </div>
  )

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white mb-0.5">Overview</h1>
        <p className="text-sm text-[#666677]">Repository health and issue analysis summary</p>
      </div>

      {/* Repo card */}
      <div className="bg-[#13131a] border border-[#22222e] rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#22222e] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#888899]" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
            </div>
            <div>
              {config ? (
                <>
                  <a href={config.repoUrl} target="_blank" rel="noopener noreferrer"
                    className="text-white font-semibold hover:text-purple-400 transition-colors text-sm">
                    {config.repoOwner}/{config.repoName}
                  </a>
                  <p className="text-xs text-[#555566] mt-0.5">{config.repoUrl}</p>
                  {config.repoDescription && (
                    <p className="text-xs text-[#666677] mt-1 max-w-lg">{config.repoDescription}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
                      <span className="text-xs text-green-500 font-medium">Webhook active</span>
                    </div>
                    <span className="text-[#333344]">·</span>
                    <span className="text-xs text-[#555566]">{total} issues tracked</span>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm text-white font-medium mb-1">No repository connected</p>
                  <p className="text-xs text-[#555566] mb-3">Connect a GitHub repository to start tracking issues</p>
                  <Link to="/config" className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                    + Connect Repository
                  </Link>
                </div>
              )}
            </div>
          </div>
          {config && (
            <Link to="/config" className="text-xs text-[#666677] hover:text-white border border-[#2a2a3d] hover:border-[#3a3a50] px-3 py-1.5 rounded-lg transition-colors shrink-0">
              Settings
            </Link>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Issues',  value: total,    sub: 'tracked',        color: 'text-white'       },
          { label: 'Accepted',      value: accepted, sub: 'by maintainer',  color: 'text-green-400'   },
          { label: 'Rejected',      value: rejected, sub: 'by maintainer',  color: 'text-red-400'     },
          { label: 'Pending Decision', value: pending, sub: 'awaiting review', color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#13131a] border border-[#22222e] rounded-xl p-4">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-white mt-1">{s.label}</p>
            <p className="text-xs text-[#444455] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* AI Analysis status */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'AI Analyzed',   value: analyzed,  color: 'text-purple-400', border: 'border-purple-900/50' },
          { label: 'Awaiting AI',   value: awaitingAI, color: 'text-yellow-400', border: 'border-yellow-900/50' },
          { label: 'Analysis Failed', value: failed,  color: 'text-red-400',    border: 'border-red-900/50'   },
        ].map(s => (
          <div key={s.label} className={`bg-[#13131a] border ${s.border} rounded-xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-[#555566] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Breakdowns row */}
      {(Object.keys(byType).length > 0 || Object.keys(byWorthiness).length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Issue type breakdown */}
          {Object.keys(byType).length > 0 && (
            <div className="bg-[#13131a] border border-[#22222e] rounded-xl p-4">
              <p className="text-xs font-medium text-[#555566] uppercase tracking-wide mb-3">By Issue Type</p>
              <div className="space-y-2">
                {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-xs text-[#888899]">{type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 bg-[#22222e] rounded-full overflow-hidden">
                        <div className="h-1 bg-purple-500 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-[#555566] w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Worthiness breakdown */}
          {Object.keys(byWorthiness).length > 0 && (
            <div className="bg-[#13131a] border border-[#22222e] rounded-xl p-4">
              <p className="text-xs font-medium text-[#555566] uppercase tracking-wide mb-3">By Worthiness</p>
              <div className="space-y-2">
                {Object.entries(byWorthiness).sort((a, b) => b[1] - a[1]).map(([w, count]) => (
                  <div key={w} className="flex items-center justify-between">
                    <span className="text-xs text-[#888899]">{w}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 bg-[#22222e] rounded-full overflow-hidden">
                        <div className="h-1 bg-indigo-500 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="text-xs text-[#555566] w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent issues */}
      {recent.length > 0 && (
        <div className="bg-[#13131a] border border-[#22222e] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#22222e] flex items-center justify-between">
            <p className="text-xs font-medium text-[#555566] uppercase tracking-wide">Recent Issues</p>
            <Link to="/dashboard" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[#1a1a24]">
            {recent.map(issue => (
              <div key={issue._id} className="px-4 py-3 flex items-center gap-3">
                <svg className={`w-3.5 h-3.5 shrink-0 ${issue.maintainerDecision === 'Rejected' ? 'text-red-500' : 'text-green-500'}`} fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                  <path fillRule="evenodd" d="M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{issue.title}</p>
                  <p className="text-xs text-[#444455]">#{issue.githubIssueId} · @{issue.userLogin}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {issue.recommendation && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${{
                      'Accept': 'text-green-400 border-green-900 bg-green-900/20',
                      'Reject': 'text-red-400 border-red-900 bg-red-900/20',
                      'Review Further': 'text-yellow-400 border-yellow-900 bg-yellow-900/20',
                    }[issue.recommendation] || ''}`}>
                      {issue.recommendation}
                    </span>
                  )}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    issue.analysisStatus === 'complete' ? 'bg-green-500' :
                    issue.analysisStatus === 'error'    ? 'bg-red-500'   : 'bg-yellow-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
