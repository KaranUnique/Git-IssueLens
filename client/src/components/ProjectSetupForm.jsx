import { useState } from 'react'

const FIELDS = [
  { key: 'name',         label: 'Project Name',        placeholder: 'e.g. My Open Source Project' },
  { key: 'description',  label: 'Project Description',  placeholder: 'What does this project do?' },
  { key: 'scope',        label: 'Project Scope',         placeholder: 'What features/areas does it cover?' },
  { key: 'technologies', label: 'Technologies Used',     placeholder: 'e.g. React, Node.js, MongoDB' }
]

export default function ProjectSetupForm({ initialValues, onSaved }) {
  const [form, setForm] = useState({
    name:         initialValues?.name         || '',
    description:  initialValues?.description  || '',
    scope:        initialValues?.scope        || '',
    technologies: initialValues?.technologies || ''
  })
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)

  function validate() {
    const e = {}
    FIELDS.forEach(f => {
      if (!form[f.key] || form[f.key].trim() === '') e[f.key] = `${f.label} is required`
    })
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e_ = validate()
    if (Object.keys(e_).length > 0) { setErrors(e_); return }
    setErrors({})
    setSaving(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setSuccess(true)
      if (onSaved) onSaved(data)
    } catch (err) {
      setErrors({ submit: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Configure Project</h3>

      {FIELDS.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
          <input
            type="text"
            value={form[f.key]}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              errors[f.key] ? 'border-red-400' : 'border-gray-300'
            }`}
          />
          {errors[f.key] && <p className="text-red-500 text-xs mt-1">{errors[f.key]}</p>}
        </div>
      ))}

      {errors.submit && <p className="text-red-500 text-sm">{errors.submit}</p>}
      {success && <p className="text-green-600 text-sm">Project saved successfully!</p>}

      <button
        type="submit"
        disabled={saving}
        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors"
      >
        {saving ? 'Saving…' : 'Save Project'}
      </button>
    </form>
  )
}
