import { useEffect, useState } from 'react'
  import { Search, RefreshCw, Users as UsersIcon, Star, Zap, DollarSign } from 'lucide-react'
  import { getUsers, isConfigured, type User } from '../api'

  const RANKS = [
    { label:'S · MONARCA', minLv:20, color:'#f59e0b', bg:'rgba(245,158,11,.1)' },
    { label:'A · NACIONAL', minLv:15, color:'#a78bfa', bg:'rgba(167,139,250,.1)' },
    { label:'B · AVANZADO', minLv:10, color:'#60a5fa', bg:'rgba(96,165,250,.1)' },
    { label:'C · RANGO B',  minLv:5,  color:'#34d399', bg:'rgba(52,211,153,.1)' },
    { label:'E · INICIADO', minLv:0,  color:'rgba(240,240,245,.4)', bg:'rgba(255,255,255,.05)' },
  ]

  function rankOf(lv:number) {
    return RANKS.find(r=>lv>=r.minLv) ?? RANKS[RANKS.length-1]
  }

  export default function Users() {
    const [users, setUsers]   = useState<User[]>([])
    const [loading, setLoad]  = useState(true)
    const [search, setSearch] = useState('')
    const [refreshing, setRef]= useState(false)

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setUsers(await getUsers()) } catch {}
      setLoad(false); setRef(false)
    }
    useEffect(() => { load() }, [])

    if (!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <p style={{color:'var(--gold)',fontSize:13}}>VITE_API_URL no configurada en Vercel</p>
      </div>
    )

    if (loading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,gap:10,color:'var(--tx3)'}}>
        <RefreshCw size={16} style={{animation:'spin 1s linear infinite'}}/>
        <span>Cargando usuarios…</span>
      </div>
    )

    const sorted = [...users].sort((a,b)=>(b.xp||0)-(a.xp||0))
    const filtered = sorted.filter(u => {
      const s = search.toLowerCase()
      return (u.name||'').toLowerCase().includes(s) || u.jid.includes(s)
    })

    return (
      <div style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'1.4rem'}}>Usuarios</h1>
            <p style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>Leaderboard y estadísticas — {users.length} registrados</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <div style={{position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--tx3)'}}/>
              <input className="input" placeholder="Buscar usuario…"
                value={search} onChange={e=>setSearch(e.target.value)}
                style={{paddingLeft:30,width:220,background:'var(--card2)'}}/>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/>
            </button>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {[
            {label:'Total',val:users.length,icon:UsersIcon,color:'var(--blue)'},
            {label:'Top XP',val:(sorted[0]?.xp||0).toLocaleString(),icon:Star,color:'var(--gold)'},
            {label:'Mayor nivel',val:sorted[0]?.level||0,icon:Zap,color:'var(--purple)'},
            {label:'Total coins',val:users.reduce((a,u)=>a+(u.coins||0),0).toLocaleString(),icon:DollarSign,color:'var(--green)'},
          ].map(s=>(
            <div key={s.label} className="card" style={{flex:1,minWidth:130,padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
              <div className="icon-badge" style={{background:s.color+'22'}}><s.icon size={15} color={s.color}/></div>
              <div>
                <div style={{fontWeight:700,fontSize:'1.2rem',color:'white'}}>{s.val}</div>
                <div style={{fontSize:10,color:'var(--tx3)'}}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div style={{padding:32,textAlign:'center',color:'var(--tx3)',fontSize:12}}>
              {search ? 'Sin resultados para esa búsqueda' : 'Sin usuarios registrados aún'}
            </div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{width:36}}>#</th>
                    <th>Usuario</th>
                    <th>Rango</th>
                    <th>Nivel</th>
                    <th>XP</th>
                    <th>Coins</th>
                    <th>Mensajes</th>
                    <th>Comandos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u,i)=>{
                    const rk = rankOf(u.level)
                    return (
                      <tr key={u.jid}>
                        <td style={{fontWeight:700,color:i===0?'#f59e0b':i===1?'#9ca3af':i===2?'#cd7c3f':'var(--tx3)'}}>{i+1}</td>
                        <td>
                          <div style={{display:'flex',alignItems:'center',gap:9}}>
                            <div style={{width:32,height:32,borderRadius:8,
                              background:rk.bg,border:`1px solid ${rk.color}33`,
                              display:'flex',alignItems:'center',justifyContent:'center',
                              fontSize:12,fontWeight:700,color:rk.color,flexShrink:0}}>
                              {(u.name||u.jid).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{fontWeight:600,fontSize:13}}>{u.name||'Sin nombre'}</div>
                              <div style={{fontSize:10,color:'var(--tx3)'}}>{u.jid.split('@')[0]}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{fontSize:11,fontWeight:700,color:rk.color,
                            background:rk.bg,padding:'2px 8px',borderRadius:4}}>
                            {rk.label}
                          </span>
                        </td>
                        <td><strong>{u.level}</strong></td>
                        <td style={{color:'var(--purple)',fontWeight:600}}>{(u.xp||0).toLocaleString()}</td>
                        <td style={{color:'var(--gold)',fontWeight:600}}>{(u.coins||0).toLocaleString()}</td>
                        <td style={{color:'var(--tx2)'}}>{(u.messages||0).toLocaleString()}</td>
                        <td style={{color:'var(--tx2)'}}>{(u.commands||0).toLocaleString()}</td>
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
  