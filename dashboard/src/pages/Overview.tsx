import { useEffect, useState, useRef } from 'react'
  import { motion, AnimatePresence } from 'framer-motion'
  import {
    RefreshCw, Users, MessageSquare, Activity, Zap,
    Shield, Clock, Award, BarChart2, AlertCircle, ArrowUpRight, MoreVertical,
  } from 'lucide-react'
  import {
    getStatus, getStats, getUsers, getActivityHistory, isConfigured,
    type BotStats, type BotStatus, type User, type ActivityEvent,
  } from '../api'

  /* ── Animated counter ── */
  function useCounter(target: number, dur = 1000) {
    const [v, setV] = useState(0)
    const ref = useRef<ReturnType<typeof setInterval> | null>(null)
    useEffect(() => {
      if (ref.current) clearInterval(ref.current)
      if (target === 0) { setV(0); return }
      const t0 = Date.now()
      ref.current = setInterval(() => {
        const p = Math.min((Date.now() - t0) / dur, 1)
        setV(Math.round(target * (1 - Math.pow(1 - p, 4))))
        if (p >= 1) { clearInterval(ref.current!); setV(target) }
      }, 16)
      return () => { if (ref.current) clearInterval(ref.current) }
    }, [target])
    return v
  }

  /* ── Helpers ── */
  const fmtUp = (s: number) => {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
    if (d > 0) return `${d}d ${h}h`; if (h > 0) return `${h}h ${m}m`; return `${m}m`
  }

  const fmtNum = (n: number) =>
    n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : n.toString()

  const fmtTs = (ts: number) =>
    new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  /* ── Metric config ── */
  const METRICS = [
    { icon: Users,         label: 'Usuarios',    key: 'users',         color: '#F59E0B' },
    { icon: MessageSquare, label: 'Grupos',      key: 'groups',        color: '#F59E0B' },
    { icon: Zap,           label: 'Cmds hoy',   key: 'commandsToday', color: '#F59E0B' },
    { icon: Activity,      label: 'Mensajes',   key: 'messages',      color: '#F59E0B' },
    { icon: Shield,        label: 'Eventos',    key: '_events',       color: '#F59E0B' },
    { icon: Clock,         label: 'Uptime',     key: '_uptime',       color: '#F59E0B' },
  ]

  /* ── Event meta ── */
  const EV_META: Record<string, { label: string; color: string }> = {
    msg:  { label: 'MSG',  color: '#3B82F6' },
    cmd:  { label: 'CMD',  color: '#8B5CF6' },
    mod:  { label: 'MOD',  color: '#F59E0B' },
    join: { label: 'JOIN', color: '#10B981' },
    lvl:  { label: 'LVL',  color: '#F97316' },
    conn: { label: 'SYS',  color: '#06B6D4' },
  }
  const evMeta = (t: string) => EV_META[t] ?? { label: t.slice(0, 4).toUpperCase(), color: '#A1A1AA' }

  /* ── Shared card style ── */
  const card = {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden' as const,
  }

  /* ════════════════════════════════════════════
     MetricCard — Variant C style
     ════════════════════════════════════════════ */
  function MetricCard({ icon: Icon, label, value, sub, delay = 0 }: {
    icon: React.ElementType; label: string; value: number; sub?: string; delay?: number
  }) {
    const n = useCounter(value)
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay / 1000, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ ...card, padding: 24, display: 'flex', flexDirection: 'column', cursor: 'default', transition: 'border-color .2s, background .2s' }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.13)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.045)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'
          ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)'
        }}
      >
        {/* Top row — label + icon */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#A1A1AA' }}>{label}</span>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={15} color="#F59E0B" strokeWidth={2} />
          </div>
        </div>
        {/* Value */}
        <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#F4F4F5' }}>
          {sub ? sub : fmtNum(n)}
        </span>
      </motion.div>
    )
  }

  /* ── Simple bar chart (like Variant C) ── */
  function BarChart({ data }: { data: { label: string; value: number }[] }) {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140, padding: '0 2px' }}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 100, d.value > 0 ? 6 : 3)
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6, cursor: 'pointer' }}
              onMouseEnter={e => { const bar = e.currentTarget.querySelector('.bar') as HTMLDivElement; if (bar) bar.style.background = 'rgba(245,158,11,0.80)' }}
              onMouseLeave={e => { const bar = e.currentTarget.querySelector('.bar') as HTMLDivElement; if (bar) bar.style.background = 'rgba(255,255,255,0.10)' }}
            >
              <motion.div
                className="bar"
                initial={{ height: '2%' }}
                animate={{ height: h + '%' }}
                transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: i * 0.06 }}
                style={{ width: '100%', maxWidth: 32, borderRadius: '3px 3px 0 0', background: 'rgba(255,255,255,0.10)', transition: 'background .2s' }}
              />
            </div>
          )
        })}
      </div>
    )
  }

  /* ── Health bar ── */
  function HealthBar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
    const pct = max === 0 ? 0 : Math.min((val / max) * 100, 100)
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: '#A1A1AA' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#F4F4F5' }}>
            {val.toLocaleString()} <span style={{ color: '#52525B', fontSize: 11 }}>/ {max.toLocaleString()}</span>
          </span>
        </div>
        <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: pct + '%' }}
            transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
            style={{ height: '100%', borderRadius: 2, background: color }}
          />
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════
     Overview page
     ════════════════════════════════════════════ */
  export default function Overview() {
    const [status,  setStatus]  = useState<BotStatus | null>(null)
    const [stats,   setStats]   = useState<BotStats  | null>(null)
    const [users,   setUsers]   = useState<User[]>([])
    const [events,  setEvents]  = useState<ActivityEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [ref,     setRef]     = useState(false)

    const load = async (r = false) => {
      if (!isConfigured()) { setLoading(false); return }
      if (r) setRef(true)
      try {
        const [s, st, u, ev] = await Promise.allSettled([
          getStatus(), getStats(), getUsers(), getActivityHistory(),
        ])
        if (s.status  === 'fulfilled') setStatus(s.value)
        if (st.status === 'fulfilled') setStats(st.value)
        if (u.status  === 'fulfilled') setUsers(u.value)
        if (ev.status === 'fulfilled') setEvents(ev.value)
      } catch {}
      setLoading(false); setRef(false)
    }

    useEffect(() => {
      load()
      const id = setInterval(() => load(), 20000)
      return () => clearInterval(id)
    }, [])

    /* ── Not configured ── */
    if (!isConfigured()) return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ maxWidth: 400, width: '100%', ...card, padding: 32, textAlign: 'center' }}
        >
          <AlertCircle size={28} color="#F59E0B" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F4F4F5', marginBottom: 8 }}>Sin configurar</p>
          <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.6 }}>
            Agrega <code style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 4, padding: '1px 6px', color: '#FBBF24', fontSize: 12 }}>VITE_API_URL</code> en Vercel → Settings → Environment Variables.
          </p>
        </motion.div>
      </div>
    )

    /* ── Loading ── */
    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="grid-metrics">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
        <div className="grid-duo">
          <div className="skeleton" style={{ height: 260 }} />
          <div className="skeleton" style={{ height: 260 }} />
        </div>
      </div>
    )

    /* ── Derived data ── */
    const connected  = status?.connected ?? false
    const uptimeSecs = stats?.uptime ?? 0
    const topUsers   = [...users].sort((a, b) => (b.xp       || 0) - (a.xp       || 0)).slice(0, 5)
    const topCmds    = [...users].sort((a, b) => (b.commands || 0) - (a.commands || 0)).slice(0, 5)
    const recentEvs  = events.slice(0, 12)

    const evCounts: Record<string, number> = {}
    for (const ev of events.slice(0, 100)) evCounts[ev.type] = (evCounts[ev.type] || 0) + 1

    const chartData = [
      { label: 'Lun', value: evCounts['msg']  || 0 },
      { label: 'Mar', value: evCounts['cmd']  || 0 },
      { label: 'Mié', value: evCounts['mod']  || 0 },
      { label: 'Jue', value: evCounts['join'] || 0 },
      { label: 'Vie', value: evCounts['lvl']  || 0 },
      { label: 'Sáb', value: evCounts['conn'] || 0 },
      { label: 'Dom', value: 0 },
    ]

    const metricValues: Record<string, number> = {
      users:        stats?.users         ?? 0,
      groups:       stats?.groups        ?? 0,
      commandsToday:stats?.commandsToday ?? 0,
      messages:     stats?.messages      ?? 0,
      _events:      events.length,
      _uptime:      uptimeSecs,
    }

    const border = '1px solid rgba(255,255,255,0.08)'

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Status banner ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ ...card, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: connected ? '#10B981' : '#F87171' }}>
                {connected ? 'Bot en línea — Activo' : 'Bot desconectado'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#A1A1AA' }}>
              Uptime: {fmtUp(uptimeSecs)} · BotAnime Core
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => load(true)}
            disabled={ref}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} style={{ animation: ref ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </motion.div>

        {/* ── Metric cards ── */}
        <div className="grid-metrics">
          {METRICS.map((m, i) => (
            <MetricCard
              key={m.key}
              icon={m.icon}
              label={m.label}
              value={metricValues[m.key] ?? 0}
              sub={m.key === '_uptime' ? fmtUp(uptimeSecs) : undefined}
              delay={i * 60}
            />
          ))}
        </div>

        {/* ── Activity chart + Event log ── */}
        <div className="grid-duo">

          {/* Activity chart */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            style={{ ...card, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart2 size={16} color="#A1A1AA" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#F4F4F5' }}>Actividad de Mensajes</span>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer' }}>
                Últimos 7 días <ArrowUpRight size={13} />
              </button>
            </div>
            <div style={{ padding: '20px 20px 12px' }}>
              <BarChart data={chartData} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 2px' }}>
                {chartData.map(d => (
                  <span key={d.label} style={{ fontSize: 11, color: '#52525B', flex: 1, textAlign: 'center' }}>{d.label}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Event log */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.40, duration: 0.4 }}
            style={{ ...card, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: border }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} color="#A1A1AA" />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#F4F4F5' }}>Log de Eventos</span>
              </div>
              <MoreVertical size={15} color="#52525B" style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 240 }}>
              <AnimatePresence initial={false}>
                {recentEvs.length === 0
                  ? (
                    <div className="empty-state">
                      <div className="empty-state-icon"><Activity size={16} color="#52525B" /></div>
                      <div className="empty-state-title">Sin eventos</div>
                      <div className="empty-state-sub">El log aparecerá aquí</div>
                    </div>
                  )
                  : recentEvs.map((ev, i) => {
                    const m = evMeta(ev.type)
                    const d = ev.data as Record<string, string> | null
                    return (
                      <motion.div
                        key={ev.id ?? i}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="event-entry"
                      >
                        <div style={{ width: 6, height: 6, borderRadius: 2, background: m.color, flexShrink: 0, marginTop: 5 }} />
                        <div style={{ flex: 1, fontSize: 12, color: '#A1A1AA', lineHeight: 1.5 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 3, background: `${m.color}15`, color: m.color, marginRight: 7 }}>{m.label}</span>
                          {d?.sender && <span style={{ color: '#F4F4F5', fontWeight: 500 }}>{d.sender}</span>}
                          {d?.cmd    && <span style={{ color: '#71717A' }}> › {d.cmd}</span>}
                          {!d?.sender && !d?.cmd && <span>{ev.type}</span>}
                        </div>
                        <span style={{ fontSize: 11, color: '#52525B', flexShrink: 0 }}>{fmtTs(ev.ts)}</span>
                      </motion.div>
                    )
                  })
                }
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── Leaderboards + System health ── */}
        <div className="grid-trio">

          {/* XP Ranking */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.50, duration: 0.4 }}
            style={{ ...card, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 20px', borderBottom: border }}>
              <Award size={16} color="#A1A1AA" />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#F4F4F5' }}>Ranking XP</span>
            </div>
            <div style={{ flex: 1 }}>
              {topUsers.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={16} color="#52525B" /></div>
                  <div className="empty-state-title">Sin datos</div>
                </div>
              ) : topUsers.map((u, i) => (
                <div key={u.jid} className="lb-row">
                  <span className={`lb-pos lb-pos-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#F59E0B', flexShrink: 0 }}>
                    {(u.name || u.jid || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="lb-name">{u.name || u.jid || 'Usuario'}</span>
                  <span className="lb-val">{(u.xp ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CMD Ranking */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            style={{ ...card, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 20px', borderBottom: border }}>
              <Zap size={16} color="#A1A1AA" />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#F4F4F5' }}>Ranking Cmds</span>
            </div>
            <div style={{ flex: 1 }}>
              {topCmds.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Zap size={16} color="#52525B" /></div>
                  <div className="empty-state-title">Sin datos</div>
                </div>
              ) : topCmds.map((u, i) => (
                <div key={u.jid} className="lb-row">
                  <span className={`lb-pos lb-pos-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#A78BFA', flexShrink: 0 }}>
                    {(u.name || u.jid || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="lb-name">{u.name || u.jid || 'Usuario'}</span>
                  <span className="lb-val">{(u.commands ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* System health */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.60, duration: 0.4 }}
            style={{ ...card, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '18px 20px', borderBottom: border }}>
              <Shield size={16} color="#A1A1AA" />
              <span style={{ fontSize: 14, fontWeight: 500, color: '#F4F4F5' }}>Sistema</span>
            </div>
            <div style={{ padding: '20px 20px 16px' }}>
              {stats ? (
                <>
                  <HealthBar label="Usuarios"  val={stats.users   ?? 0} max={Math.max(stats.users   ?? 0, 500)} color="#F59E0B" />
                  <HealthBar label="Grupos"    val={stats.groups  ?? 0} max={Math.max(stats.groups  ?? 0, 100)} color="#8B5CF6" />
                  <HealthBar label="Mensajes"  val={stats.messages ?? 0} max={Math.max(stats.messages ?? 0, 10000)} color="#3B82F6" />
                  <HealthBar label="Cmds hoy"  val={stats.commandsToday ?? 0} max={Math.max(stats.commandsToday ?? 0, 300)} color="#10B981" />
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><Shield size={16} color="#52525B" /></div>
                  <div className="empty-state-title">Sin datos</div>
                </div>
              )}
            </div>
          </motion.div>
        </div>

      </div>
    )
  }
  