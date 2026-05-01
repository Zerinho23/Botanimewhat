import { useEffect, useState } from 'react'
  import {
    RefreshCw, Users, Group, Activity, MessageSquare, TrendingUp,
    Zap, Star, Shield, Clock, BarChart2, Wifi, WifiOff, AlertCircle
  } from 'lucide-react'
  import {
    getStatus, getStats, getUsers, getActivityHistory, isConfigured,
    type BotStats, type BotStatus, type User, type ActivityEvent
  } from '../api'

  function fmtUptime(s: number) {
    if (!s) return '—'
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    if (h > 24) return `${Math.floor(h/24)}d ${h%24}h`
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  function fmtDate() {
    return new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })
  }

  // Colored metric card
  function MetricCard({
    title, value, sub, change, changeLabel, color, icon: Icon
  }: { title:string; value:string|number; sub?:string; change?:string; changeLabel?:string; color:string; icon:React.ElementType }) {
    return (
      <div className="metric-card animate-fade-up">
        <div className="accent-bar" style={{ background:color }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div className="icon-badge" style={{ background:color+'22' }}>
            <Icon size={16} color={color} />
          </div>
          {change && (
            <span className={`metric-change ${change.startsWith('+') ? 'up' : change.startsWith('-') ? 'down' : 'neu'}`}>
              {change}
            </span>
          )}
        </div>
        <div className="metric-value">{value}</div>
        <div className="metric-label">{title}</div>
        {sub && <div style={{ fontSize:10, color:'rgba(240,240,245,.28)', marginTop:3 }}>{sub}</div>}
        {changeLabel && <div style={{ fontSize:10, color:'rgba(240,240,245,.28)', marginTop:6 }}>{changeLabel}</div>}
      </div>
    )
  }

  // Stat card at the top (3 columns like screenshot)
  function StatCard({ title, value, sub, badge, color }: { title:string; value:string|number; sub?:string; badge?:string; color:string }) {
    return (
      <div className="card" style={{ flex:1 }}>
        <div className="card-header">
          <div className="card-title" style={{ fontSize:10 }}>{title}</div>
          {badge && <span className="badge badge-green" style={{ fontSize:9 }}>{badge}</span>}
        </div>
        <div style={{ padding:'0 16px 16px' }}>
          <div style={{ fontSize:'1.6rem', fontWeight:700, color, lineHeight:1 }}>{value}</div>
          {sub && <div style={{ fontSize:11, color:'var(--tx3)', marginTop:4 }}>{sub}</div>}
        </div>
      </div>
    )
  }

  export default function Overview() {
    const [status, setStatus]   = useState<BotStatus | null>(null)
    const [stats,  setStats]    = useState<BotStats  | null>(null)
    const [users,  setUsers]    = useState<User[]>([])
    const [events, setEvents]   = useState<ActivityEvent[]>([])
    const [loading,setLoading]  = useState(true)
    const [error,  setError]    = useState<string|null>(null)
    const [refreshing, setRef]  = useState(false)

    const load = async (showRef = false) => {
      if (!isConfigured()) { setLoading(false); return }
      if (showRef) setRef(true)
      setError(null)
      try {
        const [st, sa, us, ev] = await Promise.allSettled([
          getStatus(), getStats(), getUsers(), getActivityHistory()
        ])
        if (st.status === 'fulfilled') setStatus(st.value)
        if (sa.status === 'fulfilled') setStats(sa.value)
        if (us.status === 'fulfilled') setUsers(us.value)
        if (ev.status === 'fulfilled') setEvents(ev.value)
        if (st.status === 'rejected') setError('No se pudo conectar al bot')
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally { setLoading(false); setRef(false) }
    }

    useEffect(() => { load() }, [])

    if (!isConfigured()) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        height:320, gap:14, textAlign:'center' }}>
        <AlertCircle size={32} color="var(--gold)" />
        <div style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'.08em' }}>
          VITE_API_URL no configurada
        </div>
        <div style={{ fontSize:12, color:'var(--tx3)' }}>
          Ve a Vercel → Settings → Environment Variables y agrega:
        </div>
        <div style={{ padding:'10px 16px', background:'var(--card)',
          border:'1px solid rgba(255,255,255,.1)', borderRadius:8,
          fontFamily:"'JetBrains Mono',monospace", fontSize:12, color:'var(--blue)' }}>
          VITE_API_URL = https://tu-bot.railway.app
        </div>
        <div style={{ fontSize:11, color:'var(--tx3)' }}>Luego haz Redeploy en Vercel</div>
      </div>
    )

    if (loading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, gap:10, color:'var(--tx3)' }}>
        <RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:13 }}>Conectando al bot…</span>
      </div>
    )

    const online   = status?.connected ?? false
    const uptime   = stats?.uptime ?? 0
    const totalU   = stats?.users ?? 0
    const totalG   = stats?.groups ?? 0
    const topUsers = [...users].sort((a,b)=>(b.xp||0)-(a.xp||0)).slice(0,5)
    const todayCmds = users.reduce((acc,u)=>acc+(u.commands||0),0)
    const todayMsgs = users.reduce((acc,u)=>acc+(u.messages||0),0)
    const recentEvt = events.slice(0,6)

    const rankLabel = (lv:number) => {
      if (lv>=20) return {l:'S',c:'#f59e0b'}; if (lv>=15) return {l:'A',c:'#a78bfa'}
      if (lv>=10) return {l:'B',c:'#60a5fa'}; if (lv>=5)  return {l:'C',c:'#34d399'}
      return {l:'E',c:'rgba(240,240,245,.35)'}
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:1200 }}>

        {/* ── Welcome banner ── */}
        <div className="welcome-banner animate-fade-up">
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:600, color:'rgba(229,57,53,.7)', letterSpacing:'.12em', marginBottom:6, textTransform:'uppercase' }}>
                /// SISTEMA · BOTANIME · {fmtDate()}
              </div>
              <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.75rem', lineHeight:1.1, color:'white' }}>
                BIENVENIDO, ZERINHO23
              </h1>
              <p style={{ fontSize:12, color:'rgba(240,240,245,.5)', marginTop:5 }}>
                {error
                  ? `⚠ ${error}`
                  : online
                    ? '→ Bot operativo. Todas las funciones en línea.'
                    : '→ Bot desconectado. Ve a Conexión para reconectar.'}
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span className={`status-pill ${online ? 'online' : 'offline'}`}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: online ? '#10b981' : '#e53935',
                  boxShadow: online ? '0 0 6px #10b981' : 'none' }} />
                {online ? 'Bot Online' : 'Bot Offline'}
              </span>
              <button onClick={() => load(true)} className="btn btn-ghost btn-sm" disabled={refreshing}>
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Uptime strip */}
          {uptime > 0 && (
            <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:6,
              fontSize:11, color:'rgba(240,240,245,.4)' }}>
              <Clock size={11} />
              <span>Uptime: <strong style={{ color:'rgba(240,240,245,.7)' }}>{fmtUptime(uptime)}</strong></span>
              <span style={{ marginLeft:8 }}>Usuarios: <strong style={{ color:'rgba(240,240,245,.7)' }}>{totalU}</strong></span>
              <span style={{ marginLeft:8 }}>Grupos: <strong style={{ color:'rgba(240,240,245,.7)' }}>{totalG}</strong></span>
            </div>
          )}
        </div>

        {/* ── Quick stats row ── */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }} className="animate-fade-up">
          <StatCard
            title="ACTIVIDAD AHORA" value={totalU}
            sub="usuarios registrados"
            badge="LIVE" color="var(--green)" />
          <StatCard
            title="GRUPOS ACTIVOS" value={totalG}
            sub="grupos configurados"
            color="var(--blue)" />
          <StatCard
            title="COMANDOS TOTALES" value={todayCmds.toLocaleString()}
            sub="en toda la plataforma"
            color="var(--purple)" />
        </div>

        {/* ── Métricas clave ── */}
        <div className="animate-fade-up">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <BarChart2 size={15} color="var(--tx2)" />
            <div style={{ fontWeight:700, fontSize:14, color:'var(--tx)' }}>Métricas clave</div>
            <div style={{ fontSize:11, color:'var(--tx3)' }}>— Indicadores del bot en tiempo real</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:12 }}>
            <MetricCard title="Usuarios totales"    value={totalU}   icon={Users}         color="var(--red)"    sub="en la plataforma" />
            <MetricCard title="Grupos gestionados"  value={totalG}   icon={Group}         color="var(--gold)"   sub="activos" />
            <MetricCard title="Mensajes totales"    value={todayMsgs.toLocaleString()} icon={MessageSquare} color="var(--green)"  sub="procesados" />
            <MetricCard title="Comandos ejecutados" value={todayCmds.toLocaleString()} icon={Zap}           color="var(--blue)"   sub="acumulados" />
            <MetricCard title="Uptime"              value={fmtUptime(uptime)} icon={Clock}    color="var(--indigo)" sub="continuo" />
            <MetricCard title="Estado sistema"      value={online ? '100%' : '0%'} icon={Wifi}  color={online ? 'var(--green)' : 'var(--red)'} sub={online ? 'Operativo' : 'Desconectado'} />
          </div>
        </div>

        {/* ── Rendimiento y salud ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="animate-fade-up">

          {/* Conversión */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><TrendingUp size={12} style={{marginRight:5,verticalAlign:'middle'}}/>Actividad de usuarios</div>
            </div>
            <div className="card-body">
              {[
                { label:'Con XP > 0', pct: totalU > 0 ? Math.round(users.filter(u=>u.xp>0).length/totalU*100) : 0, color:'var(--green)' },
                { label:'Con nivel > 1', pct: totalU > 0 ? Math.round(users.filter(u=>u.level>1).length/totalU*100) : 0, color:'var(--blue)' },
                { label:'Con coins > 0', pct: totalU > 0 ? Math.round(users.filter(u=>u.coins>0).length/totalU*100) : 0, color:'var(--purple)' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                    <span style={{ color:'var(--tx2)' }}>{row.label}</span>
                    <span style={{ fontWeight:700, color:'white' }}>{row.pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width:row.pct+'%', background:row.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estado de plataforma */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Shield size={12} style={{marginRight:5,verticalAlign:'middle'}}/>Estado de la plataforma</div>
            </div>
            <div className="card-body">
              {[
                { label:'Bot conectado', val: online ? 100 : 0, color: online ? 'var(--green)' : 'var(--red)', txt: online ? 'Activo' : 'Caído' },
                { label:'Usuarios cargados', val: Math.min(100, totalU), color:'var(--blue)', txt: totalU > 0 ? 'OK' : 'Vacío' },
                { label:'Grupos cargados', val: Math.min(100, totalG * 5), color:'var(--purple)', txt: totalG > 0 ? 'OK' : 'Vacío' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:12 }}>
                    <span style={{ color:'var(--tx2)' }}>{row.label}</span>
                    <span style={{ fontWeight:700, color:row.color }}>{row.txt}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width:Math.min(row.val,100)+'%', background:row.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Top usuarios ── */}
        <div className="animate-fade-up">
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <Star size={15} color="var(--gold)" />
            <div style={{ fontWeight:700, fontSize:14 }}>Top Usuarios</div>
            <span className="badge badge-gold" style={{ marginLeft:4 }}>TOP {topUsers.length}</span>
          </div>
          <div className="card">
            {topUsers.length === 0 ? (
              <div style={{ padding:24, textAlign:'center', color:'var(--tx3)', fontSize:12 }}>
                Sin datos de usuarios aún
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width:40 }}>#</th>
                    <th>Usuario</th>
                    <th>Rango</th>
                    <th>Nivel</th>
                    <th>XP</th>
                    <th>Coins</th>
                    <th>Cmds</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((u, i) => {
                    const rk = rankLabel(u.level)
                    return (
                      <tr key={u.jid}>
                        <td>
                          <span style={{ fontWeight:700, color: i===0 ? '#f59e0b' : i===1 ? '#9ca3af' : i===2 ? '#cd7c3f' : 'var(--tx3)', fontSize:13 }}>
                            {i+1}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:6,
                              background:`linear-gradient(135deg,${rk.c}33,${rk.c}11)`,
                              border:`1px solid ${rk.c}44`,
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontSize:11, fontWeight:700, color:rk.c }}>
                              {(u.name||u.jid).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)' }}>
                                {u.name || u.jid.split('@')[0]}
                              </div>
                              <div style={{ fontSize:10, color:'var(--tx3)' }}>
                                {u.jid.split('@')[0].slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontWeight:700, color:rk.c, fontSize:12 }}>Rango {rk.l}</span></td>
                        <td><span style={{ fontWeight:700 }}>{u.level}</span></td>
                        <td><span style={{ color:'var(--purple)', fontWeight:600 }}>{(u.xp||0).toLocaleString()}</span></td>
                        <td><span style={{ color:'var(--gold)', fontWeight:600 }}>{(u.coins||0).toLocaleString()}</span></td>
                        <td><span style={{ color:'var(--tx2)' }}>{(u.commands||0).toLocaleString()}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Actividad reciente ── */}
        {recentEvt.length > 0 && (
          <div className="animate-fade-up">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <Activity size={15} color="var(--blue)" />
              <div style={{ fontWeight:700, fontSize:14 }}>Actividad reciente</div>
            </div>
            <div className="card">
              <div style={{ padding:'8px 16px' }}>
                {recentEvt.map((evt, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0',
                    borderBottom: i < recentEvt.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0,
                      background: evt.type?.includes('error') ? 'var(--red)' : 'var(--blue)',
                      boxShadow: `0 0 6px ${evt.type?.includes('error') ? 'var(--red)' : 'var(--blue)'}` }} />
                    <div style={{ flex:1, fontSize:12, color:'var(--tx2)' }}>
                      <span style={{ color:'var(--tx)', fontWeight:600 }}>{evt.type}</span>
                      {evt.data && typeof evt.data === 'object' && Object.keys(evt.data).length > 0 && (
                        <span style={{ color:'var(--tx3)' }}> — {JSON.stringify(evt.data).slice(0,60)}</span>
                      )}
                    </div>
                    <div style={{ fontSize:10, color:'var(--tx3)', flexShrink:0 }}>
                      {new Date(evt.ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }
  