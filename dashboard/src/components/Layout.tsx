import { useState, useEffect } from 'react'
  import { NavLink, Outlet, useLocation } from 'react-router-dom'
  import {
    LayoutDashboard, Users, MessageSquare, Settings, Shield, Activity,
    Wifi, Menu, X, Bot, ChevronRight, Cpu, Bell, Radio
  } from 'lucide-react'
  import { getStatus, getStats, isConfigured } from '../api'

  const SECTIONS = [
    {
      label: 'OPERACIONES',
      links: [
        { to: '/',           icon: LayoutDashboard, label: 'Dashboard',      color: '#e53935' },
        { to: '/users',      icon: Users,           label: 'Usuarios',       color: '#8b5cf6' },
        { to: '/groups',     icon: MessageSquare,   label: 'Grupos',         color: '#3b82f6' },
        { to: '/activity',   icon: Activity,        label: 'Actividad',      color: '#10b981' },
      ],
    },
    {
      label: 'SISTEMA · OWNER',
      links: [
        { to: '/moderation', icon: Shield,          label: 'Moderación',     color: '#f59e0b' },
        { to: '/config',     icon: Settings,        label: 'Configuración',  color: '#6366f1' },
        { to: '/connect',    icon: Wifi,            label: 'Conexión',       color: '#06b6d4' },
      ],
    },
  ]

  function formatTime() {
    return new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  export default function Layout() {
    const [open, setOpen]     = useState(false)
    const [online, setOnline] = useState<boolean | null>(null)
    const [users, setUsers]   = useState<number | null>(null)
    const [groups, setGroups] = useState<number | null>(null)
    const [time, setTime]     = useState(formatTime())
    const location            = useLocation()

    useEffect(() => { setOpen(false) }, [location])

    useEffect(() => {
      const tick = setInterval(() => setTime(formatTime()), 30000)
      return () => clearInterval(tick)
    }, [])

    useEffect(() => {
      if (!isConfigured()) return
      const poll = async () => {
        try {
          const [st, stats] = await Promise.all([getStatus(), getStats()])
          setOnline(st.connected)
          setUsers(stats.users)
          setGroups(stats.groups)
        } catch { setOnline(false) }
      }
      poll()
      const id = setInterval(poll, 15000)
      return () => clearInterval(id)
    }, [])

    const currentPage = SECTIONS.flatMap(s => s.links).find(l =>
      l.to === location.pathname || (l.to !== '/' && location.pathname.startsWith(l.to))
    )

    return (
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* Mobile overlay */}
        {open && (
          <div onClick={() => setOpen(false)} style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 40,
            animation: 'fadeIn .2s ease'
          }} />
        )}

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${open ? 'open' : ''}`} style={{
          position: 'fixed', top: 0, left: 0, height: '100vh',
          display: 'flex', flexDirection: 'column', zIndex: 50,
          width: 'var(--sidebar-w)'
        }}>
          {/* Logo */}
          <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="sidebar-logo-ring">
                <Bot size={17} color="white" style={{ position: 'relative', zIndex: 1 }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'white', lineHeight: 1.2 }}>Panel Admin</div>
                <div style={{ fontSize: 10, color: 'rgba(240,240,245,.35)', fontFamily: "'JetBrains Mono',monospace" }}>BotAnime · v2</div>
              </div>
              <button onClick={() => setOpen(false)} className="btn btn-ghost btn-xs"
                style={{ marginLeft: 'auto', padding: '4px', display: 'none' }}>
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 8 }}>
            {SECTIONS.map(sec => (
              <div key={sec.label}>
                <div className="nav-section-label">{sec.label}</div>
                {sec.links.map(l => (
                  <NavLink key={l.to} to={l.to} end={l.to === '/'}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    style={({ isActive }) => isActive ? { borderColor: `${l.color}22` } : {}}>
                    <span className="nav-icon" style={{ color: 'inherit' }}>
                      <l.icon size={15} />
                    </span>
                    <span style={{ flex: 1 }}>{l.label}</span>
                    <ChevronRight size={11} style={{ opacity: .25 }} />
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Bottom: quick stats + status */}
          <div style={{ padding: '10px 12px 14px', borderTop: '1px solid rgba(255,255,255,.05)' }}>
            {/* Mini stats */}
            {(users !== null || groups !== null) && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {users !== null && (
                  <div style={{ flex: 1, background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.15)',
                    borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#8b5cf6' }}>{users}</div>
                    <div style={{ fontSize: 9, color: 'rgba(240,240,245,.3)', marginTop: 1 }}>usuarios</div>
                  </div>
                )}
                {groups !== null && (
                  <div style={{ flex: 1, background: 'rgba(59,130,246,.08)', border: '1px solid rgba(59,130,246,.15)',
                    borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>{groups}</div>
                    <div style={{ fontSize: 9, color: 'rgba(240,240,245,.3)', marginTop: 1 }}>grupos</div>
                  </div>
                )}
              </div>
            )}

            {/* Status indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,.04)', borderRadius: 9, padding: '8px 10px',
              border: '1px solid rgba(255,255,255,.06)' }}>
              <Cpu size={13} color={online === true ? '#10b981' : online === false ? '#e53935' : 'rgba(255,255,255,.3)'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(240,240,245,.7)' }}>
                  {!isConfigured() ? 'Sin conexión' : online === null ? 'Conectando…' : online ? 'Bot Online' : 'Bot Offline'}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(240,240,245,.3)', fontFamily: "'JetBrains Mono',monospace" }}>{time}</div>
              </div>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: online ? '#10b981' : online === false ? '#e53935' : '#333',
                boxShadow: online ? '0 0 8px #10b981' : 'none',
                animation: online ? 'glow 2.5s ease-in-out infinite' : 'none' }} />
            </div>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="main-area" style={{ flex: 1, marginLeft: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Top bar */}
          <header style={{ height: 54, borderBottom: '1px solid rgba(255,255,255,.06)',
            display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px',
            background: 'rgba(7,7,11,.9)', backdropFilter: 'blur(10px)',
            position: 'sticky', top: 0, zIndex: 30 }}>

            {/* Hamburger (mobile) */}
            <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm"
              style={{ padding: '6px 8px' }}>
              {open ? <X size={15} /> : <Menu size={15} />}
            </button>

            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Radio size={11} color={online ? '#10b981' : '#555'} style={{ animation: online ? 'pulse 2s infinite' : 'none' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: online ? '#10b981' : '#555', letterSpacing: '.06em' }}>
                {online ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>

            {/* Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'rgba(240,240,245,.3)' }}>
              <span style={{ color: 'rgba(240,240,245,.45)' }}>BotAnime</span>
              <ChevronRight size={11} />
              <span style={{ color: 'white', fontWeight: 600 }}>
                {currentPage?.label ?? 'Dashboard'}
              </span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Notification icon */}
              <div style={{ position: 'relative' }}>
                <button className="btn btn-ghost btn-sm" style={{ padding: '6px 8px' }}>
                  <Bell size={14} color="var(--tx3)" />
                </button>
              </div>

              <span className="badge badge-red">OWNER</span>

              {/* Avatar */}
              <div style={{ width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg,#e53935,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
                boxShadow: '0 2px 8px rgba(229,57,53,.3)' }}>Z</div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, padding: '24px', minWidth: 0, maxWidth: 1440, width: '100%' }}>
            <Outlet />
          </main>

          {/* Footer */}
          <footer style={{ borderTop: '1px solid rgba(255,255,255,.04)', padding: '10px 22px',
            display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: "'JetBrains Mono',monospace" }}>
              BotAnime Dashboard · Panel de Administración · {new Date().getFullYear()}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--tx3)' }}>
              {isConfigured() ? '🟢 API conectada' : '🔴 API no configurada'}
            </span>
          </footer>
        </div>
      </div>
    )
  }
  