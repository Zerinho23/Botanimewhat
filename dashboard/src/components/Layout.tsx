import { useState, useEffect } from 'react'
  import { NavLink, Outlet, useLocation } from 'react-router-dom'
  import { motion, AnimatePresence } from 'framer-motion'
  import {
    LayoutDashboard, Users, MessageSquare, Settings,
    Shield, Activity, Wifi, Terminal, Menu, X, Search, Bell,
  } from 'lucide-react'
  import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

  /* ── Navigation items ── */
  const NAV = [
    { to: '/',           icon: LayoutDashboard, label: 'Inicio',     exact: true },
    { to: '/users',      icon: Users,           label: 'Usuarios'               },
    { to: '/groups',     icon: MessageSquare,   label: 'Grupos'                 },
    { to: '/moderation', icon: Shield,          label: 'Moderación'             },
    { to: '/activity',   icon: Activity,        label: 'Actividad'              },
    { to: '/config',     icon: Settings,        label: 'Config'                 },
    { to: '/connect',    icon: Wifi,            label: 'Conexión'               },
    { to: '/commands',   icon: Terminal,        label: 'Comandos'               },
  ]

  const PAGE_LABELS: Record<string, string> = {
    '/': 'Inicio', '/users': 'Usuarios', '/groups': 'Grupos',
    '/moderation': 'Moderación', '/activity': 'Actividad',
    '/config': 'Config', '/connect': 'Conexión', '/commands': 'Comandos',
  }

  /* ── Mobile hook ── */
  function useMobile() {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    useEffect(() => {
      const fn = () => setIsMobile(window.innerWidth <= 768)
      window.addEventListener('resize', fn)
      return () => window.removeEventListener('resize', fn)
    }, [])
    return isMobile
  }

  /* ══════════════════════════════════════════════════════
     Layout
     ══════════════════════════════════════════════════════ */
  export default function Layout() {
    const [status, setStatus] = useState<BotStatus | null>(null)
    const [stats,  setStats]  = useState<BotStats  | null>(null)
    const [open,   setOpen]   = useState(false)
    const location  = useLocation()
    const isMobile  = useMobile()
    const connected = status?.connected

    /* Close sidebar on navigation */
    useEffect(() => { setOpen(false) }, [location.pathname])

    /* Lock body scroll when mobile sidebar is open */
    useEffect(() => {
      if (isMobile) document.body.style.overflow = open ? 'hidden' : ''
      return () => { document.body.style.overflow = '' }
    }, [open, isMobile])

    /* Poll API */
    useEffect(() => {
      if (!isConfigured()) return
      const load = async () => {
        try { setStatus(await getStatus()) } catch {}
        try { setStats(await getStats())  } catch {}
      }
      load()
      const id = setInterval(load, 15000)
      return () => clearInterval(id)
    }, [])

    const pageLabel = PAGE_LABELS[location.pathname]
      ?? Object.entries(PAGE_LABELS).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1]
      ?? 'Dashboard'

    /* ── Styles ── */
    const border  = '1px solid rgba(255,255,255,0.08)'
    const amber   = '#F59E0B'

    return (
      <div className="shell">

        {/* ── Mobile overlay ── */}
        <AnimatePresence>
          {open && isMobile && (
            <motion.div
              key="overlay"
              className="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════
            SIDEBAR
            ════════════════════════════════════════════ */}
        <aside className={open ? 'sidebar open' : 'sidebar'}>

          {/* Logo */}
          <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: border, flexShrink: 0, gap: 12 }}>
            {isMobile && (
              <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 16, right: 16, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border, borderRadius: 8, color: 'rgba(255,255,255,0.50)' }}>
                <X size={14} />
              </button>
            )}
            <div style={{ width: 32, height: 32, borderRadius: 6, background: amber, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111118', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
              B
            </div>
            <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: '.01em', color: '#F4F4F5' }}>
              BotAnime
            </span>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '24px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.exact} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div style={{ position: 'relative' }}>
                    {/* Active left border */}
                    {isActive && (
                      <motion.div
                        layoutId="activeBar"
                        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: amber, borderRadius: '0 2px 2px 0' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    {/* Active background */}
                    {isActive && (
                      <motion.div
                        layoutId="activeBg"
                        style={{ position: 'absolute', inset: 0, background: 'rgba(245,158,11,0.08)', borderRadius: 6 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      borderRadius: 6,
                      color: isActive ? amber : '#A1A1AA',
                      cursor: 'pointer',
                      position: 'relative', zIndex: 1,
                      transition: 'color .18s',
                    }}
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                    >
                      <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
                    </div>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom — connection status */}
          <div style={{ padding: '16px', borderTop: border, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border, borderRadius: 8 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {connected && (
                  <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.35)', animation: 'pulseRing 2s ease-out infinite' }} />
                )}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: !isConfigured() ? '#52525B' : connected ? '#10B981' : '#EF4444',
                  animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
                }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#F4F4F5' }}>
                  {!isConfigured() ? 'Sin configurar' : connected ? 'En línea' : 'Desconectado'}
                </p>
                {stats && (
                  <p style={{ fontSize: 11, color: '#A1A1AA', marginTop: 1 }}>
                    {stats.users ?? 0} usuarios · {stats.groups ?? 0} grupos
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* ════════════════════════════════════════════
            MAIN CONTENT
            ════════════════════════════════════════════ */}
        <div className="main-content">

          {/* Topbar */}
          <header className="topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="sidebar-toggle" onClick={() => setOpen(o => !o)} aria-label="Menú">
                {open ? <X size={16} /> : <Menu size={16} />}
              </button>
              <motion.h1
                key={pageLabel}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ fontSize: 18, fontWeight: 600, color: '#F4F4F5' }}
              >
                {pageLabel}
              </motion.h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Search */}
              <div className="hide-mobile" style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#52525B' }} size={15} />
                <input
                  placeholder="Buscar..."
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '7px 16px 7px 36px', fontSize: 13, color: '#F4F4F5', outline: 'none', width: 200 }}
                />
              </div>

              {/* Bell */}
              <button style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#A1A1AA', cursor: 'pointer' }}>
                <Bell size={17} />
                {connected && <span style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, background: amber, borderRadius: '50%', border: '1.5px solid #111118' }} />}
              </button>

              {/* Status pill */}
              {connected != null && (
                <div className="hide-mobile" style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                  border: `1px solid ${connected ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.25)'}`,
                  borderRadius: 20,
                  background: connected ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none' }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: connected ? '#10B981' : '#F87171' }}>
                    {connected ? 'Online' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </header>

          {/* Page content */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="page-content"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    )
  }
  