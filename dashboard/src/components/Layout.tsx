import { useState, useEffect } from 'react'
  import { NavLink, Outlet, useLocation } from 'react-router-dom'
  import {
    LayoutDashboard, Users, Group, Settings, Shield, Activity,
    Wifi, Menu, X, Bot, ChevronRight, Cpu
  } from 'lucide-react'
  import { getStatus, getStats, isConfigured } from '../api'

  const SECTIONS = [
    {
      label: 'OPERACIONES',
      links: [
        { to: '/',          icon: LayoutDashboard, label: 'Dashboard'   },
        { to: '/users',     icon: Users,           label: 'Usuarios'    },
        { to: '/groups',    icon: Group,           label: 'Grupos'      },
        { to: '/activity',  icon: Activity,        label: 'Actividad'   },
      ],
    },
    {
      label: 'SISTEMA · OWNER',
      links: [
        { to: '/moderation',icon: Shield,          label: 'Moderación'  },
        { to: '/config',    icon: Settings,        label: 'Configuración'},
        { to: '/connect',   icon: Wifi,            label: 'Conexión'    },
      ],
    },
  ]

  export default function Layout() {
    const [open, setOpen]         = useState(false)
    const [online, setOnline]     = useState<boolean | null>(null)
    const [users, setUsers]       = useState<number | null>(null)
    const location                = useLocation()

    useEffect(() => { setOpen(false) }, [location])

    useEffect(() => {
      if (!isConfigured()) return
      const poll = async () => {
        try {
          const [st, stats] = await Promise.all([getStatus(), getStats()])
          setOnline(st.connected)
          setUsers(stats.users)
        } catch { setOnline(false) }
      }
      poll()
      const id = setInterval(poll, 15000)
      return () => clearInterval(id)
    }, [])

    return (
      <div style={{ display:'flex', minHeight:'100vh' }}>
        {/* Overlay mobile */}
        {open && (
          <div onClick={() => setOpen(false)}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:40 }} />
        )}

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${open ? 'open' : ''}`}
          style={{ position:'fixed', top:0, left:0, height:'100vh',
                   display:'flex', flexDirection:'column', zIndex:50,
                   width:220, minWidth:220 }}>

          {/* Logo */}
          <div style={{ padding:'20px 16px 14px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:8,
                background:'linear-gradient(135deg,#e53935,#b71c1c)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bot size={18} color="white" />
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'white', lineHeight:1.2 }}>Panel Admin</div>
                <div style={{ fontSize:10, color:'rgba(240,240,245,.4)' }}>BotAnime</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex:1, overflow:'auto', paddingBottom:12 }}>
            {SECTIONS.map(sec => (
              <div key={sec.label}>
                <div className="nav-section-label">{sec.label}</div>
                {sec.links.map(l => (
                  <NavLink key={l.to} to={l.to} end={l.to === '/'}
                    className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon"><l.icon size={15} /></span>
                    {l.label}
                    <ChevronRight size={12} style={{ marginLeft:'auto', opacity:.3 }} />
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Bottom status */}
          <div style={{ padding:'12px 14px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,.04)', borderRadius:8, padding:'8px 10px' }}>
              <Cpu size={14} color={online === true ? '#10b981' : online === false ? '#e53935' : 'rgba(255,255,255,.3)'} />
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:'rgba(240,240,245,.7)' }}>
                  {!isConfigured() ? 'Sin conexión' : online === null ? 'Conectando…' : online ? 'Bot Online' : 'Bot Offline'}
                </div>
                {users !== null && (
                  <div style={{ fontSize:10, color:'rgba(240,240,245,.35)' }}>{users} usuarios</div>
                )}
              </div>
              <div style={{ marginLeft:'auto', width:7, height:7, borderRadius:'50%',
                background: online ? '#10b981' : online === false ? '#e53935' : '#555',
                boxShadow: online ? '0 0 6px #10b981' : 'none',
                animation: online ? 'pulse 2s infinite' : 'none' }} />
            </div>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div style={{ flex:1, marginLeft:220, display:'flex', flexDirection:'column', minWidth:0 }}>

          {/* Top bar */}
          <header style={{ height:52, borderBottom:'1px solid rgba(255,255,255,.07)',
            display:'flex', alignItems:'center', gap:12, padding:'0 20px',
            background:'rgba(9,9,12,.85)', backdropFilter:'blur(8px)',
            position:'sticky', top:0, zIndex:30 }}>
            <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm"
              style={{ padding:'6px 8px', display:'none' }}>
              {open ? <X size={16}/> : <Menu size={16}/>}
            </button>

            {/* Breadcrumb */}
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(240,240,245,.4)' }}>
              <span style={{ color:'rgba(240,240,245,.6)' }}>BotAnime</span>
              <ChevronRight size={12} />
              <span style={{ color:'white', fontWeight:600 }}>
                {SECTIONS.flatMap(s=>s.links).find(l => l.to === location.pathname)?.label ?? 'Dashboard'}
              </span>
            </div>

            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
              {online !== null && (
                <span className={`status-pill ${online ? 'online' : 'offline'}`}>
                  <span style={{ width:5, height:5, borderRadius:'50%',
                    background: online ? '#10b981' : '#e53935' }} />
                  {online ? 'Online' : 'Offline'}
                </span>
              )}
              <span className="badge badge-red">OWNER</span>
              <div style={{ width:30, height:30, borderRadius:'50%',
                background:'linear-gradient(135deg,#8b5cf6,#6366f1)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700 }}>Z</div>
            </div>
          </header>

          {/* Page content */}
          <main style={{ flex:1, padding:'24px', minWidth:0 }}>
            <Outlet />
          </main>
        </div>
      </div>
    )
  }
  