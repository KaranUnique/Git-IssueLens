const COLOR_MAP = {
  'Useful':       'bg-green-900/30 text-green-400 border-green-800',
  'Duplicate':    'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  'Out of Scope': 'bg-red-900/30 text-red-400 border-red-800',
  'Too Vague':    'bg-orange-900/30 text-orange-400 border-orange-800',
  'Low Impact':   'bg-[#1a1a24] text-[#666677] border-[#2a2a3d]',
}

export default function WorthinessBadge({ value }) {
  const classes = COLOR_MAP[value] || 'bg-[#1a1a24] text-[#666677] border-[#2a2a3d]'
  return (
    <span
      data-worthiness={value}
      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md border ${classes}`}
    >
      {value}
    </span>
  )
}
