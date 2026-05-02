import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, MessageSquare, Settings,
  Shield, Activity, Wifi, Menu, X, Bot, Terminal,
  Zap, Signal
} from 'lucide-react'
import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'INICIO',      exact: true, num: '01', color: '#1e90ff', glow: 'rgba(30,144,255,0.35)' },
  { to: '/users',      icon: Users,           label: 'USUARIOS',                 num: '02', color: '#a855f7', glow: 'rgba(168,85,247,0.35)' },
  { to: '/groups',     icon: MessageSquare,   label: 'GRUPOS',                   num: '03', color: '#00d4ff', glow: 'rgba(0,212,255,0.30)' },
  { to: '/moderation', icon: Shield,          label: 'MODERACIÓN',               num: '04', color: '#ef4444', glow: 'rgba(239,68,68,0.35)' },
  { to: '/activity',   icon: Activity,        label: 'ACTIVIDAD',                num: '05', color: '#fbbf24', glow: 'rgba(251,191,36,0.30)' },
  { to: '/config',     icon: Settings,        label: 'CONFIG',                   num: '06', color: '#34d399', glow: 'rgba(52,211,153,0.30)' },
  { to: '/connect',    icon: Wifi,            label: 'CONEXIÓN',                 num: '07', color: '#f97316', glow: 'rgba(249,115,22,0.30)' },
  { to: '/commands',   icon: Terminal,        label: 'COMANDOS',                 num: '08', color: '#c084fc', glow: 'rgba(192,132,252,0.30)' },
]

const PAGE_LABELS: Record<string, string> = {
  '/':           'STATUS WINDOW',
  '/users':      'HUNTER LIST',
  '/groups':     'DUNGEON MAP',
  '/moderation': 'PENALTY RECORD',
  '/activity':   'EVENT LOG',
  '/config':     'SYSTEM CONFIG',
  '/connect':    'CONNECTION PORTAL',
  '/commands':   'COMMAND REGISTRY',
}

function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hh   = t.getHours().toString().padStart(2,'0')
  const mm   = t.getMinutes().toString().padStart(2,'0')
  const ss   = t.getSeconds().toString().padStart(2,'0')
  const date = t.toLocaleDateString('es-MX', { weekday:'short', day:'2-digit', month:'short' })
  return (
    <div style={{
      padding: '12px 16px 16px',
      borderTop: '1px solid rgba(30,144,255,0.12)',
      background: 'linear-gradient(0deg, rgba(10,30,80,0.12) 0%, transparent 100%)',
    }}>
      <div style={{
        fontFamily: "'Orbitron',sans-serif",
        fontSize: 22, fontWeight: 800,
        color: '#d0eaff',
        letterSpacing: '.06em', lineHeight: 1,
        textShadow: '0 0 20px rgba(30,144,255,0.4)',
      }}>
        {hh}<span style={{ opacity: t.getSeconds()%2===0?1:.12, transition:'opacity .1s' }}>:</span>{mm}
        <span style={{ fontSize: 12, color: 'rgba(30,144,255,0.5)', marginLeft: 6, fontWeight: 400 }}>{ss}</span>
      </div>
      <div style={{
        fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 700,
        letterSpacing: '.18em', color: 'rgba(30,144,255,0.35)', marginTop: 4,
      }}>SYS · {date.toUpperCase()}</div>
    </div>
  )
}

