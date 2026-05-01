import { useEffect, useState } from 'react'
  import { Users, MessagesSquare, Zap, Clock, Activity, AlertTriangle } from 'lucide-react'
  import type { LucideProps } from 'lucide-react'
  import type { ForwardRefExoticComponent, RefAttributes } from 'react'
  import { getStatus, getStats, getActivityHistory, getMaintenance, postMaintenance, isConfigured } from '../api'
  import type { BotStatus, BotStats, ActivityEvent, MaintenanceState } from '../api'
  import { formatUptime, formatNumber, timeAgo } from '../lib/utils'

  type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>

  function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: string; icon: LucideIcon; color: string
  }) {
    return (
      <div className="panel panel-accent" style={{ padding: '18px 20px', position:'relative' }}>
        <span className="br-bl" style={{ position:'absolute' }} /><span className="br-br" style={{ position:'absolute' }} />
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div className="sys-label" style={{ marginBottom:8 }}>{label}</div>
            <div className="stat-value" style={{ color, textShadow:`0 0 20px ${color}60` }}>{value}</div>
          </div>
          <div style={{ padding:8, border:`1px solid ${color}30`, background:`${color}10` }}>
            <Icon size={18} style={{ color }} />
          </div>
        </div>
      </div>
    )
  }

  function EventBadge({ type }: { type: string }) {
    const map: Record<string, string> = { msg:'badge-blue', cmd:'badge-purple', mod:'badge-amber', conn:'badge-green', err:'badge-red' }
    const labels: Record<string, string> = { msg:'MSG', cmd:'CMD', mod:'MOD', conn:'CONN', err:'ERR' }
    return <span className={`badge ${map[type]??'badge-blue'}`}>{labels[type]??type.toUpperCase()}</span>
  }

  export default function Overview() {
    const [status, setStatus] = useState<BotStatus | null>(null)
    const [stats, setStats] = useState<BotStats | null>(null)
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [maint, setMaint] = useState<MaintenanceState | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const load = async () => {
        try {
          const [s, st, ev, m] = await Promise.allSettled([getStatus(), getStats(), getActivityHistory(), getMaintenance()])
          if (s.status==='fulfilled') setStatus(s.value)
          if (st.status==='fulfilled') setStats(st.value)
          if (ev.status==='fulfilled') setEvents(ev.value.slice(0,15))
          if (m.status==='fulfilled') setMaint(m.value)
        } finally { setLoading(false) }
      }
      load(); const id = setInterval(load, 12000); return () => clearInterval(id)
    }, [])

    if (!isConfigured()) return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:320,gap:16,textAlign:'center'}}>
        <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:'1rem',color:'var(--amber)',letterSpacing:'0.12em',textTransform:'uppercase',textShadow:'0 0 12px rgba(255,149,0,0.5)'}}>
          [ VITE_API_URL NO CONFIGURADA ]
        </div>
        <div className="sys-label">
          VE A VERCEL → SETTINGS → ENVIRONMENT VARIABLES Y AGREGA:
        </div>
        <div style={{padding:'12px 20px',background:'rgba(0,0,0,0.6)',border:'1px solid rgba(0,195,255,0.2)',fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:'var(--blue)',letterSpacing:'0.05em'}}>
          VITE_API_URL = https://tu-bot.railway.app
        </div>
        <div className="sys-label">LUEGO REDEPLOY EN VERCEL</div>
      </div>
    )

    if (loading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:256 }}>
        <div style={{ width:36, height:36, border:'2px solid rgba(0,195,255,0.1)',
                      borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      </div>
    )

    const uptime = stats?.uptime ?? 0
    const connected = status?.connected ?? false

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {maint?.enabled && (
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px',
                        background:'rgba(255,149,0,0.06)', border:'1px solid rgba(255,149,0,0.28)',
                        color:'var(--amber)', fontFamily:"'Share Tech Mono',monospace", fontSize:11 }}>
            <AlertTriangle size={13} />
            [ MODO MANTENIMIENTO ] /// {maint.message}
          </div>
        )}

        {/* Status banner */}
        <div className="panel" style={{ padding:'18px 22px', position:'relative',
                                        borderColor: connected ? 'rgba(0,255,170,0.18)' : 'rgba(255,26,60,0.18)',
                                        background: connected ? 'rgba(0,255,170,0.02)' : 'rgba(255,26,60,0.02)' }}>
          <span className="br-bl" style={{ position:'absolute' }} /><span className="br-br" style={{ position:'absolute' }} />
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:12, height:12, borderRadius:'50%', flexShrink:0,
                          background: connected ? 'var(--green)' : 'var(--red)',
                          boxShadow: connected ? '0 0 16px var(--green), 0 0 4px var(--green)' : '0 0 16px var(--red), 0 0 4px var(--red)',
                          animation:'pulse-glow 2s infinite' }} />
            <div>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:'1rem',
                            color: connected ? 'var(--green)' : 'var(--red)',
                            textShadow: connected ? '0 0 12px rgba(0,255,170,0.6)' : '0 0 12px rgba(255,26,60,0.6)',
                            letterSpacing:'0.08em', textTransform:'uppercase' }}>
                {connected ? '[ SISTEMA OPERACIONAL ]' : '[ SISTEMA OFFLINE ]'}
              </div>
              <div className="sys-label" style={{ marginTop:4 }}>
                {connected
                  ? `STATUS: ACTIVE /// UPTIME: ${formatUptime(uptime)}`
                  : 'STATUS: AWAITING_CONNECTION /// STANDBY_MODE'}
              </div>
            </div>
            {connected && (
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, padding:'5px 14px',
                            background:'rgba(0,255,170,0.06)', border:'1px solid rgba(0,255,170,0.2)',
                            color:'var(--green)', fontFamily:"'Share Tech Mono',monospace", fontSize:11 }}>
                <Activity size={11} /> LIVE
              </div>
            )}
          </div>
        </div>

        {/* Stat grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10 }}>
          <StatCard label="[ USUARIOS ]" value={formatNumber(stats?.users ?? 0)} icon={Users} color="var(--blue)" />
          <StatCard label="[ GRUPOS ]" value={formatNumber(stats?.groups ?? 0)} icon={MessagesSquare} color="var(--violet)" />
          <StatCard label="[ COMANDOS HOY ]" value={formatNumber(stats?.commandsToday ?? 0)} icon={Zap} color="var(--amber)" />
          <StatCard label="[ UPTIME ]" value={formatUptime(uptime)} icon={Clock} color="var(--green)" />
        </div>

        {/* Activity + sys status */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)', gap:14 }}>
            <div className="panel panel-accent" style={{ padding:'20px 22px', position:'relative' }}>
              <span className="br-bl" style={{ position:'absolute' }} /><span className="br-br" style={{ position:'absolute' }} />
              <div style={{ marginBottom:14 }}>
                <div className="sys-label" style={{ color:'var(--blue)', opacity:0.7 }}>SYS://ACTIVITY_LOG</div>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'0.72rem', fontWeight:700,
                              letterSpacing:'0.14em', textTransform:'uppercase', color:'white', marginTop:3 }}>
                  ACTIVIDAD RECIENTE
                </div>
                <div className="hud-divider" style={{ marginTop:10 }} />
              </div>
              {events.length === 0 ? (
                <div className="sys-label" style={{ textAlign:'center', padding:'32px 0' }}>/// NO HAY EVENTOS ///</div>
              ) : events.map((ev, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 0',
                                      borderBottom:'1px solid rgba(0,195,255,0.05)' }}>
                  <EventBadge type={ev.type} />
                  <div style={{ flex:1, fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:'var(--tx2)',
                                 overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>
                    {typeof ev.data==='object'
                      ? Object.values(ev.data).filter(Boolean).slice(0,2).join(' · ')
                      : String(ev.data)}
                  </div>
                  <span className="sys-label" style={{ whiteSpace:'nowrap', flexShrink:0 }}>{timeAgo(ev.ts)}</span>
                </div>
              ))}
            </div>

            <div className="panel panel-accent" style={{ padding:'20px 22px', position:'relative' }}>
              <span className="br-bl" style={{ position:'absolute' }} /><span className="br-br" style={{ position:'absolute' }} />
              <div style={{ marginBottom:14 }}>
                <div className="sys-label" style={{ color:'var(--blue)', opacity:0.7 }}>SYS://DIAGNOSTICS</div>
                <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:'0.72rem', fontWeight:700,
                              letterSpacing:'0.14em', textTransform:'uppercase', color:'white', marginTop:3 }}>
                  SISTEMA
                </div>
                <div className="hud-divider" style={{ marginTop:10 }} />
              </div>
              {[
                { label:'CONEXIÓN WA', ok: status?.connected },
                { label:'SOCKET',      ok: status?.ready },
                { label:'QR ACTIVO',   ok: status?.hasQR },
                { label:'PAREADO',     ok: status?.hasPairingCode },
              ].map(({ label, ok }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                                          padding:'8px 0', borderBottom:'1px solid rgba(0,195,255,0.05)' }}>
                  <span className="sys-label">{label}</span>
                  <span className={`badge ${ok ? 'badge-green' : 'badge-red'}`}>{ok ? 'OK' : 'ERR'}</span>
                </div>
              ))}
              {maint !== null && (
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid rgba(0,195,255,0.08)' }}>
                  <div className="sys-label" style={{ marginBottom:8 }}>MODO MANT.</div>
                  <button className={`btn ${maint.enabled ? 'btn-danger' : 'btn-ghost'}`}
                          style={{ width:'100%', fontSize:11 }}
                          onClick={async () => {
                            await postMaintenance({ enabled: !maint.enabled })
                            setMaint(prev => prev ? { ...prev, enabled: !prev.enabled } : null)
                          }}>
                    {maint.enabled ? 'DESACTIVAR' : 'ACTIVAR'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  