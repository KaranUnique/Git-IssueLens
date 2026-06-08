import { useState } from 'react'
import SubmitIssueForm from '../components/SubmitIssueForm'

const PRIORITY_COLORS = {
  High:   'text-red-600 bg-red-50 border-red-200',
  Medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  Low:    'text-green-600 bg-green-50 border-green-200'
}

const REC_COLORS = {
  Accept:          'text-green-700 bg-green-100',
  'Review Further':'text-yellow-700 bg-yellow-100',
  Reject:          'text-red-700 bg-red-100'
}

export default function SubmitIssue() {
  const [result, setResult] = useState(null)

  function handleResult(r) {
    setResult(r)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Submit an Issue</h1>

      {result && !result.success && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {result.error}
        </div>
      )}

      {result && result.success && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-indigo-700">AI Analysis Result</h2>

          <div className="flex flex-wrap gap-3">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${PRIORITY_COLORS[result.issue.priority] || 'text-gray-600'}`}>
              Priority: {result.issue.priority}
            </span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${REC_COLORS[result.issue.recommendation] || 'bg-gray-100 text-gray-600'}`}>
              {result.issue.recommendation}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Scope Score: {result.issue.scopeScore}/100
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Worthiness</p>
            <p className="text-sm text-gray-700">{result.issue.issueWorthiness}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Explanation</p>
            <p className="text-sm text-gray-700">{result.issue.explanation}</p>
          </div>

          <button
            onClick={() => setResult(null)}
            className="text-sm text-indigo-600 hover:underline"
          >
            Submit another issue
          </button>
        </div>
      )}

      {!result?.success && <SubmitIssueForm onResult={handleResult} />}
    </div>
  )
}
