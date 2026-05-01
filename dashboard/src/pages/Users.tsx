import { useEffect, useState } from 'react'
  import { Search } from 'lucide-react'
  import { getUsers, isConfigured } from '../api'
  import type { User } from '../api'
  import { rankOf, shortJid, formatNumber } from '../lib/utils'

  const RANK_LABEL: Record<string, string> = { S:'SHADOW', A:'NATIONAL', B:'ADVANCED', C:'B-RANK', D:'C-RANK', E:'E-RANK' }

  export default function Users() {
    const [users, setUsers] = useState<User[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getUsers().then(d => setUsers(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false))
    }, [])

    const filtered = users
      .filter(u => shortJid(u.jid).includes(search)||(u.name||'').toLowerCase().includes(search.toLowerCase()))
      .sort((a,b)=>(b.level??0)-(a.level??0))

    const top3 = filtered.slice(0,3)

    if (!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <div className="sys-label" style={{color:'var(--amber)'}}>[ VITE_API_URL no configurada en Vercel ]</div>
      </div>
    )

    if (loading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <div style={{width:36,height:36,border:'2px solid rgba(0,195,255,0.1)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      </div>
    )

    return (
      <div style={{display:'flex',flexDirection:'column',gap:18}}>
        {/* Podium */}
        {top3.length >= 3 && (
          <div className="panel panel-accent" style={{padding:'22px 24px',position:'relative'}}>
            <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
            <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://RANK_SYSTEM</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white',marginBottom:20}}>
              TOP HUNTERS
            </div>
            <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:20}}>
              {[top3[1],top3[0],top3[2]].map((u,i)=>{
                const pos = i===0?2:i===1?1:3
                const heights = [120, 160, 96]
                const r = rankOf(u.level??0)
                return (
                  <div key={u.jid} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    {pos===1 && <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.65rem',fontWeight:900,color:'var(--gold)',letterSpacing:'0.1em',textShadow:'0 0 10px var(--gold)',marginBottom:4}}>MONARCH</div>}
                    <div className="sys-label" style={{fontSize:9}}>{shortJid(u.jid).slice(-10)}</div>
                    <div style={{height:heights[i],width:64,background:`${r.color}12`,border:`1px solid ${r.color}40`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',padding:8}}>
                      <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'1.5rem',fontWeight:900,color:r.color,textShadow:`0 0 16px ${r.color}`}}>#{pos}</div>
                      <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:10,color:r.color,opacity:0.8,marginTop:2}}>Lv.{u.level??0}</div>
                    </div>
                    <div style={{background:`${r.color}20`,border:`1px solid ${r.color}50`,padding:'2px 8px',fontFamily:"'Share Tech Mono',monospace",fontSize:9,color:r.color,letterSpacing:'0.1em'}}>{r.l}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="panel panel-accent" style={{padding:'20px 22px',position:'relative'}}>
          <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
          <div style={{marginBottom:16}}>
            <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://HUNTER_DATABASE</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white',marginBottom:12}}>
              TODOS LOS HUNTERS ({filtered.length})
            </div>
            <div style={{position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--tx3)'}} />
              <input className="input" style={{paddingLeft:34}} placeholder="BUSCAR HUNTER..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>

          {filtered.length===0 ? (
            <div className="sys-label" style={{textAlign:'center',padding:'32px 0'}}>/// NO HUNTERS REGISTRADOS ///</div>
          ) : (
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  {['#','HUNTER','RANK','NIVEL','XP','MONEDAS'].map(h=>(
                    <th key={h} className="sys-label" style={{textAlign:'left',padding:'8px 10px 10px',borderBottom:'1px solid rgba(0,195,255,0.12)'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u,i)=>{
                  const r = rankOf(u.level??0)
                  const xpForNext = ((u.level??0)+1)*100
                  const xpPct = Math.min(100, ((u.xp??0)%xpForNext)/xpForNext*100)
                  return (
                    <tr key={u.jid} style={{borderBottom:'1px solid rgba(0,195,255,0.04)'}}>
                      <td style={{padding:'10px',fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'var(--tx3)'}}>{i+1}</td>
                      <td style={{padding:'10px'}}>
                        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:'var(--tx)'}}>{shortJid(u.jid)}</div>
                        {u.name&&<div className="sys-label" style={{marginTop:1}}>{u.name}</div>}
                      </td>
                      <td style={{padding:'10px'}}>
                        <div style={{display:'inline-flex',alignItems:'center',gap:6}}>
                          <span style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:28,height:28,border:`1px solid ${r.color}50`,background:`${r.color}15`,fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:900,color:r.color,textShadow:`0 0 8px ${r.color}`}}>{r.l}</span>
                          <span className="sys-label" style={{color:r.color,opacity:0.7,fontSize:8}}>{RANK_LABEL[r.l]}</span>
                        </div>
                      </td>
                      <td style={{padding:'10px'}}>
                        <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'1.1rem',fontWeight:700,color:r.color}}>{u.level??0}</div>
                        <div style={{width:60,height:2,background:'rgba(0,195,255,0.1)',marginTop:4,overflow:'hidden'}}>
                          <div style={{height:'100%',background:r.color,width:`${xpPct}%`,boxShadow:`0 0 6px ${r.color}`}} />
                        </div>
                      </td>
                      <td style={{padding:'10px',fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'var(--tx2)'}}>{formatNumber(u.xp??0)}</td>
                      <td style={{padding:'10px',fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'var(--gold)'}}>{formatNumber(u.coins??0)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    )
  }
  