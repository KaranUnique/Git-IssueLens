import { useState } from 'react'

const FIELDS = [
  { key: 'repoUrl',       label: 'Repository URL',                placeholder: 'https://github.com/owner/repo', type: 'text'     },
  { key: 'pat',           label: 'GitHub Personal Access Token',  placeholder: 'ghp_…',                        type: 'password'  },
  { key: 'webhookSecret', label: 'Webhook Secret',                placeholder: 'A secret string to sign payloads', type: 'password' },
]

export default function RepoConfigForm({ onSuccess }) {
  const [form, setForm]     = useState({ repoUrl: '', pat: '', webhookSecret: '' })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  function validate() {
    const e = {}
    FIELDS.forEach(f => {
      if (!form[f.key] || form[f.key].trim() === '') e[f.key] = `${f.label} is required`
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
      const res  = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration')
      if (onSuccess) onSuccess(data)
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#13131a] border border-[#22222e] rounded-xl p-6 space-y-5">
      {FIELDS.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-medium text-[#888899] mb-1.5 uppercase tracking-wide">
            {f.label}
          </label>
          <input
            type={f.type}
            value={form[f.key]}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className={`w-full bg-[#0f0f13] border rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#444455] focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors ${
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
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
      >
        {saving ? 'Connecting…' : 'Connect Repository'}
      </button>
    </form>
  )
}
