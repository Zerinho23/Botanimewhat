import { useEffect, useState, useRef } from 'react'
import {
  RefreshCw, Users, MessageSquare, Activity, Zap,
  Shield, Clock, Award, BarChart2, AlertCircle
} from 'lucide-react'
import {
  getStatus, getStats, getUsers, getActivityHistory, isConfigured,
  type BotStats, type BotStatus, type User, type ActivityEvent
} from '../api'

function useCounter(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (ref.current) clearInterval(ref.current)
    if (target === 0) { setVal(0); return }
    const start = Date.now()
    ref.current = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * ease))
      if (p >= 1) { clearInterval(ref.current!); setVal(target) }
    }, 16)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [target, duration])
  return val
}

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d > 0) return d + 'd ' + h + 'h'
  if (h > 0) return h + 'h ' + m + 'm'
  return m + 'm'
}

function getRank(n: number, thresholds: number[]) {
  const ranks = ['E','D','C','B','A','S'] as const
  let idx = 0
  for (let i = 0; i < thresholds.length; i++) { if (n >= thresholds[i]) idx = i + 1 }
  return ranks[Math.min(idx, ranks.length - 1)]
}

function RankBadge({ rank }: { rank: string }) {
  return <span className={`rank rank-${rank.toLowerCase()}`}>{rank}</span>
}

function NeonBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, padding: '0 2px' }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 100, d.value > 0 ? 8 : 4)
        const col = d.color ?? 'var(--blue)'
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
            {d.value > 0 && (
              <span style={{ fontSize: 9, color: col, fontFamily: "'Orbitron',sans-serif", fontWeight: 700, textShadow: `0 0 6px ${col}` }}>{d.value}</span>
            )}
            <div style={{
              width: '100%', borderRadius: '3px 3px 0 0',
              height: h + '%',
              background: d.value > 0 ? `linear-gradient(to top, ${col}, ${col}60)` : 'rgba(30,144,255,.05)',
              boxShadow: d.value > 0 ? `0 0 10px ${col}50, 0 -2px 8px ${col}30` : 'none',
              transition: 'height .7s cubic-bezier(.4,0,.2,1)',
              position: 'relative', overflow: 'hidden',
            }}>
              {d.value > 0 && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)',
                  animation: 'shimmerFill 2.5s ease-in-out infinite',
                }} />
              )}
            </div>
            <span style={{ fontSize: 8, color: 'rgba(30,144,255,0.40)', fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: '.08em' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

const EV_META: Record<string, { label: string; color: string }> = {
  msg:  { label: 'MSG',     color: '#1e90ff'  },
  cmd:  { label: 'CMD',     color: '#a855f7'  },
  mod:  { label: 'MOD',     color: '#ef4444'  },
  join: { label: 'JOIN',    color: '#34d399'  },
  lvl:  { label: 'LVL UP', color: '#fbbf24'  },
  conn: { label: 'SYS',    color: '#00d4ff'  },
}
const evMeta = (t: string) => EV_META[t] ?? { label: t.toUpperCase().slice(0,6), color: 'rgba(30,144,255,0.5)' }

function fmtTs(ts: number) {
  return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ── Metric Card — Premium ──────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, color, rank, sub, delay = 0
}: {
  icon: React.ElementType; label: string; value: number; color: string
  rank?: string; sub?: string; delay?: number
}) {
  const displayed = useCounter(value)
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 10,
        padding: '20px 20px 16px',
        background: `linear-gradient(145deg, rgba(4,14,28,0.95), rgba(4,14,28,0.85))`,
        border: `1px solid ${hovered ? color + '45' : color + '22'}`,
        boxShadow: hovered
          ? `0 8px 40px rgba(0,0,0,0.5), 0 0 40px ${color}14, 0 1px 0 rgba(255,255,255,0.04) inset`
          : `0 4px 24px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.03) inset`,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'all .22s ease',
        animation: `fadeUp .35s ease ${delay}ms both`,
        /* Corner brackets */
        backgroundImage: `
          linear-gradient(${color}, ${color}),
          linear-gradient(${color}, ${color}),
          linear-gradient(${color}, ${color}),
          linear-gradient(${color}, ${color}),
          linear-gradient(${color}, ${color}),
          linear-gradient(${color}, ${color}),
          linear-gradient(${color}, ${color}),
          linear-gradient(${color}, ${color})
        `,
        backgroundSize: '12px 2px, 2px 12px, 12px 2px, 2px 12px, 12px 2px, 2px 12px, 12px 2px, 2px 12px',
        backgroundPosition: '0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Top accent gradient line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}cc, ${color}60, transparent 70%)`,
        boxShadow: `0 0 10px ${color}70`,
      }}/>
      {/* Background radial glow */}
      <div style={{
        position: 'absolute', top: -20, left: -10,
        width: 100, height: 100,
        background: `radial-gradient(circle, ${color}12, transparent 65%)`,
        pointerEvents: 'none',
      }}/>

      {/* Icon + Rank row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 20px ${color}30`,
        }}>
          <Icon size={18} color={color} strokeWidth={1.8}/>
        </div>
        {rank && <RankBadge rank={rank}/>}
      </div>

      {/* Big number */}
      <div style={{
        fontFamily: "'Orbitron',sans-serif",
        fontSize: 34, fontWeight: 900, lineHeight: 1,
        color,
        textShadow: `0 0 30px ${color}70, 0 0 60px ${color}25`,
        letterSpacing: '-.02em',
      }}>
        {displayed.toLocaleString()}
      </div>

      {/* Label */}
      <div style={{
        fontFamily: "'Rajdhani',sans-serif", fontSize: 10, fontWeight: 700,
        letterSpacing: '.22em', color: 'rgba(30,144,255,0.40)', marginTop: 8,
        textTransform: 'uppercase',
      }}>{label}</div>

      {sub && (
        <div style={{
          fontSize: 10, color: 'rgba(30,144,255,0.22)', marginTop: 3,
          fontFamily: "'JetBrains Mono',monospace",
        }}>{sub}</div>
      )}
    </div>
  )
}

