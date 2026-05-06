import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, MessageSquare, Settings,
  Shield, Activity, Wifi, Terminal, Menu, X, Bell,
  AlertTriangle, RefreshCw, Zap, UserX, VolumeX,
} from 'lucide-react'
import {
  getStatus, getStats, getActivityHistory, isConfigured,
  type BotStatus, type BotStats, type ActivityEvent,
} from '../api'

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

const EV_NOTIF: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  ban:     { icon: UserX,         color: '#EF4444', label: 'Ban' },
  kick:    { icon: UserX,         color: '#F87171', label: 'Expulsado' },
  warn:    { icon: AlertTriangle, color: '#F59E0B', label: 'Advertencia' },
  mute:    { icon: VolumeX,       color: '#3B82F6', label: 'Muteado' },
  command: { icon: Zap,           color: '#8B5CF6', label: 'Comando' },
  join:    { icon: Users,         color: '#10B981', label: 'Unión' },
  error:   { icon: AlertTriangle, color: '#EF4444', label: 'Error' },
}
const notifMeta = (t: string) => EV_NOTIF[t] ?? { icon: Activity, color: '#A1A1AA', label: t }

function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

function fmtTs(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'ahora'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm'
  return Math.floor(diff / 3600000) + 'h'
}

/* ── Sakura Logo (static, no spin) ── */
function SakuraLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <ellipse
          key={i}
          cx="12" cy="5.5" rx="2.8" ry="5"
          fill={i % 2 === 0 ? '#F9A8D4' : '#FBCFE8'}
          transform={`rotate(${deg} 12 12)`}
          opacity="0.90"
        />
      ))}
      <circle cx="12" cy="12" r="2.2" fill="#FBBF24" />
      <circle cx="12" cy="12" r="1.0" fill="#F59E0B" />
    </svg>
  )
}

