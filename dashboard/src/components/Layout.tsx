import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, MessageSquare, Settings,
  Shield, Activity, Wifi, Menu, X, Bot, Terminal, Zap, Signal
} from 'lucide-react'
import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

const NAV = [
  { to: '/',           icon: LayoutDashboard, label: 'INICIO',      exact: true, color: '#3b82f6', dim: '#1d4ed8' },
  { to: '/users',      icon: Users,           label: 'USUARIOS',                 color: '#a855f7', dim: '#7e22ce' },
  { to: '/groups',     icon: MessageSquare,   label: 'GRUPOS',                   color: '#06b6d4', dim: '#0e7490' },
  { to: '/moderation', icon: Shield,          label: 'MODERACIÓN',               color: '#ef4444', dim: '#b91c1c' },
  { to: '/activity',   icon: Activity,        label: 'ACTIVIDAD',                color: '#f59e0b', dim: '#b45309' },
  { to: '/config',     icon: Settings,        label: 'CONFIG',                   color: '#22c55e', dim: '#15803d' },
  { to: '/connect',    icon: Wifi,            label: 'CONEXIÓN',                 color: '#f97316', dim: '#c2410c' },
  { to: '/commands',   icon: Terminal,        label: 'COMANDOS',                 color: '#d946ef', dim: '#a21caf' },
]

const PAGE_LABELS: Record<string, string> = {
  '/': 'STATUS WINDOW', '/users': 'HUNTERS', '/groups': 'GUILDS',
  '/moderation': 'PENALTIES', '/activity': 'EVENT LOG',
  '/config': 'SYSTEM CONFIG', '/connect': 'CONNECTION', '/commands': 'COMMANDS',
}

