import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, MessageSquare, Settings,
  Shield, Activity, Wifi, Menu, X, Terminal, Zap
} from 'lucide-react'
import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Inicio',     sub: 'Status Window', exact: true },
  { to: '/users',      icon: Users,           label: 'Usuarios',   sub: 'Hunter List'              },
  { to: '/groups',     icon: MessageSquare,   label: 'Grupos',     sub: 'Guild Map'                },
  { to: '/moderation', icon: Shield,          label: 'Moderación', sub: 'Penalty Board'            },
  { to: '/activity',   icon: Activity,        label: 'Actividad',  sub: 'Event Log'                },
  { to: '/config',     icon: Settings,        label: 'Config',     sub: 'System Config'            },
  { to: '/connect',    icon: Wifi,            label: 'Conexión',   sub: 'Connection'               },
  { to: '/commands',   icon: Terminal,        label: 'Comandos',   sub: 'Command Registry'         },
]

const PAGE_LABELS: Record<string, string> = {
  '/': 'Status Window', '/users': 'Hunter List', '/groups': 'Guild Map',
  '/moderation': 'Penalty Board', '/activity': 'Event Log',
  '/config': 'System Config', '/connect': 'Connection', '/commands': 'Commands',
}

function SysClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const hh = t.getHours().toString().padStart(2, '0')
  const mm = t.getMinutes().toString().padStart(2, '0')
  const ss = t.getSeconds().toString().padStart(2, '0')
  const blink = t.getSeconds() % 2 === 0
  return (
    <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(220,38,38,0.12)', background: 'rgba(220,38,38,0.02)', flexShrink: 0 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.20em', color: 'rgba(220,38,38,0.32)', marginBottom: 6, textTransform: 'uppercase' }}>/// SYS · CLOCK</div>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 24, fontWeight: 900, color: '#F0EFFF', letterSpacing: '.04em', lineHeight: 1, textShadow: '0 0 24px rgba(220,38,38,0.28)' }}>
        {hh}
        <motion.span
          animate={{ opacity: blink ? 1 : 0.06 }}
          transition={{ duration: 0.1 }}
          style={{ color: '#DC2626' }}
        >:</motion.span>
        {mm}
        <span style={{ fontSize: 14, color: 'rgba(220,38,38,0.38)', marginLeft: 7, fontWeight: 600 }}>{ss}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.14em', color: 'rgba(220,38,38,0.20)', marginTop: 6 }}>
        {t.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
      </div>
    </div>
  )
}

/* Animated hex logo */
function HexLogo() {
  return (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* outer ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        style={{
          position: 'absolute', inset: 0,
          background: 'conic-gradient(from 0deg, transparent, rgba(220,38,38,0.6), rgba(249,115,22,0.4), transparent)',
          clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)',
        }}
      />
      {/* inner fill */}
      <div style={{
        position: 'absolute', inset: 3,
        background: 'linear-gradient(135deg, rgba(220,38,38,0.35), rgba(249,115,22,0.15))',
        clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)',
        boxShadow: '0 0 28px rgba(220,38,38,0.50), 0 0 56px rgba(220,38,38,0.18)',
      }} />
      <Zap size={18} color="#DC2626" strokeWidth={1.6} style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 7px rgba(220,38,38,0.95))' }} />
    </div>
  )
}

