import { useEffect, useState, useRef } from 'react'
  import {
    RefreshCw, Users, MessageSquare, Activity, Zap,
    Shield, Clock, AlertCircle, Award, ArrowUpRight, BarChart2, Star
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
        const elapsed = Date.now() - start
        const progress = Math.min(elapsed / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 3)
        setVal(Math.round(target * ease))
        if (progress >= 1) { clearInterval(ref.current!); setVal(target) }
      }, 16)
      return () => { if (ref.current) clearInterval(ref.current) }
    }, [target, duration])
    return val
  }

  function fmtUptime(s: number) {
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
    if (d > 0) return `${d}d ${h}h ${m}m`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  function fmtTs(ts: number) {
    return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  const EV_META: Record<string, { label: string; color: string; bg: string }> = {
    msg:  { label: 'Mensaje',  color: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
    cmd:  { label: 'Comando',  color: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
    mod:  { label: 'Mod',      color: '#e53935', bg: 'rgba(229,57,53,.12)'  },
    join: { label: 'Ingreso',  color: '#10b981', bg: 'rgba(16,185,129,.12)' },
    lvl:  { label: 'Nivel',    color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  }
  const evMeta = (t: string) => EV_META[t] ?? { label: t, color: 'var(--tx3)', bg: 'rgba(255,255,255,.06)' }

  function MiniBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 72, padding: '0 2px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            {d.value > 0 && <div style={{ fontSize: 9, color: d.color ?? 'var(--tx3)', fontWeight: 700 }}>{d.value}</div>}
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 8 : 3)}%`,
              background: d.value > 0
                ? `linear-gradient(to top, ${d.color ?? 'var(--red)'}cc, ${d.color ?? '#e53935'}55)`
                : 'rgba(255,255,255,.05)',
              transition: 'height .6s cubic-bezier(.4,0,.2,1)',
              boxShadow: d.value > 0 ? `0 -2px 10px ${d.color ?? 'var(--red)'}55` : 'none',
            }} />
            <div style={{ fontSize: 8, color: 'var(--tx3)', letterSpacing: '.03em', whiteSpace: 'nowrap', textAlign: 'center', maxWidth: '100%', overflow: 'hidden' }}>{d.label}</div>
          </div>
        ))}
      </div>
    )
  }

  function rankOf(lv: number) {
    if (lv >= 20) return { l: 'S', c: '#ffd700' }
    if (lv >= 15) return { l: 'A', c: '#b44fff' }
    if (lv >= 10) return { l: 'B', c: '#00c8ff' }
    if (lv >= 5)  return { l: 'C', c: '#00ff88' }
    return { l: 'D', c: '#888' }
  }

  function MetricCard({ label, value, icon: Icon, color, sub }: {
    label: string; value: number | string; icon: React.ElementType; color: string; sub?: string
  }) {
    const numVal = typeof value === 'number' ? value : 0
    const animated = useCounter(numVal)
    return (
      <div className="metric-card" style={{ '--accent-color': color, '--accent-border': color + '33' } as React.CSSProperties}>
        <div className="glow-orb" style={{ background: color }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: .6 }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: color + '18', border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${color}20` }}>
            <Icon size={17} color={color} />
          </div>
          <ArrowUpRight size={13} color={color} style={{ opacity: .4, marginTop: 4 }} />
        </div>
        <div className="metric-value">{typeof value === 'string' ? value : animated.toLocaleString()}</div>
        <div className="metric-label">{label}</div>
        {sub && <div style={{ fontSize: 10, color, marginTop: 6, fontWeight: 600, opacity: .8 }}>{sub}</div>}
      </div>
    )
  }

  export default function Overview() {
    const [status,    setStatus]   = useState<BotStatus | null>(null)
    const [stats,     setStats]    = useState<BotStats | null>(null)
    const [users,     setUsers]    = useState<User[]>([])
    const [events,    setEvents]   = useState<ActivityEvent[]>([])
    const [loading,   setLoad]     = useState(true)
    const [refreshing,setRef]      = useState(false)

    const load = async (r = false) => {
      if (!isConfigured()) { setLoad(false); return }
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
      setLoad(false); setRef(false)
    }

    useEffect(() => { load() }, [])

    if (!isConfigured()) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 16, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={30} color="var(--gold)" />
        </div>
        <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '1.2rem', color: 'var(--gold)' }}>VITE_API_URL no configurada</div>
        <div style={{ fontSize: 13, color: 'var(--tx3)', maxWidth: 320 }}>Ve a Vercel y agrega la URL de tu bot en Railway como variable de entorno.</div>
        <div className="code-block" style={{ fontSize: 12 }}>VITE_API_URL = https://tu-bot.railway.app</div>
      </div>
    )

    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="skeleton" style={{ height: 150, borderRadius: 16 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 14 }}>
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />)}
        </div>
      </div>
    )

    const connected = status?.connected ?? false
    const topUsers  = [...users].sort((a, b) => b.xp - a.xp).slice(0, 5)
    const cmdUsers  = [...users].sort((a, b) => (b.commands ?? 0) - (a.commands ?? 0)).slice(0, 5)
    const recent12  = events.slice(0, 12)
    const recent50  = events.slice(0, 50)
    const uptimeStr = stats?.uptime !== undefined ? fmtUptime(stats.uptime) : '--'

    const chartData = (['msg','cmd','mod','join','lvl'] as const).map(type => ({
      label: evMeta(type).label,
      value: recent50.filter(e => e.type === type).length,
      color: evMeta(type).color,
    }))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="animate-fade-up">

        <div className="welcome-banner">
          <div className="banner-grid" />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 32 }}>&#x1F916;</span>
                  <div className="banner-title">BotAnime Dashboard</div>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(238,238,245,.45)', maxWidth: 400, lineHeight: 1.65 }}>
                  Panel de control en tiempo real. Monitorea, modera y configura tu bot.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <div className={`status-pill ${connected ? 'online' : 'offline'}`}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 6px currentColor', animation: connected ? 'pulse 1.5s infinite' : 'none' }} />
                    {connected ? 'Bot conectado' : 'Bot desconectado'}
                  </div>
                  {stats?.uptime !== undefined && (
                    <div className="status-pill" style={{ background: 'rgba(59,130,246,.08)', color: 'var(--blue)', border: '1px solid rgba(59,130,246,.2)' }}>
                      <Zap size={10} /> Activo {uptimeStr}
                    </div>
                  )}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing} style={{ flexShrink: 0 }}>
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Actualizar
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(185px,1fr))', gap: 14 }}>
          <MetricCard label="Usuarios registrados" value={stats?.users ?? 0}    icon={Users}         color="#3b82f6" />
          <MetricCard label="Grupos activos"        value={stats?.groups ?? 0}   icon={MessageSquare} color="#8b5cf6" />
          <MetricCard label="Comandos hoy"          value={stats?.commandsToday ?? 0} icon={Zap}      color="#f59e0b" />
          <MetricCard label="Mensajes totales"      value={stats?.messages ?? users.reduce((a,u) => a + (u.messages ?? 0), 0)} icon={Activity} color="#10b981" />
          <MetricCard label="Top nivel"             value={topUsers[0]?.level ?? 0}   icon={Star}     color="#ec4899" sub={topUsers[0]?.name ?? ''} />
          <MetricCard label="Uptime"                value={uptimeStr}            icon={Clock}         color="#06b6d4" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 14 }}>
          <div className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BarChart2 size={14} color="var(--red)" />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Actividad</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--tx3)' }}>{Math.min(recent50.length, 50)} eventos</span>
            </div>
            <MiniBarChart data={chartData} />
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Total eventos', val: events.length, color: 'var(--tx)' },
                { label: 'Usuarios activos', val: users.filter(u => (u.messages ?? 0) > 0).length, color: 'var(--blue)' },
                { label: 'XP total otorgado', val: users.reduce((a,u) => a + u.xp, 0).toLocaleString(), color: 'var(--gold)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--tx3)' }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Activity size={14} color="var(--tx3)" />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Feed en vivo</span>
              {events.length > 0 && <span className="badge badge-green" style={{ fontSize: 9, marginLeft: 'auto' }}>LIVE</span>}
            </div>
            <div style={{ maxHeight: 248, overflowY: 'auto' }}>
              {recent12.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 0' }}>
                  <div className="empty-state-icon"><Activity size={20} color="var(--tx3)" /></div>
                  <div className="empty-state-title">Sin eventos aun</div>
                </div>
              ) : recent12.map((e, i) => {
                const m = evMeta(e.type)
                const d = e.data as Record<string, string>
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 4, background: m.bg, color: m.color, letterSpacing: '.06em', textTransform: 'uppercase', flexShrink: 0 }}>
                      {m.label}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.sender ?? d.user ?? '--'}{d.cmd ? ` /${d.cmd}` : d.group ? ` en ${d.group}` : ''}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--tx3)', flexShrink: 0, fontFamily: "'JetBrains Mono',monospace" }}>{fmtTs(e.ts)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={14} color="var(--gold)" />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Top XP</span>
            </div>
            {topUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}><div className="empty-state-title">Sin datos</div></div>
            ) : topUsers.map((u, i) => {
              const rank = rankOf(u.level)
              const maxXp = topUsers[0]?.xp ?? 1
              return (
                <div key={u.jid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < topUsers.length - 1 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                  <div style={{ width: 22, textAlign: 'center', fontSize: 13, flexShrink: 0 }}>
                    {i === 0 ? String.fromCodePoint(0x1F947) : i === 1 ? String.fromCodePoint(0x1F948) : i === 2 ? String.fromCodePoint(0x1F949) : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)' }}>#{i+1}</span>}
                  </div>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: rank.c + '20', border: `1px solid ${rank.c}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: rank.c, flexShrink: 0, fontFamily: "'Rajdhani',sans-serif" }}>
                    {rank.l}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.jid.split('@')[0]}</div>
                    <div style={{ marginTop: 4 }}>
                      <div className="progress-track-sm"><div className="progress-fill" style={{ width: `${(u.xp / maxXp) * 100}%`, background: rank.c, boxShadow: `0 0 6px ${rank.c}66` }} /></div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: rank.c }}>{u.xp.toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx3)' }}>Nv {u.level}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={14} color="var(--purple)" />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Top comandos</span>
            </div>
            {cmdUsers.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}><div className="empty-state-title">Sin datos</div></div>
            ) : cmdUsers.map((u, i) => {
              const maxCmd = cmdUsers[0]?.commands ?? 1
              return (
                <div key={u.jid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i < cmdUsers.length - 1 ? '1px solid rgba(255,255,255,.03)' : 'none' }}>
                  <div style={{ width: 22, textAlign: 'center', fontSize: 11, fontWeight: 800, color: 'var(--tx3)', flexShrink: 0 }}>#{i+1}</div>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--purple)', flexShrink: 0, fontFamily: "'Rajdhani',sans-serif" }}>
                    {(u.name || u.jid.split('@')[0])[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || u.jid.split('@')[0]}</div>
                    <div style={{ marginTop: 4 }}>
                      <div className="progress-track-sm"><div className="progress-fill" style={{ width: `${((u.commands ?? 0) / maxCmd) * 100}%`, background: 'var(--purple)', boxShadow: '0 0 6px rgba(139,92,246,.5)' }} /></div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--purple)' }}>{(u.commands ?? 0).toLocaleString()}</div>
                    <div style={{ fontSize: 9, color: 'var(--tx3)' }}>cmds</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Zap size={14} color="var(--gold)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Estado del sistema</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 18 }}>
            {[
              { label: 'WhatsApp',      val: connected ? 100 : 0, color: connected ? 'var(--green)' : 'var(--red2)',  text: connected ? 'Conectado'   : 'Offline'       },
              { label: 'Base de datos', val: 100,                  color: 'var(--blue)',                               text: 'Operativa'                                 },
              { label: 'API REST',      val: status ? 100 : 0,    color: status ? 'var(--green)' : 'var(--red2)',     text: status ? 'Respondiendo' : 'Sin respuesta'  },
              { label: 'Comandos hoy',  val: Math.min(100, ((stats?.commandsToday ?? 0) / 50) * 100), color: 'var(--purple)', text: `${stats?.commandsToday ?? 0} hoy` },
            ].map(({ label, val, color, text }) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: 'var(--tx3)', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{text}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${val}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 8px ${color}44`, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    )
  }
  