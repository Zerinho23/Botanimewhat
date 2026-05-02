import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, MessageSquare, Settings,
  Shield, Activity, Wifi, Menu, X, Terminal, Zap, ChevronRight
} from 'lucide-react'
import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'INICIO',      sub: 'Status Window',   exact: true },
  { to: '/users',      icon: Users,           label: 'USUARIOS',    sub: 'Hunter List'               },
  { to: '/groups',     icon: MessageSquare,   label: 'GRUPOS',      sub: 'Guild Map'                 },
  { to: '/moderation', icon: Shield,          label: 'MODERACIÓN',  sub: 'Penalty Board'             },
  { to: '/activity',   icon: Activity,        label: 'ACTIVIDAD',   sub: 'Event Log'                 },
  { to: '/config',     icon: Settings,        label: 'CONFIG',      sub: 'System Config'             },
  { to: '/connect',    icon: Wifi,            label: 'CONEXIÓN',    sub: 'Connection'                },
  { to: '/commands',   icon: Terminal,        label: 'COMANDOS',    sub: 'Command Registry'          },
]

const PAGE_LABELS: Record<string, string> = {
  '/': 'STATUS WINDOW', '/users': 'HUNTERS', '/groups': 'GUILDS',
  '/moderation': 'PENALTIES', '/activity': 'EVENT LOG',
  '/config': 'SYSTEM CONFIG', '/connect': 'CONNECTION', '/commands': 'COMMANDS',
}

// CSS-only hexagon shape for logo
const HexLogo = () => (
  <div style={{
    position: 'relative', width: 46, height: 46, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {/* Hexagon via clip-path */}
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(135deg, rgba(30,58,255,0.30), rgba(0,153,255,0.20))',
      clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
      border: '1px solid rgba(68,102,255,0.5)',
      boxShadow: '0 0 20px rgba(30,58,255,0.4), 0 0 40px rgba(30,58,255,0.15)',
    }}/>
    {/* Inner hex glow */}
    <div style={{
      position: 'absolute', inset: 6,
      background: 'rgba(30,58,255,0.15)',
      clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
    }}/>
    <Zap size={18} color="#4466ff" strokeWidth={1.6} style={{ position: 'relative', zIndex: 1 }}/>
  </div>
)

function SysClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const hh = t.getHours().toString().padStart(2,'0')
  const mm = t.getMinutes().toString().padStart(2,'0')
  const ss = t.getSeconds().toString().padStart(2,'0')
  const blink = t.getSeconds() % 2 === 0
  return (
    <div style={{
      padding: '14px 18px',
      borderTop: '1px solid rgba(30,58,255,0.15)',
      background: 'rgba(30,58,255,0.04)',
      flexShrink: 0,
    }}>
      {/* bracket label */}
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color: 'rgba(68,102,255,0.45)', marginBottom: 6 }}>
        [ SYS·CLOCK ]
      </div>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 22, fontWeight: 900, color: '#dde6ff', letterSpacing: '.04em', lineHeight: 1 }}>
        {hh}<span style={{ opacity: blink ? 1 : 0.08, transition: 'opacity .1s' }}>:</span>{mm}
        <span style={{ fontSize: 12, color: 'rgba(68,102,255,0.5)', marginLeft: 5 }}>{ss}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 500, letterSpacing: '.16em', color: 'rgba(68,102,255,0.30)', marginTop: 5 }}>
        {t.toLocaleDateString('es-MX', { weekday:'short', day:'2-digit', month:'short' }).toUpperCase()}
      </div>
    </div>
  )
}