export default function Layout() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [stats,  setStats]  = useState<BotStats | null>(null)
  const [open,   setOpen]   = useState(false)
  const location = useLocation()

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

  const sidebar = (
    <aside className={open ? 'sidebar open' : 'sidebar'}>

      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 2,
        background: 'linear-gradient(90deg, transparent, #DC2626 25%, #F97316 50%, #DC2626 75%, transparent)',
        boxShadow: '0 0 18px rgba(220,38,38,0.80)',
      }} />

      {/* Sidebar ambient glow orb */}
      <div style={{
        position: 'absolute', top: -60, left: -60, width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(220,38,38,0.08), transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ── Logo ── */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(220,38,38,0.10)', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 8,
          letterSpacing: '.22em', color: 'rgba(220,38,38,0.32)',
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.22))' }} />
          [ SYSTEM ]
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(220,38,38,0.22), transparent)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <HexLogo />
          <div>
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 15, fontWeight: 900, letterSpacing: '.14em', color: '#F0EFFF', textShadow: '0 0 28px rgba(220,38,38,0.45)' }}>BOTANIME</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.22em', color: 'rgba(249,115,22,0.50)', marginTop: 4 }}>SYS://BOT.CORE</div>
          </div>
        </div>

        {/* Connection pill */}
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 4,
          border: `1px solid ${!isConfigured() ? 'rgba(220,38,38,0.14)' : connected ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.26)'}`,
          background: !isConfigured() ? 'rgba(220,38,38,0.04)' : connected ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)',
          boxShadow: connected ? '0 0 20px rgba(16,185,129,0.08)' : 'none',
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {connected && <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.40)', animation: 'pulseRing 2s ease-out infinite' }} />}
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: !isConfigured() ? 'rgba(220,38,38,0.35)' : connected ? '#10B981' : '#EF4444',
              boxShadow: connected ? '0 0 12px rgba(16,185,129,0.80)' : 'none',
              animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
            }} />
          </div>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: !isConfigured() ? 'rgba(220,38,38,0.45)' : connected ? '#10B981' : '#EF4444' }}>
            {!isConfigured() ? 'Sin configurar' : connected ? 'Hunter · Online' : 'Desconectado'}
          </span>
          {stats?.groups != null && connected && (
            <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron',monospace", fontSize: 8, color: 'rgba(16,185,129,0.40)', fontWeight: 700 }}>G{stats.groups}</span>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ padding: '6px 20px 10px', fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.22em', color: 'rgba(220,38,38,0.26)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>/// NAV</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(220,38,38,0.14), transparent)' }} />
        </div>

        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.exact} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 16px 9px 18px',
              textDecoration: 'none', position: 'relative',
              transition: 'background .18s',
              borderLeft: `2px solid ${isActive ? '#DC2626' : 'transparent'}`,
              background: isActive ? 'linear-gradient(90deg, rgba(220,38,38,0.13) 0%, rgba(220,38,38,0.02) 100%)' : 'transparent',
              marginBottom: 1,
            })}
          >
            {({ isActive }) => (
              <>
                {/* Glow behind active */}
                {isActive && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'radial-gradient(ellipse at left, rgba(220,38,38,0.14), transparent 80%)', pointerEvents: 'none' }} />
                )}

                {/* Icon box */}
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  style={{
                    width: 32, height: 32, borderRadius: 4, flexShrink: 0,
                    background: isActive ? 'rgba(220,38,38,0.20)' : 'rgba(220,38,38,0.05)',
                    border: `1px solid ${isActive ? 'rgba(220,38,38,0.50)' : 'rgba(220,38,38,0.10)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 0 18px rgba(220,38,38,0.30), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
                    transition: 'all .18s',
                  }}
                >
                  <item.icon size={13} color={isActive ? '#EF4444' : 'rgba(220,38,38,0.35)'} strokeWidth={isActive ? 2.2 : 1.8} />
                </motion.div>

                {/* Label */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '.06em', color: isActive ? '#F0EFFF' : 'rgba(122,122,154,0.70)', transition: 'color .18s' }}>
                    {item.label}
                  </div>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.10em', color: 'rgba(220,38,38,0.40)', overflow: 'hidden' }}
                      >
                        {item.sub}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active indicator dot */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: '#DC2626', boxShadow: '0 0 12px rgba(220,38,38,1)', animation: 'livePulse 2.5s ease-in-out infinite' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Mini stats ── */}
      {stats && (
        <div style={{ margin: '0 14px 12px', padding: '14px 14px', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 4, background: 'rgba(220,38,38,0.025)', position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10, borderTop: '1px solid rgba(220,38,38,0.55)', borderLeft: '1px solid rgba(220,38,38,0.55)' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderBottom: '1px solid rgba(220,38,38,0.55)', borderRight: '1px solid rgba(220,38,38,0.55)' }} />
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.18em', color: 'rgba(220,38,38,0.28)', marginBottom: 12 }}>[ SYS · STATUS ]</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            {[
              { v: stats.users ?? 0,  l: 'HUNTERS', c: '#EF4444' },
              { v: stats.groups ?? 0, l: 'GUILDS',  c: '#A855F7' },
              { v: connected ? 'ON' : 'OFF', l: 'NET', c: connected ? '#10B981' : '#EF4444' },
            ].map(s => (
              <div key={s.l}>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{ fontFamily: "'Orbitron',monospace", fontSize: 16, fontWeight: 900, color: s.c, lineHeight: 1, textShadow: `0 0 14px ${s.c}90` }}
                >
                  {s.v}
                </motion.div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.12em', color: 'rgba(220,38,38,0.26)', marginTop: 5 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SysClock />
    </aside>
  )

  return (
    <div className="shell">
      {/* ── Global ambient orbs (behind everything) ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <motion.div
          animate={{ x: [0, 30, -10, 0], y: [0, -20, 15, 0], scale: [1, 1.05, 0.97, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '10%', left: '35%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(220,38,38,0.055), transparent 70%)', borderRadius: '50%' }}
        />
        <motion.div
          animate={{ x: [0, -25, 15, 0], y: [0, 18, -12, 0], scale: [1, 0.95, 1.04, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{ position: 'absolute', bottom: '15%', right: '20%', width: 380, height: 380, background: 'radial-gradient(circle, rgba(249,115,22,0.040), transparent 70%)', borderRadius: '50%' }}
        />
        <motion.div
          animate={{ x: [0, 18, -22, 0], y: [0, -10, 20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          style={{ position: 'absolute', top: '50%', left: '60%', width: 280, height: 280, background: 'radial-gradient(circle, rgba(168,85,247,0.030), transparent 70%)', borderRadius: '50%' }}
        />
      </div>

      {sidebar}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <div className="main-content" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="sidebar-toggle" onClick={() => setOpen(o => !o)}>
            {open ? <X size={15} /> : <Menu size={15} />}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.16em', color: 'rgba(220,38,38,0.42)' }}>BOTANIME</span>
            <span style={{ color: 'rgba(220,38,38,0.25)', fontSize: 14, lineHeight: 1 }}>/</span>
            <motion.span
              key={pageLabel}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, fontWeight: 800, letterSpacing: '.13em', color: '#F0EFFF', textShadow: '0 0 20px rgba(220,38,38,0.30)' }}
            >
              {pageLabel}
            </motion.span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: '1px solid rgba(220,38,38,0.18)', borderRadius: 4, background: 'rgba(220,38,38,0.05)' }}>
                <Users size={9} color="rgba(220,38,38,0.65)" />
                <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700, color: 'rgba(220,38,38,0.80)', letterSpacing: '.08em' }}>{stats.users ?? 0} HUNTERS</span>
              </div>
            )}
            {connected != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: `1px solid ${connected ? 'rgba(16,185,129,0.30)' : 'rgba(239,68,68,0.24)'}`, borderRadius: 4, background: connected ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)', boxShadow: connected ? '0 0 16px rgba(16,185,129,0.08)' : 'none' }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                  {connected && <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.35)', animation: 'pulseRing 2s ease-out infinite' }} />}
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', boxShadow: connected ? '0 0 10px rgba(16,185,129,0.80)' : 'none', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none' }} />
                </div>
                <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700, color: connected ? '#10B981' : '#EF4444', letterSpacing: '.10em' }}>{connected ? 'Online' : 'Offline'}</span>
              </div>
            )}
            {connected && (
              <div style={{ padding: '5px 12px', border: '1px solid rgba(251,191,36,0.32)', borderRadius: 4, background: 'rgba(251,191,36,0.07)', boxShadow: '0 0 16px rgba(251,191,36,0.07)' }}>
                <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 900, letterSpacing: '.14em', color: '#FBBF24', animation: 'sRankPulse 2.5s ease-in-out infinite' }}>◈ S-RANK</span>
              </div>
            )}
          </div>
        </header>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
          className="page-content"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
