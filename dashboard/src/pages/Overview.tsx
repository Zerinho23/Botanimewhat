import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Users, MessageSquare, Activity, Zap,
  Shield, Clock, Award, BarChart2, AlertCircle, ArrowUpRight,
} from 'lucide-react'
import {
  getStatus, getStats, getUsers, getActivityHistory, isConfigured,
  type BotStats, type BotStatus, type User, type ActivityEvent,
} from '../api'

function useCounter(target: number, dur = 900) {
  const [v, setV] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (ref.current) clearInterval(ref.current)
    if (target === 0) { setV(0); return }
    const t0 = Date.now()
    ref.current = setInterval(() => {
      const p = Math.min((Date.now() - t0) / dur, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) { clearInterval(ref.current!); setV(target) }
    }, 16)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [target])
  return v
}

const fmtUp = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`; if (h > 0) return `${h}h ${m}m`; return `${m}m`
}
const fmtNum = (n: number) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : n.toString()
const fmtTs  = (ts: number) => new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const METRICS = [
  { icon: Users,         label: 'Usuarios',  key: 'users',         color: '#F59E0B', bg: 'rgba(245,158,11,.10)' },
  { icon: MessageSquare, label: 'Grupos',    key: 'groups',        color: '#EC4899', bg: 'rgba(236,72,153,.10)' },
  { icon: Zap,           label: 'Cmds hoy', key: 'commandsToday', color: '#8B5CF6', bg: 'rgba(139,92,246,.10)' },
  { icon: Activity,      label: 'Mensajes',  key: 'messages',      color: '#06B6D4', bg: 'rgba(6,182,212,.10)'  },
  { icon: Shield,        label: 'Eventos',   key: '_events',       color: '#10B981', bg: 'rgba(16,185,129,.10)' },
  { icon: Clock,         label: 'Uptime',    key: '_uptime',       color: '#F97316', bg: 'rgba(249,115,22,.10)' },
]

const EV_META: Record<string, { label: string; color: string }> = {
  msg:     { label: 'MSG',  color: '#3B82F6' },
  message: { label: 'MSG',  color: '#3B82F6' },
  cmd:     { label: 'CMD',  color: '#8B5CF6' },
  command: { label: 'CMD',  color: '#8B5CF6' },
  mod:     { label: 'MOD',  color: '#F59E0B' },
  join:    { label: 'JOIN', color: '#10B981' },
  lvl:     { label: 'LVL',  color: '#F97316' },
  conn:    { label: 'SYS',  color: '#06B6D4' },
  ban:     { label: 'BAN',  color: '#EF4444' },
  kick:    { label: 'KICK', color: '#F87171' },
  error:   { label: 'ERR',  color: '#EF4444' },
}
const evMeta = (t: string) => EV_META[t] ?? { label: t.slice(0, 4).toUpperCase(), color: '#71717A' }

const card = { background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, overflow: 'hidden' as const }

/* ── Anime silhouette for empty states ── */
function AnimeSilhouette({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.26)} viewBox="0 0 52 66"
      fill="currentColor" style={{ color: 'rgba(245,158,11,.13)', display: 'block', margin: '0 auto 6px' }}>
      <ellipse cx="26" cy="13" rx="10" ry="11" />
      <path d="M16 9 L9 1 L18 7Z" />
      <path d="M36 9 L43 1 L34 7Z" />
      <path d="M22 4 L20 0 L25 4Z" />
      <path d="M30 4 L32 0 L27 4Z" />
      <path d="M12 32 Q12 25 26 23 Q40 25 40 32 L42 58 L10 58Z" />
      <path d="M12 32 L4 47 L9 49 L15 36Z" />
      <path d="M40 32 L48 47 L43 49 L37 36Z" />
      <path d="M16 56 L14 66 L20 66 L22 56Z" />
      <path d="M36 56 L38 66 L32 66 L30 56Z" />
    </svg>
  )
}

/* ── Metric card ── */
function MetricCard({ icon: Icon, label, value, sub, delay = 0, color, bg }: {
  icon: React.ElementType; label: string; value: number; sub?: string; delay?: number; color: string; bg: string
}) {
  const n = useCounter(value)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="metric-card"
      style={{
        borderTop: `2px solid ${color}`,
        boxShadow: `0 0 0 0px transparent, 0 4px 20px ${color}0a`,
      }}
      whileHover={{ boxShadow: `0 0 18px ${color}22, 0 4px 24px ${color}0f` } as never}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: bg,
          border: `1px solid ${color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: `0 0 10px ${color}18`,
        }}>
          <Icon size={13} color={color} strokeWidth={2} />
        </div>
      </div>
      <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, color: '#F4F4F5' }}>
        {sub ?? fmtNum(n)}
      </span>
    </motion.div>
  )
}

