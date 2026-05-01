import { useEffect, useState } from 'react'
  import { Activity as ActivityIcon, RefreshCw, Zap } from 'lucide-react'
  import { getActivityHistory, isConfigured, type ActivityEvent } from '../api'

  const TYPE_COLORS: Record<string,string> = {
    message:'var(--blue)', command:'var(--purple)', join:'var(--green)',
    leave:'var(--red)', error:'var(--red2)', warning:'var(--gold)',
  }

  export default function Activity() {
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [loading, setLoad]  = useState(true)
    const [refreshing, setRef]= useState(false)

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setEvents(await getActivityHistory()) } catch {}
      setLoad(false); setRef(false)
    }
    useEffect(()=>{ load() },[])

    if (!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <p style={{color:'var(--gold)',fontSize:13}}>VITE_API_URL no configurada en Vercel</p>
      </div>
    )
    if (loading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,gap:10,color:'var(--tx3)'}}>
        <RefreshCw size={16} style={{animation:'spin 1s linear infinite'}}/><span>Cargando actividad…</span>
      </div>
    )

    const typeCounts: Record<string,number> = {}
    events.forEach(e=>{ typeCounts[e.type]=(typeCounts[e.type]||0)+1 })

    return (
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'1.4rem'}}>Actividad</h1>
            <p style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>Eventos del bot en tiempo real — {events.length} registros</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
            <RefreshCw size={13} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/>Actualizar
          </button>
        </div>

        {/* Type breakdown */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {Object.entries(typeCounts).slice(0,6).map(([type,count])=>(
            <div key={type} className="card" style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
              <div className="icon-badge" style={{background:(TYPE_COLORS[type]||'var(--tx3)')+'22'}}>
                <Zap size={14} color={TYPE_COLORS[type]||'var(--tx3)'}/>
              </div>
              <div>
                <div style={{fontWeight:700,color:'white'}}>{count}</div>
                <div style={{fontSize:10,color:'var(--tx3)',textTransform:'uppercase'}}>{type}</div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div style={{color:'var(--tx3)',fontSize:12,padding:'12px 0'}}>
              Sin eventos registrados aún — el bot aún no ha procesado mensajes
            </div>
          )}
        </div>

        {/* Event feed */}
        {events.length > 0 && (
          <div className="card">
            <div style={{padding:'12px 16px 4px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
              <ActivityIcon size={13} color="var(--tx3)"/>
              <span style={{fontSize:11,fontWeight:600,color:'var(--tx3)',letterSpacing:'.05em',textTransform:'uppercase'}}>Feed de eventos</span>
            </div>
            <div style={{maxHeight:480,overflow:'auto'}}>
              {events.slice(0,200).map((e,i)=>{
                const c = TYPE_COLORS[e.type]||'var(--tx3)'
                return (
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:12,
                    padding:'10px 16px',
                    borderBottom:i<events.length-1?'1px solid rgba(255,255,255,.04)':'none',
                    transition:'background .15s'}}
                    onMouseEnter={ev=>(ev.currentTarget.style.background='rgba(255,255,255,.02)')}
                    onMouseLeave={ev=>(ev.currentTarget.style.background='transparent')}>
                    <div style={{width:6,height:6,borderRadius:'50%',background:c,
                      boxShadow:`0 0 5px ${c}`,marginTop:5,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                        <span style={{fontSize:11,fontWeight:700,color:c,textTransform:'uppercase'}}>{e.type}</span>
                        <span style={{fontSize:10,color:'var(--tx3)'}}>
                          {new Date(e.ts).toLocaleString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                        </span>
                      </div>
                      {e.data && typeof e.data === 'object' && Object.keys(e.data).length > 0 && (
                        <div style={{fontSize:11,color:'var(--tx2)',fontFamily:"'JetBrains Mono',monospace",
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {JSON.stringify(e.data).slice(0,100)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }
  