function SysTime() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const hh = t.getHours().toString().padStart(2,'0')
  const mm = t.getMinutes().toString().padStart(2,'0')
  const ss = t.getSeconds().toString().padStart(2,'0')
  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 24, fontWeight: 900, color: '#e2e8f0', letterSpacing: '.04em', lineHeight: 1 }}>
        {hh}<span style={{ opacity: t.getSeconds() % 2 === 0 ? 1 : 0.15, transition: 'opacity .1s' }}>:</span>{mm}
        <span style={{ fontSize: 13, color: '#3b82f6', marginLeft: 6, fontWeight: 400 }}>{ss}</span>
      </div>
      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '.18em', color: 'rgba(255,255,255,0.22)', marginTop: 4 }}>
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

  const currentNav = NAV.find(n => n.exact ? location.pathname === n.to : location.pathname.startsWith(n.to) && n.to !== '/') ?? (location.pathname === '/' ? NAV[0] : null)
  const accentColor = currentNav?.color ?? '#3b82f6'
  const pageLabel = PAGE_LABELS[location.pathname] ?? PAGE_LABELS[Object.keys(PAGE_LABELS).find(k => location.pathname.startsWith(k) && k !== '/') ?? '/'] ?? 'SYSTEM'
  const connected = status?.connected

  const sidebar = (
    <aside className={open ? 'sidebar open' : 'sidebar'} style={{
      width: 248, flexShrink: 0,
      background: 'linear-gradient(180deg, #050d1a 0%, #020912 100%)',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', zIndex: 40,
      boxShadow: '6px 0 30px rgba(0,0,0,0.7)',
    }}>
      {/* top glowline */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:2, background:`linear-gradient(90deg,transparent,${accentColor}cc,transparent)`, transition:'background .4s' }}/>

      {/* ── Logo ── */}
      <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)',
            border: '1px solid rgba(59,130,246,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59,130,246,0.4), 0 0 0 4px rgba(59,130,246,0.08)',
          }}>
            <Bot size={22} color="white" strokeWidth={1.6}/>
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 13, fontWeight: 900, letterSpacing: '.16em', color: '#f1f5f9' }}>BOT SYSTEM</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.22em', color: '#3b82f6', marginTop: 2 }}>BOTANIME · AWAKENED</div>
          </div>
        </div>

        {/* Status pill */}
        <div style={{
          marginTop: 14,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 8,
          background: !isConfigured() ? 'rgba(255,255,255,0.04)' : connected ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
          border: `1px solid ${!isConfigured() ? 'rgba(255,255,255,0.08)' : connected ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.30)'}`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: !isConfigured() ? '#64748b' : connected ? '#22c55e' : '#ef4444',
            boxShadow: connected ? '0 0 8px #22c55e, 0 0 16px rgba(34,197,94,0.4)' : 'none',
            animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
          }}/>
          <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: !isConfigured() ? '#64748b' : connected ? '#22c55e' : '#ef4444' }}>
            {!isConfigured() ? 'SIN CONFIGURAR' : connected ? 'HUNTER: ONLINE' : 'DESCONECTADO'}
          </span>
          {stats && connected && (
            <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron',monospace", fontSize: 9, color: 'rgba(34,197,94,0.5)', fontWeight: 700 }}>G{stats.groups ?? 0}</span>
          )}
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {NAV.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '9px 12px', borderRadius: 10,
              textDecoration: 'none',
              background: isActive ? `linear-gradient(90deg, ${item.color}20, ${item.color}08)` : 'transparent',
              border: `1px solid ${isActive ? item.color + '40' : 'transparent'}`,
              boxShadow: isActive ? `0 2px 12px ${item.color}18` : 'none',
              transition: 'all .18s ease',
              position: 'relative',
            })}
          >
            {({ isActive }) => (
              <>
                {/* active left bar */}
                {isActive && <div style={{ position:'absolute',left:0,top:'20%',bottom:'20%',width:3,borderRadius:'0 3px 3px 0',background:item.color,boxShadow:`0 0 10px ${item.color}` }}/>}

                {/* COLORED icon box — visible for ALL items */}
                <div style={{
                  width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                  background: isActive ? `${item.color}28` : `${item.color}12`,
                  border: `1px solid ${isActive ? item.color + '55' : item.color + '28'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? `0 0 18px ${item.color}30` : 'none',
                  transition: 'all .18s',
                }}>
                  <item.icon size={15} color={isActive ? item.color : item.dim} strokeWidth={isActive ? 2.2 : 1.8}/>
                </div>

                {/* label */}
                <span style={{
                  flex: 1,
                  fontFamily: "'Rajdhani',sans-serif", fontSize: 13, fontWeight: 700,
                  letterSpacing: '.1em',
                  color: isActive ? item.color : 'rgba(148,163,184,0.75)',
                  transition: 'color .18s',
                }}>
                  {item.label}
                </span>

                {/* active arrow */}
                {isActive && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}`, flexShrink: 0 }}/>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Stats row ── */}
      {stats && (
        <div style={{ margin: '0 10px 10px', padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Signal size={10} color="rgba(148,163,184,0.4)"/>
            <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 8, fontWeight: 700, letterSpacing: '.2em', color: 'rgba(148,163,184,0.4)' }}>SYSTEM</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, textAlign: 'center' }}>
            {[
              { v: stats.users ?? 0,   l: 'HUNTERS', c: '#3b82f6' },
              { v: stats.groups ?? 0,  l: 'GUILDS',  c: '#a855f7' },
              { v: connected ? 'ON':'OFF', l: 'NET', c: connected ? '#22c55e' : '#ef4444' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 16, fontWeight: 800, color: s.c, lineHeight: 1, textShadow: `0 0 12px ${s.c}70` }}>{s.v}</div>
                <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(148,163,184,0.35)', marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SysTime/>
    </aside>
  )

  return (
    <div className="shell">
      {sidebar}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)}/>}

      <div className="main-content">
        {/* ── Topbar ── */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
          background: '#020912', borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0, zIndex: 30, position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {/* bottom colored accent */}
          <div style={{ position:'absolute',bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${accentColor}aa,transparent)`,transition:'background .4s' }}/>

          <button className="sidebar-toggle" style={{ position:'static' }} onClick={() => setOpen(o=>!o)}>
            {open ? <X size={16}/> : <Menu size={16}/>}
          </button>

          {/* Page label */}
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ width:8,height:8,borderRadius:2,background:accentColor,boxShadow:`0 0 10px ${accentColor}`,flexShrink:0,transition:'all .4s' }}/>
            <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:10,fontWeight:700,letterSpacing:'.18em',color:'rgba(148,163,184,0.5)' }}>SYSTEM</span>
            <span style={{ color:'rgba(255,255,255,0.2)',fontSize:14 }}>›</span>
            <span style={{ fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:800,letterSpacing:'.14em',color:accentColor,textShadow:`0 0 14px ${accentColor}`,transition:'all .4s' }}>{pageLabel}</span>
          </div>

          <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:8 }}>
            {stats && (
              <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',border:'1px solid rgba(168,85,247,0.25)',borderRadius:8,background:'rgba(168,85,247,0.08)' }}>
                <Zap size={10} color="#a855f7"/>
                <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:'#a855f7',letterSpacing:'.08em' }}>{stats.users ?? 0} USERS</span>
              </div>
            )}
            {connected ? (
              <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',border:'1px solid rgba(34,197,94,0.35)',borderRadius:8,background:'rgba(34,197,94,0.10)',boxShadow:'0 0 16px rgba(34,197,94,0.12)' }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 8px #22c55e',animation:'livePulse 1.8s ease-in-out infinite' }}/>
                <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:'#22c55e',letterSpacing:'.10em' }}>ONLINE</span>
              </div>
            ) : status && (
              <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 12px',border:'1px solid rgba(239,68,68,0.28)',borderRadius:8,background:'rgba(239,68,68,0.09)' }}>
                <div style={{ width:6,height:6,borderRadius:'50%',background:'#ef4444' }}/>
                <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:'#ef4444',letterSpacing:'.10em' }}>OFFLINE</span>
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
