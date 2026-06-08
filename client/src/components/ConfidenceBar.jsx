export default function ConfidenceBar({ value }) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#22222e] rounded-full h-1 overflow-hidden">
        <div
          className={`h-1 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
          data-confidence={pct}
        />
      </div>
    </div>
  )
}
