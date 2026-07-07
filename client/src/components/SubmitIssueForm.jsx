import { useState } from 'react'
import { apiFetch } from '../api'

export default function SubmitIssueForm({ onResult }) {
  const [form, setForm]     = useState({ title: '', description: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function validate() {
    const e = {}
    if (!form.title.trim())       e.title       = 'Issue title is required'
    if (!form.description.trim()) e.description = 'Issue description is required'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e_ = validate()
    if (Object.keys(e_).length > 0) { setErrors(e_); return }
    setErrors({})
    setLoading(true)

    try {
      const res = await apiFetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setForm({ title: '', description: '' })
      if (onResult) onResult({ success: true, issue: data })
    } catch (err) {
      if (onResult) onResult({ success: false, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Submit a New Issue</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Title</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          placeholder="Brief summary of the issue"
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            errors.title ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Issue Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Detailed description of the issue"
          rows={5}
          className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none ${
            errors.description ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors"
      >
        {loading ? 'Analyzing…' : 'Submit Issue'}
      </button>
    </form>
  )
}
