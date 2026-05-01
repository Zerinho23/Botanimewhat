import { useEffect, useState } from 'react'
  import { Search, RefreshCw, Users as UsersIcon, Star, Zap, DollarSign, Trophy, MessageSquare } from 'lucide-react'
  import { getUsers, isConfigured, type User } from '../api'

  const RANKS = [
    { label:'S · MONARCA',  minLv:20, color:'#f59e0b', bg:'rgba(245,158,11,.1)',  glow:'rgba(245,158,11,.35)' },
    { label:'A · NACIONAL', minLv:15, color:'#a78bfa', bg:'rgba(167,139,250,.1)', glow:'rgba(167,139,250,.35)' },
    { label:'B · AVANZADO', minLv:10, color:'#60a5fa', bg:'rgba(96,165,250,.1)',  glow:'rgba(96,165,250,.35)' },
    { label:'C · RANGO B',  minLv:5,  color:'#34d399', bg:'rgba(52,211,153,.1)',  glow:'rgba(52,211,153,.35)' },
    { label:'E · INICIADO', minLv:0,  color:'rgba(240,240,245,.45)', bg:'rgba(255,255,255,.05)', glow:'transparent' },
  ]
  function rankOf(lv:number) { return RANKS.find(r=>lv>=r.minLv) ?? RANKS[RANKS.length-1] }

  function avatarColor(jid: string): string {
    const colors = ['#e53935','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ec4899','#06b6d4','#6366f1']
    let h = 0; for (const c of jid) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return colors[h % colors.length]
  }

  function xpToNextLevel(level: number, xp: number, multiplier = 250) {
    const required = level * multiplier
    return { current: xp, required, pct: Math.min(100, Math.round(xp / required * 100)) }
  }

  export default function Users() {
    const [users,     setUsers]  = useState<User[]>([])
    const [loading,   setLoad]   = useState(true)
    const [search,    setSearch] = useState('')
    const [refreshing,setRef]    = useState(false)
    const [sortKey,   setSort]   = useState<'xp'|'level'|'coins'|'messages'|'commands'>('level')

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setUsers(await getUsers()) } catch {}
      setLoad(false); setRef(false)
    }
    useEffect(() => { load() }, [])

    if (!isConfigured()) return (
      <div className="empty-state" style={{ height:320 }}>
        <div className="empty-state-title" style={{ color:'var(--gold)' }}>VITE_API_URL no configurada en Vercel</div>
      </div>
    )
    if (loading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, gap:10, color:'var(--tx3)' }}>
        <RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:13 }}>Cargando usuarios…</span>
      </div>
    )

    const sorted = [...users].sort((a,b) => (b[sortKey]||0) - (a[sortKey]||0))
    const filtered = sorted.filter(u => {
      const s = search.toLowerCase()
      return (u.name||'').toLowerCase().includes(s) || u.jid.includes(s)
    })

    const SORT_OPTS: {key: typeof sortKey; label: string}[] = [
      { key:'level',    label:'Nivel' },
      { key:'xp',       label:'XP' },
      { key:'coins',    label:'Coins' },
      { key:'messages', label:'Mensajes' },
      { key:'commands', label:'Comandos' },
    ]

    const totalCoins = users.reduce((a,u)=>a+(u.coins||0),0)
    const avgLevel   = users.length ? Math.round(users.reduce((a,u)=>a+(u.level||1),0)/users.length*10)/10 : 0

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:22 }} className="animate-fade-up">
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.6rem' }}>Usuarios</h1>
            <p style={{ fontSize:12, color:'var(--tx3)', marginTop:3 }}>Leaderboard y estadísticas — {users.length} registrados</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tx3)', pointerEvents:'none' }} />
              <input className="input" placeholder="Buscar usuario…" value={search}
                onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:30, width:200 }} />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} />
            </button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10 }}>
          {[
            { label:'Total usuarios', val:users.length, icon:UsersIcon, color:'var(--blue)' },
            { label:'Nivel promedio', val:avgLevel, icon:Trophy, color:'var(--gold)' },
            { label:'Mayor nivel',    val:[...users].sort((a,b)=>(b.level||0)-(a.level||0))[0]?.level||0, icon:Zap, color:'var(--purple)' },
            { label:'Top XP',         val:[...users].sort((a,b)=>(b.xp||0)-(a.xp||0))[0]?.xp?.toLocaleString()||0, icon:Star, color:'var(--red)' },
            { label:'Coins totales',  val:totalCoins.toLocaleString(), icon:DollarSign, color:'var(--green)' },
            { label:'Total mensajes', val:users.reduce((a,u)=>a+(u.messages||0),0).toLocaleString(), icon:MessageSquare, color:'var(--indigo)' },
          ].map(s=>(
            <div key={s.label} className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <div className="icon-badge" style={{ background:s.color+'20' }}>
                <s.icon size={15} color={s.color} />
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:'1.1rem', color:'white' }}>{s.val}</div>
                <div style={{ fontSize:9, color:'var(--tx3)', marginTop:1 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'var(--tx3)', alignSelf:'center', marginRight:4 }}>Ordenar:</span>
          {SORT_OPTS.map(o=>(
            <button key={o.key} onClick={()=>setSort(o.key)}
              className={`btn btn-xs ${sortKey===o.key?'btn-primary':'btn-ghost'}`}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><UsersIcon size={22} color="var(--tx3)" /></div>
              <div className="empty-state-title">{search ? 'Sin resultados' : 'Sin usuarios registrados'}</div>
              <div className="empty-state-sub">{search ? 'Intenta con otro término' : 'Los usuarios aparecerán cuando el bot comience a operar'}</div>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th style={{width:36}}>#</th><th>Usuario</th><th>Rango</th><th>Nivel / XP</th><th>Coins</th><th>Mensajes</th><th>Comandos</th></tr>
                </thead>
                <tbody>
                  {filtered.map((u,i)=>{
                    const rk  = rankOf(u.level)
                    const av  = avatarColor(u.jid)
                    const xpp = xpToNextLevel(u.level, u.xp)
                    return (
                      <tr key={u.jid}>
                        <td>
                          <span style={{ fontWeight:800, fontSize:13, color:i===0?'#f59e0b':i===1?'#c0c0c0':i===2?'#cd7c3f':'var(--tx3)' }}>
                            {i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:34, height:34, borderRadius:9, background:av+'20',
                              border:`1px solid ${av}44`, display:'flex', alignItems:'center',
                              justifyContent:'center', fontSize:13, fontWeight:700, color:av, flexShrink:0,
                              boxShadow: i<3 ? `0 0 10px ${av}33` : 'none' }}>
                              {(u.name||u.jid).charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <div style={{ fontWeight:600, fontSize:13 }}>{u.name||'Sin nombre'}</div>
                              <div style={{ fontSize:9, color:'var(--tx3)', fontFamily:"'JetBrains Mono',monospace" }}>+{u.jid.split('@')[0]}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize:10, fontWeight:700, color:rk.color, background:rk.bg,
                            padding:'3px 9px', borderRadius:5, boxShadow:i<3?`0 0 8px ${rk.glow}`:'none' }}>
                            {rk.label}
                          </span>
                        </td>
                        <td style={{ minWidth:130 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <strong style={{ fontSize:13, color:'white', minWidth:22, textAlign:'right' }}>{u.level}</strong>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'var(--tx3)', marginBottom:3 }}>
                                <span>{xpp.current}</span><span>{xpp.required}</span>
                              </div>
                              <div className="progress-track-sm">
                                <div className="progress-fill" style={{ width:xpp.pct+'%', background:'var(--purple)' }} />
                              </div>
                            </div>
                            <span style={{ fontSize:9, color:'var(--tx3)', minWidth:28 }}>{xpp.pct}%</span>
                          </div>
                        </td>
                        <td style={{ color:'var(--gold)', fontWeight:600 }}>{(u.coins||0).toLocaleString()}</td>
                        <td style={{ color:'var(--tx2)' }}>{(u.messages||0).toLocaleString()}</td>
                        <td style={{ color:'var(--tx2)' }}>{(u.commands||0).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }
  