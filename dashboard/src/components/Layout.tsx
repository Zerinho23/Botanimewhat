import { useState, useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, MessageSquare, Settings,
  Shield, Activity, Wifi, Terminal, X, Bell,
  AlertTriangle, RefreshCw, Zap, UserX, VolumeX,
} from 'lucide-react'
import {
  getStatus, getStats, getActivityHistory, isConfigured,
  type BotStatus, type BotStats, type ActivityEvent,
} from '../api'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'Inicio',     exact: true,  color: '#F59E0B' },
  { to: '/users',      icon: Users,           label: 'Usuarios',                 color: '#3B82F6' },
  { to: '/groups',     icon: MessageSquare,   label: 'Grupos',                   color: '#10B981' },
  { to: '/moderation', icon: Shield,          label: 'Moderación',               color: '#EF4444' },
  { to: '/activity',   icon: Activity,        label: 'Actividad',                color: '#8B5CF6' },
  { to: '/config',     icon: Settings,        label: 'Config',                   color: '#06B6D4' },
  { to: '/connect',    icon: Wifi,            label: 'Conexión',                 color: '#F97316' },
  { to: '/commands',   icon: Terminal,        label: 'Comandos',                 color: '#EC4899' },
]

const PAGE_LABELS: Record<string, string> = {
  '/': 'Inicio', '/users': 'Usuarios', '/groups': 'Grupos',
  '/moderation': 'Moderación', '/activity': 'Actividad',
  '/config': 'Config', '/connect': 'Conexión', '/commands': 'Comandos',
}

const EV_NOTIF: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  ban:     { icon: UserX,         color: '#EF4444', label: 'Ban'         },
  kick:    { icon: UserX,         color: '#F87171', label: 'Expulsado'   },
  warn:    { icon: AlertTriangle, color: '#F59E0B', label: 'Advertencia' },
  mute:    { icon: VolumeX,       color: '#3B82F6', label: 'Muteado'     },
  command: { icon: Zap,           color: '#8B5CF6', label: 'Comando'     },
  join:    { icon: Users,         color: '#10B981', label: 'Unión'       },
  error:   { icon: AlertTriangle, color: '#EF4444', label: 'Error'       },
}
const notifMeta = (t: string) => EV_NOTIF[t] ?? { icon: Activity, color: '#71717A', label: t }

function useMobile() {
  const [m, setM] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

function fmtTs(ts: number) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'ahora'
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm'
  return Math.floor(diff / 3600000) + 'h'
}

/* ── Sakura Logo SVG (static) ── */
function SakuraLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      {[0, 72, 144, 216, 288].map((deg, i) => (
        <ellipse key={i} cx="12" cy="5.5" rx="2.8" ry="5"
          fill={i % 2 === 0 ? '#F9A8D4' : '#FBCFE8'}
          transform={`rotate(${deg} 12 12)`} opacity="0.90"/>
      ))}
      <circle cx="12" cy="12" r="2.2" fill="#FBBF24"/>
      <circle cx="12" cy="12" r="1.0" fill="#F59E0B"/>
    </svg>
  )
}