export default function Layout() {
  const [status, setStatus] = useState<BotStatus|null>(null)
  const [stats, setStats] = useState<BotStats|null>(null)
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (!isConfigured()) return
    const tick = async () => {
      try { setStatus(await getStatus()) } catch {}
      try { setStats(await getStats()) } catch {}
    }
    tick(); const id = setInterval(tick, 15000); return () => clearInterval(id)
  }, [])

  const pageLabel = PAGE_LABELS[location.pathname]
    ?? Object.entries(PAGE_LABELS).find(([k]) => location.pathname.startsWith(k) && k !== '/')?.[1]
    ?? 'SYSTEM'
  const connected = status?.connected

  const sidebar = (
    <aside className={open ? 'sidebar open' : 'sidebar'}>
      {/* Top accent line */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(68,102,255,0.8),rgba(0,153,255,0.9),rgba(68,102,255,0.8),transparent)',boxShadow:'0 0 10px rgba(30,58,255,0.5)',zIndex:1 }}/>

      {/* ── Logo / Header ── */}
      <div style={{
        padding: '22px 18px 18px',
        borderBottom: '1px solid rgba(30,58,255,0.15)',
        position: 'relative', flexShrink: 0,
      }}>
        {/* AnimeFLEX-style bracket header */}
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 600,
          letterSpacing: '.18em', color: 'rgba(68,102,255,0.45)', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(30,58,255,0.20)' }}/>
          [ SYSTEM ]
          <div style={{ flex: 1, height: 1, background: 'rgba(30,58,255,0.20)' }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <HexLogo/>
          <div>
            <div style={{
              fontFamily: "'Orbitron',monospace", fontSize: 14, fontWeight: 900,
              letterSpacing: '.14em', color: '#dde6ff',
              textShadow: '0 0 20px rgba(30,58,255,0.5)',
            }}>BOTANIME</div>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 500,
              letterSpacing: '.20em', color: 'rgba(0,153,255,0.60)', marginTop: 3,
            }}>SYS://BOT.CORE</div>
          </div>
        </div>

        {/* Status bar — AnimeFLEX style ● STATUS */}
        <div style={{
          marginTop: 14,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px',
          border: `1px solid ${!isConfigured() ? 'rgba(30,58,255,0.15)' : connected ? 'rgba(0,255,136,0.30)' : 'rgba(255,51,85,0.28)'}`,
          borderRadius: 4,
          background: !isConfigured() ? 'rgba(30,58,255,0.04)' : connected ? 'rgba(0,255,136,0.07)' : 'rgba(255,51,85,0.07)',
          position: 'relative',
        }}>
          {/* left accent bar */}
          <div style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 2px 2px 0',
            background: !isConfigured() ? 'rgba(30,58,255,0.3)' : connected ? '#00ff88' : '#ff3355',
            boxShadow: connected ? '0 0 8px rgba(0,255,136,0.5)' : 'none',
          }}/>
          <div style={{
            width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
            background: !isConfigured() ? 'rgba(30,58,255,0.4)' : connected ? '#00ff88' : '#ff3355',
            boxShadow: connected ? '0 0 8px rgba(0,255,136,0.6), 0 0 16px rgba(0,255,136,0.3)' : 'none',
            animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
            marginLeft: 4,
          }}/>
          <span style={{
            fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '.10em',
            color: !isConfigured() ? 'rgba(68,102,255,0.5)' : connected ? '#00ff88' : '#ff3355',
          }}>
            {!isConfigured() ? 'SIN CONFIGURAR' : connected ? 'HUNTER: ONLINE' : 'DESCONECTADO'}
          </span>
          {stats?.groups != null && connected && (
            <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron',monospace", fontSize: 8, color: 'rgba(0,255,136,0.45)', fontWeight: 700 }}>
              G{stats.groups}
            </span>
          )}
        </div>
      </div>

      {/* ── Navigation — AnimeFLEX style ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0 8px' }}>
        {/* Section label */}
        <div style={{
          padding: '4px 18px 10px',
          fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 600,
          letterSpacing: '.20em', color: 'rgba(30,58,255,0.35)',
        }}>/// NAVEGACIÓN</div>

        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 18px',
              textDecoration: 'none',
              borderLeft: isActive ? '3px solid rgba(68,102,255,0.9)' : '3px solid transparent',
              background: isActive
                ? 'linear-gradient(90deg, rgba(30,58,255,0.14), rgba(30,58,255,0.04))'
                : 'transparent',
              borderRight: '1px solid transparent',
              borderTop: isActive ? '1px solid rgba(30,58,255,0.12)' : '1px solid transparent',
              borderBottom: isActive ? '1px solid rgba(30,58,255,0.12)' : '1px solid transparent',
              position: 'relative',
              transition: 'all .16s',
              marginBottom: 2,
            })}
          >
            {({ isActive }) => (
              <>
                {/* Arrow prefix — AnimeFLEX style */}
                <ChevronRight
                  size={12}
                  color={isActive ? '#4466ff' : 'rgba(30,58,255,0.30)'}
                  strokeWidth={isActive ? 2.5 : 2}
                  style={{ flexShrink: 0, transition: 'all .16s', transform: isActive ? 'translateX(2px)' : 'none' }}
                />
                {/* Icon */}
                <div style={{
                  width: 30, height: 30, borderRadius: 4, flexShrink: 0,
                  background: isActive ? 'rgba(30,58,255,0.20)' : 'rgba(30,58,255,0.06)',
                  border: `1px solid ${isActive ? 'rgba(68,102,255,0.50)' : 'rgba(30,58,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 14px rgba(30,58,255,0.25)' : 'none',
                  transition: 'all .16s',
                }}>
                  <item.icon size={13} color={isActive ? '#4466ff' : 'rgba(68,102,255,0.45)'} strokeWidth={isActive ? 2.2 : 1.8}/>
                </div>
                {/* Text */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 700,
                    letterSpacing: '.10em',
                    color: isActive ? '#dde6ff' : 'rgba(136,152,204,0.7)',
                    transition: 'color .16s',
                  }}>{item.label}</div>
                  {isActive && (
                    <div style={{
                      fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 500,
                      letterSpacing: '.10em', color: 'rgba(68,102,255,0.50)',
                      marginTop: 1,
                    }}>{item.sub}</div>
                  )}
                </div>
                {/* Active dot */}
                {isActive && (
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4466ff', boxShadow: '0 0 8px rgba(68,102,255,0.8)', flexShrink: 0 }}/>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Stats mini grid ── */}
      {stats && (
        <div style={{
          margin: '0 12px 10px',
          padding: '12px 14px',
          border: '1px solid rgba(30,58,255,0.15)',
          borderRadius: 4,
          background: 'rgba(30,58,255,0.04)',
          position: 'relative',
        }}>
          {/* corner brackets */}
          <div style={{ position:'absolute',top:-1,left:-1,width:10,height:10,borderTop:'1px solid rgba(68,102,255,0.6)',borderLeft:'1px solid rgba(68,102,255,0.6)' }}/>
          <div style={{ position:'absolute',bottom:-1,right:-1,width:10,height:10,borderBottom:'1px solid rgba(68,102,255,0.6)',borderRight:'1px solid rgba(68,102,255,0.6)' }}/>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:600,letterSpacing:'.18em',color:'rgba(30,58,255,0.35)',marginBottom:10 }}>[ SYS·STATUS ]</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center' }}>
            {[
              { v: stats.users  ?? 0,        l: 'HUNTERS', c: '#4466ff' },
              { v: stats.groups ?? 0,         l: 'GUILDS',  c: '#8855ff' },
              { v: connected ? 'ON' : 'OFF',  l: 'NET',     c: connected ? '#00ff88' : '#ff3355' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily:"'Orbitron',monospace",fontSize:16,fontWeight:800,color:s.c,lineHeight:1,textShadow:`0 0 10px ${s.c}80` }}>{s.v}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:600,letterSpacing:'.12em',color:'rgba(30,58,255,0.30)',marginTop:4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SysClock/>
    </aside>
  )

  return (
    <div className="shell">
      {sidebar}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)}/>}

      <div className="main-content">
        {/* ── Topbar — AnimeFLEX [SYSTEM] LABEL style ── */}
        <header style={{
          height: 52, display:'flex', alignItems:'center', gap:14, padding:'0 22px',
          background: 'rgba(5,8,16,0.98)',
          borderBottom: '1px solid rgba(30,58,255,0.18)',
          flexShrink:0, zIndex:30, position:'relative',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          {/* Bottom accent */}
          <div style={{ position:'absolute',bottom:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(68,102,255,0.6),rgba(0,153,255,0.8),rgba(68,102,255,0.6),transparent)' }}/>

          <button className="sidebar-toggle" style={{ position:'static' }} onClick={() => setOpen(o=>!o)}>
            {open ? <X size={15}/> : <Menu size={15}/>}
          </button>

          {/* Bracket-style page label — core AnimeFLEX visual */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{
              fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:600,
              letterSpacing:'.14em', color:'rgba(68,102,255,0.50)',
            }}>[ SYSTEM ]</span>
            <span style={{ color:'rgba(30,58,255,0.30)', fontSize:16 }}>///</span>
            <span style={{
              fontFamily:"'Orbitron',monospace", fontSize:12, fontWeight:800,
              letterSpacing:'.14em', color:'#dde6ff',
              textShadow:'0 0 16px rgba(30,58,255,0.5)',
            }}>{pageLabel}</span>
          </div>

          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
            {stats && (
              <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 10px',border:'1px solid rgba(68,102,255,0.20)',borderRadius:4,background:'rgba(30,58,255,0.07)' }}>
                <Zap size={9} color="rgba(68,102,255,0.7)"/>
                <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:'rgba(68,102,255,0.80)',letterSpacing:'.08em' }}>{stats.users ?? 0} USERS</span>
              </div>
            )}
            {connected != null && (
              <div style={{
                display:'flex',alignItems:'center',gap:6,padding:'4px 10px',
                border:`1px solid ${connected ? 'rgba(0,255,136,0.30)' : 'rgba(255,51,85,0.25)'}`,
                borderRadius:4,
                background:`${connected ? 'rgba(0,255,136,0.07)' : 'rgba(255,51,85,0.07)'}`,
              }}>
                <div style={{
                  width:6,height:6,borderRadius:'50%',
                  background:connected?'#00ff88':'#ff3355',
                  boxShadow:connected?'0 0 8px rgba(0,255,136,0.6)':'none',
                  animation:connected?'livePulse 1.8s ease-in-out infinite':'none',
                }}/>
                <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:connected?'#00ff88':'#ff3355',letterSpacing:'.10em' }}>
                  {connected?'ONLINE':'OFFLINE'}
                </span>
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
