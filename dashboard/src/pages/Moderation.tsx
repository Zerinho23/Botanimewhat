import { useEffect, useState } from 'react'
  import { Shield, Clock } from 'lucide-react'
  import { getModHistory, type ModEntry } from '../api'
  import { shortJid, timeAgo } from '../lib/utils'

  const ACTION_COLORS: Record<string, string> = {
    kick: 'badge-red', ban: 'badge-red', warn: 'badge-amber',
    mute: 'badge-amber', promote: 'badge-green', demote: 'badge-blue',
    add: 'badge-blue',
  }

  const ACTION_LABELS: Record<string, string> = {
    kick: 'EXPULSADO', ban: 'BANEADO', warn: 'ADVERTIDO',
    mute: 'SILENCIADO', promote: 'PROMOVIDO', demote: 'DEGRADADO',
    add: 'AGREGADO',
  }

  export default function Moderation() {
    const [history, setHistory] = useState<ModEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getModHistory()
        .then(d => setHistory(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [])

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
      </div>
    )

    return (
      <div className="space-y-6">
        <div className="card">
          <p className="section-title">Historial de moderación ({history.length})</p>
          {history.length === 0 ? (
            <div className="text-center py-12 text-tx3 font-mono text-xs uppercase tracking-widest">
              <Shield size={28} className="mx-auto mb-3 opacity-30" />
              Sin acciones de moderación registradas
            </div>
          ) : (
            <div className="space-y-0 divide-y divide-blue/5">
              {history.map((entry, i) => (
                <div key={i} className="flex items-center gap-3 py-3 hover:bg-blue/3 transition px-1 rounded">
                  <span className={`badge ${ACTION_COLORS[entry.action] ?? 'badge-blue'} text-[9px] w-20 justify-center flex-shrink-0`}>
                    {ACTION_LABELS[entry.action] ?? entry.action.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-tx truncate">
                      {shortJid(entry.userJid)}
                    </p>
                    <p className="font-mono text-[10px] text-tx3 truncate">
                      Grupo: {shortJid(entry.groupJid)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-tx3 flex-shrink-0">
                    <Clock size={10} />
                    {timeAgo(entry.ts)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  