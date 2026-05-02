import { useEffect, useState, useRef } from 'react'
  import { Activity as ActivityIcon, RefreshCw, Play, Pause, X } from 'lucide-react'
  import { getActivityHistory, isConfigured, type ActivityEvent } from '../api'

  const TYPE_META: Record<string,{ color: string; bg: string; label: string }> = {
    message: { color: 'var(--blue)',    bg: 'rgba(30,144,255,.1)',   label: 'MSG'     },
    command: { color: 'var(--purple2)', bg: 'rgba(168,85,247,.1)',   label: 'CMD'     },
    join:    { color: 'var(--green2)',  bg: 'rgba(16,185,129,.1)',   label: 'JOIN'    },
    leave:   { color: 'var(--red2)',    bg: 'rgba(239,68,68,.1)',    label: 'LEAVE'   },
    error:   { color: 'var(--red2)',    bg: 'rgba(239,68,68,.1)',    label: 'ERROR'   },
    warning: { color: 'var(--gold)',    bg: 'rgba(251,191,36,.1)',   label: 'WARN'    },
    ban:     { color: 'var(--red2)',    bg: 'rgba(239,68,68,.1)',    label: 'BAN'     },
    kick:    { color: 'var(--orange)',  bg: 'rgba(249,115,22,.1)',   label: 'KICK'    },
    mute:    { color: 'var(--gold)',    bg: 'rgba(251,191,36,.1)',   label: 'MUTE'    },
    conn:    { color: 'var(--cyan)',    bg: 'rgba(0,200,255,.1)',    label: 'SYS'     },
    lvl:     { color: 'var(--gold)',    bg: 'rgba(251,191,36,.1)',   label: 'LVL UP'  },
  }

  const getMeta = (t: string) =>
    TYPE_META[t] ?? { color: 'var(--tx3)', bg: 'rgba(30,144,255,.05)', label: t.toUpperCase().slice(0,8) }

  function fmtTs(ts: number) {
    return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  function fmtDate(ts: number) {
    const d = new Date(ts)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'HOY'
    const y = new Date(now); y.setDate(y.getDate() - 1)
    if (d.toDateString() === y.toDateString()) return 'AYER'
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase()
  }

  export default function Activity() {
    const [events,    setEvents]  = useState<ActivityEvent[]>([])
    const [loading,   setLoad]    = useState(true)
    const [filter,    setFilter]  = useState<string>('all')
    const [paused,    setPaused]  = useState(false)
    const [refreshing,setRef]     = useState(false)
    const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null)

    const load = async (r = false) => {
      if (!isConfigured() || paused) return
      if (r) setRef(true)
      try { const ev = await getActivityHistory(); setEvents(ev) } catch {}
      setLoad(false); setRef(false)
    }

    useEffect(() => {
      load()
      intervalRef.current = setInterval(load, 8000)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [paused])
    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter)

    // Stats
    const counts: Record<string,number> = {}
    for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1

    // Group by date for timeline
    const grouped: { date: string; items: ActivityEvent[] }[] = []
    for (const ev of filtered.slice(0, 150)) {
      const date = fmtDate(ev.ts)
      const last = grouped[grouped.length - 1]
      if (last?.date === date) last.items.push(ev)
      else grouped.push({ date, items: [ev] })
    }

    if (!isConfigured()) return (
      <div className="empty-state">
        <div className="empty-state-icon"><ActivityIcon size={20} color="var(--tx3)" /></div>
        <div className="empty-state-title">API SIN CONFIGURAR</div>
      </div>
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-up">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title">
              <span className="page-title-bracket">◈</span>
              EVENT LOG
              <span className="page-title-bracket">◈</span>
            </div>
            <div className="page-subtitle">
              {events.length} EVENTOS · {paused ? 'PAUSADO' : 'LIVE — actualiza cada 8s'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm ${paused ? 'btn-green' : 'btn-ghost'}`} onClick={() => setPaused(p => !p)}>
              {paused ? <><Play size={12} /> LIVE</> : <><Pause size={12} /> PAUSAR</>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing || paused}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Event type stats strip */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([type, cnt]) => {
            const m = getMeta(type)
            return (
              <div key={type} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
                borderRadius: 'var(--radius)', background: m.bg, border: '1px solid ' + m.color + '30',
                cursor: 'pointer',
              }} onClick={() => setFilter(filter === type ? 'all' : type)}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: m.color, boxShadow: '0 0 4px ' + m.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, color: m.color, letterSpacing: '.1em' }}>{m.label}</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: m.color }}>{cnt}</span>
              </div>
            )
          })}
        </div>

        {/* Active filters */}
        {filter !== 'all' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>FILTRO:</span>
            <span className="badge badge-blue">{getMeta(filter).label}</span>
            <button className="btn btn-ghost btn-xs" onClick={() => setFilter('all')}><X size={10} /> LIMPIAR</button>
            <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--tx3)', fontFamily: "'Rajdhani',sans-serif" }}>{filtered.length} eventos</span>
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 6 }} />)}
          </div>
        ) : grouped.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><ActivityIcon size={20} color="var(--tx3)" /></div>
              <div className="empty-state-title">SIN EVENTOS</div>
              <div className="empty-state-sub">No se han registrado eventos aún</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {grouped.map(({ date, items }) => (
              <div key={date}>
                {/* Date separator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700,
                    letterSpacing: '.14em', color: 'var(--tx3)', padding: '2px 10px',
                    border: '1px solid var(--border)', borderRadius: 2, background: 'var(--bg2)' }}>
                    {date}
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <div className="card" style={{ padding: '6px 16px' }}>
                  {items.map((ev, i) => {
                    const m    = getMeta(ev.type)
                    const data = ev.data as Record<string,string> | null
                    return (
                      <div key={ev.id ?? i} className="event-entry">
                        {/* Dot + type badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, width: 64 }}>
                          <div className="event-dot" style={{ background: m.color, boxShadow: '0 0 5px ' + m.color }} />
                          <span style={{
                            fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700,
                            letterSpacing: '.1em', color: m.color, background: m.bg,
                            border: '1px solid ' + m.color + '30',
                            padding: '1px 5px', borderRadius: 2,
                          }}>{m.label}</span>
                        </div>

                        {/* Content */}
                        <div className="event-text">
                          {data?.sender && <span style={{ color: 'var(--tx1)', fontWeight: 600 }}>{data.sender} </span>}
                          {data?.cmd    && <span style={{ color: 'var(--purple2)' }}>→ {data.cmd} </span>}
                          {data?.group  && <span style={{ color: 'var(--tx3)', fontSize: 10 }}>[{data.group}] </span>}
                          {data?.text   && <span style={{ color: 'var(--tx3)' }}>{String(data.text).slice(0,60)}</span>}
                          {!data?.sender && !data?.cmd && !data?.group &&
                            <span style={{ color: 'var(--tx3)' }}>{ev.type} event</span>}
                        </div>

                        {/* Timestamp */}
                        <div className="event-time">{fmtTs(ev.ts)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  