function StatusChip({ status, stats }: { status: BotStatus|null; stats: BotStats|null }) {
  const connected = status?.connected
  const color = !isConfigured() || !status ? 'rgba(30,144,255,0.4)' : connected ? '#34d399' : '#ef4444'
  const bg    = !isConfigured() || !status ? 'rgba(30,144,255,0.04)' : connected ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)'
  const border= !isConfigured() || !status ? 'rgba(30,144,255,0.12)' : connected ? 'rgba(52,211,153,0.28)' : 'rgba(239,68,68,0.25)'
  const label = !isConfigured() ? 'API SIN CONFIG' : !status ? 'CONECTANDO…' : connected ? 'HUNTER: ONLINE' : 'DESCONECTADO'

  return (
    <div style={{
      margin: '8px 12px 4px',
      padding: '8px 12px',
      borderRadius: 8,
      border: `1px solid ${border}`,
      background: bg,
      display: 'flex', alignItems: 'center', gap: 8,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated left accent */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: color,
        boxShadow: `0 0 8px ${color}`,
        borderRadius: '0 2px 2px 0',
      }}/>
      {/* Pulsing dot */}
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}50`,
        flexShrink: 0, marginLeft: 4,
        animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
      }}/>
      <span style={{
        fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700,
        letterSpacing: '.1em', color,
      }}>{label}</span>
      {stats && connected && (
        <span style={{
          marginLeft: 'auto', fontFamily: "'Orbitron',sans-serif",
          fontSize: 8, color: `${color}80`,
        }}>G{stats.groups??0}</span>
      )}
    </div>
  )
}

export default function Layout() {
  const [status, setStatus] = useState<BotStatus|null>(null)
  const [stats,  setStats]  = useState<BotStats|null>(null)
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

  const currentNav = NAV.find(n => n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/')
    ?? (location.pathname === '/' ? NAV[0] : null)
  const pageLabel = PAGE_LABELS[location.pathname] ??
    Object.entries(PAGE_LABELS).find(([k]) => location.pathname.startsWith(k))?.[1] ?? 'SYSTEM'

  const sidebar = (
    <aside style={{
      width: 240, flexShrink: 0,
      background: 'rgba(2,8,18,0.98)',
      borderRight: '1px solid rgba(30,144,255,0.16)',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', zIndex: 40,
      boxShadow: '4px 0 40px rgba(0,0,0,0.6)',
    }} className={open ? 'sidebar open' : 'sidebar'}>

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(30,144,255,0.7), rgba(0,212,255,1), rgba(30,144,255,0.7), transparent)',
        boxShadow: '0 0 12px rgba(0,212,255,0.5)',
      }}/>

      {/* ── Logo Area ── */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid rgba(30,144,255,0.10)',
        background: 'linear-gradient(180deg, rgba(20,70,180,0.10) 0%, transparent 100%)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Bot icon with glow */}
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(30,144,255,0.25), rgba(0,212,255,0.15))',
            border: '1px solid rgba(30,144,255,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(30,144,255,0.30), 0 0 40px rgba(0,212,255,0.10)',
            flexShrink: 0,
          }}>
            <Bot size={20} color="#00d4ff" strokeWidth={1.8}/>
          </div>
          <div>
            <div style={{
              fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 900,
              letterSpacing: '.18em', color: '#d0eaff',
              textShadow: '0 0 20px rgba(30,144,255,0.55)',
            }}>BOT SYSTEM</div>
            <div style={{
              fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 700,
              letterSpacing: '.22em', color: 'rgba(0,212,255,0.60)', marginTop: 2,
            }}>BOTANIME · AWAKENED</div>
          </div>
        </div>
      </div>

      {/* ── Status ── */}
      <StatusChip status={status} stats={stats}/>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 0 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Section header */}
        <div style={{
          padding: '0 16px 8px',
          fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700,
          letterSpacing: '.26em', color: 'rgba(30,144,255,0.30)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ height: 1, flex: 1, background: 'rgba(30,144,255,0.12)' }}/>
          MENU
          <div style={{ height: 1, flex: 1, background: 'rgba(30,144,255,0.12)' }}/>
        </div>

        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '8px 14px 8px 12px',
              margin: '0 8px',
              borderRadius: 8,
              textDecoration: 'none',
              border: isActive ? `1px solid ${item.color}30` : '1px solid transparent',
              background: isActive ? `linear-gradient(90deg, ${item.color}16, ${item.color}08)` : 'transparent',
              boxShadow: isActive ? `0 0 20px ${item.color}18 inset` : 'none',
              transition: 'all .18s ease',
              position: 'relative',
              overflow: 'hidden',
            })}
          >
            {({ isActive }) => (
              <>
                {/* Left glow accent for active */}
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 3,
                    borderRadius: '0 3px 3px 0',
                    background: `linear-gradient(180deg, ${item.color}, ${item.color}80)`,
                    boxShadow: `0 0 10px ${item.color}, 0 0 20px ${item.glow}`,
                  }}/>
                )}
                {/* Icon box */}
                <div style={{
                  width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                  background: isActive ? `${item.color}22` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? item.color + '45' : 'rgba(255,255,255,0.05)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .18s',
                  boxShadow: isActive ? `0 0 14px ${item.glow}` : 'none',
                }}>
                  <item.icon size={13} color={isActive ? item.color : 'rgba(30,144,255,0.35)'} strokeWidth={isActive ? 2.2 : 1.8}/>
                </div>
                {/* Label */}
                <span style={{
                  flex: 1,
                  fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700,
                  letterSpacing: '.10em',
                  color: isActive ? item.color : 'rgba(70,130,180,0.7)',
                  transition: 'color .18s',
                }}>
                  {item.label}
                </span>
                {/* Number */}
                <span style={{
                  fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700,
                  color: isActive ? `${item.color}70` : 'rgba(30,144,255,0.15)',
                  background: isActive ? `${item.color}12` : 'transparent',
                  border: isActive ? `1px solid ${item.color}20` : '1px solid transparent',
                  padding: '1px 5px', borderRadius: 3,
                  transition: 'all .18s',
                }}>{item.num}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Stats Grid ── */}
      {stats && (
        <div style={{
          margin: '0 10px 8px',
          padding: '12px 14px',
          borderRadius: 8,
          border: '1px solid rgba(30,144,255,0.14)',
          background: 'rgba(10,25,55,0.50)',
        }}>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700,
            letterSpacing: '.22em', color: 'rgba(30,144,255,0.35)',
            marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Signal size={8} color="rgba(30,144,255,0.35)"/>
            SYSTEM STATUS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              { val: stats.users??0, label: 'HUNTERS', color: '#1e90ff' },
              { val: stats.groups??0, label: 'GUILDS', color: '#a855f7' },
              { val: stats.connected ? 'ON' : 'OFF', label: 'NET', color: stats.connected ? '#34d399' : '#ef4444' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{
                  fontFamily: "'Orbitron',sans-serif", fontSize: 16, fontWeight: 800,
                  color: s.color, lineHeight: 1,
                  textShadow: `0 0 14px ${s.color}60`,
                }}>{s.val}</div>
                <div style={{
                  fontFamily: "'Rajdhani',sans-serif", fontSize: 8, fontWeight: 700,
                  letterSpacing: '.12em', color: 'rgba(30,144,255,0.30)', marginTop: 3,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Clock/>
    </aside>
  )

  return (
    <div className="shell">
      {sidebar}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)}/>}

      <div className="main-content" style={{ marginLeft: 0 }}>

        {/* ── Topbar ── */}
        <header style={{
          height: 54, display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 22px',
          borderBottom: '1px solid rgba(30,144,255,0.14)',
          background: 'rgba(2,9,18,0.97)',
          flexShrink: 0, position: 'relative', zIndex: 30,
          boxShadow: '0 4px 30px rgba(0,0,0,0.35)',
        }}>
          {/* Bottom accent */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(30,144,255,0.45), rgba(0,212,255,0.65), rgba(30,144,255,0.45), transparent)',
          }}/>

          {/* Mobile toggle */}
          <button className="sidebar-toggle" style={{ position: 'static' }} onClick={() => setOpen(o=>!o)}>
            {open ? <X size={16}/> : <Menu size={16}/>}
          </button>

          {/* Breadcrumb pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flex: 1, overflow: 'hidden',
            padding: '6px 14px',
            background: 'rgba(30,144,255,0.06)',
            border: '1px solid rgba(30,144,255,0.14)',
            borderRadius: 8,
            maxWidth: 380,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: currentNav?.color ?? 'var(--cyan)',
              boxShadow: `0 0 8px ${currentNav?.color ?? 'var(--cyan)'}`,
              flexShrink: 0,
            }}/>
            <span style={{
              fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700,
              letterSpacing: '.2em', color: 'rgba(30,144,255,0.40)', flexShrink: 0,
            }}>■ SYSTEM</span>
            <span style={{ color: 'rgba(30,144,255,0.25)', flexShrink: 0 }}>›</span>
            <span style={{
              fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 800,
              letterSpacing: '.14em',
              color: currentNav?.color ?? '#5ab5ff',
              textShadow: `0 0 16px ${currentNav?.color ?? '#5ab5ff'}80`,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{pageLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {/* Uptime / stats */}
            {stats && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                border: '1px solid rgba(168,85,247,0.20)',
                borderRadius: 8,
                background: 'rgba(168,85,247,0.07)',
                fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '.1em', color: 'rgba(168,85,247,0.80)',
              }}>
                <Zap size={10} color="rgba(168,85,247,0.8)"/>
                {stats.users??0} USERS
              </div>
            )}

            {/* Online badge */}
            {status?.connected ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                border: '1px solid rgba(52,211,153,0.28)',
                borderRadius: 8,
                background: 'rgba(52,211,153,0.09)',
                fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '.12em', color: '#34d399',
                boxShadow: '0 0 14px rgba(52,211,153,0.12)',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#34d399',
                  boxShadow: '0 0 8px #34d399',
                  animation: 'livePulse 1.8s ease-in-out infinite',
                }}/>
                ONLINE
              </div>
            ) : status && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                background: 'rgba(239,68,68,0.08)',
                fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '.12em', color: '#ef4444',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }}/>
                OFFLINE
              </div>
            )}
          </div>
        </header>

        <div className="page-content animate-fade-up">
          <Outlet/>
        </div>
      </div>
    </div>
  )
}
