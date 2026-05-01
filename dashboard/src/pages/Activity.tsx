import { useEffect, useState, useRef } from 'react'
  import { Activity, Wifi, WifiOff } from 'lucide-react'
  import { getActivityHistory, getApiUrl, type ActivityEvent } from '../api'
  import { timeAgo } from '../lib/utils'

  const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
    msg: { label: 'MSG', cls: 'badge-blue' },
    cmd: { label: 'CMD', cls: 'badge-purple' },
    mod: { label: 'MOD', cls: 'badge-amber' },
    conn: { label: 'CONN', cls: 'badge-green' },
    err: { label: 'ERR', cls: 'badge-red' },
  }

  export default function ActivityPage() {
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [live, setLive] = useState(false)
    const [loading, setLoading] = useState(true)
    const esRef = useRef<EventSource | null>(null)

    useEffect(() => {
      getActivityHistory()
        .then(data => setEvents(data.slice(0, 100)))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
      const apiUrl = getApiUrl()
      if (!apiUrl) return
      const es = new EventSource(`${apiUrl}/api/events`)
      esRef.current = es
      es.onopen = () => setLive(true)
      es.onerror = () => setLive(false)
      es.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data) as ActivityEvent
          setEvents(prev => [ev, ...prev].slice(0, 100))
        } catch {}
      }
      return () => { es.close(); setLive(false) }
    }, [])

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
      </div>
    )

    return (
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0">Actividad en tiempo real</p>
            <div className={`flex items-center gap-1.5 font-mono text-[10px] ${live ? 'text-green' : 'text-tx3'}`}>
              {live ? <Wifi size={12} /> : <WifiOff size={12} />}
              {live ? 'LIVE' : 'Sin conexión SSE'}
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 text-tx3 font-mono text-xs uppercase tracking-widest">
              <Activity size={28} className="mx-auto mb-3 opacity-30" />
              Sin actividad registrada
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-blue/5 max-h-[600px] overflow-y-auto">
              {events.map((ev, i) => {
                const cfg = TYPE_CONFIG[ev.type] ?? { label: ev.type.toUpperCase(), cls: 'badge-blue' }
                return (
                  <div key={i} className="flex items-start gap-3 py-2.5 hover:bg-blue/3 transition px-1 rounded">
                    <span className={`badge ${cfg.cls} text-[9px] w-12 justify-center flex-shrink-0`}>{cfg.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-tx leading-relaxed">
                        {typeof ev.data === 'object'
                          ? Object.entries(ev.data).map(([k, v]) => `${k}: ${v}`).join(' · ')
                          : String(ev.data)}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-tx3 whitespace-nowrap flex-shrink-0">
                      {timeAgo(ev.ts)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }
  