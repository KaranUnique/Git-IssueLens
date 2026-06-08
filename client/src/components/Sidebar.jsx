import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: '⊞', label: 'All Issues' },
  { to: '/config',    icon: '⚙', label: 'Configure'  },
  { to: '/',          icon: '⌂', label: 'Home', end: true },
]

export default function Sidebar() {
  return (
    <aside className="w-52 shrink-0 bg-[#13131a] border-r border-[#22222e] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-[#22222e]">
        <img src="/Logo.png" alt="Logo" className="w-11 h-11 rounded-lg object-contain" />
        <span className="text-white font-semibold text-sm">Git IssueLens</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ to, icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[#2a2a3d] text-white font-medium'
                  : 'text-[#888899] hover:text-white hover:bg-[#1e1e2a]'
              }`
            }
          >
            <span className="text-base w-4 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[#22222e] space-y-0.5">
        <NavLink
          to="/config"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888899] hover:text-white hover:bg-[#1e1e2a] transition-colors"
        >
          <span className="text-base w-4 text-center">◎</span>
          Settings
        </NavLink>
        <a
          href="https://ai.google.dev/gemini-api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#888899] hover:text-white hover:bg-[#1e1e2a] transition-colors"
        >
          <span className="text-base w-4 text-center">?</span>
          Help & Support
        </a>
      </div>
    </aside>
  )
}
