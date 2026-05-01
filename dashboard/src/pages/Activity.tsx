import { useEffect, useState, useRef } from 'react'
  import { Activity as ActivityIcon, RefreshCw, Zap, Filter, Clock, Play, Pause } from 'lucide-react'
  import { getActivityHistory, isConfigured, type ActivityEvent } from '../api'

  const TYPE_META: Record<string, { color: string; label: string }> = {
    message: { color:'#3b82f6', label:'Mensaje' },
    command: { color:'#8b5cf6', label:'Comando' },
    join:    { color:'#10b981', label:'Ingreso' },
    leave:   { color:'#e53935', label:'Salida' },
    error:   { color:'#ff5252', label:'Error' },
    warning: { color:'#f59e0b', label:'Aviso' },
    kick:    { color:'#e53935', label:'Expulsión' },
    ban:     { color:'#ff5252', label:'Ban' },
  }
  function metaOf(type: string) {
    return TYPE_META[type] || { color:'rgba(240,240,245,.4)', label:type }
  }

  function fmtTs(ts: number) {
    return new Date(ts).toLocaleString('es-MX', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
  }

  export default function Activity() {
    const [events,    setEvents]  = useState<ActivityEvent[]>([])
    const [loading,   setLoad]    = useState(true)
    const [refreshing,setRef]     = useState(false)
    const [filter,    setFilter]  = useState<string>('all')
    const [autoRef,   setAutoRef] = useState(false)
    const intervalRef             = useRef<ReturnType<typeof setInterval>|null>(null)

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setEvents(await getActivityHistory()) } catch {}
      setLoad(false); setRef(false)
    }

    useEffect(() => { load() }, [])

    useEffect(() => {
      if (autoRef) {
        intervalRef.current = setInterval(() => load(false), 5000)
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [autoRef])

    if (!isConfigured()) return (
      <div className="empty-state" style={{ height:320 }}>
        <div className="empty-state-title" style={{ color:'var(--gold)' }}>VITE_API_URL no configurada en Vercel</div>
      </div>
    )
    if (loading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, gap:10, color:'var(--tx3)' }}>
        <RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:13 }}>Cargando actividad…</span>
      </div>
    )

    const typeCounts: Record<string, number> = {}
    events.forEach(e => { typeCounts[e.type] = (typeCounts[e.type]||0)+1 })

    const allTypes = Object.keys(typeCounts)
    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:22 }} className="animate-fade-up">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.6rem' }}>Actividad</h1>
            <p style={{ fontSize:12, color:'var(--tx3)', marginTop:3 }}>Feed de eventos en tiempo real — {events.length} registros</p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => setAutoRef(a=>!a)}
              className={`btn btn-sm ${autoRef?'btn-green':'btn-ghost'}`}>
              {autoRef ? <Pause size={13} /> : <Play size={13} />}
              {autoRef ? 'Auto-refresh ON' : 'Auto-refresh'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Type breakdown */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => setFilter('all')}
            className={`btn btn-xs ${filter==='all'?'btn-primary':'btn-ghost'}`}>
            <Filter size={10} /> Todos ({events.length})
          </button>
          {allTypes.map(type => {
            const m = metaOf(type)
            return (
              <button key={type} onClick={() => setFilter(type)}
                className={`btn btn-xs ${filter===type?'btn-primary':'btn-ghost'}`}
                style={filter===type ? {} : { borderColor:m.color+'33', color:m.color }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:m.color, display:'inline-block' }} />
                {m.label} ({typeCounts[type]})
              </button>
            )
          })}
        </div>

        {/* Type summary cards */}
        {Object.keys(typeCounts).length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10 }}>
            {Object.entries(typeCounts).slice(0,6).map(([type, count]) => {
              const m = metaOf(type)
              return (
                <div key={type} className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10,
                  cursor:'pointer', borderColor: filter===type?m.color+'44':undefined }}
                  onClick={() => setFilter(f => f===type?'all':type)}>
                  <div className="icon-badge" style={{ background:m.color+'20' }}>
                    <Zap size={14} color={m.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'1.2rem', color:'white' }}>{count}</div>
                    <div style={{ fontSize:10, color:'var(--tx3)', textTransform:'uppercase' }}>{m.label}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Event feed */}
        <div className="card">
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <ActivityIcon size={13} color="var(--tx3)" />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--tx3)', letterSpacing:'.06em', textTransform:'uppercase' }}>
                Feed de eventos
              </span>
              {autoRef && (
                <span style={{ fontSize:10, color:'var(--green)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', display:'inline-block', animation:'pulse 1.5s infinite' }} />
                  LIVE
                </span>
              )}
            </div>
            <span className="badge badge-blue">{filtered.length} eventos</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><ActivityIcon size={22} color="var(--tx3)" /></div>
              <div className="empty-state-title">Sin eventos registrados</div>
              <div className="empty-state-sub">Los eventos aparecerán aquí cuando el bot comience a procesar mensajes</div>
            </div>
          ) : (
            <div style={{ maxHeight:520, overflowY:'auto' }}>
              {filtered.slice(0,200).map((e, i) => {
                const m = metaOf(e.type)
                return (
                  <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'10px 18px',
                    borderBottom: i < filtered.length-1 ? '1px solid rgba(255,255,255,.04)' : 'none',
                    transition:'background .15s' }}
                    onMouseEnter={ev => (ev.currentTarget.style.background='rgba(255,255,255,.02)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background='transparent')}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:m.color,
                      boxShadow:`0 0 6px ${m.color}88`, marginTop:5, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:m.color, textTransform:'uppercase',
                          background:m.color+'15', padding:'1px 7px', borderRadius:4 }}>{m.label}</span>
                        <span style={{ fontSize:10, color:'var(--tx3)', display:'flex', alignItems:'center', gap:3 }}>
                          <Clock size={9} />
                          {fmtTs(e.ts)}
                        </span>
                      </div>
                      {e.data && typeof e.data === 'object' && Object.keys(e.data).length > 0 && (
                        <div style={{ fontSize:11, color:'var(--tx2)', fontFamily:"'JetBrains Mono',monospace",
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'100%' }}>
                          {JSON.stringify(e.data).slice(0, 120)}
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
    )
  }
  