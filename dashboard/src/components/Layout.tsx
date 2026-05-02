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

  const HexLogo = () => (
    <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(30,58,255,0.35), rgba(0,153,255,0.25))',
        clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)',
        boxShadow: '0 0 24px rgba(30,58,255,0.5), 0 0 48px rgba(30,58,255,0.18)',
      }}/>
      <div style={{
        position: 'absolute', inset: 7,
        background: 'rgba(30,58,255,0.18)',
        clipPath: 'polygon(50% 0%,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)',
      }}/>
      <Zap size={19} color="#4466ff" strokeWidth={1.6} style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 6px rgba(68,102,255,0.8))' }}/>
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
      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(30,58,255,0.12)', background: 'rgba(30,58,255,0.03)', flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1, background: 'linear-gradient(90deg,transparent,rgba(68,102,255,0.4),transparent)' }}/>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 600, letterSpacing: '.16em', color: 'rgba(68,102,255,0.40)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(68,102,255,0.5)', display: 'inline-block' }}/>
          SYS·CLOCK
        </div>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 24, fontWeight: 900, color: '#e0eaff', letterSpacing: '.04em', lineHeight: 1, textShadow: '0 0 20px rgba(30,58,255,0.35)' }}>
          {hh}<span style={{ opacity: blink ? 1 : 0.07, transition: 'opacity .1s', color: '#4466ff' }}>:</span>{mm}
          <span style={{ fontSize: 13, color: 'rgba(68,102,255,0.45)', marginLeft: 6, fontWeight: 600 }}>{ss}</span>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 500, letterSpacing: '.16em', color: 'rgba(68,102,255,0.28)', marginTop: 5 }}>
          {t.toLocaleDateString('es-MX', { weekday:'short', day:'2-digit', month:'short', year:'numeric' }).toUpperCase()}
        </div>
      </div>
    )
  }

  export default function Layout() {
    const [status, setStatus] = useState<BotStatus|null>(null)
    const [stats,  setStats]  = useState<BotStats|null>(null)
    const [open,   setOpen]   = useState(false)
    const [tick,   setTick]   = useState(0)
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
      ?? 'SYSTEM'
    const connected = status?.connected

    const sidebar = (
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        {/* Top rainbow accent */}
        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(68,102,255,0.9),rgba(0,153,255,1),rgba(68,102,255,0.9),transparent)',boxShadow:'0 0 12px rgba(30,58,255,0.6)',zIndex:1 }}/>

        {/* ── Logo ── */}
        <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid rgba(30,58,255,0.12)', position:'relative', flexShrink:0 }}>
          {/* version tag */}
          <div style={{ position:'absolute',top:10,right:14,fontFamily:"'JetBrains Mono',monospace",fontSize:7,fontWeight:600,letterSpacing:'.14em',color:'rgba(30,58,255,0.30)',background:'rgba(30,58,255,0.06)',border:'1px solid rgba(30,58,255,0.12)',borderRadius:3,padding:'1px 5px' }}>v2.0</div>

          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:600,letterSpacing:'.18em',color:'rgba(68,102,255,0.38)',marginBottom:14,display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(30,58,255,0.25))' }}/>
            [ SYSTEM ]
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(30,58,255,0.25),transparent)' }}/>
          </div>

          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <HexLogo/>
            <div>
              <div style={{ fontFamily:"'Orbitron',monospace",fontSize:15,fontWeight:900,letterSpacing:'.14em',color:'#e0eaff',textShadow:'0 0 24px rgba(30,58,255,0.55)' }}>BOTANIME</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:500,letterSpacing:'.20em',color:'rgba(0,153,255,0.55)',marginTop:4 }}>SYS://BOT.CORE</div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{
            marginTop:14, display:'flex',alignItems:'center',gap:8,
            padding:'8px 12px',
            border:`1px solid ${!isConfigured()?'rgba(30,58,255,0.15)':connected?'rgba(0,255,136,0.28)':'rgba(255,51,85,0.25)'}`,
            borderRadius:4,
            background:`${!isConfigured()?'rgba(30,58,255,0.04)':connected?'rgba(0,255,136,0.06)':'rgba(255,51,85,0.06)'}`,
            position:'relative', overflow:'hidden',
          }}>
            {/* left bar */}
            <div style={{ position:'absolute',left:0,top:'15%',bottom:'15%',width:3,borderRadius:'0 2px 2px 0',background:!isConfigured()?'rgba(30,58,255,0.3)':connected?'#00ff88':'#ff3355',boxShadow:connected?'0 0 10px rgba(0,255,136,0.6)':'none' }}/>

            <div style={{ position:'relative',marginLeft:4 }}>
              {connected && <div style={{ position:'absolute',inset:-3,borderRadius:'50%',border:'1px solid rgba(0,255,136,0.4)',animation:'pulseRing 2s ease-out infinite' }}/>}
              <div style={{ width:7,height:7,borderRadius:'50%',background:!isConfigured()?'rgba(30,58,255,0.4)':connected?'#00ff88':'#ff3355',boxShadow:connected?'0 0 10px rgba(0,255,136,0.7),0 0 20px rgba(0,255,136,0.3)':'none',animation:connected?'livePulse 1.8s ease-in-out infinite':'none' }}/>
            </div>

            <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:700,letterSpacing:'.10em',color:!isConfigured()?'rgba(68,102,255,0.5)':connected?'#00ff88':'#ff3355' }}>
              {!isConfigured()?'SIN CONFIGURAR':connected?'HUNTER: ONLINE':'DESCONECTADO'}
            </span>
            {stats?.groups!=null&&connected&&(
              <span style={{ marginLeft:'auto',fontFamily:"'Orbitron',monospace",fontSize:8,color:'rgba(0,255,136,0.40)',fontWeight:700 }}>G{stats.groups}</span>
            )}
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex:1,overflowY:'auto',padding:'10px 0 6px' }}>
          <div style={{ padding:'4px 18px 10px',fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:600,letterSpacing:'.20em',color:'rgba(30,58,255,0.30)',display:'flex',alignItems:'center',gap:8 }}>
            <span>/// NAVEGACIÓN</span>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(30,58,255,0.15),transparent)' }}/>
          </div>

          {NAV.map((item) => (
            <NavLink
              key={item.to} to={item.to} end={item.exact}
              onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display:'flex',alignItems:'center',gap:10,
                padding:'10px 16px',
                textDecoration:'none',
                borderLeft:isActive?'3px solid rgba(68,102,255,0.85)':'3px solid transparent',
                background:isActive?'linear-gradient(90deg,rgba(30,58,255,0.13),rgba(30,58,255,0.03))':'transparent',
                borderTop:isActive?'1px solid rgba(30,58,255,0.10)':'1px solid transparent',
                borderBottom:isActive?'1px solid rgba(30,58,255,0.10)':'1px solid transparent',
                position:'relative', transition:'all .16s',marginBottom:2,
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && <div style={{ position:'absolute',right:0,top:0,bottom:0,width:1,background:'linear-gradient(180deg,transparent,rgba(68,102,255,0.5),transparent)' }}/>}
                  <ChevronRight size={11} color={isActive?'#4466ff':'rgba(30,58,255,0.25)'} strokeWidth={isActive?2.5:2} style={{ flexShrink:0,transition:'all .16s',transform:isActive?'translateX(2px)':'none' }}/>
                  <div style={{
                    width:30,height:30,borderRadius:4,flexShrink:0,
                    background:isActive?'rgba(30,58,255,0.20)':'rgba(30,58,255,0.05)',
                    border:`1px solid ${isActive?'rgba(68,102,255,0.45)':'rgba(30,58,255,0.12)'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    boxShadow:isActive?'0 0 16px rgba(30,58,255,0.28)':'none',
                    transition:'all .16s',
                  }}>
                    <item.icon size={13} color={isActive?'#4466ff':'rgba(68,102,255,0.38)'} strokeWidth={isActive?2.2:1.8}/>
                  </div>
                  <div style={{ flex:1,overflow:'hidden' }}>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:13,fontWeight:700,letterSpacing:'.10em',color:isActive?'#e0eaff':'rgba(136,152,204,0.60)',transition:'color .16s' }}>
                      {item.label}
                    </div>
                    {isActive&&(
                      <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:500,letterSpacing:'.10em',color:'rgba(68,102,255,0.45)',marginTop:1 }}>
                        {item.sub}
                      </div>
                    )}
                  </div>
                  {isActive&&<div style={{ width:5,height:5,borderRadius:'50%',background:'#4466ff',boxShadow:'0 0 10px rgba(68,102,255,0.9)',flexShrink:0,animation:'livePulse 2.5s ease-in-out infinite' }}/>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Stats mini grid ── */}
        {stats && (
          <div style={{ margin:'0 12px 10px',padding:'12px 14px',border:'1px solid rgba(30,58,255,0.13)',borderRadius:4,background:'rgba(30,58,255,0.03)',position:'relative' }}>
            <div style={{ position:'absolute',top:-1,left:-1,width:10,height:10,borderTop:'1px solid rgba(68,102,255,0.55)',borderLeft:'1px solid rgba(68,102,255,0.55)' }}/>
            <div style={{ position:'absolute',bottom:-1,right:-1,width:10,height:10,borderBottom:'1px solid rgba(68,102,255,0.55)',borderRight:'1px solid rgba(68,102,255,0.55)' }}/>
            <div style={{ position:'absolute',top:0,left:14,right:14,height:1,background:'linear-gradient(90deg,transparent,rgba(68,102,255,0.3),transparent)' }}/>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:600,letterSpacing:'.18em',color:'rgba(30,58,255,0.32)',marginBottom:10 }}>[ SYS·STATUS ]</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,textAlign:'center' }}>
              {[
                { v:stats.users??0,     l:'HUNTERS', c:'#4466ff' },
                { v:stats.groups??0,    l:'GUILDS',  c:'#8855ff' },
                { v:connected?'ON':'OFF',l:'NET',    c:connected?'#00ff88':'#ff3355' },
              ].map(s=>(
                <div key={s.l}>
                  <div style={{ fontFamily:"'Orbitron',monospace",fontSize:16,fontWeight:900,color:s.c,lineHeight:1,textShadow:`0 0 12px ${s.c}90` }}>{s.v}</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:600,letterSpacing:'.12em',color:'rgba(30,58,255,0.28)',marginTop:5 }}>{s.l}</div>
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
        {open&&<div className="sidebar-overlay" onClick={()=>setOpen(false)}/>}

        <div className="main-content">
          {/* ── Topbar ── */}
          <header className="topbar">
            <button className="sidebar-toggle" style={{ position:'static' }} onClick={()=>setOpen(o=>!o)}>
              {open?<X size={15}/>:<Menu size={15}/>}
            </button>

            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:10,fontWeight:600,letterSpacing:'.14em',color:'rgba(68,102,255,0.45)' }}>[ SYSTEM ]</span>
              <span style={{ color:'rgba(30,58,255,0.28)',fontSize:14,lineHeight:1 }}>///</span>
              <span style={{ fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:800,letterSpacing:'.14em',color:'#e0eaff',textShadow:'0 0 18px rgba(30,58,255,0.5)' }}>{pageLabel}</span>
            </div>

            <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:8 }}>
              {stats&&(
                <div style={{ display:'flex',alignItems:'center',gap:6,padding:'5px 11px',border:'1px solid rgba(68,102,255,0.18)',borderRadius:4,background:'rgba(30,58,255,0.06)' }}>
                  <Zap size={9} color="rgba(68,102,255,0.65)"/>
                  <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:'rgba(68,102,255,0.75)',letterSpacing:'.08em' }}>{stats.users??0} USERS</span>
                </div>
              )}
              {connected!=null&&(
                <div style={{
                  display:'flex',alignItems:'center',gap:6,padding:'5px 11px',
                  border:`1px solid ${connected?'rgba(0,255,136,0.28)':'rgba(255,51,85,0.22)'}`,
                  borderRadius:4,
                  background:`${connected?'rgba(0,255,136,0.06)':'rgba(255,51,85,0.06)'}`,
                }}>
                  <div style={{ position:'relative',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    {connected&&<div style={{ position:'absolute',inset:-3,borderRadius:'50%',border:'1px solid rgba(0,255,136,0.35)',animation:'pulseRing 2s ease-out infinite' }}/>}
                    <div style={{ width:6,height:6,borderRadius:'50%',background:connected?'#00ff88':'#ff3355',boxShadow:connected?'0 0 8px rgba(0,255,136,0.7)':'none',animation:connected?'livePulse 1.8s ease-in-out infinite':'none' }}/>
                  </div>
                  <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:connected?'#00ff88':'#ff3355',letterSpacing:'.10em' }}>
                    {connected?'ONLINE':'OFFLINE'}
                  </span>
                </div>
              )}
              {connected&&(
                <div style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 10px',border:'1px solid rgba(255,170,0,0.22)',borderRadius:4,background:'rgba(255,170,0,0.05)' }}>
                  <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:900,letterSpacing:'.14em',color:'#fde047',animation:'sRankPulse 2.5s ease-in-out infinite' }}>◈ S-RANK</span>
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
  