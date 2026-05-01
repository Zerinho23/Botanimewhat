import { useEffect, useState } from 'react'
  import { RefreshCw, Users, MessageSquare, Activity, Zap, Star, Shield, Clock, Wifi, AlertCircle, TrendingUp, BarChart2, Award, ArrowUpRight } from 'lucide-react'
  import { getStatus, getStats, getUsers, getActivityHistory, isConfigured, type BotStats, type BotStatus, type User, type ActivityEvent } from '../api'

  function fmtUptime(s: number) {
    if (!s) return '—'
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    if (h > 24) return `${Math.floor(h/24)}d ${h%24}h`
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }
  function fmtDate() {
    return new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' })
  }
  function fmtTs(ts: number) {
    const d = new Date(ts)
    return d.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})
  }

  const EVENT_COLORS: Record<string,string> = {
    message:'#3b82f6', command:'#8b5cf6', join:'#10b981',
    leave:'#e53935', error:'#ff5252', warning:'#f59e0b', default:'rgba(240,240,245,.4)'
  }

  function MetricCard({ title, value, sub, color, icon: Icon, trend }: {
    title: string; value: string|number; sub?: string; color: string; icon: React.ElementType; trend?: string
  }) {
    return (
      <div className="metric-card animate-fade-up">
        <div className="accent-bar" style={{ background: color }} />
        <div className="glow-bg" style={{ background: color }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
          <div className="icon-badge" style={{ background: color+'20' }}>
            <Icon size={16} color={color} />
          </div>
          {trend && (
            <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:'var(--green)', fontWeight:700 }}>
              <ArrowUpRight size={10} />{trend}
            </div>
          )}
        </div>
        <div className="metric-value">{value}</div>
        <div className="metric-label">{title}</div>
        {sub && <div style={{ fontSize:10, color:'var(--tx3)', marginTop:4 }}>{sub}</div>}
      </div>
    )
  }

  const RANKS = [
    { label:'S', minLv:20, color:'#f59e0b' },
    { label:'A', minLv:15, color:'#a78bfa' },
    { label:'B', minLv:10, color:'#60a5fa' },
    { label:'C', minLv:5,  color:'#34d399' },
    { label:'E', minLv:0,  color:'rgba(240,240,245,.4)' },
  ]
  function rankOf(lv:number) { return RANKS.find(r=>lv>=r.minLv) ?? RANKS[RANKS.length-1] }

  function avatarColor(jid: string): string {
    const colors = ['#e53935','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ec4899','#06b6d4','#6366f1']
    let h = 0; for (const c of jid) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return colors[h % colors.length]
  }

  export default function Overview() {
    const [status,    setStatus]  = useState<BotStatus | null>(null)
    const [stats,     setStats]   = useState<BotStats  | null>(null)
    const [users,     setUsers]   = useState<User[]>([])
    const [events,    setEvents]  = useState<ActivityEvent[]>([])
    const [loading,   setLoading] = useState(true)
    const [error,     setError]   = useState<string|null>(null)
    const [refreshing,setRef]     = useState(false)

    const load = async (showRef = false) => {
      if (!isConfigured()) { setLoading(false); return }
      if (showRef) setRef(true)
      setError(null)
      try {
        const [st, sa, us, ev] = await Promise.allSettled([getStatus(), getStats(), getUsers(), getActivityHistory()])
        if (st.status === 'fulfilled') setStatus(st.value)
        if (sa.status === 'fulfilled') setStats(sa.value)
        if (us.status === 'fulfilled') setUsers(us.value)
        if (ev.status === 'fulfilled') setEvents(ev.value)
        if (st.status === 'rejected') setError('No se pudo conectar al bot')
      } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error') }
      finally { setLoading(false); setRef(false) }
    }

    useEffect(() => { load() }, [])

    if (!isConfigured()) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:360, gap:16, textAlign:'center' }}>
        <div className="icon-badge-lg" style={{ background:'rgba(245,158,11,.1)', width:64, height:64, borderRadius:18 }}>
          <AlertCircle size={30} color="var(--gold)" />
        </div>
        <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'.08em' }}>VITE_API_URL no configurada</div>
        <div style={{ fontSize:12, color:'var(--tx3)', maxWidth:360 }}>Ve a Vercel → Settings → Environment Variables y agrega la URL de tu bot en Railway:</div>
        <div className="code-block" style={{ fontSize:13 }}>VITE_API_URL = https://tu-bot.railway.app</div>
        <div style={{ fontSize:11, color:'var(--tx3)' }}>Luego haz Redeploy en Vercel para aplicar los cambios</div>
      </div>
    )

    if (loading) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:360, gap:14 }}>
        <RefreshCw size={28} color="var(--red)" style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:13, color:'var(--tx3)' }}>Conectando al bot…</span>
      </div>
    )

    const online    = status?.connected ?? false
    const uptime    = stats?.uptime ?? 0
    const totalU    = stats?.users ?? 0
    const totalG    = stats?.groups ?? 0
    const topUsers  = [...users].sort((a,b)=>(b.level||0)-(a.level||0)||(b.xp||0)-(a.xp||0)).slice(0,5)
    const todayCmds = users.reduce((a,u)=>a+(u.commands||0),0)
    const todayMsgs = users.reduce((a,u)=>a+(u.messages||0),0)
    const totalCoins= users.reduce((a,u)=>a+(u.coins||0),0)
    const recentEvt = events.slice(0,8)

    const activityData = (() => {
      const msgsByUser = [...users].sort((a,b)=>(b.messages||0)-(a.messages||0)).slice(0,7)
      const maxMsg = Math.max(...msgsByUser.map(u=>u.messages||0), 1)
      return msgsByUser.map(u => ({ name: u.name||u.jid.split('@')[0].slice(0,8), val: u.messages||0, pct: Math.round(((u.messages||0)/maxMsg)*100) }))
    })()

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:22, maxWidth:1280 }}>

        {/* ── Welcome banner ── */}
        <div className="welcome-banner animate-fade-up">
          <div className="decor-dots">
            {[...Array(6)].map((_,i)=><span key={i}/>)}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(229,57,53,.6)', letterSpacing:'.16em', marginBottom:7, textTransform:'uppercase', fontFamily:"'JetBrains Mono',monospace" }}>
                /// SISTEMA · BOTANIME · {fmtDate()}
              </div>
              <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.9rem', lineHeight:1.1, color:'white' }}>
                BIENVENIDO, ZERINHO23
              </h1>
              <p style={{ fontSize:12, color:'rgba(240,240,245,.45)', marginTop:6 }}>
                {error ? `⚠ ${error}` : online ? '→ Bot operativo. Todas las funciones en línea.' : '→ Bot desconectado. Ve a Conexión para reconectar.'}
              </p>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <span className={`status-pill ${online ? 'online' : 'offline'}`}>
                <span style={{ width:6, height:6, borderRadius:'50%', background: online ? '#10b981' : '#e53935',
                  boxShadow: online ? '0 0 6px #10b981' : 'none', animation: online ? 'pulse 2s infinite' : 'none' }} />
                {online ? 'Bot Online' : 'Bot Offline'}
              </span>
              <button onClick={() => load(true)} className="btn btn-ghost btn-sm" disabled={refreshing}>
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid rgba(229,57,53,.12)',
            display:'flex', flexWrap:'wrap', gap:20, fontSize:11, color:'rgba(240,240,245,.35)' }}>
            {uptime > 0 && <span><Clock size={11} style={{verticalAlign:'middle',marginRight:4}}/>Uptime: <strong style={{color:'rgba(240,240,245,.7)'}}>{fmtUptime(uptime)}</strong></span>}
            <span><Users size={11} style={{verticalAlign:'middle',marginRight:4}}/>{totalU} usuarios</span>
            <span><MessageSquare size={11} style={{verticalAlign:'middle',marginRight:4}}/>{totalG} grupos</span>
            <span><Zap size={11} style={{verticalAlign:'middle',marginRight:4}}/>{todayCmds.toLocaleString()} comandos</span>
          </div>
        </div>

        {/* ── Metrics grid ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }} className="animate-fade-up">
          <MetricCard title="Usuarios"      value={totalU}                       icon={Users}         color="var(--red)"    sub="registrados" />
          <MetricCard title="Grupos"        value={totalG}                       icon={MessageSquare} color="var(--blue)"   sub="gestionados" />
          <MetricCard title="Mensajes"      value={todayMsgs.toLocaleString()}   icon={Activity}      color="var(--green)"  sub="procesados totales" />
          <MetricCard title="Comandos"      value={todayCmds.toLocaleString()}   icon={Zap}           color="var(--purple)" sub="ejecutados" />
          <MetricCard title="Coins totales" value={totalCoins.toLocaleString()}  icon={Award}         color="var(--gold)"   sub="en economía" />
          <MetricCard title="Uptime"        value={fmtUptime(uptime)}            icon={Clock}         color="var(--indigo)" sub="sin reinicios" />
        </div>

        {/* ── Second row ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }} className="animate-fade-up">

          {/* Actividad por usuario (barras) */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><BarChart2 size={12} />Mensajes por usuario</div>
              <span className="badge badge-blue">TOP 7</span>
            </div>
            <div className="card-body">
              {activityData.length === 0 ? (
                <div className="empty-state" style={{ padding:'20px 0' }}>
                  <div className="empty-state-sub">Sin datos aún</div>
                </div>
              ) : activityData.map((row, i) => (
                <div key={i} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:11 }}>
                    <span style={{ color:'var(--tx2)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.name}</span>
                    <span style={{ fontWeight:700, color:'white' }}>{row.val.toLocaleString()}</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width:row.pct+'%', background: i===0?'var(--red)':i===1?'var(--purple)':i===2?'var(--blue)':'var(--green)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Salud del sistema */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Shield size={12} />Salud del sistema</div>
            </div>
            <div className="card-body">
              {[
                { label:'Bot conectado',      val: online ? 100 : 0,    color: online ? 'var(--green)' : 'var(--red)', txt: online ? 'Activo' : 'Caído' },
                { label:'Usuarios activos',   val: totalU > 0 ? Math.min(100, Math.round(users.filter(u=>u.xp>0).length/totalU*100)) : 0, color:'var(--blue)',   txt: totalU > 0 ? `${users.filter(u=>u.xp>0).length} con XP` : '—' },
                { label:'Usuarios con nivel', val: totalU > 0 ? Math.min(100, Math.round(users.filter(u=>u.level>1).length/totalU*100)) : 0, color:'var(--purple)', txt: totalU > 0 ? `${users.filter(u=>u.level>1).length} lvl>1` : '—' },
                { label:'Con economía',       val: totalU > 0 ? Math.min(100, Math.round(users.filter(u=>u.coins>0).length/totalU*100)) : 0, color:'var(--gold)',   txt: totalU > 0 ? `${users.filter(u=>u.coins>0).length} con coins` : '—' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:11 }}>
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

        {/* ── Third row: top usuarios + actividad reciente ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:14 }} className="animate-fade-up">

          {/* Top usuarios */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Star size={12} color="var(--gold)" />Top Usuarios</div>
              <span className="badge badge-gold">RANKING</span>
            </div>
            {topUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-sub">Sin usuarios registrados aún</div>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>#</th><th>Usuario</th><th>Rango</th><th>Nivel</th><th>XP</th></tr></thead>
                <tbody>
                  {topUsers.map((u,i) => {
                    const rk = rankOf(u.level)
                    const av = avatarColor(u.jid)
                    return (
                      <tr key={u.jid}>
                        <td style={{ fontWeight:700, color:i===0?'#f59e0b':i===1?'#9ca3af':i===2?'#cd7c3f':'var(--tx3)', fontSize:12 }}>{i+1}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:8, background:av+'22',
                              border:`1px solid ${av}44`, display:'flex', alignItems:'center',
                              justifyContent:'center', fontSize:11, fontWeight:700, color:av, flexShrink:0 }}>
                              {(u.name||u.jid).charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:600, fontSize:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:100 }}>{u.name||'Sin nombre'}</div>
                              <div style={{ fontSize:9, color:'var(--tx3)' }}>{u.jid.split('@')[0].slice(0,12)}</div>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ fontSize:10, fontWeight:700, color:rk.color, background:rk.color+'18', padding:'2px 7px', borderRadius:4 }}>{rk.label}</span></td>
                        <td style={{ fontWeight:700 }}>{u.level}</td>
                        <td style={{ color:'var(--purple)', fontWeight:600, fontSize:12 }}>{(u.xp||0).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Actividad reciente */}
          <div className="card">
            <div className="card-header">
              <div className="card-title"><Activity size={12} />Actividad reciente</div>
              <span className="badge badge-green">{events.length} eventos</span>
            </div>
            {recentEvt.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-sub">Sin eventos registrados aún</div>
              </div>
            ) : (
              <div style={{ padding:'0 0 6px' }}>
                {recentEvt.map((e, i) => {
                  const col = EVENT_COLORS[e.type] || EVENT_COLORS.default
                  return (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'9px 16px',
                      borderBottom: i < recentEvt.length-1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:col,
                        boxShadow:`0 0 6px ${col}88`, marginTop:5, flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                          <span style={{ fontSize:11, fontWeight:700, color:col, textTransform:'uppercase' }}>{e.type}</span>
                          <span style={{ fontSize:9, color:'var(--tx3)', fontFamily:"'JetBrains Mono',monospace" }}>{fmtTs(e.ts)}</span>
                        </div>
                        {e.data && Object.keys(e.data).length > 0 && (
                          <div style={{ fontSize:10, color:'var(--tx3)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {JSON.stringify(e.data).slice(0,60)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  