/* ── Hamburger icon (3 lines with animation) ── */
function BurgerIcon({ open }: { open: boolean }) {
  const line = (rotate: string, y: string, opacity = 1) => (
    <motion.span animate={{ rotate, y, opacity }}
      transition={{ duration: .22, ease: [.16,1,.3,1] }}
      style={{ display:'block', width:16, height:1.5, borderRadius:2, background:'currentColor', transformOrigin:'center' }}/>
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3.5, alignItems:'center', justifyContent:'center' }}>
      {open ? (
        <>
          {line('45deg',  '5.5px')}
          {line('0deg',   '0px', 0)}
          {line('-45deg', '-5.5px')}
        </>
      ) : (
        <>
          {line('0deg', '0px')}
          {line('0deg', '0px')}
          {line('0deg', '0px')}
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const [status,      setStatus]   = useState<BotStatus | null>(null)
  const [stats,       setStats]    = useState<BotStats  | null>(null)
  const [events,      setEvents]   = useState<ActivityEvent[]>([])
  const [open,        setOpen]     = useState(false)
  const [showNotifs,  setShowN]    = useState(false)
  const [unreadCount, setUnread]   = useState(0)
  const [lastSeenTs,  setLastSeen] = useState(Date.now())
  const [retrying,    setRetrying] = useState(false)
  const notifRef   = useRef<HTMLDivElement>(null)
  const location   = useLocation()
  const isMobile   = useMobile()
  const configured = isConfigured()
  const connected  = status?.connected ?? null

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    if (isMobile) document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open, isMobile])
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowN(false)
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

  const openNotifs = () => { setShowN(s => !s); setLastSeen(Date.now()); setUnread(0) }

  const pageLabel =
    PAGE_LABELS[location.pathname] ??
    Object.entries(PAGE_LABELS).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1] ??
    'Dashboard'

  const activeNavColor = NAV.find(n =>
    n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/'
  )?.color ?? '#F59E0B'

  const recentEvents = events.slice(0, 8)
  const bdr = '1px solid rgba(255,255,255,0.07)'

  return (
    <div className="shell">

      {/* Overlay */}
      <AnimatePresence>
        {open && isMobile && (
          <motion.div key="overlay" className="sidebar-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }} onClick={() => setOpen(false)}/>
        )}
      </AnimatePresence>

      {/* ── SIDEBAR ── */}
      <aside className={open ? 'sidebar open' : 'sidebar'} style={{
        zIndex: 50,
        background: 'linear-gradient(180deg, #0a0a14 0%, #080812 100%)',
      }}>

        {/* Gradient top accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, #F59E0B, #EC4899, #8B5CF6)`,
          zIndex: 2,
        }}/>

        {/* Logo header */}
        <div style={{
          height: 64, display: 'flex', alignItems: 'center',
          padding: '0 16px', borderBottom: bdr, flexShrink: 0, gap: 12,
          background: 'rgba(255,255,255,.012)',
        }}>
          {isMobile && (
            <button onClick={() => setOpen(false)} style={{
              position: 'absolute', top: 16, right: 14, width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,.06)', border: bdr, borderRadius: 7,
              color: 'rgba(255,255,255,.55)', cursor: 'pointer',
            }}>
              <X size={13}/>
            </button>
          )}

          {/* Logo icon */}
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(236,72,153,.28) 0%, rgba(245,158,11,.20) 100%)',
            border: '1px solid rgba(249,168,212,.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(236,72,153,.20), inset 0 1px 0 rgba(255,255,255,.08)',
          }}>
            <SakuraLogo/>
          </div>

          <div>
            <div style={{
              fontFamily: "'Noto Serif JP', serif", fontWeight: 700, fontSize: 14,
              color: '#F4F4F5', letterSpacing: '.01em', lineHeight: 1.2,
            }}>BotAnime</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', marginTop: 2, fontWeight: 400 }}>
              WhatsApp · Dashboard
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{
          flex: 1, overflowY: 'auto', padding: '10px 8px',
          display: 'flex', flexDirection: 'column', gap: 1,
        }}>

          {/* MENÚ label */}
          <div style={{
            fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,.20)',
            letterSpacing: '.10em', padding: '4px 10px 8px',
            textTransform: 'uppercase',
          }}>Menú</div>

          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.exact} style={{ textDecoration: 'none' }}>
              {({ isActive }) => (
                <div style={{ position: 'relative' }}>
                  {isActive && (
                    <motion.div layoutId="navActiveBg"
                      style={{
                        position: 'absolute', inset: 0, borderRadius: 9,
                        background: `linear-gradient(90deg, ${item.color}14, ${item.color}06)`,
                        border: `1px solid ${item.color}28`,
                        boxShadow: `0 0 16px ${item.color}0a`,
                      }}
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    />
                  )}
                  <div className={isActive ? '' : 'nav-item-hover'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 9,
                      position: 'relative', zIndex: 1,
                      transition: 'color .16s',
                      color: isActive ? item.color : 'rgba(255,255,255,.38)',
                    }}>
                    {/* Color dot indicator */}
                    <div style={{
                      width: 3, height: isActive ? 18 : 6, borderRadius: 2,
                      background: item.color, flexShrink: 0,
                      opacity: isActive ? 1 : 0.28,
                      transition: 'height .22s cubic-bezier(.16,1,.3,1), opacity .16s',
                    }}/>

                    {/* Icon in subtle bg */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: isActive ? item.color + '18' : 'rgba(255,255,255,.04)',
                      border: `1px solid ${isActive ? item.color + '30' : 'rgba(255,255,255,.06)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .16s',
                    }}>
                      <item.icon size={13} strokeWidth={isActive ? 2.2 : 1.8}/>
                    </div>

                    <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, letterSpacing: '.005em' }}>
                      {item.label}
                    </span>
                  </div>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Connection status footer */}
        <div style={{ padding: '10px 10px 14px', borderTop: bdr, flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 10,
            background: configured && connected
              ? 'rgba(16,185,129,.06)' : configured && connected === false
              ? 'rgba(236,72,153,.06)' : 'rgba(255,255,255,.025)',
            border: configured && connected
              ? '1px solid rgba(16,185,129,.18)' : configured && connected === false
              ? '1px solid rgba(236,72,153,.18)' : bdr,
            transition: 'all .3s',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: configured && connected
                ? 'rgba(16,185,129,.12)' : 'rgba(255,255,255,.04)',
              border: bdr,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: !configured ? '#52525B' : connected ? '#10B981' : '#EC4899',
                boxShadow: connected ? '0 0 6px #10B981' : configured && connected === false ? '0 0 6px #EC4899' : 'none',
                animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
              }}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 12, fontWeight: 600,
                color: !configured ? '#71717A' : connected ? '#10B981' : '#F9A8D4',
              }}>
                {!configured ? 'Sin configurar' : connected ? 'En línea' : 'Desconectado'}
              </p>
              {stats && (
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', marginTop: 1 }}>
                  {stats.users ?? 0} users · {stats.groups ?? 0} grupos
                </p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-content">

        {/* Topbar */}
        <header style={{
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 18px', borderBottom: bdr, flexShrink: 0,
          background: 'rgba(8,8,18,.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

            {/* Hamburger button */}
            <button
              onClick={() => setOpen(o => !o)}
              aria-label="Menú"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
                background: open ? activeNavColor + '16' : 'rgba(255,255,255,.05)',
                border: `1px solid ${open ? activeNavColor + '40' : 'rgba(255,255,255,.08)'}`,
                color: open ? activeNavColor : 'rgba(255,255,255,.55)',
                transition: 'all .2s',
                boxShadow: open ? `0 0 12px ${activeNavColor}18` : 'none',
              }}>
              <BurgerIcon open={open}/>
            </button>

            {/* Page title with colored underline */}
            <div>
              <motion.div
                key={pageLabel}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  fontSize: 16, fontWeight: 700, color: '#F4F4F5',
                  fontFamily: "'Noto Serif JP', serif",
                  letterSpacing: '.01em', lineHeight: 1.2,
                }}
              >
                {pageLabel}
              </motion.div>
              <motion.div
                key={pageLabel + 'bar'}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                style={{ height: 2, background: `linear-gradient(90deg, ${activeNavColor}, transparent)`, borderRadius: 2, marginTop: 2, transformOrigin: 'left' }}
                transition={{ duration: 0.25, delay: 0.05 }}
              />
            </div>
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
                }}/>
                <span style={{ fontSize: 11, fontWeight: 600, color: connected ? '#10B981' : '#F9A8D4' }}>
                  {connected ? 'Online' : 'Offline'}
                </span>
              </div>
            )}

            {/* Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={openNotifs} style={{
                position: 'relative', width: 34, height: 34,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: showNotifs ? 'rgba(245,158,11,.10)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${showNotifs ? 'rgba(245,158,11,.30)' : 'rgba(255,255,255,.08)'}`,
                borderRadius: 9, color: showNotifs ? '#F59E0B' : 'rgba(255,255,255,.45)',
                cursor: 'pointer', transition: 'all .18s',
                boxShadow: showNotifs ? '0 0 12px rgba(245,158,11,.18)' : 'none',
              }}>
                <Bell size={14}/>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6, width: 7, height: 7,
                    borderRadius: '50%', background: '#EF4444',
                    border: '1.5px solid #08081a', animation: 'livePulse 1.5s ease-in-out infinite',
                  }}/>
                )}
              </button>

              {showNotifs && (
                <div className="notif-drawer">
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom: bdr }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <Bell size={12} color="var(--text2)"/>
                      <span style={{ fontSize:13, fontWeight:600 }}>Actividad reciente</span>
                    </div>
                    <button onClick={()=>setShowN(false)} style={{ color:'var(--text3)', padding:2, cursor:'pointer' }}>
                      <X size={13}/>
                    </button>
                  </div>
                  <div style={{ maxHeight:320, overflowY:'auto' }}>
                    {recentEvents.length===0 ? (
                      <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--text3)', fontSize:12 }}>Sin eventos recientes</div>
                    ) : recentEvents.map((ev,i)=>{
                      const m=notifMeta(ev.type); const Icon=m.icon
                      const d=ev.data as Record<string,string>
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 16px', borderBottom: bdr }}>
                          <div style={{ width:26, height:26, borderRadius:6, flexShrink:0, background:m.color+'12', border:`1px solid ${m.color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Icon size={11} color={m.color}/>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                              <span style={{ fontSize:9, fontWeight:700, color:m.color, background:m.color+'12', border:`1px solid ${m.color}18`, padding:'1px 5px', borderRadius:3 }}>{m.label}</span>
                              {d?.sender && <span style={{ fontSize:11, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.sender}</span>}
                            </div>
                            {d?.group && <div style={{ fontSize:10, color:'var(--text3)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.group}</div>}
                          </div>
                          <span style={{ fontSize:10, color:'var(--text3)', flexShrink:0 }}>{fmtTs(ev.ts)}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ padding:'9px 16px', borderTop: bdr }}>
                    <NavLink to="/activity" onClick={()=>setShowN(false)}
                      style={{ fontSize:12, color:'#F59E0B', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
                      Ver todo el log <Activity size={11}/>
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
            <div className="offline-banner-dot"/>
            <span className="offline-banner-text">Bot desconectado — verifica tu servidor</span>
            <button className="btn btn-red btn-xs" onClick={retry} disabled={retrying} style={{ marginLeft:'auto' }}>
              <RefreshCw size={10} style={{ animation:retrying?'spin 1s linear infinite':'none' }}/>
              Reintentar
            </button>
          </div>
        )}

        {/* Page content */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.20, ease: [0.16, 1, 0.3, 1] }}
          className="page-content"
        >
          <Outlet/>
        </motion.div>
      </div>
    </div>
  )
}
