import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Users, MessageSquare, Activity, Zap, Shield, Clock, Award, BarChart2, AlertCircle } from 'lucide-react'
import { getStatus, getStats, getUsers, getActivityHistory, isConfigured, type BotStats, type BotStatus, type User, type ActivityEvent } from '../api'

function useCounter(target: number, dur = 1100) {
  const [v, setV] = useState(0)
  const r = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (r.current) clearInterval(r.current)
    if (target === 0) { setV(0); return }
    const t0 = Date.now()
    r.current = setInterval(() => {
      const p = Math.min((Date.now() - t0) / dur, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 4))))
      if (p >= 1) { clearInterval(r.current!); setV(target) }
    }, 16)
    return () => { if (r.current) clearInterval(r.current) }
  }, [target])
  return v
}

const fmtUp = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`; if (h > 0) return `${h}h ${m}m`; return `${m}m`
}

const getRank = (n: number, t: number[]) => {
  const R = ['E', 'D', 'C', 'B', 'A', 'S'] as const; let i = 0
  for (let x = 0; x < t.length; x++) if (n >= t[x]) i = x + 1
  return R[Math.min(i, R.length - 1)]
}

const R_COLORS: Record<string, string> = { S: '#FBBF24', A: '#C084FC', B: '#60A5FA', C: '#34D399', D: '#94A3B8', E: '#475569' }

const METRICS = [
  { icon: Users,         label: 'Hunters',    key: 'users',         color: '#3B82F6', glow: 'rgba(59,130,246,0.16)',   tiers: [10,25,50,100,250]       },
  { icon: MessageSquare, label: 'Guilds',      key: 'groups',        color: '#A855F7', glow: 'rgba(168,85,247,0.14)',   tiers: [5,10,20,50,100]         },
  { icon: Zap,           label: 'Cmds Hoy',   key: 'commandsToday', color: '#F59E0B', glow: 'rgba(245,158,11,0.14)',   tiers: [10,30,60,150,300]       },
  { icon: Activity,      label: 'Mensajes',   key: 'messages',      color: '#06B6D4', glow: 'rgba(6,182,212,0.13)',    tiers: [100,500,1000,5000,10000] },
  { icon: Shield,        label: 'Eventos',    key: '_events',       color: '#10B981', glow: 'rgba(16,185,129,0.12)',   tiers: []                       },
  { icon: Clock,         label: 'Uptime',     key: '_uptime',       color: '#F97316', glow: 'rgba(249,115,22,0.13)',   tiers: []                       },
]

function MetricCard({ icon: Icon, label, value, color, glow, rank, sub, delay = 0 }: {
  icon: React.ElementType; label: string; value: number
  color: string; glow: string; rank?: string; sub?: string; delay?: number
}) {
  const n = useCounter(value)
  const rc = rank ? R_COLORS[rank] : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: delay / 1000, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.22 } }}
      style={{
        position: 'relative', borderRadius: 4, padding: '20px 20px 18px',
        background: `linear-gradient(140deg, ${glow} 0%, rgba(7,7,20,1) 60%)`,
        border: `1px solid ${color}22`,
        borderLeft: `3px solid ${color}`,
        overflow: 'hidden', cursor: 'default',
        boxShadow: `0 4px 24px rgba(0,0,0,0.60), 0 0 0 1px ${color}08`,
      }}
    >
      {/* Top gradient line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, ${color}88, transparent 60%)` }} />
      {/* Corner bracket */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 13, height: 13, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, boxShadow: `-1px -1px 8px ${glow}` }} />
      {/* Ambient orb */}
      <div style={{ position: 'absolute', top: -20, left: -10, width: 120, height: 120, background: `radial-gradient(circle, ${glow}, transparent 68%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
        <div style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, background: `${color}16`, border: `1px solid ${color}42`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${glow}` }}>
          <Icon size={17} color={color} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </div>
        {rank && rc && (
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 8, fontWeight: 900, letterSpacing: '.14em', padding: '2px 8px', borderRadius: 2, border: `1px solid ${rc}50`, background: `${rc}10`, color: rc, animation: rank === 'S' ? 'sRankPulse 2.5s ease-in-out infinite' : 'none' }}>{rank}</div>
        )}
      </div>

      <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 36, fontWeight: 900, lineHeight: 1, color, letterSpacing: '-.02em', textShadow: `0 0 28px ${color}90, 0 0 56px ${color}28` }}>
        {n.toLocaleString()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, fontWeight: 600, letterSpacing: '.18em', color: 'rgba(220,38,38,0.32)', textTransform: 'uppercase' }}>/// {label}</span>
        {sub && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, color: 'rgba(220,38,38,0.20)', marginLeft: 'auto' }}>{sub}</span>}
      </div>
    </motion.div>
  )
}

