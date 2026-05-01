import { useEffect, useState } from 'react'
  import { Search, Trophy, Star } from 'lucide-react'
  import { getUsers, type User } from '../api'
  import { rankOf, shortJid, formatNumber } from '../lib/utils'

  export default function Users() {
    const [users, setUsers] = useState<User[]>([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getUsers()
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [])

    const filtered = users
      .filter(u => shortJid(u.jid).includes(search) || (u.name || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))

    const top3 = filtered.slice(0, 3)
    const rest = filtered.slice(3)

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
      </div>
    )

    return (
      <div className="space-y-6">
        {/* Podium */}
        {top3.length >= 3 && (
          <div className="card">
            <p className="section-title">Top Usuarios</p>
            <div className="flex items-end justify-center gap-4 pt-4 pb-2">
              {[top3[1], top3[0], top3[2]].map((u, i) => {
                const pos = i === 0 ? 2 : i === 1 ? 1 : 3
                const heights = ['h-20', 'h-28', 'h-16']
                const r = rankOf(u.level ?? 0)
                return (
                  <div key={u.jid} className="flex flex-col items-center gap-1">
                    <div className="font-mono text-[10px] text-tx3 mb-1">{shortJid(u.jid).slice(-8)}</div>
                    <div className="font-display font-bold text-sm" style={{ color: r.color }}>{r.l}</div>
                    <div className={`${heights[i]} w-16 flex items-center justify-center rounded-t-md border border-current/30`}
                         style={{ background: `${r.color}18`, borderColor: `${r.color}40` }}>
                      <span className="font-display font-bold text-2xl" style={{ color: r.color }}>#{pos}</span>
                    </div>
                    <div className="font-mono text-[10px] text-tx2">Lv.{u.level ?? 0}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title mb-0">Todos los usuarios ({filtered.length})</p>
          </div>
          <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-tx3" />
            <input
              className="input pl-9 text-sm"
              placeholder="Buscar por número o nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-tx3 font-mono text-xs uppercase tracking-widest">
              <Trophy size={28} className="mx-auto mb-3 opacity-30" />
              Sin usuarios registrados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="label pb-3 text-left pr-4">#</th>
                    <th className="label pb-3 text-left pr-4">Usuario</th>
                    <th className="label pb-3 text-left pr-4">Rango</th>
                    <th className="label pb-3 text-left pr-4">Nivel</th>
                    <th className="label pb-3 text-left pr-4">XP</th>
                    <th className="label pb-3 text-left">Monedas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue/5">
                  {filtered.map((u, i) => {
                    const r = rankOf(u.level ?? 0)
                    const xpForNext = ((u.level ?? 0) + 1) * 100
                    const xpPct = Math.min(100, ((u.xp ?? 0) % xpForNext) / xpForNext * 100)
                    return (
                      <tr key={u.jid} className="hover:bg-blue/3 transition group">
                        <td className="py-3 pr-4 font-mono text-xs text-tx3">{i + 1}</td>
                        <td className="py-3 pr-4">
                          <div className="font-mono text-sm text-tx">{shortJid(u.jid)}</div>
                          {u.name && <div className="font-mono text-[10px] text-tx3">{u.name}</div>}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded border font-display font-bold text-sm"
                                style={{ color: r.color, borderColor: r.color + '50', background: r.color + '15' }}>
                            {r.l}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-display font-bold text-base" style={{ color: r.color }}>
                            {u.level ?? 0}
                          </div>
                          <div className="w-20 h-1 bg-blue/10 rounded-full mt-1 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${xpPct}%`, background: r.color }} />
                          </div>
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-tx2">{formatNumber(u.xp ?? 0)}</td>
                        <td className="py-3 font-mono text-xs text-amber">{formatNumber(u.coins ?? 0)} <Star size={10} className="inline text-gold" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }
  