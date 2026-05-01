import { useEffect, useState } from 'react'
  import { MessagesSquare, Users, Search } from 'lucide-react'
  import { getGroups, type Group } from '../api'
  import { shortJid } from '../lib/utils'

  export default function Groups() {
    const [groups, setGroups] = useState<Group[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getGroups()
        .then(data => setGroups(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [])

    const filtered = groups.filter(g =>
      (g.subject || '').toLowerCase().includes(search.toLowerCase()) ||
      shortJid(g.id).includes(search)
    )

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
      </div>
    )

    return (
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0">Grupos ({filtered.length})</p>
          </div>
          <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" />
            <input
              className="input pl-9 text-sm"
              placeholder="Buscar por nombre o ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-tx3 font-mono text-xs uppercase tracking-widest">
              <MessagesSquare size={28} className="mx-auto mb-3 opacity-30" />
              Sin grupos registrados
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map(g => (
                <div key={g.id} className="group relative p-4 rounded-lg bg-surface border border-border
                                          hover:border-blue/30 hover:bg-blue/3 transition-all cursor-default">
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue opacity-50 rounded-l-lg" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display font-semibold text-sm text-tx truncate">{g.subject || 'Sin nombre'}</p>
                      <p className="font-mono text-[10px] text-tx3 mt-0.5 truncate">{shortJid(g.id)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs text-tx2">
                      <Users size={12} />
                      {g.participants ?? '?'}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {g.welcome && <span className="badge badge-blue text-[9px]">Welcome</span>}
                    {g.antiLink && <span className="badge badge-red text-[9px]">Anti-Link</span>}
                    {g.antiBad && <span className="badge badge-amber text-[9px]">Anti-Bad</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }
  