function MiniBar({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90, padding: '0 2px' }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 100, d.value > 0 ? 8 : 3)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            {d.value > 0 && <span style={{ fontSize: 9, color: d.color, fontFamily: "'Orbitron',monospace", fontWeight: 700, textShadow: `0 0 8px ${d.color}` }}>{d.value}</span>}
            <motion.div
              initial={{ height: '3%' }}
              animate={{ height: h + '%' }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: i * 0.06 }}
              style={{ width: '100%', borderRadius: '2px 2px 0 0', background: d.value > 0 ? `linear-gradient(to top, ${d.color}, ${d.color}70)` : 'rgba(220,38,38,0.04)', boxShadow: d.value > 0 ? `0 0 12px ${d.color}55` : 'none', position: 'relative', overflow: 'hidden' }}
            >
              {d.value > 0 && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)', animation: 'shimmerFill 2.5s ease-in-out infinite' }} />}
            </motion.div>
            <span style={{ fontSize: 8, color: 'rgba(220,38,38,0.32)', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.05em' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function HealthBar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min((val / max) * 100, 100)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.12em', color: 'rgba(220,38,38,0.38)' }}>{label}</span>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 11, fontWeight: 700, color: '#F0EFFF' }}>
          {val.toLocaleString()} <span style={{ color: 'rgba(220,38,38,0.28)', fontSize: 9 }}>/ {max.toLocaleString()}</span>
        </span>
      </div>
      <div style={{ width: '100%', height: 5, background: 'rgba(220,38,38,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: pct + '%' }}
          transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
          style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg,${color},${color}88)`, boxShadow: `0 0 12px ${color}55`, position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.30),transparent)', animation: 'shimmerFill 2.5s ease-in-out infinite' }} />
        </motion.div>
      </div>
    </div>
  )
}

const EV_META: Record<string, { label: string; color: string }> = {
  msg:  { label: 'MSG',  color: '#3B82F6' },
  cmd:  { label: 'CMD',  color: '#A855F7' },
  mod:  { label: 'MOD',  color: '#EF4444' },
  join: { label: 'JOIN', color: '#10B981' },
  lvl:  { label: 'LVL',  color: '#F59E0B' },
  conn: { label: 'SYS',  color: '#06B6D4' },
}
const evMeta = (t: string) => EV_META[t] ?? { label: t.slice(0, 4).toUpperCase(), color: 'rgba(220,38,38,0.45)' }
const fmtTs = (ts: number) => new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const panelStyle = (accent: string) => ({
  background: 'linear-gradient(135deg, rgba(10,10,24,0.97) 0%, rgba(5,5,14,1) 100%)',
  border: `1px solid rgba(220,38,38,0.13)`,
  borderLeft: `3px solid ${accent}`,
  borderRadius: 4,
  position: 'relative' as const,
  overflow: 'hidden' as const,
  display: 'flex' as const,
  flexDirection: 'column' as const,
  boxShadow: `0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px ${accent}06`,
})

const panelHeader = (accent: string) => ({
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '11px 16px',
  borderBottom: '1px solid rgba(220,38,38,0.07)',
  background: `${accent}06`,
  flexShrink: 0,
})

export default function Overview() {
  const [status,  setStatus]  = useState<BotStatus | null>(null)
  const [stats,   setStats]   = useState<BotStats | null>(null)
  const [users,   setUsers]   = useState<User[]>([])
  const [events,  setEvents]  = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [ref,     setRef]     = useState(false)

  const load = async (r = false) => {
    if (!isConfigured()) { setLoading(false); return }
    if (r) setRef(true)
    try {
      const [s, st, u, ev] = await Promise.allSettled([getStatus(), getStats(), getUsers(), getActivityHistory()])
      if (s.status === 'fulfilled')  setStatus(s.value)
      if (st.status === 'fulfilled') setStats(st.value)
      if (u.status === 'fulfilled')  setUsers(u.value)
      if (ev.status === 'fulfilled') setEvents(ev.value)
    } catch {}
    setLoading(false); setRef(false)
  }
  useEffect(() => { load(); const id = setInterval(() => load(), 20000); return () => clearInterval(id) }, [])

  if (!isConfigured()) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 360 }}>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} style={{ maxWidth: 420, width: '100%', background: 'linear-gradient(135deg, rgba(10,10,24,0.97), rgba(5,5,14,1))', border: '1px solid rgba(220,38,38,0.22)', borderLeft: '3px solid #DC2626', borderRadius: 4, overflow: 'hidden', boxShadow: '0 0 50px rgba(220,38,38,0.10), 0 20px 60px rgba(0,0,0,0.7)' }}>
        <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '2px solid #DC2626', borderLeft: '2px solid #DC2626' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px', borderBottom: '1px solid rgba(220,38,38,0.10)', background: 'rgba(220,38,38,0.05)' }}>
          <AlertCircle size={12} color="#DC2626" style={{ filter: 'drop-shadow(0 0 5px #DC2626)' }} />
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: '#DC2626' }}>[ SYSTEM ALERT ]</span>
        </div>
        <div style={{ padding: '24px 20px', fontSize: 12, color: 'rgba(122,122,154,0.80)', lineHeight: 1.9 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'rgba(220,38,38,0.55)' }}>{'>'}</span>{' '}
          Configura <span style={{ color: '#DC2626', fontFamily: "'JetBrains Mono',monospace", background: 'rgba(220,38,38,0.10)', padding: '1px 6px', borderRadius: 2 }}>VITE_API_URL</span> en Vercel → Settings → Environment Variables.
        </div>
      </motion.div>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="skeleton" style={{ height: 96, borderRadius: 4 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 14 }}>
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 138, borderRadius: 4 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>
        <div className="skeleton" style={{ height: 230, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 230, borderRadius: 4 }} />
      </div>
    </div>
  )

  const topUsers  = [...users].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 6)
  const topCmds   = [...users].sort((a, b) => (b.commands || 0) - (a.commands || 0)).slice(0, 6)
  const recentEvs = events.slice(0, 12)
  const connected = status?.connected ?? false
  const uptimeSecs = stats?.uptime ?? 0
  const evCounts: Record<string, number> = {}
  for (const ev of events.slice(0, 100)) evCounts[ev.type] = (evCounts[ev.type] || 0) + 1
  const chartData = [
    { label: 'MSG',  value: evCounts['msg']  || 0, color: '#3B82F6' },
    { label: 'CMD',  value: evCounts['cmd']  || 0, color: '#A855F7' },
    { label: 'MOD',  value: evCounts['mod']  || 0, color: '#EF4444' },
    { label: 'JOIN', value: evCounts['join'] || 0, color: '#10B981' },
    { label: 'LVL',  value: evCounts['lvl']  || 0, color: '#F59E0B' },
    { label: 'SYS',  value: evCounts['conn'] || 0, color: '#06B6D4' },
  ]
  const metricValues: Record<string, number> = {
    users: stats?.users ?? 0, groups: stats?.groups ?? 0,
    commandsToday: stats?.commandsToday ?? 0, messages: stats?.messages ?? 0,
    _events: events.length, _uptime: uptimeSecs,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

      {/* ── Hero banner ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(100deg, rgba(220,38,38,0.12) 0%, rgba(7,7,20,0.97) 60%)',
          border: '1px solid rgba(220,38,38,0.20)', borderLeft: '4px solid #DC2626',
          borderRadius: 4, position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          boxShadow: '0 0 50px rgba(220,38,38,0.08), 0 8px 40px rgba(0,0,0,0.60)',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, #DC2626, #F97316 40%, rgba(220,38,38,0.20) 70%, transparent)' }} />
        <div style={{ position: 'absolute', top: -1, left: -1, width: 16, height: 16, borderTop: '2px solid #DC2626', borderLeft: '2px solid #DC2626', boxShadow: '-2px -2px 12px rgba(220,38,38,0.60)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: 240, height: '100%', background: 'radial-gradient(ellipse at left, rgba(220,38,38,0.10), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.22em', color: 'rgba(220,38,38,0.40)', marginBottom: 9 }}>
            [ SYSTEM ] /// STATUS WINDOW
          </div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 20, fontWeight: 900, letterSpacing: '.10em', color: '#F0EFFF', display: 'flex', alignItems: 'center', gap: 12, textShadow: '0 0 40px rgba(220,38,38,0.25)' }}>
            <span style={{ color: '#DC2626', textShadow: '0 0 20px rgba(220,38,38,0.90)', fontSize: 16 }}>◈</span>
            BOTANIME CORE
            <span style={{ color: '#F97316', textShadow: '0 0 20px rgba(249,115,22,0.80)', fontSize: 16 }}>◈</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '.12em', color: 'rgba(220,38,38,0.30)', marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block', flexShrink: 0, background: connected ? '#10B981' : '#EF4444', boxShadow: connected ? '0 0 8px rgba(16,185,129,0.80)' : 'none' }}
            />
            {'>'} HUNTER: BOTANIME · {connected ? 'ONLINE — AWAKENED' : 'OFFLINE'} · UPTIME {fmtUp(uptimeSecs)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {connected
            ? <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, fontWeight: 900, letterSpacing: '.14em', padding: '6px 14px', borderRadius: 3, border: '1px solid rgba(251,191,36,0.52)', background: 'rgba(251,191,36,0.10)', color: '#FBBF24', animation: 'sRankPulse 2.5s ease-in-out infinite', boxShadow: '0 0 20px rgba(251,191,36,0.12)' }}>◈ S-RANK</div>
            : <div style={{ fontFamily: "'Orbitron',monospace", fontSize: 10, fontWeight: 900, letterSpacing: '.14em', padding: '6px 14px', borderRadius: 3, border: '1px solid rgba(71,85,105,0.30)', background: 'rgba(71,85,105,0.08)', color: '#475569' }}>E-RANK</div>
          }
          <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={ref}>
            <RefreshCw size={12} style={{ animation: ref ? 'spin 1s linear infinite' : 'none', color: 'rgba(220,38,38,0.65)' }} />
          </button>
        </div>
      </motion.div>

      {/* ── Metrics grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 14 }}>
        {METRICS.map((m, i) => (
          <MetricCard
            key={m.key}
            icon={m.icon}
            label={m.label}
            value={metricValues[m.key] ?? 0}
            color={m.color}
            glow={m.glow}
            rank={m.tiers.length > 0 ? getRank(metricValues[m.key] ?? 0, m.tiers) : undefined}
            sub={m.key === '_uptime' ? fmtUp(uptimeSecs) : undefined}
            delay={i * 60}
          />
        ))}
      </div>

      {/* ── Chart + Event Log ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>

        {/* Activity chart */}
        <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.38, duration: 0.35 }} style={panelStyle('#3B82F6')}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '2px solid #3B82F6', borderLeft: '2px solid #3B82F6', boxShadow: '-1px -1px 8px rgba(59,130,246,0.55)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, #3B82F6, transparent 50%)' }} />
          <div style={panelHeader('#3B82F6')}>
            <BarChart2 size={11} color="#3B82F6" style={{ filter: 'drop-shadow(0 0 5px #3B82F6)' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.16em', color: '#3B82F6' }}>[ ACTIVITY SCAN ]</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(59,130,246,0.40)', boxShadow: '0 0 5px rgba(59,130,246,0.6)' }} />)}
            </div>
          </div>
          <div style={{ padding: '16px 18px 14px', flex: 1 }}>
            <MiniBar data={chartData} />
            <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(59,130,246,0.20),transparent)', margin: '14px 0 12px' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {chartData.map(d => (
                <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: 'rgba(122,122,154,0.50)', letterSpacing: '.05em' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: d.color, boxShadow: `0 0 6px ${d.color}`, flexShrink: 0 }} />
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Event log */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.42, duration: 0.35 }} style={panelStyle('#A855F7')}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '2px solid #A855F7', borderLeft: '2px solid #A855F7', boxShadow: '-1px -1px 8px rgba(168,85,247,0.55)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, #A855F7, transparent 50%)' }} />
          <div style={panelHeader('#A855F7')}>
            <Activity size={11} color="#A855F7" style={{ filter: 'drop-shadow(0 0 5px #A855F7)' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.16em', color: '#A855F7' }}>[ EVENT LOG ]</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <motion.div key={i} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, delay: i * 0.3, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: '50%', background: '#A855F7', boxShadow: '0 0 5px rgba(168,85,247,0.7)' }} />)}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 260 }}>
            <AnimatePresence initial={false}>
              {recentEvs.length === 0
                ? <div className="empty-state">
                    <div className="empty-state-icon"><Activity size={16} color="rgba(168,85,247,0.35)" /></div>
                    <div className="empty-state-title">Sin eventos</div>
                    <div className="empty-state-sub">// el log aparecerá aquí</div>
                  </div>
                : recentEvs.map((ev, i) => {
                    const m = evMeta(ev.type); const d = ev.data as Record<string, string> | null
                    return (
                      <motion.div key={ev.id ?? i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.025 }}
                        className="event-entry"
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: m.color, boxShadow: `0 0 7px ${m.color}`, flexShrink: 0, marginTop: 4 }} />
                        <div style={{ flex: 1, fontSize: 12, color: 'rgba(122,122,154,0.72)', lineHeight: 1.5 }}>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 7, fontWeight: 700, letterSpacing: '.12em', color: m.color, background: `${m.color}12`, border: `1px solid ${m.color}28`, padding: '1px 5px', borderRadius: 2, marginRight: 7 }}>{m.label}</span>
                          {d?.sender && <span style={{ color: '#F0EFFF', fontWeight: 600 }}>{d.sender}</span>}
                          {d?.cmd && <span style={{ color: 'rgba(220,38,38,0.48)' }}> › {d.cmd}</span>}
                          {d?.group && <span style={{ color: 'rgba(220,38,38,0.28)', fontSize: 10 }}> [{d.group}]</span>}
                          {!d?.sender && !d?.cmd && <span style={{ color: 'rgba(220,38,38,0.35)' }}>{ev.type}</span>}
                        </div>
                        <span className="event-time">{fmtTs(ev.ts)}</span>
                      </motion.div>
                    )
                  })
              }
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* ── Leaderboards + System Health ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

        {[
          { title: '[ XP RANKING ]',  icon: Award, color: '#F59E0B', data: topUsers, valFn: (u: User) => u.xp ?? 0 },
          { title: '[ CMD RANKING ]', icon: Zap,   color: '#A855F7', data: topCmds,  valFn: (u: User) => u.commands ?? 0 },
        ].map(({ title, icon: Ico, color, data, valFn }, pi) => (
          <motion.div key={title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.50 + pi * 0.06, duration: 0.35 }} style={panelStyle(color)}>
            <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, boxShadow: `-1px -1px 8px ${color}55` }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,${color},transparent 50%)` }} />
            <div style={panelHeader(color)}>
              <Ico size={11} color={color} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color }}>{title}</span>
            </div>
            <div style={{ flex: 1, padding: '6px 0' }}>
              {data.length === 0
                ? <div className="empty-state"><div className="empty-state-title">Sin datos</div></div>
                : data.map((u, pos) => {
                    const posClass = pos === 0 ? 'lb-pos-1' : pos === 1 ? 'lb-pos-2' : pos === 2 ? 'lb-pos-3' : 'lb-pos-n'
                    const name = u.name || u.jid.split('@')[0]
                    return (
                      <div key={u.jid} className="lb-row">
                        <span className={`lb-pos ${posClass}`}>#{pos + 1}</span>
                        <div style={{ width: 26, height: 26, borderRadius: 4, background: `${color}12`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, fontWeight: 800, color, fontFamily: "'Orbitron',monospace" }}>
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="lb-name">{name}</span>
                        <span className="lb-val" style={{ color }}>{valFn(u).toLocaleString()}</span>
                      </div>
                    )
                  })
              }
            </div>
          </motion.div>
        ))}

        {/* System health */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62, duration: 0.35 }} style={panelStyle('#10B981')}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '2px solid #10B981', borderLeft: '2px solid #10B981', boxShadow: '-1px -1px 8px rgba(16,185,129,0.55)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,#10B981,transparent 50%)' }} />
          <div style={panelHeader('#10B981')}>
            <Activity size={11} color="#10B981" style={{ filter: 'drop-shadow(0 0 5px #10B981)' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color: '#10B981' }}>[ SYSTEM HEALTH ]</span>
          </div>
          <div style={{ padding: '16px 18px', flex: 1 }}>
            <HealthBar label="USUARIOS"  val={stats?.users ?? 0}         max={500}   color="#3B82F6" />
            <HealthBar label="GUILDS"    val={stats?.groups ?? 0}        max={100}   color="#A855F7" />
            <HealthBar label="COMANDOS"  val={stats?.commandsToday ?? 0} max={300}   color="#F59E0B" />
            <HealthBar label="MENSAJES"  val={stats?.messages ?? 0}      max={10000} color="#10B981" />
            <div style={{ height: 1, background: 'linear-gradient(90deg,transparent,rgba(16,185,129,0.18),transparent)', margin: '14px 0 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 8, letterSpacing: '.14em', color: 'rgba(220,38,38,0.32)' }}>/// NET STATUS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.6, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', boxShadow: connected ? '0 0 10px rgba(16,185,129,0.80)' : 'none' }} />
                <span style={{ fontFamily: "'Orbitron',monospace", fontSize: 9, fontWeight: 700, color: connected ? '#10B981' : '#EF4444', letterSpacing: '.10em' }}>{connected ? 'ONLINE' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
