import { useState } from 'react'
import WorthinessBadge from './WorthinessBadge'
import ConfidenceBar from './ConfidenceBar'
import { apiUrl } from '../api'

const PRIORITY_COLORS = {
  High:   'text-red-400 bg-red-900/20 border-red-800',
  Medium: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
  Low:    'text-green-400 bg-green-900/20 border-green-800',
}

const REC_COLORS = {
  'Accept':         'bg-green-900/30 text-green-400 border-green-800',
  'Review Further': 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  'Reject':         'bg-red-900/30 text-red-400 border-red-800',
}

const DECISION_BORDER = {
  Accepted: 'border-l-4 border-l-green-600 border-[#22222e]',
  Rejected: 'border-l-4 border-l-red-600 border-[#22222e]',
  Pending:  'border-[#22222e]',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function IssueCard({ issue: initialIssue }) {
  const [issue, setIssue]     = useState(initialIssue)
  const [loading, setLoading] = useState(null)
  const [error, setError]     = useState(null)
  const [expanded, setExpanded] = useState(false)

  const decided = issue.maintainerDecision !== 'Pending'

  async function handleDecision(decision) {
    setLoading(decision)
    setError(null)
    try {
      const res  = await fetch(apiUrl(`/api/issues/${issue._id}/decision`), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setIssue(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(null) }
  }

  async function handleAnalyze() {
    setLoading('analyzing')
    setError(null)
    try {
      const res  = await fetch(apiUrl(`/api/issues/${issue._id}/analyze`), { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      setIssue(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(null) }
  }

  return (
    <div className={`bg-[#13131a] border rounded-xl overflow-hidden transition-all ${DECISION_BORDER[issue.maintainerDecision] || 'border-[#22222e]'}`}>
      {/* Main row */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Open/closed dot */}
          <div className="mt-1 shrink-0">
            <svg className={`w-4 h-4 ${issue.maintainerDecision === 'Rejected' ? 'text-red-500' : 'text-green-500'}`} fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
              <path fillRule="evenodd" d="M8 0a8 8 0 110 16A8 8 0 018 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>
            </svg>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3
                    className="font-semibold text-white text-sm leading-snug hover:text-purple-400 cursor-pointer transition-colors"
                    onClick={() => setExpanded(e => !e)}
                  >
                    {issue.title}
                  </h3>
                  {/* Labels */}
                  {issue.labels?.length > 0 && issue.labels.map(label => (
                    <span key={label} className="text-xs px-2 py-0.5 rounded-full border border-[#2a2a3d] bg-[#1a1a24] text-[#888899]">
                      {label}
                    </span>
                  ))}
                </div>

                {/* Meta line — like GitHub */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#555566]">
                  <span className="font-mono text-[#444455]">#{issue.githubIssueId}</span>
                  {issue.repoName && <span>{issue.repoName}</span>}
                  <span>opened {timeAgo(issue.createdAt)}</span>
                  {issue.userLogin && (
                    <span>by <span className="text-[#888899]">@{issue.userLogin}</span></span>
                  )}
                  {issue.githubIssueUrl && (
                    <a href={issue.githubIssueUrl} target="_blank" rel="noopener noreferrer"
                      title="View on GitHub"
                      className="text-purple-500 hover:text-purple-400 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-2 shrink-0">
                {issue.maintainerDecision !== 'Pending' && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    issue.maintainerDecision === 'Accepted'
                      ? 'bg-green-900/30 text-green-400 border-green-800'
                      : 'bg-red-900/30 text-red-400 border-red-800'
                  }`}>
                    {issue.maintainerDecision}
                  </span>
                )}

                {/* AI status badge */}
                {issue.analysisStatus === 'complete' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 border border-purple-800">
                    ✦ Analyzed
                  </span>
                )}

                {issue.analysisStatus !== 'complete' && (
                  <button
                    onClick={handleAnalyze}
                    disabled={loading === 'analyzing'}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white transition-colors"
                  >
                    {loading === 'analyzing'
                      ? <><span className="animate-spin inline-block">◌</span> Analyzing…</>
                      : <>✦ Analyze</>
                    }
                  </button>
                )}

                <button
                  onClick={() => setExpanded(e => !e)}
                  className="text-[#555566] hover:text-white transition-colors p-1"
                >
                  <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick AI summary row — visible without expanding */}
        {issue.analysisStatus === 'complete' && !expanded && (
          <div className="flex flex-wrap gap-2 mt-3 ml-7">
            {issue.recommendation && (
              <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${REC_COLORS[issue.recommendation] || ''}`}>
                {issue.recommendation}
              </span>
            )}
            {issue.priority && (
              <span className={`text-xs px-2 py-0.5 rounded-md border font-medium ${PRIORITY_COLORS[issue.priority] || ''}`}>
                {issue.priority} Priority
              </span>
            )}
            {issue.issueWorthiness && <WorthinessBadge value={issue.issueWorthiness} />}
            {issue.scopeScore != null && (
              <span className="text-xs text-[#666677]">Scope: {issue.scopeScore}/100</span>
            )}
          </div>
        )}

        {issue.analysisStatus === 'pending' && loading !== 'analyzing' && (
          <p className="text-xs text-[#444455] mt-2 ml-7 italic">Not yet analyzed — click ✦ Analyze to run AI triage.</p>
        )}

        {issue.analysisStatus === 'error' && (
          <p className="text-xs text-red-500/80 mt-2 ml-7">Analysis failed. Click ✦ Analyze to retry.</p>
        )}

        {error && <p className="text-xs text-red-400 mt-2 ml-7">{error}</p>}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-[#22222e] bg-[#0f0f13]">
          {/* Issue body */}
          {issue.body && (
            <div className="px-6 py-4 border-b border-[#1a1a24]">
              <p className="text-xs font-medium text-[#555566] uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-[#aaaabc] leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-60">
                {issue.body}
              </p>
            </div>
          )}

          {/* AI Analysis full panel */}
          {issue.analysisStatus === 'complete' && (
            <div className="px-6 py-4 border-b border-[#1a1a24]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-purple-400">✦</span>
                <span className="text-xs font-semibold text-[#888899] uppercase tracking-wider">AI Analysis</span>
              </div>

              {/* 2-col grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-[#13131a] rounded-lg p-3 border border-[#22222e]">
                  <p className="text-xs text-[#555566] mb-1">Recommendation</p>
                  {issue.recommendation && (
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-md border ${REC_COLORS[issue.recommendation] || ''}`}>
                      {issue.recommendation}
                    </span>
                  )}
                </div>
                <div className="bg-[#13131a] rounded-lg p-3 border border-[#22222e]">
                  <p className="text-xs text-[#555566] mb-1">Issue Worthiness</p>
                  {issue.issueWorthiness && <WorthinessBadge value={issue.issueWorthiness} />}
                </div>
                <div className="bg-[#13131a] rounded-lg p-3 border border-[#22222e]">
                  <p className="text-xs text-[#555566] mb-1">Priority</p>
                  {issue.priority && (
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-md border ${PRIORITY_COLORS[issue.priority] || ''}`}>
                      {issue.priority}
                    </span>
                  )}
                </div>
                <div className="bg-[#13131a] rounded-lg p-3 border border-[#22222e]">
                  <p className="text-xs text-[#555566] mb-1">Issue Type</p>
                  <span className="text-sm text-[#aaaabc] font-medium">{issue.issueType}</span>
                </div>
              </div>

              {/* Scope score + confidence */}
              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-[#555566]">Scope Match</span>
                    <span className="text-xs font-semibold text-purple-300">{issue.scopeScore}/100</span>
                  </div>
                  <div className="h-1.5 bg-[#22222e] rounded-full overflow-hidden">
                    <div className="h-1.5 bg-purple-500 rounded-full" style={{ width: `${issue.scopeScore}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-[#555566]">AI Confidence</span>
                    <span className="text-xs font-semibold text-[#888899]">{issue.confidence}%</span>
                  </div>
                  <ConfidenceBar value={issue.confidence} />
                </div>
              </div>

              {/* Explanation */}
              {issue.explanation && (
                <div className="bg-[#13131a] rounded-lg p-3 border border-[#22222e]">
                  <p className="text-xs text-[#555566] mb-1">AI Explanation</p>
                  <p className="text-sm text-[#aaaabc] leading-relaxed">{issue.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Decision buttons */}
          <div className="px-6 py-3 flex items-center gap-3">
            <button
              onClick={() => handleDecision('Accepted')}
              disabled={decided || loading !== null}
              className={`text-xs font-medium px-4 py-1.5 rounded-lg border transition-colors ${
                issue.maintainerDecision === 'Accepted'
                  ? 'bg-green-900/30 text-green-400 border-green-800 cursor-default'
                  : 'text-[#888899] border-[#2a2a3d] hover:text-green-400 hover:bg-green-900/20 hover:border-green-800 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {loading === 'Accepted' ? '…' : '✓ Accept'}
            </button>
            <button
              onClick={() => handleDecision('Rejected')}
              disabled={decided || loading !== null}
              className={`text-xs font-medium px-4 py-1.5 rounded-lg border transition-colors ${
                issue.maintainerDecision === 'Rejected'
                  ? 'bg-red-900/30 text-red-400 border-red-800 cursor-default'
                  : 'text-[#888899] border-[#2a2a3d] hover:text-red-400 hover:bg-red-900/20 hover:border-red-800 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {loading === 'Rejected' ? '…' : '✕ Reject'}
            </button>
            {issue.maintainerDecision !== 'Pending' && (
              <span className="text-xs text-[#444455]">Decision recorded</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
