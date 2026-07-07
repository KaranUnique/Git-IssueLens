import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api'
import { useState } from 'react'

const FIELDS = [
  { key: 'repoUrl',       label: 'Repository URL',               placeholder: 'https://github.com/owner/repo', type: 'text'     },
  { key: 'pat',           label: 'GitHub Personal Access Token', placeholder: 'ghp_…',                        type: 'password'  },
  { key: 'webhookSecret', label: 'Webhook Secret',               placeholder: 'Any secret string you choose', type: 'password'  },
]

export default function Landing({ onConnected }) {
  const navigate = useNavigate()
  const [form, setForm]     = useState({ repoUrl: '', pat: '', webhookSecret: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function validate() {
    const e = {}
    FIELDS.forEach(f => {
      if (!form[f.key] || !form[f.key].trim()) e[f.key] = `${f.label} is required`
    })
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const fieldErrors = validate()
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return }
    setErrors({})
    setSaving(true)
    try {
      const res  = await apiFetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to connect repository')
      if (onConnected) onConnected()
      navigate('/')
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo + heading */}
        <div className="flex items-center gap-3 mb-8">
          <img src="/Logo.png" alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
          <div>
            <h1 className="text-white font-semibold text-xl leading-tight">Git IssueLens</h1>
            <p className="text-[#555566] text-xs">AI-powered GitHub issue triage</p>
          </div>
        </div>

        <div className="bg-[#13131a] border border-[#22222e] rounded-2xl p-7">
          <h2 className="text-white font-semibold text-lg mb-1">Connect your repository</h2>
          <p className="text-[#555566] text-sm mb-6">
            Enter your GitHub details to start analysing issues with AI. Your data is isolated to this browser session.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-[#888899] mb-1.5 uppercase tracking-wide">
                  {f.label}
                </label>
                <input
                  type={f.type}
                  value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className={`w-full bg-[#0f0f13] border rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#333344] focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors ${
                    errors[f.key] ? 'border-red-600' : 'border-[#2a2a3d]'
                  }`}
                />
                {errors[f.key] && <p className="text-red-500 text-xs mt-1">{errors[f.key]}</p>}
              </div>
            ))}

            {errors.submit && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
            >
              {saving ? 'Connecting…' : 'Connect & Get Started'}
            </button>
          </form>

          <p className="text-xs text-[#444455] mt-5 leading-relaxed">
            Your PAT needs <span className="text-[#666677]">repo</span> scope to register webhooks and read issues.
            The webhook secret can be any string — just keep it consistent with what you set in GitHub.
          </p>
        </div>
      </div>
    </div>
  )
}
