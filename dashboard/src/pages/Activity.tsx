import { useEffect, useState, useRef } from 'react'
import { Activity as ActivityIcon, RefreshCw, Play, Pause, X, Filter, Download } from 'lucide-react'
import { getActivityHistory, isConfigured, type ActivityEvent } from '../api'

const TYPE_META: Record<string, { color: string; bg: string; label: string }> = {
  message: { color: '#3B82F6',  bg: 'rgba(59,130,246,.10)',  label: 'MSG'    },
  msg:     { color: '#3B82F6',  bg: 'rgba(59,130,246,.10)',  label: 'MSG'    },
  command: { color: '#8B5CF6',  bg: 'rgba(139,92,246,.10)', label: 'CMD'    },
  cmd:     { color: '#8B5CF6',  bg: 'rgba(139,92,246,.10)', label: 'CMD'    },
  join:    { color: '#10B981',  bg: 'rgba(16,185,129,.10)', label: 'JOIN'   },
  leave:   { color: '#EF4444',  bg: 'rgba(239,68,68,.10)',  label: 'LEAVE'  },
  error:   { color: '#EF4444',  bg: 'rgba(239,68,68,.10)',  label: 'ERROR'  },
  warning: { color: '#F59E0B',  bg: 'rgba(245,158,11,.10)', label: 'WARN'   },
  ban:     { color: '#EF4444',  bg: 'rgba(239,68,68,.10)',  label: 'BAN'    },
  kick:    { color: '#F97316',  bg: 'rgba(249,115,22,.10)', label: 'KICK'   },
  mute:    { color: '#F59E0B',  bg: 'rgba(245,158,11,.10)', label: 'MUTE'   },
  unmute:  { color: '#10B981',  bg: 'rgba(16,185,129,.10)', label: 'UNMUTE' },
  conn:    { color: '#06B6D4',  bg: 'rgba(6,182,212,.10)',  label: 'SYS'    },
  lvl:     { color: '#F97316',  bg: 'rgba(249,115,22,.10)', label: 'LVL UP' },
  warn:    { color: '#F59E0B',  bg: 'rgba(245,158,11,.10)', label: 'WARN'   },
}
const getMeta = (t: string) =>
  TYPE_META[t] ?? { color: '#71717A', bg: 'rgba(255,255,255,.04)', label: t.toUpperCase().slice(0, 6) }

function fmtTs(ts: number) {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDate(ts: number) {
  const d = new Date(ts), now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Hoy'
  const y = new Date(now); y.setDate(y.getDate() - 1)
  if (d.toDateString() === y.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'short' })
}

