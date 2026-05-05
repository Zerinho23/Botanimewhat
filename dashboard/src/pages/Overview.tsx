import { useEffect, useState, useRef } from 'react'
import {
  RefreshCw, Users, MessageSquare, Activity, Zap,
  Shield, Clock, Award, BarChart2, AlertCircle
} from 'lucide-react'
import {
  getStatus, getStats, getUsers, getActivityHistory, isConfigured,
  type BotStats, type BotStatus, type User, type ActivityEvent
} from '../api'

function useCounter(target: number, dur = 900) {
  const [v, setV] = useState(0)
  const r = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (r.current) clearInterval(r.current)
    if (target === 0) { setV(0); return }
    const t0 = Date.now()
    r.current = setInterval(() => {
      const p = Math.min((Date.now() - t0) / dur, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p >= 1) { clearInterval(r.current!); setV(target) }
    }, 16)
    return () => { if (r.current) clearInterval(r.current) }
  }, [target])
  return v
}

const fmtUp = (s: number) => {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d > 0) return d + 'd ' + h + 'h'; if (h > 0) return h + 'h ' + m + 'm'; return m + 'm'
}

const getRank = (n: number, t: number[]) => {
  const R = ['E', 'D', 'C', 'B', 'A', 'S'] as const; let i = 0
  for (let x = 0; x < t.length; x++) if (n >= t[x]) i = x + 1
  return R[Math.min(i, R.length - 1)]
}

const METRICS = [
  { icon: Users,         label: 'Hunters',    key: 'users',         color: '#3B82F6', glow: 'rgba(59,130,246,0.14)',   tiers: [10,25,50,100,250]  },
  { icon: MessageSquare, label: 'Guilds',      key: 'groups',        color: '#A855F7', glow: 'rgba(168,85,247,0.13)',   tiers: [5,10,20,50,100]    },
  { icon: Zap,           label: 'Cmds Hoy',   key: 'commandsToday', color: '#F59E0B', glow: 'rgba(245,158,11,0.12)',   tiers: [10,30,60,150,300]  },
  { icon: Activity,      label: 'Mensajes',   key: 'messages',      color: '#06B6D4', glow: 'rgba(6,182,212,0.12)',    tiers: [100,500,1000,5000,10000] },
  { icon: Shield,        label: 'Eventos',    key: '_events',       color: '#10B981', glow: 'rgba(16,185,129,0.10)',   tiers: []                  },
  { icon: Clock,         label: 'Uptime',     key: '_uptime',       color: '#F97316', glow: 'rgba(249,115,22,0.12)',   tiers: []                  },
]

const R_COLORS: Record<string, string> = { S: '#FBBF24', A: '#C084FC', B: '#60A5FA', C: '#34D399', D: '#94A3B8', E: '#475569' }

function MetricCard({ icon: Icon, label, value, color, glow, rank, sub, delay = 0 }: {
  icon: React.ElementType; label: string; value: number
  color: string; glow: string; rank?: string; sub?: string; delay?: number
}) {
  const n = useCounter(value)
  const [hov, setHov] = useState(false)
  const rc = rank ? R_COLORS[rank] : null

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', borderRadius: 4, padding: '18px 18px 16px',
        background: `linear-gradient(140deg, ${glow} 0%, rgba(7,7,16,0.99) 60%)`,
        border: `1px solid ${hov ? color + '40' : color + '18'}`,
        borderLeft: `3px solid ${color}`,
        boxShadow: hov
          ? `0 10px 42px rgba(0,0,0,0.65), 0 0 28px ${glow}, 0 0 0 1px ${color}18`
          : '0 4px 20px rgba(0,0,0,0.45)',
        transform: hov ? 'translateY(-5px)' : 'none',
        transition: 'all .22s cubic-bezier(.4,0,.2,1)',
        animation: `cardReveal .42s ease ${delay}ms both`,
        overflow: 'hidden',
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}
    >
      {/* corner bracket top-left */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, boxShadow: `-1px -1px 7px ${glow}` }} />
      {/* ambient glow */}
      <div style={{ position: 'absolute', top: -20, left: -10, width: 100, height: 100, background: `radial-gradient(circle, ${glow}, transparent 68%)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 4, flexShrink: 0,
          background: `${color}15`, border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 16px ${glow}`,
        }}>
          <Icon size={16} color={color} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
        </div>
        {rank && rc && (
          <div style={{
            fontFamily: "'Orbitron', monospace", fontSize: 8, fontWeight: 900,
            letterSpacing: '.14em', padding: '2px 8px', borderRadius: 2,
            border: `1px solid ${rc}50`, background: `${rc}10`, color: rc,
            animation: rank === 'S' ? 'sRankPulse 2.5s ease-in-out infinite' : 'none',
          }}>{rank}</div>
        )}
      </div>

      <div style={{
        fontFamily: "'Orbitron', monospace", fontSize: 34, fontWeight: 900, lineHeight: 1,
        color, letterSpacing: '-.02em',
        textShadow: `0 0 22px ${color}80, 0 0 44px ${color}22`,
      }}>
        {n.toLocaleString()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600,
          letterSpacing: '.16em', color: 'rgba(220,38,38,0.35)', textTransform: 'uppercase',
        }}>/// {label}</span>
        {sub && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: 'rgba(220,38,38,0.22)', marginLeft: 'auto' }}>{sub}</span>}
      </div>
    </div>
  )
}

