import { useEffect, useState } from 'react'
  import { type LucideIcon, Users, MessagesSquare, Zap, Clock, TrendingUp, Activity, AlertTriangle } from 'lucide-react'
  import { getStatus, getStats, getActivityHistory, getMaintenance, postMaintenance,
    type BotStatus, type BotStats, type ActivityEvent, type MaintenanceState } from '../api'
  import { formatUptime, formatNumber, timeAgo, cn } from '../lib/utils'

  function StatCard({ label, value, icon: Icon, color = 'blue', sub }: {
    label: string; value: string | number; icon: React.ComponentType<{ size?: number; className?: string }>;
    color?: string; sub?: string
  }) {
    const colors: Record<string, string> = {
      blue: 'text-blue', purple: 'text-purple', green: 'text-green', amber: 'text-amber', gold: 'text-gold'
    }
    return (
      <div className="stat-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[9px] text-tx3 uppercase tracking-widest mb-2">{label}</p>
            <p className={`font-display text-4xl font-bold ${colors[color] ?? 'text-blue'} leading-none`}
               style={{ textShadow: `0 0 20px currentColor` }}>
              {value}
            </p>
            {sub && <p className="font-mono text-[10px] text-tx3 mt-1.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-md bg-current/10 ${colors[color] ?? 'text-blue'}`}>
            <Icon size={18} className="current" />
          </div>
        </div>
      </div>
    )
  }

  function EventBadge({ type }: { type: string }) {
    const map: Record<string, string> = {
      msg: 'badge-blue', cmd: 'badge-purple', mod: 'badge-amber',
      conn: 'badge-green', err: 'badge-red'
    }
    const labels: Record<string, string> = {
      msg: 'MSG', cmd: 'CMD', mod: 'MOD', conn: 'CONN', err: 'ERR'
    }
    return <span className={`badge ${map[type] ?? 'badge-blue'}`}>{labels[type] ?? type.toUpperCase()}</span>
  }

  export default function Overview() {
    const [status, setStatus] = useState<BotStatus | null>(null)
    const [stats, setStats] = useState<BotStats | null>(null)
    const [events, setEvents] = useState<ActivityEvent[]>([])
    const [maint, setMaint] = useState<MaintenanceState | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      const load = async () => {
        try {
          const [s, st, ev, m] = await Promise.allSettled([
            getStatus(), getStats(), getActivityHistory(), getMaintenance()
          ])
          if (s.status === 'fulfilled') setStatus(s.value)
          if (st.status === 'fulfilled') setStats(st.value)
          if (ev.status === 'fulfilled') setEvents(ev.value.slice(0, 15))
          if (m.status === 'fulfilled') setMaint(m.value)
        } finally { setLoading(false) }
      }
      load()
      const id = setInterval(load, 12000)
      return () => clearInterval(id)
    }, [])

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
      </div>
    )

    const uptime = stats?.uptime ?? 0

    return (
      <div className="space-y-6">
        {maint?.enabled && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber/8 border border-amber/30 text-amber font-display font-semibold text-sm">
            <AlertTriangle size={16} />
            Modo mantenimiento activo — {maint.message}
          </div>
        )}

        {/* Status banner */}
        <div className={cn(
          'flex items-center gap-4 p-5 rounded-lg border',
          status?.connected
            ? 'bg-green/5 border-green/20'
            : 'bg-red/5 border-red/20'
        )}>
          <div className={cn(
            'w-3 h-3 rounded-full animate-pulse-slow',
            status?.connected ? 'bg-green shadow-[0_0_12px_#00ff88]' : 'bg-red shadow-[0_0_12px_#ff3355]'
          )} />
          <div>
            <p className={cn('font-display font-bold text-lg', status?.connected ? 'text-green' : 'text-red')}>
              {status?.connected ? 'Bot Conectado' : 'Bot Desconectado'}
            </p>
            <p className="font-mono text-[10px] text-tx3 mt-0.5">
              {status?.connected ? `Activo • Uptime: ${formatUptime(uptime)}` : 'Esperando conexión de WhatsApp'}
            </p>
          </div>
          {status?.connected && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded bg-green/10 border border-green/20 text-green font-mono text-xs">
              <Activity size={12} />
              LIVE
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Usuarios totales"
            value={formatNumber(stats?.totalUsers ?? 0)}
            icon={Users}
            color="blue"
            sub="registrados"
          />
          <StatCard
            label="Grupos activos"
            value={formatNumber(stats?.totalGroups ?? 0)}
            icon={MessagesSquare}
            color="purple"
            sub="en gestión"
          />
          <StatCard
            label="Comandos hoy"
            value={formatNumber(stats?.commandsToday ?? 0)}
            icon={Zap}
            color="amber"
            sub="ejecutados"
          />
          <StatCard
            label="Uptime"
            value={formatUptime(uptime)}
            icon={Clock}
            color="green"
            sub="tiempo activo"
          />
        </div>

        {/* Activity feed + quick info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Activity feed */}
          <div className="lg:col-span-2 card">
            <p className="section-title">Actividad reciente</p>
            {events.length === 0 ? (
              <div className="text-center py-12 text-tx3 font-mono text-xs uppercase tracking-widest">
                <TrendingUp size={28} className="mx-auto mb-3 opacity-30" />
                Sin actividad reciente
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-blue/5">
                {events.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 hover:bg-blue/3 transition rounded px-1">
                    <EventBadge type={ev.type} />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-tx truncate">
                        {typeof ev.data === 'object'
                          ? Object.values(ev.data).filter(Boolean).slice(0, 2).join(' · ')
                          : String(ev.data)}
                      </p>
                    </div>
                    <span className="font-mono text-[10px] text-tx3 whitespace-nowrap flex-shrink-0">
                      {timeAgo(ev.ts)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick status */}
          <div className="card space-y-4">
            <p className="section-title">Estado del sistema</p>
            {[
              { label: 'Conexión WA', ok: status?.connected },
              { label: 'Socket listo', ok: status?.ready },
              { label: 'QR disponible', ok: status?.hasQR },
              { label: 'Código pareado', ok: status?.hasPairingCode },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-blue/5 last:border-0">
                <span className="font-mono text-xs text-tx2">{label}</span>
                <span className={cn('badge text-[10px]', ok ? 'badge-green' : 'badge-red')}>
                  {ok ? 'OK' : 'NO'}
                </span>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="label">Último update</p>
              <p className="font-mono text-xs text-tx2">
                {status?.lastUpdate ? timeAgo(status.lastUpdate) : '—'}
              </p>
            </div>

            {maint !== null && (
              <div className="pt-2 border-t border-border">
                <p className="label mb-2">Mantenimiento</p>
                <button
                  className={cn('btn-ghost w-full text-xs justify-center', maint.enabled && 'btn-danger')}
                  onClick={async () => {
                    await postMaintenance({ enabled: !maint.enabled })
                    setMaint(prev => prev ? { ...prev, enabled: !prev.enabled } : null)
                  }}
                >
                  {maint.enabled ? 'Desactivar' : 'Activar mantenimiento'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
  