/* ── Bar chart ── */
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 110 }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 100, d.value > 0 ? 8 : 4)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 6, cursor: 'pointer' }}
            title={`${d.label}: ${d.value}`}
            onMouseEnter={e => { const b = e.currentTarget.querySelector('.bar') as HTMLDivElement; if (b) { b.style.background = 'rgba(236,72,153,.70)'; b.style.boxShadow = '0 0 12px rgba(236,72,153,.30)' } }}
            onMouseLeave={e => { const b = e.currentTarget.querySelector('.bar') as HTMLDivElement; if (b) { b.style.background = 'rgba(255,255,255,.08)'; b.style.boxShadow = 'none' } }}
          >
            <motion.div className="bar" initial={{ height: '2%' }} animate={{ height: h + '%' }}
              transition={{ duration: 0.65, ease: [0.4, 0, 0.2, 1], delay: i * 0.06 }}
              style={{ width: '100%', maxWidth: 28, borderRadius: '4px 4px 0 0', background: 'rgba(255,255,255,.08)', transition: 'background .2s,box-shadow .2s' }}
            />
          </div>
        )
      })}
    </div>
  )
}

/* ── Activity heatmap (12 weeks × 7 days) ── */
function ActivityHeatmap({ events }: { events: ActivityEvent[] }) {
  const dateMap: Record<string, number> = {}
  for (const ev of events) {
    const d = new Date(ev.ts).toISOString().split('T')[0]
    dateMap[d] = (dateMap[d] || 0) + 1
  }
  const cells: { date: string; count: number }[] = []
  const today = new Date()
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: dateMap[key] || 0 })
  }
  const maxCount = Math.max(...cells.map(c => c.count), 1)
  const totalEvents = cells.reduce((s, c) => s + c.count, 0)
  const activeDays  = cells.filter(c => c.count > 0).length

  const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart2 size={14} color="#71717A" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Mapa de actividad</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Últimas 12 semanas</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B', letterSpacing: '-0.02em' }}>{totalEvents}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>eventos</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#EC4899', letterSpacing: '-0.02em' }}>{activeDays}</div>
            <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>días activos</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 0, flexShrink: 0 }}>
          {DAYS.map(d => <div key={d} style={{ height: 12, lineHeight: '12px', fontSize: 9, color: 'var(--text3)', fontWeight: 600, width: 12, textAlign: 'center' }}>{d}</div>)}
        </div>
        <div className="heatmap-grid" style={{ flexShrink: 0 }}>
          {cells.map((c, i) => {
            const intensity = c.count === 0 ? 0 : Math.max(0.18, c.count / maxCount)
            const bg = c.count === 0
              ? 'rgba(255,255,255,0.04)'
              : i % 3 === 0
                ? `rgba(236,72,153,${intensity})`
                : `rgba(245,158,11,${intensity})`
            const borderColor = c.count === 0
              ? 'rgba(255,255,255,0.05)'
              : i % 3 === 0
                ? `rgba(236,72,153,${Math.min(intensity * 0.7, 0.6)})`
                : `rgba(245,158,11,${Math.min(intensity * 0.7, 0.6)})`
            return (
              <div key={i} className="heatmap-cell" title={`${c.date}: ${c.count} evento${c.count !== 1 ? 's' : ''}`}
                style={{ background: bg, border: `1px solid ${borderColor}` }}
              />
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 9, color: 'var(--text3)', marginRight: 4 }}>Menos</span>
        {[0, 0.18, 0.4, 0.65, 1].map((op, i) => (
          <div key={i} style={{
            width: 10, height: 10, borderRadius: 2,
            background: op === 0 ? 'rgba(255,255,255,0.04)' : i % 2 === 0 ? `rgba(245,158,11,${op})` : `rgba(236,72,153,${op})`,
            border: `1px solid ${op === 0 ? 'rgba(255,255,255,.05)' : `rgba(245,158,11,${op * 0.6})`}`,
          }} />
        ))}
        <span style={{ fontSize: 9, color: 'var(--text3)', marginLeft: 4 }}>Más</span>
      </div>
    </div>
  )
}

