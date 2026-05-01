import { useEffect, useState } from 'react'
  import { Search } from 'lucide-react'
  import { getGroups } from '../api'
  import type { Group } from '../api'
  import { shortJid } from '../lib/utils'

  export default function Groups() {
    const [groups, setGroups] = useState<Group[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getGroups().then(d=>setGroups(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false))
    }, [])

    const filtered = groups.filter(g=>
      (g.subject||'').toLowerCase().includes(search.toLowerCase())||shortJid(g.jid).includes(search)
    )

    if (loading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <div style={{width:36,height:36,border:'2px solid rgba(0,195,255,0.1)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      </div>
    )

    return (
      <div style={{display:'flex',flexDirection:'column',gap:18}}>
        <div className="panel panel-accent" style={{padding:'20px 22px',position:'relative'}}>
          <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
          <div style={{marginBottom:16}}>
            <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://GROUP_REGISTRY</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white',marginBottom:12}}>
              GRUPOS ACTIVOS ({filtered.length})
            </div>
            <div style={{position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--tx3)'}} />
              <input className="input" style={{paddingLeft:34}} placeholder="BUSCAR GRUPO..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
          </div>
          {filtered.length===0 ? (
            <div className="sys-label" style={{textAlign:'center',padding:'32px 0'}}>/// SIN GRUPOS REGISTRADOS ///</div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:10}}>
              {filtered.map(g=>(
                <div key={g.id} style={{padding:'14px 16px',background:'rgba(0,5,20,0.6)',border:'1px solid rgba(0,195,255,0.1)',borderLeft:'2px solid var(--blue)'}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'0.95rem',color:'white',letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:4}}>{g.name||'SIN NOMBRE'}</div>
                  <div className="sys-label" style={{marginBottom:10}}>{shortJid(g.jid)}</div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div className="sys-label">MIEMBROS: <span style={{color:'var(--blue)'}}>{g.participants??'?'}</span></div>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {g.welcome&&<span className="badge badge-blue" style={{fontSize:9}}>WELCOME</span>}
                      {g.antiLink&&<span className="badge badge-red" style={{fontSize:9}}>ANTI-LINK</span>}
                      {g.antiSpam&&<span className="badge badge-amber" style={{fontSize:9}}>FILTRO</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  