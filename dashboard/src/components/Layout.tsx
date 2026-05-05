import { useState, useEffect } from 'react'
  import { NavLink, Outlet, useLocation } from 'react-router-dom'
  import { motion, AnimatePresence } from 'framer-motion'
  import {
    LayoutDashboard, Users, MessageSquare, Settings,
    Shield, Activity, Wifi, Menu, X, Terminal, Bot
  } from 'lucide-react'
  import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

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

  function SysClock() {
    const [t, setT] = useState(new Date())
    useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
    const hh = t.getHours().toString().padStart(2, '0')
    const mm = t.getMinutes().toString().padStart(2, '0')
    const ss = t.getSeconds().toString().padStart(2, '0')
    const blink = t.getSeconds() % 2 === 0
    return (
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.18em', color: 'rgba(139,92,246,0.40)', marginBottom: 6 }}>SYSTEM CLOCK</div>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 24, fontWeight: 900, color: '#F0EFFF', letterSpacing: '.04em', lineHeight: 1 }}>
          {hh}
          <motion.span animate={{ opacity: blink ? 1 : 0.08 }} transition={{ duration: 0.1 }} style={{ color: '#8B5CF6' }}>:</motion.span>
          {mm}
          <span style={{ fontSize: 14, color: 'rgba(139,92,246,0.40)', marginLeft: 7, fontWeight: 600 }}>{ss}</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.14em', color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>
          {t.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
        </div>
      </div>
    )
  }

  function useMobile() {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
    useEffect(() => {
      const fn = () => setIsMobile(window.innerWidth <= 768)
      window.addEventListener('resize', fn)
      return () => window.removeEventListener('resize', fn)
    }, [])
    return isMobile
  }

  export default function Layout() {
    const [status, setStatus] = useState<BotStatus | null>(null)
    const [stats,  setStats]  = useState<BotStats | null>(null)
    const [open,   setOpen]   = useState(false)
    const location = useLocation()
    const isMobile = useMobile()

    useEffect(() => { setOpen(false) }, [location.pathname])

    useEffect(() => {
      if (isMobile) document.body.style.overflow = open ? 'hidden' : ''
      return () => { document.body.style.overflow = '' }
    }, [open, isMobile])

    useEffect(() => {
      if (!isConfigured()) return
      const load = async () => {
        try { setStatus(await getStatus()) } catch {}
        try { setStats(await getStats()) } catch {}
      }
      load(); const id = setInterval(load, 15000); return () => clearInterval(id)
    }, [])

    const pageLabel = PAGE_LABELS[location.pathname]
      ?? Object.entries(PAGE_LABELS).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1]
      ?? 'System'
    const connected = status?.connected
    const gb = 'rgba(255,255,255,0.08)'
    const glassBg = 'rgba(255,255,255,0.04)'

    return (
      <div className="shell">
        {/* Ambient orbs */}
        {!isMobile && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            <motion.div
              animate={{ x: [0, 30, -10, 0], y: [0, -20, 15, 0], scale: [1, 1.05, 0.97, 1] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
              style={{ position: 'absolute', top: '8%', left: '30%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(139,92,246,0.09), transparent 70%)', borderRadius: '50%' }}
            />
            <motion.div
              animate={{ x: [0, -25, 15, 0], y: [0, 18, -12, 0], scale: [1, 0.95, 1.04, 1] }}
              transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
              style={{ position: 'absolute', bottom: '8%', right: '12%', width: 480, height: 480, background: 'radial-gradient(circle, rgba(236,72,153,0.07), transparent 70%)', borderRadius: '50%' }}
            />
            <motion.div
              animate={{ x: [0, 18, -22, 0], y: [0, -10, 20, 0] }}
              transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
              style={{ position: 'absolute', top: '50%', left: '60%', width: 360, height: 360, background: 'radial-gradient(circle, rgba(6,182,212,0.06), transparent 70%)', borderRadius: '50%' }}
            />
          </div>
        )}

        {/* Mobile overlay */}
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

        {/* Sidebar */}
        <aside className={open ? 'sidebar open' : 'sidebar'}>
          {/* Top gradient bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #8B5CF6, #EC4899 50%, #06B6D4)', opacity: 0.85, zIndex: 2 }} />

          {/* Logo */}
          <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${gb}`, flexShrink: 0, position: 'relative', zIndex: 1 }}>
            {isMobile && (
              <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 18, right: 16, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: glassBg, border: `1px solid ${gb}`, borderRadius: 10, color: 'rgba(255,255,255,0.50)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #7C3AED, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(139,92,246,0.45), 0 0 48px rgba(236,72,153,0.18)', flexShrink: 0 }}
              >
                <Bot size={22} color="white" strokeWidth={2} />
              </motion.div>
              <div>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 15, fontWeight: 900, letterSpacing: '.12em', color: '#F0EFFF' }}>BOTANIME</div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.18em', color: 'rgba(139,92,246,0.55)', marginTop: 4 }}>BOT CORE</div>
              </div>
            </div>

            {/* Connection status */}
            <div style={{
              marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              borderRadius: 20,
              border: `1px solid ${!isConfigured() ? gb : connected ? 'rgba(16,185,129,0.30)' : 'rgba(236,72,153,0.26)'}`,
              background: !isConfigured() ? glassBg : connected ? 'rgba(16,185,129,0.08)' : 'rgba(236,72,153,0.07)',
            }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {connected && <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.40)', animation: 'pulseRing 2s ease-out infinite' }} />}
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: !isConfigured() ? 'rgba(255,255,255,0.20)' : connected ? '#10B981' : '#EC4899', boxShadow: connected ? '0 0 12px rgba(16,185,129,0.80)' : 'none', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none' }} />
              </div>
              <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '.05em', color: !isConfigured() ? 'rgba(255,255,255,0.30)' : connected ? '#10B981' : '#F472B6' }}>
                {!isConfigured() ? 'Sin configurar' : connected ? 'En línea' : 'Desconectado'}
              </span>
              {stats?.groups != null && connected && (
                <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron',monospace", fontSize: 8, color: 'rgba(16,185,129,0.45)', fontWeight: 700 }}>G{stats.groups}</span>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '12px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.exact} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div style={{ position: 'relative' }}>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        style={{ position: 'absolute', inset: 0, borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)' }}
                        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
                      />
                    )}
                    <motion.div
                      whileHover={{ backgroundColor: isActive ? undefined : 'rgba(255,255,255,0.04)' }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, color: isActive ? '#F0EFFF' : 'rgba(255,255,255,0.42)', cursor: 'pointer', position: 'relative', zIndex: 1, minHeight: 46, transition: 'color .18s' }}
                    >
                      <item.icon size={17} color={isActive ? '#A78BFA' : 'rgba(255,255,255,0.35)'} strokeWidth={isActive ? 2.2 : 1.8} />
                      <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: '.04em' }}>
                        {item.label}
                      </span>
                    </motion.div>
                  </div>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Mini stats */}
          {stats && (
            <div style={{ margin: '0 12px 12px', padding: '14px', border: `1px solid ${gb}`, borderRadius: 14, background: glassBg }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.16em', color: 'rgba(139,92,246,0.40)', marginBottom: 12 }}>SISTEMA</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                {[
                  { v: stats.users ?? 0,  l: 'USERS',  c: '#A78BFA' },
                  { v: stats.groups ?? 0, l: 'GRUPOS',  c: '#F472B6' },
                  { v: connected ? 'ON' : 'OFF', l: 'NET', c: connected ? '#10B981' : '#F472B6' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 16, fontWeight: 900, color: s.c, lineHeight: 1 }}>{s.v}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.10em', color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SysClock />
        </aside>

        <div className="main-content" style={{ position: 'relative', zIndex: 1 }}>
          {/* Topbar */}
          <header className="topbar">
            <button className="sidebar-toggle" onClick={() => setOpen(o => !o)} aria-label="Abrir menú">
              <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.22 }}>
                {open ? <X size={15} /> : <Menu size={15} />}
              </motion.div>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <motion.span
                key={pageLabel}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                style={{ fontFamily: "'Orbitron',monospace", fontSize: 13, fontWeight: 800, letterSpacing: '.10em', color: '#F0EFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {pageLabel}
              </motion.span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {stats && (
                <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: `1px solid ${gb}`, borderRadius: 20, background: glassBg }}>
                  <Users size={10} color="rgba(167,139,250,0.70)" />
                  <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700, color: '#A78BFA', letterSpacing: '.08em' }}>{stats.users ?? 0}</span>
                </div>
              )}
              {connected != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: `1px solid ${connected ? 'rgba(16,185,129,0.28)' : 'rgba(236,72,153,0.22)'}`, borderRadius: 20, background: connected ? 'rgba(16,185,129,0.07)' : 'rgba(236,72,153,0.07)' }}>
                  <div style={{ position: 'relative', display: 'flex' }}>
                    {connected && <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.35)', animation: 'pulseRing 2s ease-out infinite' }} />}
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10B981' : '#EC4899', boxShadow: connected ? '0 0 10px rgba(16,185,129,0.80)' : 'none', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none' }} />
                  </div>
                  <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700, color: connected ? '#10B981' : '#F472B6', letterSpacing: '.10em' }}>{connected ? 'Online' : 'Off'}</span>
                </div>
              )}
              {connected && (
                <div className="hide-mobile" style={{ padding: '5px 12px', border: '1px solid rgba(245,158,11,0.30)', borderRadius: 20, background: 'rgba(245,158,11,0.07)' }}>
                  <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 900, letterSpacing: '.12em', color: '#FBBF24', animation: 'sRankPulse 2.5s ease-in-out infinite' }}>◈ S-RANK</span>
                </div>
              )}
            </div>
          </header>

          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="page-content"
          >
            <Outlet />
          </motion.div>
        </div>
      </div>
    )
  }
  