/* ── Health bar ── */
function HealthBar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min((val / max) * 100, 100)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: '#A1A1AA' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#F4F4F5' }}>
          {val.toLocaleString()} <span style={{ color: '#52525B', fontSize: 11 }}>/ {max.toLocaleString()}</span>
        </span>
      </div>
      <div className="stat-bar">
        <motion.div initial={{ width: 0 }} animate={{ width: pct + '%' }}
          transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
          className="stat-fill" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MAIN
   ══════════════════════════════════════════════════════ */
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
      const [s, st, u, ev] = await Promise.allSettled([getStatus(), getStats(), getUsers(), getActivityHistory()])
      if (s.status  === 'fulfilled') setStatus(s.value)
      if (st.status === 'fulfilled') setStats(st.value)
      if (u.status  === 'fulfilled') setUsers(u.value)
      if (ev.status === 'fulfilled') setEvents(ev.value)
    } catch {}
    setLoading(false); setRef(false)
  }

  useEffect(() => { load(); const id = setInterval(load, 20000); return () => clearInterval(id) }, [])

  if (!isConfigured()) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        style={{ maxWidth: 400, width: '100%', ...card, padding: 32, textAlign: 'center' }}>
        <AnimeSilhouette size={60} />
        <AlertCircle size={24} color="#EC4899" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: "'Noto Serif JP', serif" }}>Sin configurar</p>
        <p style={{ fontSize: 13, color: '#A1A1AA', lineHeight: 1.6 }}>
          Agrega <code style={{ background: 'rgba(236,72,153,.12)', border: '1px solid rgba(236,72,153,.25)', borderRadius: 4, padding: '1px 6px', color: '#F9A8D4', fontSize: 12 }}>VITE_API_URL</code> en Vercel → Settings → Environment Variables.
        </p>
      </motion.div>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ height: 64, borderRadius: 12 }} className="skeleton" />
      <div className="grid-metrics">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}</div>
      <div className="skeleton" style={{ height: 140 }} />
      <div className="grid-duo"><div className="skeleton" style={{ height: 220 }} /><div className="skeleton" style={{ height: 220 }} /></div>
    </div>
  )

  const connected   = status?.connected ?? false
  const uptimeSecs  = stats?.uptime ?? 0
  const topUsers    = [...users].sort((a, b) => (b.xp       || 0) - (a.xp       || 0)).slice(0, 5)
  const topCmds     = [...users].sort((a, b) => (b.commands || 0) - (a.commands || 0)).slice(0, 5)
  const recentEvs   = events.slice(0, 12)

  const evCounts: Record<string, number> = {}
  for (const ev of events.slice(0, 100)) evCounts[ev.type] = (evCounts[ev.type] || 0) + 1

  const chartData = ['msg','cmd','mod','join','lvl','conn','ban'].map((k, i) => ({
    label: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][i],
    value: evCounts[k] || 0,
  }))

  const metricValues: Record<string, number> = {
    users: stats?.users ?? 0, groups: stats?.groups ?? 0,
    commandsToday: stats?.commandsToday ?? 0, messages: stats?.messages ?? 0,
    _events: events.length, _uptime: uptimeSecs,
  }

  const bdr = '1px solid rgba(255,255,255,.07)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Status banner */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ ...card, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderLeft: `3px solid ${connected ? '#10B981' : '#EC4899'}`, background: connected ? 'rgba(16,185,129,.04)' : 'rgba(236,72,153,.04)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#10B981' : '#EC4899', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: connected ? '#10B981' : '#F9A8D4', fontFamily: "'Noto Serif JP', serif" }}>
              {connected ? '🌸 Bot en línea — Activo y procesando mensajes' : '❌ Bot desconectado'}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#71717A', paddingLeft: 15 }}>Uptime: {fmtUp(uptimeSecs)} · BotAnime Core</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={ref}>
          <RefreshCw size={12} style={{ animation: ref ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </motion.div>

      {/* Metric cards — with aurora glow behind */}
      <div className="aurora-wrap" style={{ position: 'relative' }}>
        <div className="grid-metrics" style={{ position: 'relative', zIndex: 1 }}>
          {METRICS.map((m, i) => (
            <MetricCard key={m.key} icon={m.icon} label={m.label}
              value={metricValues[m.key] ?? 0}
              sub={m.key === '_uptime' ? fmtUp(uptimeSecs) : undefined}
              delay={i * 55} color={m.color} bg={m.bg}
            />
          ))}
        </div>
      </div>

      {/* Activity heatmap */}
      <ActivityHeatmap events={events} />

      {/* Chart + Event log */}
      <div className="grid-duo">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.38 }}
          style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: bdr }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart2 size={14} color="#71717A" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Actividad semanal</span>
            </div>
            <span style={{ fontSize: 11, color: '#52525B', display: 'flex', alignItems: 'center', gap: 4 }}>
              Por tipo <ArrowUpRight size={11} />
            </span>
          </div>
          <div style={{ padding: '16px 18px 10px' }}>
            <BarChart data={chartData} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '0 2px' }}>
              {chartData.map(d => <span key={d.label} style={{ fontSize: 10, color: '#52525B', flex: 1, textAlign: 'center' }}>{d.label}</span>)}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.38 }}
          style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: bdr }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color="#71717A" />
              <span style={{ fontSize: 13, fontWeight: 600 }}>Log en vivo</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'livePulse 1.8s ease-in-out infinite' }} />
              <span style={{ fontSize: 10, color: '#52525B' }}>LIVE</span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200 }}>
            <AnimatePresence initial={false}>
              {recentEvs.length === 0
                ? (
                  <div className="empty-state">
                    <AnimeSilhouette size={44} />
                    <div className="empty-state-title">Sin eventos aún</div>
                    <div className="empty-state-sub">Los eventos aparecerán aquí en tiempo real 🌸</div>
                  </div>
                )
                : recentEvs.map((ev, i) => {
                  const m = evMeta(ev.type)
                  const d = ev.data as Record<string, string> | null
                  return (
                    <motion.div key={ev.id ?? i} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="event-entry">
                      <div style={{ width: 5, height: 5, borderRadius: 1, background: m.color, flexShrink: 0, marginTop: 6 }} />
                      <div style={{ flex: 1, fontSize: 12, color: '#A1A1AA', lineHeight: 1.5, minWidth: 0 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${m.color}15`, color: m.color, marginRight: 6 }}>{m.label}</span>
                        {d?.sender && <span style={{ color: '#F4F4F5', fontWeight: 500 }}>{d.sender}</span>}
                        {d?.cmd    && <span style={{ color: '#71717A' }}> › {d.cmd}</span>}
                        {!d?.sender && !d?.cmd && <span>{ev.type}</span>}
                      </div>
                      <span style={{ fontSize: 10, color: '#52525B', flexShrink: 0 }}>{fmtTs(ev.ts)}</span>
                    </motion.div>
                  )
                })
              }
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Leaderboards + System */}
      <div className="grid-trio">
        {/* XP ranking */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46, duration: 0.38 }}
          style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: bdr }}>
            <Award size={14} color="#F59E0B" /><span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Noto Serif JP', serif" }}>Ranking XP</span>
          </div>
          <div style={{ flex: 1 }}>
            {topUsers.length === 0
              ? (
                <div className="empty-state">
                  <AnimeSilhouette size={40} />
                  <div className="empty-state-title">Sin hunters aún</div>
                </div>
              )
              : topUsers.map((u, i) => (
                <div key={u.jid} className="lb-row">
                  <span className={`lb-pos lb-pos-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(245,158,11,.10)', border: '1px solid rgba(245,158,11,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F59E0B', flexShrink: 0 }}>
                    {(u.name || u.jid || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="lb-name">{u.name || u.jid || 'Usuario'}</span>
                  <span className="lb-val">{(u.xp ?? 0).toLocaleString()}</span>
                </div>
              ))}
          </div>
        </motion.div>

        {/* Cmds ranking */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.51, duration: 0.38 }}
          style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: bdr }}>
            <Zap size={14} color="#EC4899" /><span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Noto Serif JP', serif" }}>Ranking Cmds</span>
          </div>
          <div style={{ flex: 1 }}>
            {topCmds.length === 0
              ? (
                <div className="empty-state">
                  <AnimeSilhouette size={40} />
                  <div className="empty-state-title">Sin datos aún</div>
                </div>
              )
              : topCmds.map((u, i) => (
                <div key={u.jid} className="lb-row">
                  <span className={`lb-pos lb-pos-${i < 3 ? i + 1 : 'n'}`}>{i + 1}</span>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(236,72,153,.10)', border: '1px solid rgba(236,72,153,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#F9A8D4', flexShrink: 0 }}>
                    {(u.name || u.jid || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="lb-name">{u.name || u.jid || 'Usuario'}</span>
                  <span className="lb-val" style={{ color: '#EC4899' }}>{(u.commands ?? 0).toLocaleString()}</span>
                </div>
              ))}
          </div>
        </motion.div>

        {/* System health */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.56, duration: 0.38 }}
          style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: bdr }}>
            <Shield size={14} color="#8B5CF6" /><span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Noto Serif JP', serif" }}>Sistema</span>
          </div>
          <div style={{ padding: '16px 18px 12px' }}>
            {stats ? (
              <>
                <HealthBar label="Usuarios"  val={stats.users ?? 0}        max={Math.max(stats.users ?? 0, 500)}      color="#F59E0B" />
                <HealthBar label="Grupos"    val={stats.groups ?? 0}       max={Math.max(stats.groups ?? 0, 100)}     color="#EC4899" />
                <HealthBar label="Mensajes"  val={stats.messages ?? 0}     max={Math.max(stats.messages ?? 0, 10000)} color="#3B82F6" />
                <HealthBar label="Cmds hoy"  val={stats.commandsToday ?? 0} max={Math.max(stats.commandsToday ?? 0, 300)} color="#8B5CF6" />
              </>
            ) : (
              <div className="empty-state">
                <AnimeSilhouette size={40} />
                <div className="empty-state-title">Sin datos</div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div style={{ height: 8 }} />
    </div>
  )
}
