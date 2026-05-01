import { useState, useEffect } from 'react'
  import { Outlet, NavLink, useLocation } from 'react-router-dom'
  import {
    LayoutDashboard, Users, MessagesSquare, Settings,
    Shield, Activity, Link2, Menu, X, Zap
  } from 'lucide-react'
  import { cn } from '../lib/utils'
  import { getStatus, type BotStatus } from '../api'

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Overview', end: true },
    { to: '/users', icon: Users, label: 'Usuarios' },
    { to: '/groups', icon: MessagesSquare, label: 'Grupos' },
    { to: '/moderation', icon: Shield, label: 'Moderación' },
    { to: '/activity', icon: Activity, label: 'Actividad' },
    { to: '/config', icon: Settings, label: 'Configuración' },
    { to: '/connect', icon: Link2, label: 'Conexión' },
  ]

  export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [status, setStatus] = useState<BotStatus | null>(null)
    const location = useLocation()

    useEffect(() => {
      const fetchStatus = () => getStatus().then(setStatus).catch(() => {})
      fetchStatus()
      const id = setInterval(fetchStatus, 8000)
      return () => clearInterval(id)
    }, [])

    useEffect(() => { setSidebarOpen(false) }, [location])

    const connected = status?.connected ?? false
    const maintenance = false

    return (
      <div className="flex min-h-screen relative z-10">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          'fixed top-0 left-0 h-full w-[230px] bg-[rgba(0,10,30,0.97)] border-r border-border',
          'flex flex-col z-50 transition-transform duration-300 backdrop-blur-2xl',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          {/* Header */}
          <div className="px-4 py-5 border-b border-border flex items-start justify-between">
            <div>
              <div className="font-display font-bold text-[1.3rem] text-blue glow-blue tracking-wider flex items-center gap-2">
                <Zap size={18} className="text-blue" />
                BotAnime
              </div>
              <div className="font-mono text-[9px] text-tx3 tracking-[0.15em] uppercase mt-0.5">
                Dashboard v2.0
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-tx3 hover:text-tx p-1">
              <X size={16} />
            </button>
          </div>

          {/* Status pill */}
          <div className="mx-3 mt-2.5">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded border text-[11px] font-bold font-display tracking-wider uppercase',
              maintenance
                ? 'border-amber/35 text-amber bg-amber/8'
                : connected
                ? 'border-green/35 text-green bg-green/8'
                : 'border-red/35 text-red bg-red/8'
            )}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full animate-pulse-slow',
                maintenance ? 'bg-amber' : connected ? 'bg-green' : 'bg-red'
              )} style={{ boxShadow: `0 0 6px currentColor` }} />
              {maintenance ? 'Mantenimiento' : connected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-4">
            <p className="section-title px-4 mb-2">Navegación</p>
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cn('nav-item', isActive && 'active')}
              >
                <Icon size={16} className="flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border font-mono text-[9px] text-tx3 tracking-wider">
            BotAnime © 2025
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 lg:ml-[230px] min-h-screen">
          {/* Topbar */}
          <div className="sticky top-0 z-30 flex items-center gap-3 px-5 py-3
                          bg-bg/90 backdrop-blur-md border-b border-border">
            <button
              className="lg:hidden flex flex-col gap-1 p-2 rounded border border-border hover:bg-surface transition"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={16} className="text-blue" />
            </button>
            <div>
              <p className="font-display font-bold text-base text-white tracking-wide">
                {navItems.find(n => n.to === location.pathname)?.label ?? 'Dashboard'}
              </p>
              <p className="font-mono text-[9px] text-tx3 uppercase tracking-widest">
                BotAnime — Panel de control
              </p>
            </div>
            <div className="ml-auto">
              {status && (
                <span className={cn(
                  'badge text-[10px]',
                  connected ? 'badge-green' : 'badge-red'
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow" />
                  {connected ? 'Online' : 'Offline'}
                </span>
              )}
            </div>
          </div>

          {/* Page content */}
          <main className="p-5 md:p-7 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }
  