function HealthBar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
  const pct = Math.min((val / max) * 100, 100)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(30,144,255,0.55)' }}>{label}</span>
        <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 700, color: '#d0eaff' }}>
          {val.toLocaleString()} <span style={{ color: 'rgba(30,144,255,0.30)', fontSize: 9 }}>/ {max.toLocaleString()}</span>
        </span>
      </div>
      <div style={{ width: '100%', height: 6, background: 'rgba(30,144,255,0.07)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: pct + '%', height: '100%', borderRadius: 3,
          background: `linear-gradient(90deg, ${color}, ${color}90)`,
          boxShadow: `0 0 8px ${color}60`,
          transition: 'width .8s cubic-bezier(.4,0,.2,1)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)',
            animation: 'shimmerFill 2.5s ease-in-out infinite',
          }}/>
        </div>
      </div>
    </div>
  )
}

export default function Overview() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [stats,  setStats]  = useState<BotStats  | null>(null)
  const [users,  setUsers]  = useState<User[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRef] = useState(false)

  const load = async (r = false) => {
    if (!isConfigured()) { setLoading(false); return }
    if (r) setRef(true)
    try {
      const [s, st, u, ev] = await Promise.allSettled([
        getStatus(), getStats(), getUsers(), getActivityHistory()
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

  if (!isConfigured()) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <div className="card animate-scale-in" style={{ padding: 32, textAlign: 'center', maxWidth: 360 }}>
        <div className="sys-header" style={{ margin: '-18px -18px 18px', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <AlertCircle size={13} color="var(--gold)"/>
          <span className="sys-header-title" style={{ color: 'var(--gold)' }}>SYSTEM ALERT</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.7 }}>
          Configura <span style={{ color: 'var(--blue)', fontFamily: "'JetBrains Mono',monospace" }}>VITE_API_URL</span> en
          Vercel → Settings → Environment Variables.
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 54, borderRadius: 8 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
        {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height: 130 }}/>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>
        <div className="skeleton" style={{ height: 230 }}/>
        <div className="skeleton" style={{ height: 230 }}/>
      </div>
    </div>
  )

  const topUsers  = [...users].sort((a,b) => (b.xp||0) - (a.xp||0)).slice(0,6)
  const topCmds   = [...users].sort((a,b) => (b.commands||0) - (a.commands||0)).slice(0,6)
  const recentEvs = events.slice(0, 12)

  const userRank  = getRank(stats?.users ?? 0,  [10,25,50,100,250])
  const groupRank = getRank(stats?.groups ?? 0, [5,10,20,50,100])
  const cmdRank   = getRank(stats?.commandsToday ?? 0, [10,30,60,150,300])
  const msgRank   = getRank(stats?.messages ?? 0, [100,500,1000,5000,10000])

  const evCounts: Record<string, number> = {}
  for (const ev of events.slice(0,100)) evCounts[ev.type] = (evCounts[ev.type] || 0) + 1
  const chartData = [
    { label: 'MSG',  value: evCounts['msg']  || 0, color: '#1e90ff'  },
    { label: 'CMD',  value: evCounts['cmd']  || 0, color: '#a855f7'  },
    { label: 'MOD',  value: evCounts['mod']  || 0, color: '#ef4444'  },
    { label: 'JOIN', value: evCounts['join'] || 0, color: '#34d399'  },
    { label: 'LVL',  value: evCounts['lvl']  || 0, color: '#fbbf24'  },
    { label: 'SYS',  value: evCounts['conn'] || 0, color: '#00d4ff'  },
  ]

  const connected  = status?.connected ?? false
  const uptimeSecs = stats?.uptime ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-up">

      {/* ── Page header strip ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        padding: '14px 20px',
        borderRadius: 10,
        background: 'rgba(4,14,28,0.80)',
        border: '1px solid rgba(30,144,255,0.18)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #1e90ff90, #00d4ffcc, #1e90ff90, transparent)' }}/>
        <div>
          <div style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 18, fontWeight: 900,
            letterSpacing: '.12em', color: '#d0eaff',
            textShadow: '0 0 30px rgba(30,144,255,0.35)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ color: '#00d4ff', textShadow: '0 0 14px rgba(0,212,255,0.7)' }}>◈</span>
            STATUS WINDOW
            <span style={{ color: '#00d4ff', textShadow: '0 0 14px rgba(0,212,255,0.7)' }}>◈</span>
          </div>
          <div style={{
            fontSize: 10, fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
            letterSpacing: '.16em', color: 'rgba(30,144,255,0.40)', marginTop: 5,
          }}>
            HUNTER: BOTANIME · {connected ? 'ONLINE — AWAKENED' : 'OFFLINE'} · UPTIME {fmtUptime(uptimeSecs)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {connected
            ? <span className="rank rank-s" style={{ fontSize: 10, padding: '4px 12px' }}>◈ S-RANK</span>
            : <span className="rank rank-e">OFFLINE</span>
          }
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => load(true)}
            disabled={refreshing}
            style={{ minWidth: 36 }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}/>
          </button>
        </div>
      </div>

      {/* ── Metric cards grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
        <StatCard icon={Users}         label="HUNTERS"      value={stats?.users ?? 0}          color="#1e90ff" rank={userRank}  sub="usuarios registrados" delay={0}  />
        <StatCard icon={MessageSquare} label="GUILDS"       value={stats?.groups ?? 0}         color="#a855f7" rank={groupRank} sub="grupos activos"       delay={60} />
        <StatCard icon={Zap}           label="CMDS HOY"     value={stats?.commandsToday ?? 0}  color="#fbbf24" rank={cmdRank}   sub="comandos ejecutados"  delay={120}/>
        <StatCard icon={Activity}      label="MENSAJES"     value={stats?.messages ?? 0}       color="#00d4ff" rank={msgRank}   sub="mensajes procesados"  delay={180}/>
        <StatCard icon={Shield}        label="EVENTOS"      value={events.length}              color="#34d399"                  sub="en historial"         delay={240}/>
        <StatCard icon={Clock}         label="UPTIME (seg)" value={uptimeSecs}                 color="#f97316"                  sub={fmtUptime(uptimeSecs)} delay={300}/>
      </div>

      {/* ── Middle row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>

        {/* Activity chart */}
        <div className="card" style={{ padding: 0 }}>
          <div className="sys-header">
            <BarChart2 size={12} color="#1e90ff"/>
            <span className="sys-header-title">ACTIVITY SCAN</span>
            <div className="sys-dots"><div className="sys-dot"/><div className="sys-dot"/><div className="sys-dot"/></div>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <NeonBarChart data={chartData}/>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {chartData.map(d => (
                <span key={d.label} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  fontSize: 10, color: 'rgba(30,144,255,0.50)',
                  fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: '.08em',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0, boxShadow: `0 0 5px ${d.color}` }}/>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Event log */}
        <div className="card" style={{ padding: 0 }}>
          <div className="sys-header">
            <Activity size={12} color="#a855f7"/>
            <span className="sys-header-title" style={{ color: '#a855f7', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}>EVENT LOG</span>
            <div className="sys-dots"><div className="sys-dot"/><div className="sys-dot"/><div className="sys-dot"/></div>
          </div>
          <div style={{ padding: '6px 16px 14px', maxHeight: 270, overflowY: 'auto' }}>
            {recentEvs.length === 0 ? (
              <div className="empty-state" style={{ height: 160 }}>
                <div className="empty-state-title">SIN EVENTOS</div>
                <div className="empty-state-sub">El log de eventos aparecerá aquí</div>
              </div>
            ) : recentEvs.map((ev, i) => {
              const m = evMeta(ev.type)
              const d = ev.data as Record<string,string> | null
              return (
                <div key={i} className="event-entry">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color, boxShadow: `0 0 6px ${m.color}`, flexShrink: 0, marginTop: 4 }}/>
                  <div style={{ fontSize: 12, color: 'rgba(70,130,180,0.8)', flex: 1, lineHeight: 1.5 }}>
                    <span style={{ display: 'inline-block', fontFamily: "'Orbitron',sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '.12em', color: m.color, background: m.color + '18', border: `1px solid ${m.color}35`, padding: '1px 5px', borderRadius: 2, marginRight: 7 }}>{m.label}</span>
                    {d?.sender && <span style={{ color: '#d0eaff', fontWeight: 600 }}>{d.sender}</span>}
                    {d?.cmd    && <span style={{ color: 'rgba(30,144,255,0.60)' }}> → {d.cmd}</span>}
                    {d?.group  && <span style={{ color: 'rgba(30,144,255,0.35)', fontSize: 10 }}> [{d.group}]</span>}
                    {!d?.sender && !d?.cmd && <span style={{ color: 'rgba(30,144,255,0.40)' }}>{ev.type} event</span>}
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(30,144,255,0.30)', flexShrink: 0 }}>{fmtTs(ev.ts)}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

        {/* XP leaderboard */}
        <div className="card" style={{ padding: 0 }}>
          <div className="sys-header" style={{ background: 'linear-gradient(90deg, rgba(251,191,36,0.10) 0%, transparent 100%)' }}>
            <Award size={12} color="#fbbf24"/>
            <span className="sys-header-title" style={{ color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>XP RANKING</span>
          </div>
          <div style={{ padding: '4px 0 10px' }}>
            {topUsers.length === 0
              ? <div className="empty-state" style={{ height: 120 }}><div className="empty-state-sub">Sin datos</div></div>
              : topUsers.map((u, i) => (
                <div key={u.jid} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                  borderRadius: 6, margin: '0 6px',
                  transition: 'background .14s',
                  background: i === 0 ? 'rgba(251,191,36,0.06)' : 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,144,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(251,191,36,0.06)' : 'transparent')}>
                  <span style={{
                    fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 800,
                    width: 22, textAlign: 'center', flexShrink: 0,
                    color: i === 0 ? '#fbbf24' : i === 1 ? 'rgba(70,130,180,0.8)' : i === 2 ? '#cd7f32' : 'rgba(30,144,255,0.30)',
                    textShadow: i === 0 ? '0 0 12px rgba(251,191,36,0.7)' : 'none',
                  }}>{i === 0 ? '◈' : i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#d0eaff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name || u.jid.split('@')[0]}
                  </span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.4)' }}>
                    {(u.xp ?? 0).toLocaleString()}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* CMD leaderboard */}
        <div className="card" style={{ padding: 0 }}>
          <div className="sys-header" style={{ background: 'linear-gradient(90deg, rgba(168,85,247,0.10) 0%, transparent 100%)' }}>
            <Zap size={12} color="#a855f7"/>
            <span className="sys-header-title" style={{ color: '#a855f7', textShadow: '0 0 10px rgba(168,85,247,0.5)' }}>CMD RANKING</span>
          </div>
          <div style={{ padding: '4px 0 10px' }}>
            {topCmds.length === 0
              ? <div className="empty-state" style={{ height: 120 }}><div className="empty-state-sub">Sin datos</div></div>
              : topCmds.map((u, i) => (
                <div key={u.jid} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px',
                  borderRadius: 6, margin: '0 6px', transition: 'background .14s',
                  background: i === 0 ? 'rgba(168,85,247,0.06)' : 'transparent',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,144,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = i === 0 ? 'rgba(168,85,247,0.06)' : 'transparent')}>
                  <span style={{
                    fontFamily: "'Orbitron',sans-serif", fontSize: 11, fontWeight: 800,
                    width: 22, textAlign: 'center', flexShrink: 0,
                    color: i === 0 ? '#a855f7' : i === 1 ? 'rgba(70,130,180,0.8)' : i === 2 ? '#cd7f32' : 'rgba(30,144,255,0.30)',
                    textShadow: i === 0 ? '0 0 12px rgba(168,85,247,0.7)' : 'none',
                  }}>{i === 0 ? '◈' : i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#d0eaff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name || u.jid.split('@')[0]}
                  </span>
                  <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: '#a855f7', textShadow: '0 0 8px rgba(168,85,247,0.4)' }}>
                    {(u.commands ?? 0).toLocaleString()}
                  </span>
                </div>
              ))
            }
          </div>
        </div>

        {/* System Health */}
        <div className="card" style={{ padding: 0 }}>
          <div className="sys-header" style={{ background: 'linear-gradient(90deg, rgba(52,211,153,0.10) 0%, transparent 100%)' }}>
            <Shield size={12} color="#34d399"/>
            <span className="sys-header-title" style={{ color: '#34d399', textShadow: '0 0 10px rgba(52,211,153,0.5)' }}>SYSTEM HEALTH</span>
          </div>
          <div style={{ padding: '18px 20px' }}>
            <HealthBar label="HUNTERS"  val={stats?.users ?? 0}         max={Math.max(500,  stats?.users ?? 0)}         color="#1e90ff"/>
            <HealthBar label="GUILDS"   val={stats?.groups ?? 0}        max={Math.max(100,  stats?.groups ?? 0)}        color="#a855f7"/>
            <HealthBar label="CMDS"     val={stats?.commandsToday ?? 0} max={Math.max(200,  stats?.commandsToday ?? 0)} color="#fbbf24"/>
            <HealthBar label="MSGS"     val={stats?.messages ?? 0}      max={Math.max(5000, stats?.messages ?? 0)}      color="#34d399"/>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(30,144,255,0.10)' }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: 'rgba(30,144,255,0.35)', letterSpacing: '.12em' }}>UPTIME</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, color: connected ? '#34d399' : '#ef4444', fontWeight: 700, textShadow: connected ? '0 0 10px rgba(52,211,153,0.5)' : 'none' }}>
                {fmtUptime(uptimeSecs)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
