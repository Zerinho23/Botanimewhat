import { useState, useEffect } from 'react'
  import { NavLink, Outlet, useLocation } from 'react-router-dom'
  import {
    LayoutDashboard, Users, MessageSquare, Settings,
    Shield, Activity, Wifi, Menu, X, Bot, Terminal
  } from 'lucide-react'
  import { getStatus, getStats, isConfigured, type BotStatus, type BotStats } from '../api'

  const NAV = [
    { to: '/',           icon: LayoutDashboard, label: 'INICIO',      exact: true, num: '01' },
    { to: '/users',      icon: Users,           label: 'USUARIOS',                 num: '02' },
    { to: '/groups',     icon: MessageSquare,   label: 'GRUPOS',                   num: '03' },
    { to: '/moderation', icon: Shield,          label: 'MODERACIÓN',               num: '04' },
    { to: '/activity',   icon: Activity,        label: 'ACTIVIDAD',                num: '05' },
    { to: '/config',     icon: Settings,        label: 'CONFIG',                   num: '06' },
    { to: '/connect',    icon: Wifi,            label: 'CONEXIÓN',                 num: '07' },
    { to: '/commands',   icon: Terminal,        label: 'COMANDOS',                 num: '08' },
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
      <div className="sidebar-footer">
        <div className="sidebar-clock">
          {hh}
          <span style={{ opacity: t.getSeconds()%2===0?1:.15, transition:'opacity .1s' }}>:</span>
          {mm}
          <span style={{ fontSize:11,color:'var(--tx3)',marginLeft:5,fontWeight:400,fontFamily:"'Orbitron',sans-serif" }}>{ss}</span>
        </div>
        <div className="sidebar-date">SYS · {date.toUpperCase()}</div>
      </div>
    )
  }

  function StatusChip({ status, stats }: { status: BotStatus|null; stats: BotStats|null }) {
    if (!isConfigured()) return (
      <div className="sidebar-status loading">
        <div className="live-dot"/>
        <span>API SIN CONFIG</span>
      </div>
    )
    if (!status) return (
      <div className="sidebar-status loading">
        <div className="live-dot"/>
        <span>CONECTANDO…</span>
      </div>
    )
    return (
      <div className={`sidebar-status ${status.connected?'online':'offline'}`}>
        <div className="live-dot"/>
        <span>{status.connected?'HUNTER: ONLINE':'DESCONECTADO'}</span>
        {stats && status.connected && (
          <span style={{marginLeft:'auto',fontSize:9,opacity:.55,fontFamily:"'Orbitron',sans-serif"}}>
            G{stats.groups??0}
          </span>
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

    const pageLabel = Object.entries(PAGE_LABELS)
      .sort((a,b) => b[0].length - a[0].length)
      .find(([k]) => k==='/' ? location.pathname==='/' : location.pathname.startsWith(k))?.[1] ?? 'SYSTEM'

    const sidebar = (
      <aside className={`sidebar ${open?'open':''}`}>

        {/* ── Logo Header ── */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-title">
            <div className="logo-diamond"/>
            BOT SYSTEM
          </div>
          <div className="sidebar-logo-sub">
            <span style={{color:'var(--blue)',opacity:.5}}>■</span>
            <span>[ BOTANIME · AWAKENED ]</span>
          </div>
        </div>

        {/* ── Hunter Status ── */}
        <StatusChip status={status} stats={stats}/>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav">
          {/* Section label */}
          <div style={{
            padding:'6px 12px 4px',
            fontFamily:"'Orbitron',sans-serif",
            fontSize:8,
            letterSpacing:'.22em',
            color:'var(--tx3)',
            display:'flex',
            alignItems:'center',
            gap:6
          }}>
            <span style={{color:'var(--blue)',opacity:.4}}>■</span>
            <span>[ NAVIGATION ]</span>
          </div>

          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-link ${isActive?'active':''}`}
              onClick={() => setOpen(false)}
            >
              <item.icon size={14} strokeWidth={1.8}/>
              <span style={{flex:1}}>{item.label}</span>
              <span className="nav-num">{item.num}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Mini stats ── */}
        {stats && (
          <div className="sidebar-stats" style={{margin:'4px 10px 6px',borderRadius:'var(--radius)',border:'1px solid var(--border)',background:'rgba(30,144,255,.02)',padding:'10px 12px',position:'relative'}}>
            {/* stats header */}
            <div style={{
              fontFamily:"'Orbitron',sans-serif",
              fontSize:8,
              letterSpacing:'.18em',
              color:'var(--tx3)',
              marginBottom:8,
              display:'flex',
              alignItems:'center',
              gap:6
            }}>
              <span style={{color:'var(--blue)',opacity:.4}}>■</span>
              <span>[ SYSTEM STATUS ]</span>
            </div>
            <div className="sidebar-stats-grid">
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-val">{stats.users??0}</div>
                <div className="sidebar-stat-label">HUNTERS</div>
              </div>
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-val">{stats.groups??0}</div>
                <div className="sidebar-stat-label">GUILDS</div>
              </div>
              <div className="sidebar-stat-item">
                <div className="sidebar-stat-val" style={{color:stats.connected?'var(--green2)':'var(--red2)',fontSize:11}}>
                  {stats.connected?'LIVE':'OFF'}
                </div>
                <div className="sidebar-stat-label">NET</div>
              </div>
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

        <div className="main-content" style={{marginLeft:0}}>

          {/* ── Topbar ── */}
          <header className="topbar">
            <button className="sidebar-toggle" onClick={() => setOpen(o=>!o)}>
              {open ? <X size={16}/> : <Menu size={16}/>}
            </button>

            {/* Bot icon */}
            <div style={{
              width:28,height:28,
              borderRadius:'var(--radius)',
              background:'rgba(30,144,255,.08)',
              border:'1px solid var(--border2)',
              display:'flex',alignItems:'center',justifyContent:'center',
              flexShrink:0
            }}>
              <Bot size={13} color="var(--blue)"/>
            </div>

            {/* Page title — [ SYSTEM ] PAGE format */}
            <div className="topbar-title">
              <span style={{
                fontFamily:"'Orbitron',sans-serif",
                fontSize:9,
                fontWeight:700,
                letterSpacing:'.2em',
                color:'var(--tx3)',
              }}>
                <span style={{color:'var(--blue)',opacity:.7}}>■</span>
                {' [ SYSTEM ] '}
              </span>
              <span className="topbar-page-label">{pageLabel}</span>
            </div>

            {/* Online badge */}
            {status?.connected && (
              <div style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'4px 10px',
                border:'1px solid rgba(30,144,255,.25)',
                borderRadius:'var(--radius)',
                background:'rgba(30,144,255,.07)',
                fontFamily:"'Orbitron',sans-serif",
                fontSize:8,
                fontWeight:700,
                letterSpacing:'.16em',
                color:'var(--blue)',
                flexShrink:0,
              }}>
                <div style={{width:5,height:5,borderRadius:'50%',background:'var(--blue)',boxShadow:'0 0 6px var(--blue)',animation:'livePulse 1.6s ease-in-out infinite'}}/>
                ONLINE
              </div>
            )}
          </header>

          <div className="page-content animate-fade-up">
            <Outlet/>
          </div>
        </div>
      </div>
    )
  }
  