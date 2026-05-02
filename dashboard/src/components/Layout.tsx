import { useState, useEffect } from 'react'
  import { NavLink, Outlet, useLocation } from 'react-router-dom'
  import {
    LayoutDashboard, Users, MessageSquare, Settings,
    Shield, Activity, Wifi, Menu, X, Bot
  } from 'lucide-react'
  import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

  const NAV = [
    { to: '/',           icon: LayoutDashboard, label: 'INICIO',         exact: true,  num: '01' },
    { to: '/users',      icon: Users,           label: 'USUARIOS',                     num: '02' },
    { to: '/groups',     icon: MessageSquare,   label: 'GRUPOS',                       num: '03' },
    { to: '/moderation', icon: Shield,          label: 'MODERACIÓN',                   num: '04' },
    { to: '/activity',   icon: Activity,        label: 'ACTIVIDAD',                    num: '05' },
    { to: '/config',     icon: Settings,        label: 'CONFIG',                       num: '06' },
    { to: '/connect',    icon: Wifi,            label: 'CONEXIÓN',                     num: '07' },
  ]

  const PAGE_LABELS: Record<string, string> = {
    '/': 'STATUS WINDOW', '/users': 'HUNTER LIST', '/groups': 'DUNGEON MAP',
    '/moderation': 'MOD SYSTEM', '/activity': 'EVENT LOG', '/config': 'SYSTEM CONFIG', '/connect': 'CONNECTION',
  }

  function Clock() {
    const [t, setT] = useState(new Date())
    useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
    const hh = t.getHours().toString().padStart(2,'0')
    const mm = t.getMinutes().toString().padStart(2,'0')
    const ss = t.getSeconds().toString().padStart(2,'0')
    const date = t.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })
    return (
      <div className="sidebar-footer">
        <div className="sidebar-clock">
          {hh}
          <span style={{ opacity: t.getSeconds() % 2 === 0 ? 1 : .2, transition: 'opacity .1s' }}>:</span>
          {mm}
          <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 4, fontWeight: 400 }}>{ss}</span>
        </div>
        <div className="sidebar-date">SYS · {date.toUpperCase()}</div>
      </div>
    )
  }

  function StatusChip({ status, stats }: { status: BotStatus | null; stats: BotStats | null }) {
    if (!isConfigured()) return (
      <div className="sidebar-status loading">
        <div className="live-dot" />
        <span>API SIN CONFIG</span>
      </div>
    )
    if (!status) return (
      <div className="sidebar-status loading">
        <div className="live-dot" />
        <span>CONECTANDO…</span>
      </div>
    )
    return (
      <div className={`sidebar-status ${status.connected ? 'online' : 'offline'}`}>
        <div className="live-dot" />
        <span>{status.connected ? 'HUNTER: ONLINE' : 'DESCONECTADO'}</span>
        {stats && status.connected && (
          <span style={{ marginLeft: 'auto', fontSize: 9, opacity: .6, fontFamily: "'Orbitron',sans-serif" }}>
            S{stats.groups ?? 0}
          </span>
        )}
      </div>
    )
  }

  export default function Layout() {
    const [status, setStatus] = useState<BotStatus | null>(null)
    const [stats,  setStats]  = useState<BotStats  | null>(null)
    const [open,   setOpen]   = useState(false)
    const location = useLocation()

    useEffect(() => {
      if (!isConfigured()) return
      const tick = async () => {
        try { setStatus(await getStatus()) } catch {}
        try { setStats(await getStats())   } catch {}
      }
      tick()
      const id = setInterval(tick, 12000)
      return () => clearInterval(id)
    }, [])

    const pageLabel = Object.entries(PAGE_LABELS)
      .sort((a,b) => b[0].length - a[0].length)
      .find(([k]) => k === '/' ? location.pathname === '/' : location.pathname.startsWith(k))?.[1] ?? ''

    const sidebar = (
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-title">
            <div className="logo-diamond" />
            BOT SYSTEM
          </div>
          <div className="sidebar-logo-sub">◈ BOTANIME · v2.0 · AWAKENED</div>
        </div>

        {/* Hunter Status */}
        <StatusChip status={status} stats={stats} />

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <item.icon size={14} strokeWidth={1.8} />
              <span style={{ flex: 1 }}>{item.label}</span>
              <span className="nav-num">{item.num}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mini stats */}
        {stats && (
          <div className="sidebar-stats">
            <div className="sidebar-stats-grid">
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-val">{stats.users ?? 0}</div>
                <div className="sidebar-stat-label">PWR</div>
              </div>
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-val">{stats.groups ?? 0}</div>
                <div className="sidebar-stat-label">GUILD</div>
              </div>
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-val" style={{ color: stats.connected ? 'var(--green2)' : 'var(--red2)' }}>
                  {stats.connected ? 'ON' : 'OFF'}
                </div>
                <div className="sidebar-stat-label">NET</div>
              </div>
            </div>
          </div>
        )}

        <Clock />
      </aside>
    )

    return (
      <div className="shell">
        {sidebar}
        {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

        <div className="main-content" style={{ marginLeft: 0 }}>
          {/* Topbar */}
          <header className="topbar">
            <button className="sidebar-toggle" onClick={() => setOpen(o => !o)}>
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className="sidebar-logo-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Bot size={14} />
            </div>
            <div className="topbar-title">
              <span className="topbar-page-label" style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, letterSpacing: '.14em' }}>
                {pageLabel}
              </span>
            </div>
            {status?.connected && (
              <div className="topbar-badge">◈ SYSTEM ACTIVE</div>
            )}
          </header>

          <div className="page-content animate-fade-up">
            <Outlet />
          </div>
        </div>
      </div>
    )
  }
  