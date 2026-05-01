import { useEffect, useState } from 'react'
  import { Search, RefreshCw, Group as GroupIcon, Shield, Link, Bell, ToggleLeft, ToggleRight } from 'lucide-react'
  import { getGroups, isConfigured, type Group } from '../api'

  export default function Groups() {
    const [groups, setGroups] = useState<Group[]>([])
    const [loading, setLoad]  = useState(true)
    const [search, setSearch] = useState('')
    const [refreshing, setRef]= useState(false)

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setGroups(await getGroups()) } catch {}
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
        <span>Cargando grupos…</span>
      </div>
    )

    const filtered = groups.filter(g => {
      const s = search.toLowerCase()
      return (g.name||'').toLowerCase().includes(s) || g.jid.includes(s)
    })

    return (
      <div style={{display:'flex',flexDirection:'column',gap:20}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'1.4rem'}}>Grupos</h1>
            <p style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>{groups.length} grupos gestionados por el bot</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <div style={{position:'relative'}}>
              <Search size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--tx3)'}}/>
              <input className="input" placeholder="Buscar grupo…"
                value={search} onChange={e=>setSearch(e.target.value)}
                style={{paddingLeft:30,width:220}}/>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/>
            </button>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          {[
            {label:'Total grupos',val:groups.length,color:'var(--blue)'},
            {label:'Anti-link activo',val:groups.filter(g=>g.antiLink).length,color:'var(--red)'},
            {label:'Anti-spam activo',val:groups.filter(g=>g.antiSpam).length,color:'var(--gold)'},
            {label:'Bienvenida activa',val:groups.filter(g=>g.welcome).length,color:'var(--green)'},
          ].map(s=>(
            <div key={s.label} className="card" style={{flex:1,minWidth:120,padding:'14px 16px'}}>
              <div style={{fontWeight:700,fontSize:'1.4rem',color:s.color}}>{s.val}</div>
              <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Grid of group cards */}
        {filtered.length === 0 ? (
          <div className="card" style={{padding:32,textAlign:'center',color:'var(--tx3)',fontSize:12}}>
            {search ? 'Sin resultados para esa búsqueda' : 'El bot no está en ningún grupo aún'}
          </div>
        ) : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
            {filtered.map(g=>{
              const shortJid = g.jid.split('@')[0]
              const activeCount = [g.antiLink,g.antiSpam,g.welcome].filter(Boolean).length
              return (
                <div key={g.jid} className="card" style={{padding:16,position:'relative',overflow:'hidden'}}>
                  {/* accent */}
                  <div style={{position:'absolute',top:0,left:0,right:0,height:'2px',
                    background:activeCount===3?'var(--green)':activeCount>=1?'var(--blue)':'var(--border)'}}/>
                  <div style={{display:'flex',alignItems:'flex-start',gap:10,marginBottom:14}}>
                    <div className="icon-badge" style={{background:'rgba(59,130,246,.1)',flexShrink:0}}>
                      <GroupIcon size={16} color="var(--blue)"/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                        {g.name||'Sin nombre'}
                      </div>
                      <div style={{fontSize:10,color:'var(--tx3)',marginTop:2}}>{shortJid}</div>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[
                      {label:'Anti-Link', on:g.antiLink,  icon:Link,    color:'var(--red)'},
                      {label:'Anti-Spam', on:g.antiSpam,  icon:Shield,  color:'var(--gold)'},
                      {label:'Bienvenida',on:g.welcome,   icon:Bell,    color:'var(--green)'},
                    ].map(feat=>(
                      <div key={feat.label} style={{display:'flex',alignItems:'center',gap:5,
                        padding:'4px 8px',borderRadius:6,
                        background:feat.on?feat.color+'18':'rgba(255,255,255,.04)',
                        border:`1px solid ${feat.on?feat.color+'33':'rgba(255,255,255,.08)'}`}}>
                        {feat.on
                          ? <ToggleRight size={12} color={feat.color}/>
                          : <ToggleLeft size={12} color="rgba(240,240,245,.3)"/>}
                        <span style={{fontSize:10,fontWeight:600,color:feat.on?feat.color:'var(--tx3)'}}>{feat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  