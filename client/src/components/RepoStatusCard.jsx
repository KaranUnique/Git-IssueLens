import { Link } from 'react-router-dom'

export default function RepoStatusCard({ repoUrl }) {
  if (!repoUrl) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800 text-sm">
        <p className="font-semibold mb-2">No repository configured yet.</p>
        <Link to="/config" className="text-indigo-600 font-medium hover:underline">
          Go to Configure →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
        Configured Repository
      </p>
      <a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-700 font-medium text-sm break-all hover:underline"
      >
        {repoUrl}
      </a>
      <p className="mt-3 text-xs text-green-600 font-medium">
        ✓ Webhook active
      </p>
    </div>
  )
}
