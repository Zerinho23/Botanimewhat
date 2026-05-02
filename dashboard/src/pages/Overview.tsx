import { useEffect, useState, useRef } from 'react'
  import {
    RefreshCw, Users, MessageSquare, Activity, Zap,
    Shield, Clock, Award, BarChart2, AlertCircle
  } from 'lucide-react'
  import {
    getStatus, getStats, getUsers, getActivityHistory, isConfigured,
    type BotStats, type BotStatus, type User, type ActivityEvent
  } from '../api'

  // ── Animated counter ─────────────────────────────────────────────────────────
  function useCounter(target: number, duration = 1000) {
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
    return (
      <span className={`rank rank-${rank.toLowerCase()}`}>{rank}</span>
    )
  }

  // ── Mini bar chart (blue neon) ────────────────────────────────────────────────
  function NeonBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80, padding: '0 2px' }}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 100, d.value > 0 ? 10 : 4)
          const col = d.color ?? 'var(--blue)'
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              {d.value > 0 && (
                <span style={{ fontSize: 8, color: col, fontFamily: "'Orbitron',sans-serif", fontWeight: 700 }}>{d.value}</span>
              )}
              <div style={{
                width: '100%', borderRadius: '2px 2px 0 0',
                height: h + '%',
                background: d.value > 0
                  ? `linear-gradient(to top, ${col}, ${col}55)`
                  : 'rgba(30,144,255,.06)',
                boxShadow: d.value > 0 ? `0 0 6px ${col}55` : 'none',
                transition: 'height .6s cubic-bezier(.4,0,.2,1)',
                position: 'relative', overflow: 'hidden',
              }}>
                {d.value > 0 && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)',
                    animation: 'shimmerFill 2.5s ease-in-out infinite',
                  }} />
                )}
              </div>
              <span style={{ fontSize: 8, color: 'var(--tx3)', fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: '.06em' }}>{d.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Activity event type meta ──────────────────────────────────────────────────
  const EV_META: Record<string, { label: string; color: string }> = {
    msg:  { label: 'MSG',     color: 'var(--blue)'    },
    cmd:  { label: 'CMD',     color: 'var(--purple2)' },
    mod:  { label: 'MOD',     color: 'var(--red2)'    },
    join: { label: 'JOIN',    color: 'var(--green2)'  },
    lvl:  { label: 'LVL UP', color: 'var(--gold)'    },
    conn: { label: 'SYS',    color: 'var(--cyan)'    },
  }
  const evMeta = (t: string) => EV_META[t] ?? { label: t.toUpperCase(), color: 'var(--tx3)' }

  function fmtTs(ts: number) {
    return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // ── Stat card ─────────────────────────────────────────────────────────────────
  function StatCard({
    icon: Icon, label, value, color, rank, sub, delay = 0
  }: {
    icon: React.ElementType; label: string; value: number; color: string
    rank?: string; sub?: string; delay?: number
  }) {
    const displayed = useCounter(value)
    return (
      <div className="metric-card animate-fade-up" style={{ animationDelay: delay + 'ms' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--radius)',
            background: color + '15', border: '1px solid ' + color + '30',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} color={color} />
          </div>
          {rank && <RankBadge rank={rank} />}
        </div>
        <div className="metric-val" style={{ color }}>{displayed.toLocaleString()}</div>
        <div className="metric-label">{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 3, fontFamily: "'JetBrains Mono',monospace" }}>{sub}</div>}
      </div>
    )
  }

  // ── System health bar ─────────────────────────────────────────────────────────
  function HealthBar({ label, val, max, color }: { label: string; val: number; max: number; color: string }) {
    const pct = Math.min((val / max) * 100, 100)
    return (
      <div className="health-bar-wrap">
        <div className="health-bar-header">
          <span className="health-bar-label">{label}</span>
          <span className="health-bar-val">{val.toLocaleString()} <span style={{ color: 'var(--tx3)', fontSize: 9 }}>/ {max.toLocaleString()}</span></span>
        </div>
        <div className="stat-bar">
          <div className="stat-fill" style={{ width: pct + '%', background: `linear-gradient(90deg, ${color}, ${color}aa)`, boxShadow: `0 0 6px ${color}55` }} />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN PAGE
  // ─────────────────────────────────────────────────────────────────────────────
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
            <AlertCircle size={13} color="var(--gold)" />
            <span className="sys-header-title" style={{ color: 'var(--gold)' }}>SYSTEM ALERT</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6 }}>
            Configura <span style={{ color: 'var(--blue)', fontFamily: "'JetBrains Mono',monospace" }}>VITE_API_URL</span> en
            Vercel → Settings → Environment Variables con la URL de tu bot en Railway.
          </div>
        </div>
      </div>
    )

    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="skeleton" style={{ height: 52, borderRadius: 6 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="skeleton" style={{ height: 220 }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      </div>
    )

    // ── Data derivation ──
    const topUsers   = [...users].sort((a,b) => (b.xp||0) - (a.xp||0)).slice(0, 6)
    const topCmds    = [...users].sort((a,b) => (b.commands||0) - (a.commands||0)).slice(0, 6)
    const recentEvs  = events.slice(0, 12)

    const userRank   = getRank(stats?.users ?? 0,  [10,25,50,100,250])
    const groupRank  = getRank(stats?.groups ?? 0, [5,10,20,50,100])
    const cmdRank    = getRank(stats?.commandsToday ?? 0, [10,30,60,150,300])
    const msgRank    = getRank(stats?.messages ?? 0,  [100,500,1000,5000,10000])

    // Chart data from events
    const evCounts: Record<string, number> = {}
    for (const ev of events.slice(0, 100)) evCounts[ev.type] = (evCounts[ev.type] || 0) + 1
    const chartData = [
      { label: 'MSG',  value: evCounts['msg']  || 0, color: 'var(--blue)'    },
      { label: 'CMD',  value: evCounts['cmd']  || 0, color: 'var(--purple2)' },
      { label: 'MOD',  value: evCounts['mod']  || 0, color: 'var(--red2)'    },
      { label: 'JOIN', value: evCounts['join'] || 0, color: 'var(--green2)'  },
      { label: 'LVL',  value: evCounts['lvl']  || 0, color: 'var(--gold)'    },
      { label: 'SYS',  value: evCounts['conn'] || 0, color: 'var(--cyan)'    },
    ]

    const connected  = status?.connected ?? false
    const uptimeSecs = stats?.uptime ?? 0

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-up">

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div className="page-title">
              <span className="page-title-bracket">◈</span>
              STATUS WINDOW
              <span className="page-title-bracket">◈</span>
            </div>
            <div className="page-subtitle">
              HUNTER: BOTANIME · {connected ? 'ONLINE — AWAKENED' : 'OFFLINE'} · UPTIME {fmtUptime(uptimeSecs)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {connected
              ? <span className="rank rank-s" style={{ animation: 'sRankPulse 2s ease-in-out infinite' }}>◈ S-RANK</span>
              : <span className="rank rank-e">OFFLINE</span>
            }
            <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: 12 }}>
          <StatCard icon={Users}          label="HUNTERS"       value={stats?.users   ?? 0} color="var(--blue)"    rank={userRank}  sub={"usuarios registrados"} delay={0}   />
          <StatCard icon={MessageSquare}  label="GUILDS"        value={stats?.groups  ?? 0} color="var(--purple2)"  rank={groupRank} sub={"grupos activos"}       delay={60}  />
          <StatCard icon={Zap}            label="CMDS HOY"      value={stats?.commandsToday ?? 0} color="var(--gold)" rank={cmdRank} sub={"comandos ejecutados"}  delay={120} />
          <StatCard icon={Activity}       label="MENSAJES"      value={stats?.messages ?? 0} color="var(--cyan)"   rank={msgRank}   sub={"mensajes procesados"}   delay={180} />
          <StatCard icon={Shield}         label="EVENTOS"       value={events.length}        color="var(--green2)"               sub={"en historial"}            delay={240} />
          <StatCard icon={Clock}          label="UPTIME (seg)"  value={uptimeSecs}           color="var(--orange)"               sub={fmtUptime(uptimeSecs)}     delay={300} />
        </div>

        {/* ── Middle row: chart + event log ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14 }}>

          {/* Activity breakdown */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sys-header">
              <BarChart2 size={12} color="var(--blue)" />
              <span className="sys-header-title">ACTIVITY SCAN</span>
              <div className="sys-dots"><div className="sys-dot" /><div className="sys-dot" /><div className="sys-dot" /></div>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <NeonBarChart data={chartData} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {chartData.map(d => (
                  <span key={d.label} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 10, color: 'var(--tx3)', fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, letterSpacing: '.06em',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 1, background: d.color, flexShrink: 0, boxShadow: '0 0 4px ' + d.color }} />
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Event log */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sys-header">
              <Activity size={12} color="var(--purple2)" />
              <span className="sys-header-title" style={{ color: 'var(--purple2)' }}>EVENT LOG</span>
              <div className="sys-dots"><div className="sys-dot" /><div className="sys-dot" /><div className="sys-dot" /></div>
            </div>
            <div style={{ padding: '8px 14px', maxHeight: 260, overflowY: 'auto' }}>
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
                    <div className="event-dot" style={{ background: m.color, boxShadow: '0 0 4px ' + m.color }} />
                    <div className="event-text">
                      <span className="badge" style={{ background: m.color + '18', borderColor: m.color + '40', color: m.color, marginRight: 6 }}>
                        {m.label}
                      </span>
                      {d?.sender && <span style={{ color: 'var(--tx1)', fontWeight: 600 }}>{d.sender}</span>}
                      {d?.cmd    && <span style={{ color: 'var(--tx3)' }}> → {d.cmd}</span>}
                      {d?.group  && <span style={{ color: 'var(--tx3)', fontSize: 10 }}> [{d.group}]</span>}
                      {!d?.sender && !d?.cmd && <span style={{ color: 'var(--tx3)' }}>{ev.type} event</span>}
                    </div>
                    <div className="event-time">{fmtTs(ev.ts)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom row: leaderboards + system health ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>

          {/* XP leaderboard */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sys-header">
              <Award size={12} color="var(--gold)" />
              <span className="sys-header-title" style={{ color: 'var(--gold)' }}>XP RANKING</span>
            </div>
            <div style={{ padding: '6px 0 10px' }}>
              {topUsers.length === 0
                ? <div className="empty-state" style={{ height: 120 }}><div className="empty-state-sub">Sin datos</div></div>
                : topUsers.map((u, i) => (
                  <div key={u.jid} className="lb-row">
                    <span className={`lb-pos lb-pos-${i < 3 ? i+1 : 'n'}`}>{i === 0 ? '◈' : i + 1}</span>
                    <span className="lb-name">{u.name || u.jid.split('@')[0]}</span>
                    <span className="lb-val">{(u.xp ?? 0).toLocaleString()}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* Commands leaderboard */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sys-header">
              <Zap size={12} color="var(--purple2)" />
              <span className="sys-header-title" style={{ color: 'var(--purple2)' }}>CMD RANKING</span>
            </div>
            <div style={{ padding: '6px 0 10px' }}>
              {topCmds.length === 0
                ? <div className="empty-state" style={{ height: 120 }}><div className="empty-state-sub">Sin datos</div></div>
                : topCmds.map((u, i) => (
                  <div key={u.jid} className="lb-row">
                    <span className={`lb-pos lb-pos-${i < 3 ? i+1 : 'n'}`}>{i === 0 ? '◈' : i + 1}</span>
                    <span className="lb-name">{u.name || u.jid.split('@')[0]}</span>
                    <span className="lb-val" style={{ color: 'var(--purple2)' }}>{(u.commands ?? 0).toLocaleString()}</span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* System health */}
          <div className="card" style={{ padding: 0 }}>
            <div className="sys-header">
              <Shield size={12} color="var(--green2)" />
              <span className="sys-header-title" style={{ color: 'var(--green2)' }}>SYSTEM HEALTH</span>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <HealthBar label="HUNTERS"   val={stats?.users   ?? 0} max={Math.max(500, stats?.users   ?? 0)} color="var(--blue)"    />
              <HealthBar label="GUILDS"    val={stats?.groups  ?? 0} max={Math.max(100, stats?.groups  ?? 0)} color="var(--purple2)" />
              <HealthBar label="CMDS HOY"  val={stats?.commandsToday ?? 0} max={Math.max(200, stats?.commandsToday ?? 0)} color="var(--gold)"    />
              <HealthBar label="MENSAJES"  val={stats?.messages ?? 0} max={Math.max(5000, stats?.messages ?? 0)} color="var(--green2)" />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, color: 'var(--tx3)', letterSpacing: '.1em' }}>UPTIME</span>
                <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 11, color: connected ? 'var(--green2)' : 'var(--red2)', fontWeight: 700 }}>
                  {fmtUptime(uptimeSecs)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    )
  }
  