function MiniBar({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 80, padding: '0 2px' }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 100, d.value > 0 ? 7 : 3)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            {d.value > 0 && <span style={{ fontSize: 9, color: d.color, fontFamily: "'Orbitron', monospace", fontWeight: 700, textShadow: `0 0 8px ${d.color}` }}>{d.value}</span>}
            <div style={{
              width: '100%', borderRadius: '2px 2px 0 0', height: h + '%',
              background: d.value > 0 ? `linear-gradient(to top, ${d.color}, ${d.color}70)` : 'rgba(220,38,38,0.04)',
              boxShadow: d.value > 0 ? `0 0 10px ${d.color}55` : 'none',
              transition: 'height .75s cubic-bezier(.4,0,.2,1)', position: 'relative', overflow: 'hidden',
            }}>
              {d.value > 0 && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.20),transparent)', animation: 'shimmerFill 2.5s ease-in-out infinite' }} />}
            </div>
            <span style={{ fontSize: 8, color: 'rgba(220,38,38,0.35)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.05em' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function HealthBar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.min((val / max) * 100, 100)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.12em', color: 'rgba(220,38,38,0.40)' }}>{label}</span>
        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700, color: '#F1F0FF' }}>
          {val.toLocaleString()} <span style={{ color: 'rgba(220,38,38,0.30)', fontSize: 9 }}>/ {max.toLocaleString()}</span>
        </span>
      </div>
      <div style={{ width: '100%', height: 4, background: 'rgba(220,38,38,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${color},${color}90)`, boxShadow: `0 0 10px ${color}55`, transition: 'width .9s cubic-bezier(.4,0,.2,1)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)', animation: 'shimmerFill 2.5s ease-in-out infinite' }} />
        </div>
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

/* shared panel style */
const panel = (accentColor: string) => ({
  background: 'rgba(7,7,16,0.97)',
  border: `1px solid rgba(220,38,38,0.14)`,
  borderLeft: `3px solid ${accentColor}`,
  borderRadius: 4,
  position: 'relative' as const,
  overflow: 'hidden' as const,
  display: 'flex' as const,
  flexDirection: 'column' as const,
  clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
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

  /* ── Not configured ── */
  if (!isConfigured()) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <div style={{
        maxWidth: 400, width: '100%',
        background: 'rgba(7,7,16,0.98)', border: '1px solid rgba(220,38,38,0.20)',
        borderLeft: '3px solid #DC2626', borderRadius: 4,
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid #DC2626', borderLeft: '2px solid #DC2626' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(220,38,38,0.10)', background: 'rgba(220,38,38,0.05)' }}>
          <AlertCircle size={12} color="#DC2626" style={{ filter: 'drop-shadow(0 0 4px #DC2626)' }} />
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 700, letterSpacing: '.18em', color: '#DC2626' }}>[ SYSTEM ALERT ]</span>
        </div>
        <div style={{ padding: '22px 18px', fontSize: 12, color: 'rgba(139,139,170,0.80)', lineHeight: 1.8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'rgba(220,38,38,0.55)' }}>{'>'}</span>{' '}
          Configura{' '}
          <span style={{ color: '#DC2626', fontFamily: "'JetBrains Mono', monospace", background: 'rgba(220,38,38,0.10)', padding: '1px 5px', borderRadius: 2 }}>
            VITE_API_URL
          </span>{' '}
          en Vercel → Settings → Environment Variables.
        </div>
      </div>
    </div>
  )

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 88, borderRadius: 4 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 14 }}>
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 4 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>
        <div className="skeleton" style={{ height: 220, borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 220, borderRadius: 4 }} />
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
    users:         stats?.users ?? 0,
    groups:        stats?.groups ?? 0,
    commandsToday: stats?.commandsToday ?? 0,
    messages:      stats?.messages ?? 0,
    _events:       events.length,
    _uptime:       uptimeSecs,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-up">

      {/* ── Header banner ── */}
      <div style={{
        padding: '18px 22px',
        background: 'linear-gradient(100deg, rgba(220,38,38,0.10), rgba(7,7,16,0.97))',
        border: '1px solid rgba(220,38,38,0.18)', borderLeft: '3px solid #DC2626',
        borderRadius: 4, position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
        clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
      }}>
        {/* top gradient line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, #DC2626, #F97316 40%, transparent 70%)' }} />
        {/* corner */}
        <div style={{ position: 'absolute', top: -1, left: -1, width: 14, height: 14, borderTop: '2px solid #DC2626', borderLeft: '2px solid #DC2626', boxShadow: '-1px -1px 10px rgba(220,38,38,0.55)' }} />
        {/* ambient */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 200, height: '100%', background: 'radial-gradient(ellipse at left, rgba(220,38,38,0.08), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.20em', color: 'rgba(220,38,38,0.42)', marginBottom: 8 }}>
            [ SYSTEM ] /// STATUS WINDOW
          </div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, letterSpacing: '.10em', color: '#F1F0FF', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: '#DC2626', textShadow: '0 0 16px rgba(220,38,38,0.80)', fontSize: 14 }}>◈</span>
            BOTANIME CORE
            <span style={{ color: '#F97316', textShadow: '0 0 16px rgba(249,115,22,0.70)', fontSize: 14 }}>◈</span>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '.12em', color: 'rgba(220,38,38,0.32)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
              background: connected ? '#10B981' : '#EF4444',
              boxShadow: connected ? '0 0 6px rgba(16,185,129,0.7)' : 'none',
            }} />
            {'>'} HUNTER: BOTANIME · {connected ? 'ONLINE — AWAKENED' : 'OFFLINE'} · UPTIME {fmtUp(uptimeSecs)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {connected
            ? <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 900, letterSpacing: '.14em', padding: '5px 12px', borderRadius: 3, border: '1px solid rgba(251,191,36,0.50)', background: 'rgba(251,191,36,0.10)', color: '#FBBF24', animation: 'sRankPulse 2.5s ease-in-out infinite' }}>◈ S-RANK</div>
            : <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 10, fontWeight: 900, letterSpacing: '.14em', padding: '5px 12px', borderRadius: 3, border: '1px solid rgba(71,85,105,0.30)', background: 'rgba(71,85,105,0.08)', color: '#475569' }}>E-RANK</div>
          }
          <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={ref} title="Actualizar">
            <RefreshCw size={12} style={{ animation: ref ? 'spin 1s linear infinite' : 'none', color: 'rgba(220,38,38,0.65)' }} />
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
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
            delay={i * 55}
          />
        ))}
      </div>

      {/* ── Activity chart + Event Log ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 14 }}>

        {/* Activity chart */}
        <div style={panel('#3B82F6')}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid #3B82F6', borderLeft: '2px solid #3B82F6', boxShadow: '-1px -1px 6px rgba(59,130,246,0.5)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(220,38,38,0.07)', background: 'rgba(59,130,246,0.05)', flexShrink: 0 }}>
            <BarChart2 size={11} color="#3B82F6" style={{ filter: 'drop-shadow(0 0 4px #3B82F6)' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.16em', color: '#3B82F6' }}>[ ACTIVITY ]</span>
            <div className="sys-dots" style={{ gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(59,130,246,0.40)', boxShadow: '0 0 4px rgba(59,130,246,0.5)' }} />)}
            </div>
          </div>
          <div style={{ padding: '16px 18px 14px', flex: 1 }}>
            <MiniBar data={chartData} />
            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.20), transparent)', margin: '14px 0 12px' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {chartData.map(d => (
                <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(139,139,170,0.50)', letterSpacing: '.05em' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: d.color, boxShadow: `0 0 5px ${d.color}`, flexShrink: 0 }} />
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Event log */}
        <div style={panel('#A855F7')}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid #A855F7', borderLeft: '2px solid #A855F7', boxShadow: '-1px -1px 6px rgba(168,85,247,0.5)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(220,38,38,0.07)', background: 'rgba(168,85,247,0.05)', flexShrink: 0 }}>
            <Activity size={11} color="#A855F7" style={{ filter: 'drop-shadow(0 0 4px #A855F7)' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.16em', color: '#A855F7' }}>[ EVENT LOG ]</span>
            <div className="sys-dots" style={{ gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(168,85,247,0.40)', boxShadow: '0 0 4px rgba(168,85,247,0.5)' }} />)}
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 250 }}>
            {recentEvs.length === 0
              ? <div className="empty-state">
                  <div style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(168,85,247,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={13} color="rgba(168,85,247,0.35)" />
                  </div>
                  <div className="empty-state-title">Sin eventos</div>
                  <div className="empty-state-sub">// el log aparecerá aquí</div>
                </div>
              : recentEvs.map((ev, i) => {
                  const m = evMeta(ev.type); const d = ev.data as Record<string, string> | null
                  return (
                    <div key={i} className="event-entry"
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: m.color, boxShadow: `0 0 6px ${m.color}`, flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1, fontSize: 12, color: 'rgba(139,139,170,0.72)', lineHeight: 1.5 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, fontWeight: 700, letterSpacing: '.12em', color: m.color, background: `${m.color}12`, border: `1px solid ${m.color}28`, padding: '1px 5px', borderRadius: 2, marginRight: 7 }}>{m.label}</span>
                        {d?.sender && <span style={{ color: '#F1F0FF', fontWeight: 600 }}>{d.sender}</span>}
                        {d?.cmd && <span style={{ color: 'rgba(220,38,38,0.48)' }}> › {d.cmd}</span>}
                        {d?.group && <span style={{ color: 'rgba(220,38,38,0.30)', fontSize: 10 }}> [{d.group}]</span>}
                        {!d?.sender && !d?.cmd && <span style={{ color: 'rgba(220,38,38,0.35)' }}>{ev.type}</span>}
                      </div>
                      <span className="event-time">{fmtTs(ev.ts)}</span>
                    </div>
                  )
                })
            }
          </div>
        </div>
      </div>

      {/* ── Leaderboards + Health ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

        {[
          { title: '[ XP RANKING ]',  icon: Award, color: '#F59E0B', data: topUsers, valFn: (u: User) => u.xp ?? 0 },
          { title: '[ CMD RANKING ]', icon: Zap,   color: '#A855F7', data: topCmds,  valFn: (u: User) => u.commands ?? 0 },
        ].map(({ title, icon: Ico, color, data, valFn }) => (
          <div key={title} style={panel(color)}>
            <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}`, boxShadow: `-1px -1px 6px ${color}55` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(220,38,38,0.07)', background: `${color}07`, flexShrink: 0 }}>
              <Ico size={11} color={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color }}>{title}</span>
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
                        <div style={{ width: 26, height: 26, borderRadius: 3, background: `${color}12`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, fontWeight: 700, color, fontFamily: "'Rajdhani', sans-serif" }}>
                          {name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="lb-name">{name}</span>
                        <span className="lb-val" style={{ color }}>{valFn(u).toLocaleString()}</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        ))}

        {/* System health */}
        <div style={panel('#10B981')}>
          <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '2px solid #10B981', borderLeft: '2px solid #10B981', boxShadow: '-1px -1px 6px rgba(16,185,129,0.5)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid rgba(220,38,38,0.07)', background: 'rgba(16,185,129,0.05)', flexShrink: 0 }}>
            <Activity size={11} color="#10B981" style={{ filter: 'drop-shadow(0 0 4px #10B981)' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, letterSpacing: '.14em', color: '#10B981' }}>[ SYSTEM HEALTH ]</span>
          </div>
          <div style={{ padding: '14px 18px', flex: 1 }}>
            <HealthBar label="USUARIOS"  val={stats?.users ?? 0}         max={500}  color="#3B82F6" />
            <HealthBar label="GUILDS"    val={stats?.groups ?? 0}        max={100}  color="#A855F7" />
            <HealthBar label="COMANDOS"  val={stats?.commandsToday ?? 0} max={300}  color="#F59E0B" />
            <HealthBar label="MENSAJES"  val={stats?.messages ?? 0}      max={10000} color="#10B981" />

            <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.18), transparent)', margin: '14px 0 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '.14em', color: 'rgba(220,38,38,0.35)' }}>/// NET STATUS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', boxShadow: connected ? '0 0 8px rgba(16,185,129,0.7)' : 'none', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none' }} />
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 9, fontWeight: 700, color: connected ? '#10B981' : '#EF4444', letterSpacing: '.10em' }}>
                  {connected ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