export default function Layout() {
  const [status,      setStatus]     = useState<BotStatus | null>(null)
  const [stats,       setStats]      = useState<BotStats  | null>(null)
  const [events,      setEvents]     = useState<ActivityEvent[]>([])
  const [open,        setOpen]       = useState(false)
  const [showNotifs,  setShowNotifs] = useState(false)
  const [unreadCount, setUnread]     = useState(0)
  const [lastSeenTs,  setLastSeen]   = useState(Date.now())
  const [retrying,    setRetrying]   = useState(false)
  const notifRef  = useRef<HTMLDivElement>(null)
  const location  = useLocation()
  const isMobile  = useMobile()
  const configured = isConfigured()
  const connected  = status?.connected ?? null
  const amber = '#F59E0B'

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (isMobile) document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, isMobile])

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifs(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const pollData = async () => {
    if (!configured) return
    try { setStatus(await getStatus()) } catch {}
    try { setStats(await getStats())   } catch {}
    try {
      const ev = await getActivityHistory()
      setEvents(ev)
      setUnread(ev.filter(e => e.ts > lastSeenTs).length)
    } catch {}
  }

  const retry = async () => { setRetrying(true); await pollData(); setRetrying(false) }

  useEffect(() => {
    if (!configured) return
    pollData()
    const id = setInterval(pollData, 15000)
    return () => clearInterval(id)
  }, [lastSeenTs])

  const openNotifs = () => {
    setShowNotifs(s => !s)
    setLastSeen(Date.now())
    setUnread(0)
  }

  const pageLabel =
    PAGE_LABELS[location.pathname] ??
    Object.entries(PAGE_LABELS).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1] ??
    'Dashboard'

  const border       = '1px solid rgba(255,255,255,0.07)'
  const recentEvents = events.slice(0, 8)

  return (
    <div className="shell">

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && isMobile && (
          <motion.div key="overlay" className="sidebar-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }} onClick={() => setOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <aside className={open ? 'sidebar open' : 'sidebar'} style={{ zIndex: 50 }}>

        {/* Logo area */}
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          padding: '0 16px', borderBottom: border, flexShrink: 0, gap: 10,
        }}>
          {isMobile && (
            <button onClick={() => setOpen(false)} style={{
              position: 'absolute', top: 14, right: 14, width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)', border, borderRadius: 7,
              color: 'rgba(255,255,255,.50)',
            }}>
              <X size={14} />
            </button>
          )}

          {/* Static sakura logo */}
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(236,72,153,.20), rgba(245,158,11,.16))',
            border: '1px solid rgba(249,168,212,.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 12px rgba(236,72,153,.15)',
          }}>
            <SakuraLogo />
          </div>

          <div>
            <div style={{
              fontFamily: "'Noto Serif JP', serif", fontWeight: 700, fontSize: 13,
              letterSpacing: '.01em', color: '#F4F4F5',
            }}>
              BotAnime
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400, marginTop: 1 }}>
              WhatsApp · Dashboard
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1, overflowY: 'auto', padding: '12px 8px',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.exact} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{ position: 'relative' }}>
                  {isActive && (
                    <motion.div layoutId="activeBg"
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(245,158,11,0.08)',
                        borderRadius: 8,
                        borderLeft: `2px solid ${amber}`,
                      }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8,
                    color: isActive ? amber : '#6B7280',
                    position: 'relative', zIndex: 1,
                    transition: 'color .18s',
                  }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.color = '#9CA3AF' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.color = '#6B7280' }}
                  >
                    <item.icon size={15} strokeWidth={isActive ? 2.2 : 1.8} />
                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                  </div>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Connection status pill */}
        <div style={{ padding: '10px 12px', borderTop: border, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: 'rgba(255,255,255,0.025)', border, borderRadius: 8,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: !configured ? '#52525B' : connected ? '#10B981' : '#EF4444',
              animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#E5E7EB' }}>
                {!configured ? 'Sin configurar' : connected ? 'En línea' : 'Desconectado'}
              </p>
              {stats && (
                <p style={{ fontSize: 10, color: '#6B7280', marginTop: 1 }}>
                  {stats.users ?? 0} users · {stats.groups ?? 0} grupos
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="sidebar-toggle" onClick={() => setOpen(o => !o)} aria-label="Menú">
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
            <motion.h1
              key={pageLabel}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                fontSize: 16, fontWeight: 600, color: '#F4F4F5',
                fontFamily: "'Noto Serif JP', serif",
              }}
            >
              {pageLabel}
            </motion.h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Status pill */}
            {connected != null && (
              <div className="hide-mobile" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px',
                borderRadius: 20,
                border: `1px solid ${connected ? 'rgba(16,185,129,.25)' : 'rgba(236,72,153,.25)'}`,
                background: connected ? 'rgba(16,185,129,.06)' : 'rgba(236,72,153,.06)',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: connected ? '#10B981' : '#EC4899',
                  animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: connected ? '#10B981' : '#F9A8D4' }}>
                  {connected ? 'Online' : 'Offline'}
                </span>
              </div>
            )}

            {/* Notification bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={openNotifs}
                style={{
                  position: 'relative', width: 34, height: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: showNotifs ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                  border, borderRadius: 8,
                  color: showNotifs ? '#F4F4F5' : '#9CA3AF',
                  cursor: 'pointer', transition: 'all .18s',
                }}>
                <Bell size={15} />
                {unreadCount > 0 && <span className="notif-badge" />}
              </button>

              {showNotifs && (
                <div className="notif-drawer">
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Bell size={12} color="var(--text2)" />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Actividad reciente</span>
                    </div>
                    <button onClick={() => setShowNotifs(false)} style={{ color: 'var(--text3)', padding: 2 }}>
                      <X size={13} />
                    </button>
                  </div>

                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {recentEvents.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                        Sin eventos recientes
                      </div>
                    ) : recentEvents.map((ev, i) => {
                      const m = notifMeta(ev.type)
                      const Icon = m.icon
                      const d = ev.data as Record<string, string>
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 16px', borderBottom: '1px solid var(--border)',
                        }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--card-hover)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '' }}
                        >
                          <div style={{
                            width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                            background: m.color + '12', border: `1px solid ${m.color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Icon size={11} color={m.color} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <span style={{
                                fontSize: 9, fontWeight: 700, color: m.color,
                                background: m.color + '12', border: `1px solid ${m.color}20`,
                                padding: '1px 5px', borderRadius: 3,
                              }}>{m.label}</span>
                              {d?.sender && (
                                <span style={{
                                  fontSize: 12, fontWeight: 500, color: 'var(--text)',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{d.sender}</span>
                              )}
                            </div>
                            {d?.group && (
                              <div style={{
                                fontSize: 10, color: 'var(--text3)', marginTop: 1,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>{d.group}</div>
                            )}
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink: 0 }}>{fmtTs(ev.ts)}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ padding: '9px 16px', borderTop: '1px solid var(--border)' }}>
                    <NavLink to="/activity" onClick={() => setShowNotifs(false)}
                      style={{ fontSize: 12, color: amber, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                      Ver todo el log <Activity size={11} />
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Offline banner */}
        {configured && connected === false && (
          <div className="offline-banner">
            <div className="offline-banner-dot" />
            <span className="offline-banner-text">
              Bot desconectado — verifica tu servidor en Railway o Render
            </span>
            <button className="btn btn-red btn-xs" onClick={retry} disabled={retrying} style={{ marginLeft: 'auto' }}>
              <RefreshCw size={10} style={{ animation: retrying ? 'spin 1s linear infinite' : 'none' }} />
              Reintentar
            </button>
          </div>
        )}

        {/* Page */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.20, ease: [0.16, 1, 0.3, 1] }}
          className="page-content"
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  )
}
