import { useState, useEffect } from 'react'
  import { NavLink, Outlet, useLocation } from 'react-router-dom'
  import {
    LayoutDashboard, Users, MessageSquare, Settings,
    Shield, Activity, Wifi, Menu, X, Bot, Radio
  } from 'lucide-react'
  import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

  const NAV = [
    { to: '/',           icon: LayoutDashboard, label: 'Inicio',       exact: true },
    { to: '/users',      icon: Users,           label: 'Usuarios' },
    { to: '/groups',     icon: MessageSquare,   label: 'Grupos' },
    { to: '/moderation', icon: Shield,          label: 'Moderación' },
    { to: '/activity',   icon: Activity,        label: 'Actividad' },
    { to: '/config',     icon: Settings,        label: 'Configuración' },
    { to: '/connect',    icon: Wifi,            label: 'Conexión' },
  ]

  const PAGE_LABELS: Record<string, string> = {
    '/':           'Inicio',
    '/users':      'Usuarios',
    '/groups':     'Grupos',
    '/moderation': 'Moderación',
    '/activity':   'Actividad',
    '/config':     'Configuración',
    '/connect':    'Conexión',
  }

  function Clock() {
    const [time, setTime] = useState(new Date())
    useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id) }, [])
    const hh = time.getHours().toString().padStart(2, '0')
    const mm = time.getMinutes().toString().padStart(2, '0')
    const ss = time.getSeconds().toString().padStart(2, '0')
    const date = time.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })
    return (
      <div className="sidebar-footer">
        <div className="sidebar-clock">{hh}<span style={{ opacity: time.getSeconds() % 2 === 0 ? 1 : .3, transition: 'opacity .15s' }}>:</span>{mm}<span style={{ fontSize: 12, color: 'var(--tx3)', marginLeft: 3 }}>{ss}</span></div>
        <div className="sidebar-date">{date.toUpperCase()}</div>
      </div>
    )
  }

  function StatusChip({ status, stats }: { status: BotStatus | null; stats: BotStats | null }) {
    if (!isConfigured()) return (
      <div className="sidebar-status loading">
        <div className="live-dot" style={{ color: 'var(--tx3)' }} />
        <span style={{ fontSize: 10 }}>API sin configurar</span>
      </div>
    )
    if (!status) return (
      <div className="sidebar-status loading">
        <div className="live-dot" style={{ color: 'var(--tx3)' }} />
        <span style={{ fontSize: 10 }}>Conectando…</span>
      </div>
    )
    return (
      <div className={`sidebar-status ${status.connected ? 'online' : 'offline'}`}>
        <div className="live-dot" />
        <span>{status.connected ? 'BOT EN LÍNEA' : 'DESCONECTADO'}</span>
        {stats && status.connected && (
          <span style={{ marginLeft: 'auto', fontSize: 9, opacity: .7 }}>
            {stats.users}u · {stats.groups}g
          </span>
        )}
      </div>
    )
  }

  export default function Layout() {
    const [open, setOpen]   = useState(false)
    const [status, setStat] = useState<BotStatus | null>(null)
    const [stats,  setStats]= useState<BotStats | null>(null)
    const location          = useLocation()

    useEffect(() => {
      if (!isConfigured()) return
      const load = async () => {
        try {
          const [s, st] = await Promise.allSettled([
            getStatus(),
            getStats(),
          ])
          if (s.status === 'fulfilled')  setStat(s.value)
          if (st.status === 'fulfilled') setStats(st.value)
        } catch {}
      }
      load()
      const id = setInterval(load, 12000)
      return () => clearInterval(id)
    }, [])

    useEffect(() => { setOpen(false) }, [location])

    const pageLabel = PAGE_LABELS[location.pathname] ?? ''

    return (
      <div className="app-layout">
        {/* ── Sidebar overlay (mobile) ── */}
        <div
          className={`sidebar-overlay${open ? ' show' : ''}`}
          onClick={() => setOpen(false)}
        />

        {/* ── Sidebar ── */}
        <aside className={`sidebar${open ? ' open' : ''}`}>
          {/* Header / brand */}
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">🤖</div>
              <div>
                <div className="sidebar-brand-name">BotAnime</div>
                <div className="sidebar-brand-sub">Dashboard v2</div>
              </div>
            </div>
            <StatusChip status={status} stats={stats} />
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, paddingTop: 8 }}>
            <div className="nav-section-label">Navegación</div>

            {NAV.map(({ to, icon: Icon, label, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon"><Icon size={16} /></span>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Stats mini */}
          {stats && (
            <div style={{ margin: '0 8px 4px', padding: '10px 12px', borderRadius: 10, background: 'rgba(229,57,53,.05)', border: '1px solid rgba(229,57,53,.1)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'rgba(229,57,53,.6)', textTransform: 'uppercase', marginBottom: 8, fontFamily: "'JetBrains Mono',monospace" }}>Stats globales</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[
                  { label: 'Usuarios', val: stats.users, color: 'var(--blue)' },
                  { label: 'Grupos',   val: stats.groups, color: 'var(--purple)' },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 7, background: 'rgba(0,0,0,.2)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color, fontFamily: "'Rajdhani',sans-serif", lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx3)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Clock />
        </aside>

        {/* ── Main ── */}
        <div className="main-content">
          {/* Topbar */}
          <header className="topbar">
            <button className="mobile-menu-btn" onClick={() => setOpen(o => !o)} aria-label="menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={16} color="var(--red)" style={{ flexShrink: 0 }} />
              <span className="topbar-title">BotAnime</span>
              <span className="topbar-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ opacity: .3 }}>/</span>
                {pageLabel}
              </span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Live pill */}
              {isConfigured() && status?.connected && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.18)', fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: '.08em' }}>
                  <Radio size={10} style={{ animation: 'pulse 1.8s ease-in-out infinite' }} />
                  LIVE
                </div>
              )}

              {/* Uptime */}
              {stats?.uptime !== undefined && (
                <div style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: "'JetBrains Mono',monospace" }}>
                  ↑ {Math.floor(stats.uptime / 3600)}h {Math.floor((stats.uptime % 3600) / 60)}m
                </div>
              )}

              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: 'linear-gradient(135deg,#e53935,#7b1fa2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, boxShadow: '0 0 12px rgba(229,57,53,.25)',
              }}>🤖</div>
            </div>
          </header>

          {/* Page content */}
          <main className="page-content">
            <Outlet />
          </main>
        </div>
      </div>
    )
  }
  