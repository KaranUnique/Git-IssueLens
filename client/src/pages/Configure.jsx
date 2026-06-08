import { useState } from 'react'
import RepoConfigForm from '../components/RepoConfigForm'

export default function Configure() {
  const [success, setSuccess] = useState(false)

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Configure Repository</h1>
        <p className="text-sm text-[#666677]">Connect a GitHub repository to start receiving issue events</p>
      </div>

      {success ? (
        <div className="bg-[#13131a] border border-green-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white text-xs">✓</span>
            <p className="text-green-400 font-medium text-sm">Configuration saved successfully!</p>
          </div>
          <p className="text-sm text-[#888899] mb-1">Your webhook has been registered. GitHub will now deliver issue events to this app.</p>
          <p className="text-sm text-[#888899] mb-5">
            Existing open issues have been fetched — click <span className="text-purple-400 font-medium">✦ Analyze</span> on each issue card to run AI analysis.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Update configuration →
          </button>
        </div>
      ) : (
        <RepoConfigForm onSuccess={() => setSuccess(true)} />
      )}
    </div>
  )
}
