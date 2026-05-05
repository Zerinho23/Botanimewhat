import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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
  '/': 'Status Window', '/users': 'Hunters', '/groups': 'Guilds',
  '/moderation': 'Moderación', '/activity': 'Event Log',
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
    <div style={{
      padding: '14px 20px',
      borderTop: '1px solid rgba(220,38,38,0.12)',
      background: 'rgba(220,38,38,0.02)',
      flexShrink: 0,
    }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        letterSpacing: '.18em', color: 'rgba(220,38,38,0.35)', marginBottom: 6,
        textTransform: 'uppercase',
      }}>SYS · CLOCK</div>
      <div style={{
        fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900,
        color: '#F1F0FF', letterSpacing: '.04em', lineHeight: 1,
        textShadow: '0 0 20px rgba(220,38,38,0.25)',
      }}>
        {hh}
        <span style={{ opacity: blink ? 1 : 0.08, transition: 'opacity .1s', color: '#DC2626' }}>:</span>
        {mm}
        <span style={{ fontSize: 13, color: 'rgba(220,38,38,0.40)', marginLeft: 6, fontWeight: 600 }}>{ss}</span>
      </div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        letterSpacing: '.14em', color: 'rgba(220,38,38,0.22)', marginTop: 5,
      }}>
        {t.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase()}
      </div>
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

      {/* top red accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 2,
        background: 'linear-gradient(90deg, transparent, #DC2626 30%, #F97316 55%, #DC2626 75%, transparent)',
        boxShadow: '0 0 14px rgba(220,38,38,0.7)',
      }} />

      {/* ── Logo ── */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(220,38,38,0.10)', flexShrink: 0, position: 'relative' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
          letterSpacing: '.20em', color: 'rgba(220,38,38,0.35)',
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(220,38,38,0.25))' }} />
          [ SYSTEM ]
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(220,38,38,0.25), transparent)' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* hex logo */}
          <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(220,38,38,0.45), rgba(249,115,22,0.22))',
              clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
              boxShadow: '0 0 24px rgba(220,38,38,0.50), 0 0 48px rgba(220,38,38,0.18)',
            }} />
            <Zap size={17} color="#DC2626" strokeWidth={1.6} style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 6px rgba(220,38,38,0.9))' }} />
          </div>
          <div>
            <div style={{
              fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 900,
              letterSpacing: '.14em', color: '#F1F0FF',
              textShadow: '0 0 24px rgba(220,38,38,0.40)',
            }}>BOTANIME</div>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
              letterSpacing: '.22em', color: 'rgba(249,115,22,0.55)', marginTop: 4,
            }}>SYS://BOT.CORE</div>
          </div>
        </div>

        {/* connection status pill */}
        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 12px', borderRadius: 4,
          border: `1px solid ${!isConfigured() ? 'rgba(220,38,38,0.14)' : connected ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.25)'}`,
          background: !isConfigured() ? 'rgba(220,38,38,0.04)' : connected ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {connected && (
              <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.35)', animation: 'pulseRing 2s ease-out infinite' }} />
            )}
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: !isConfigured() ? 'rgba(220,38,38,0.35)' : connected ? '#10B981' : '#EF4444',
              boxShadow: connected ? '0 0 10px rgba(16,185,129,0.7)' : 'none',
              animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
            }} />
          </div>
          <span style={{
            fontFamily: "'Rajdhani', sans-serif", fontSize: 12, fontWeight: 700,
            letterSpacing: '.08em',
            color: !isConfigured() ? 'rgba(220,38,38,0.45)' : connected ? '#10B981' : '#EF4444',
          }}>
            {!isConfigured() ? 'Sin configurar' : connected ? 'Online' : 'Desconectado'}
          </span>
          {stats?.groups != null && connected && (
            <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron', monospace", fontSize: 8, color: 'rgba(16,185,129,0.40)', fontWeight: 700 }}>
              G{stats.groups}
            </span>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0 6px' }}>
        <div style={{
          padding: '6px 20px 10px',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
          letterSpacing: '.20em', color: 'rgba(220,38,38,0.28)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>/// NAV</span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(220,38,38,0.14), transparent)' }} />
        </div>

        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.exact} onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 11,
              padding: '9px 16px 9px 20px',
              textDecoration: 'none', position: 'relative',
              transition: 'all .16s', marginBottom: 1,
              borderLeft: `2px solid ${isActive ? '#DC2626' : 'transparent'}`,
              background: isActive
                ? 'linear-gradient(90deg, rgba(220,38,38,0.12), rgba(220,38,38,0.02))'
                : 'transparent',
            })}
          >
            {({ isActive }) => (
              <>
                {/* icon box */}
                <div style={{
                  width: 32, height: 32, borderRadius: 4, flexShrink: 0,
                  background: isActive ? 'rgba(220,38,38,0.18)' : 'rgba(220,38,38,0.05)',
                  border: `1px solid ${isActive ? 'rgba(220,38,38,0.45)' : 'rgba(220,38,38,0.12)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 16px rgba(220,38,38,0.25)' : 'none',
                  transition: 'all .16s',
                }}>
                  <item.icon size={13}
                    color={isActive ? '#EF4444' : 'rgba(220,38,38,0.38)'}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </div>

                {/* text */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700,
                    letterSpacing: '.06em',
                    color: isActive ? '#F1F0FF' : 'rgba(139,139,170,0.70)',
                    transition: 'color .16s',
                  }}>
                    {item.label}
                  </div>
                  {isActive && (
                    <div style={{
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                      letterSpacing: '.10em', color: 'rgba(220,38,38,0.40)', marginTop: 1,
                    }}>
                      {item.sub}
                    </div>
                  )}
                </div>

                {/* active dot */}
                {isActive && (
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                    background: '#DC2626', boxShadow: '0 0 10px rgba(220,38,38,0.9)',
                    animation: 'livePulse 2.5s ease-in-out infinite',
                  }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Mini stats ── */}
      {stats && (
        <div style={{
          margin: '0 14px 12px',
          padding: '12px 14px',
          border: '1px solid rgba(220,38,38,0.12)',
          borderRadius: 4,
          background: 'rgba(220,38,38,0.02)',
          position: 'relative',
        }}>
          {/* top-left bracket */}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 9, height: 9, borderTop: '1px solid rgba(220,38,38,0.50)', borderLeft: '1px solid rgba(220,38,38,0.50)' }} />
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderBottom: '1px solid rgba(220,38,38,0.50)', borderRight: '1px solid rgba(220,38,38,0.50)' }} />

          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
            letterSpacing: '.18em', color: 'rgba(220,38,38,0.30)', marginBottom: 10,
          }}>[ SYS·STATUS ]</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            {[
              { v: stats.users ?? 0,                  l: 'HUNTERS', c: '#EF4444'  },
              { v: stats.groups ?? 0,                  l: 'GUILDS',  c: '#A855F7'  },
              { v: connected ? 'ON' : 'OFF',           l: 'NET',     c: connected ? '#10B981' : '#EF4444' },
            ].map(s => (
              <div key={s.l}>
                <div style={{
                  fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 900,
                  color: s.c, lineHeight: 1, textShadow: `0 0 12px ${s.c}88`,
                }}>{s.v}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
                  letterSpacing: '.12em', color: 'rgba(220,38,38,0.28)', marginTop: 5,
                }}>{s.l}</div>
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
      {sidebar}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <div className="main-content">

        {/* ── Topbar ── */}
        <header className="topbar">
          <button className="sidebar-toggle" onClick={() => setOpen(o => !o)}>
            {open ? <X size={15} /> : <Menu size={15} />}
          </button>

          {/* breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
              letterSpacing: '.14em', color: 'rgba(220,38,38,0.45)',
            }}>BOTANIME</span>
            <span style={{ color: 'rgba(220,38,38,0.28)', fontSize: 12 }}>/</span>
            <span style={{
              fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 800,
              letterSpacing: '.12em', color: '#F1F0FF',
            }}>{pageLabel}</span>
          </div>

          {/* right side */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {stats && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 11px', border: '1px solid rgba(220,38,38,0.18)',
                borderRadius: 4, background: 'rgba(220,38,38,0.05)',
              }}>
                <Users size={9} color="rgba(220,38,38,0.65)" />
                <span style={{
                  fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 700,
                  color: 'rgba(220,38,38,0.80)', letterSpacing: '.08em',
                }}>{stats.users ?? 0}</span>
              </div>
            )}

            {connected != null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 11px',
                border: `1px solid ${connected ? 'rgba(16,185,129,0.28)' : 'rgba(239,68,68,0.22)'}`,
                borderRadius: 4,
                background: connected ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
              }}>
                <div style={{ position: 'relative', display: 'flex' }}>
                  {connected && <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', border: '1px solid rgba(16,185,129,0.35)', animation: 'pulseRing 2s ease-out infinite' }} />}
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: connected ? '#10B981' : '#EF4444',
                    boxShadow: connected ? '0 0 8px rgba(16,185,129,0.7)' : 'none',
                    animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none',
                  }} />
                </div>
                <span style={{
                  fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 700,
                  color: connected ? '#10B981' : '#EF4444', letterSpacing: '.10em',
                }}>{connected ? 'Online' : 'Offline'}</span>
              </div>
            )}

            {connected && (
              <div style={{
                padding: '5px 10px', border: '1px solid rgba(251,191,36,0.30)',
                borderRadius: 4, background: 'rgba(251,191,36,0.07)',
              }}>
                <span style={{
                  fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 900,
                  letterSpacing: '.14em', color: '#FBBF24',
                  animation: 'sRankPulse 2.5s ease-in-out infinite',
                }}>S-RANK</span>
              </div>
            )}
          </div>
        </header>

        <div className="page-content animate-fade-up">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
