import { useState, useEffect } from 'react'
  import { Outlet, NavLink, useLocation } from 'react-router-dom'
  import {
    LayoutDashboard, Users, MessagesSquare, Settings,
    Shield, Activity, Link2, Menu, X
  } from 'lucide-react'
  import { getStatus, type BotStatus } from '../api'

  const NAV = [
    { to: '/', icon: LayoutDashboard, label: 'Overview',       end: true },
    { to: '/users',      icon: Users,          label: 'Usuarios'          },
    { to: '/groups',     icon: MessagesSquare, label: 'Grupos'            },
    { to: '/moderation', icon: Shield,         label: 'Moderación'        },
    { to: '/activity',   icon: Activity,       label: 'Actividad'         },
    { to: '/config',     icon: Settings,       label: 'Config'            },
    { to: '/connect',    icon: Link2,          label: 'Conexión'          },
  ]

  function cn(...c: (string | boolean | undefined)[]) {
    return c.filter(Boolean).join(' ')
  }

  export default function Layout() {
    const [open, setOpen] = useState(false)
    const [status, setStatus] = useState<BotStatus | null>(null)
    const location = useLocation()

    useEffect(() => {
      const f = () => getStatus().then(setStatus).catch(() => {})
      f(); const id = setInterval(f, 8000); return () => clearInterval(id)
    }, [])

    useEffect(() => setOpen(false), [location])

    const connected = status?.connected ?? false
    const pageLabel = NAV.find(n => n.to === location.pathname)?.label ?? 'Dashboard'

    return (
      <div className="flex min-h-screen relative z-10">
        {/* Mobile overlay */}
        {open && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
               onClick={() => setOpen(false)} />
        )}

        {/* ── Sidebar ── */}
        <aside className={cn(
          'sidebar fixed top-0 left-0 h-full w-56 flex flex-col z-50',
          'transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          {/* Logo */}
          <div className="px-5 py-6 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div>
                <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '1.05rem', fontWeight: 900,
                              color: 'var(--blue)', textShadow: '0 0 20px var(--glow-b)', letterSpacing: '0.12em' }}>
                  SYS://BOTANIME
                </div>
                <div className="sys-label mt-1">PANEL_v2.0 /// CONTROL</div>
              </div>
              <button onClick={() => setOpen(false)} className="lg:hidden text-[var(--tx3)] hover:text-[var(--tx)]">
                <X size={15} />
              </button>
            </div>

            {/* Status */}
            <div className="mt-4 flex items-center gap-2">
              <span className={cn(
                'status-dot',
                connected ? 'bg-[var(--green)]' : 'bg-[var(--red)]'
              )} style={{ boxShadow: connected ? '0 0 8px var(--green)' : '0 0 8px var(--red)' }} />
              <span className="sys-label" style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>
                {connected ? '● CONNECTED' : '○ OFFLINE'}
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3">
            <div className="sys-label px-5 mb-3 mt-1">[ NAVIGATION ]</div>
            {NAV.map(({ to, icon: Icon, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) => cn('nav-link', isActive && 'active')}>
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-[var(--border)]">
            <div className="sys-label">BOTANIME © 2025</div>
            <div className="sys-label mt-0.5" style={{ color: 'var(--blue)', opacity: 0.5 }}>
              SYS_STATUS: {connected ? 'OPERATIONAL' : 'STANDBY'}
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 lg:ml-56 min-h-screen flex flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex items-center gap-4 px-5 py-3"
                  style={{ background: 'rgba(0,1,10,0.92)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}>
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 border border-[var(--border)] hover:border-[var(--blue)] transition">
              <Menu size={16} style={{ color: 'var(--blue)' }} />
            </button>

            {/* Page title */}
            <div>
              <div className="sys-label" style={{ color: 'var(--blue)', opacity: 0.6 }}>SYS://BOTANIME.DASHBOARD</div>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: '0.95rem', fontWeight: 700,
                            color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '1px' }}>
                {pageLabel}
              </div>
            </div>

            {/* Right: status pill */}
            <div className="ml-auto flex items-center gap-3">
              <div className={cn('badge', connected ? 'badge-green' : 'badge-red')}>
                <span className="status-dot w-1.5 h-1.5"
                      style={{ background: connected ? 'var(--green)' : 'var(--red)',
                               boxShadow: connected ? '0 0 6px var(--green)' : '0 0 6px var(--red)' }} />
                {connected ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 p-5 md:p-7 animate-fade-up">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }
  