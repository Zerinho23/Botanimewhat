import { useEffect, useState, useRef } from 'react'
  import { Wifi, WifiOff } from 'lucide-react'
  import { getActivityHistory, getApiUrl, isConfigured } from '../api'
  import type { ActivityEvent } from '../api'
  import { timeAgo } from '../lib/utils'

  const TYPE_CFG: Record<string,{label:string;cls:string}> = {
    msg:{label:'MSG',cls:'badge-blue'}, cmd:{label:'CMD',cls:'badge-purple'},
    mod:{label:'MOD',cls:'badge-amber'}, conn:{label:'CONN',cls:'badge-green'}, err:{label:'ERR',cls:'badge-red'}
  }

  export default function ActivityPage() {
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [live, setLive] = useState(false)
    const [loading, setLoading] = useState(true)
    const esRef = useRef<EventSource|null>(null)

    useEffect(() => {
      getActivityHistory().then(d=>setEvents(d.slice(0,100))).catch(()=>{}).finally(()=>setLoading(false))
    }, [])

    useEffect(() => {
      const apiUrl = getApiUrl()
      if (!apiUrl) return
      const es = new EventSource(`${apiUrl}/api/events`)
      esRef.current = es
      es.onopen = () => setLive(true)
      es.onerror = () => setLive(false)
      es.onmessage = (e) => {
        try { const ev = JSON.parse(e.data) as ActivityEvent; setEvents(prev=>[ev,...prev].slice(0,100)) } catch {}
      }
      return () => { es.close(); setLive(false) }
    }, [])

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
      <div className="panel panel-accent" style={{padding:'22px 24px',position:'relative'}}>
        <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://REAL_TIME_FEED</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white'}}>LOG EN VIVO</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,fontFamily:"'Share Tech Mono',monospace",fontSize:11,
                       color: live ? 'var(--green)' : 'var(--tx3)'}}>
            {live ? <Wifi size={12}/> : <WifiOff size={12}/>}
            {live ? 'SSE ACTIVO' : 'SIN SSE'}
          </div>
        </div>
        <div className="hud-divider" style={{marginBottom:12}} />
        {events.length===0 ? (
          <div className="sys-label" style={{textAlign:'center',padding:'40px 0'}}>/// SIN ACTIVIDAD ///</div>
        ) : (
          <div style={{maxHeight:560,overflowY:'auto',display:'flex',flexDirection:'column',gap:0}}>
            {events.map((ev,i)=>{
              const cfg = TYPE_CFG[ev.type]??{label:ev.type.toUpperCase(),cls:'badge-blue'}
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(0,195,255,0.05)'}}>
                  <span className={`badge ${cfg.cls}`} style={{minWidth:44,justifyContent:'center'}}>{cfg.label}</span>
                  <div style={{flex:1,fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'var(--tx2)',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                    {typeof ev.data==='object'
                      ? Object.entries(ev.data).map(([k,v])=>`${k}:${v}`).join(' · ')
                      : String(ev.data)}
                  </div>
                  <span className="sys-label" style={{whiteSpace:'nowrap',flexShrink:0}}>{timeAgo(ev.ts)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  