function exportCSV(events: ActivityEvent[]) {
  const rows = [['ID', 'Tipo', 'Timestamp', 'Sender', 'Grupo', 'Comando']]
  for (const ev of events) {
    const d = ev.data as Record<string, string> | null
    rows.push([String(ev.id), ev.type, new Date(ev.ts).toISOString(), d?.sender ?? '', d?.group ?? '', d?.cmd ?? ''])
  }
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
  a.download = `activity_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}

export default function Activity() {
  const [events,    setEvents]  = useState<ActivityEvent[]>([])
  const [loading,   setLoad]    = useState(true)
  const [filter,    setFilter]  = useState<string>('all')
  const [paused,    setPaused]  = useState(false)
  const [refreshing,setRef]     = useState(false)
  const [search,    setSearch]  = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  // Stats
  const counts: Record<string, number> = {}
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1

  // Filter
  let filtered = filter === 'all' ? events : events.filter(e => e.type === filter)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e => {
      const d = e.data as Record<string, string> | null
      return e.type.includes(q) || (d?.sender ?? '').toLowerCase().includes(q) || (d?.group ?? '').toLowerCase().includes(q) || (d?.cmd ?? '').toLowerCase().includes(q)
    })
  }

  // Group by date
  const grouped: { date: string; items: ActivityEvent[] }[] = []
  for (const ev of filtered.slice(0, 200)) {
    const date = fmtDate(ev.ts)
    const last = grouped[grouped.length - 1]
    if (last?.date === date) last.items.push(ev)
    else grouped.push({ date, items: [ev] })
  }

  if (!isConfigured()) return (
    <div className="empty-state">
      <div className="empty-state-icon"><ActivityIcon size={20} color="var(--text3)" /></div>
      <div className="empty-state-title">API sin configurar</div>
    </div>
  )

  const topTypes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div className="page-title">
            <ActivityIcon size={18} color="#8B5CF6" />
            Actividad
          </div>
          <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span>{events.length} eventos totales</span>
            {!paused && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981', animation: 'livePulse 1.8s ease-in-out infinite' }} />
                <span style={{ color: '#10B981', fontSize: 11, fontWeight: 600 }}>LIVE</span>
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(filtered)} title="Exportar CSV">
            <Download size={12} /> CSV
          </button>
          <button className={`btn btn-sm ${paused ? 'btn-green' : 'btn-ghost'}`} onClick={() => setPaused(p => !p)}>
            {paused ? <><Play size={12} /> Reanudar</> : <><Pause size={12} /> Pausar</>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing || paused}>
            <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8 }}>
        {topTypes.map(([type, cnt]) => {
          const m = getMeta(type)
          const isActive = filter === type
          return (
            <button key={type} onClick={() => setFilter(filter === type ? 'all' : type)}
              style={{
                background: isActive ? m.bg : 'rgba(255,255,255,.025)',
                border: `1px solid ${isActive ? m.color + '40' : 'rgba(255,255,255,.06)'}`,
                borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
                textAlign: 'left', transition: 'all .18s',
              }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: m.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{cnt}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: m.color, opacity: .7, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{m.label}</div>
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)' }}>
          <Filter size={11} />
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em' }}>FILTRO:</span>
        </div>
        <button className={`btn btn-xs ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter('all')}>
          Todos ({events.length})
        </button>
        {topTypes.slice(0, 5).map(([type]) => {
          const m = getMeta(type)
          return (
            <button key={type} className={`btn btn-xs ${filter === type ? 'btn-primary' : 'btn-ghost'}`}
              style={filter !== type ? { color: m.color, borderColor: m.color + '30' } : undefined}
              onClick={() => setFilter(filter === type ? 'all' : type)}>
              {m.label}
            </button>
          )
        })}
        {filter !== 'all' && (
          <button className="btn btn-ghost btn-xs" onClick={() => setFilter('all')}><X size={10} /> Limpiar</button>
        )}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <input className="input" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 12, width: 160, paddingLeft: 10 }} />
        </div>
        {filtered.length !== events.length && (
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{filtered.length} resultados</span>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><ActivityIcon size={20} color="var(--text3)" /></div>
            <div className="empty-state-title">Sin eventos</div>
            <div className="empty-state-sub">
              {search ? 'Sin resultados para esa búsqueda' : filter !== 'all' ? 'Sin eventos de este tipo' : 'No se han registrado eventos aún'}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grouped.map(({ date, items }) => (
            <div key={date}>
              {/* Date separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', padding: '3px 10px', border: '1px solid var(--border)', borderRadius: 20, background: 'var(--bg2)', whiteSpace: 'nowrap' }}>
                  {date} · {items.length} eventos
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div className="card" style={{ padding: '4px 0' }}>
                {items.map((ev, i) => {
                  const m    = getMeta(ev.type)
                  const data = ev.data as Record<string, string> | null
                  return (
                    <div key={ev.id ?? i} className="event-entry" style={{ padding: '8px 16px' }}>
                      {/* Type badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, width: 68 }}>
                        <div style={{ width: 5, height: 5, borderRadius: 1, background: m.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.02em', color: m.color, background: m.bg, border: `1px solid ${m.color}30`, padding: '2px 6px', borderRadius: 4 }}>
                          {m.label}
                        </span>
                      </div>
                      {/* Content */}
                      <div className="event-text">
                        {data?.sender && <span style={{ color: 'var(--text)', fontWeight: 600 }}>{data.sender} </span>}
                        {data?.cmd    && <span style={{ color: '#8B5CF6' }}>→ {data.cmd} </span>}
                        {data?.group  && <span style={{ color: 'var(--text3)', fontSize: 10 }}>[{data.group}] </span>}
                        {data?.text   && <span style={{ color: 'var(--text3)' }}>{String(data.text).slice(0, 60)}</span>}
                        {!data?.sender && !data?.cmd && !data?.group && <span style={{ color: 'var(--text3)' }}>{ev.type} event</span>}
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
      <div style={{ height: 8 }} />
    </div>
  )
}
