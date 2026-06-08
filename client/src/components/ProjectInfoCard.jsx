export default function ProjectInfoCard({ project }) {
  if (!project) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-700 text-sm">
        No project configured yet. Use the form below to set up your project.
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-xl font-bold text-indigo-700 mb-1">{project.name}</h2>
      <p className="text-gray-600 text-sm mb-4">{project.description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Scope</span>
          <p className="text-gray-700 text-sm mt-1">{project.scope}</p>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Technologies</span>
          <p className="text-gray-700 text-sm mt-1">{project.technologies}</p>
        </div>
      </div>
    </div>
  )
}
