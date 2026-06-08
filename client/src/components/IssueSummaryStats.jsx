export default function IssueSummaryStats({ total, accepted, rejected }) {
  const stats = [
    { label: 'Total Issues',     value: total,    color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Accepted Issues',  value: accepted,  color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Rejected Issues',  value: rejected,  color: 'bg-red-50 text-red-700 border-red-200' }
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map(s => (
        <div key={s.label} className={`rounded-lg border p-4 text-center ${s.color}`}>
          <p className="text-3xl font-bold">{s.value}</p>
          <p className="text-xs font-medium mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  )
}
