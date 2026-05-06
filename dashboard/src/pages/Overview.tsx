import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw, Users, MessageSquare, Activity, Zap,
  Shield, Clock, Award, BarChart2, AlertCircle,
  Crown, Star, TrendingUp,
} from 'lucide-react'
import {
  getStatus, getStats, getUsers, getActivityHistory, isConfigured,
  type BotStats, type BotStatus, type User, type ActivityEvent,
} from '../api'

/* ── Utilities ───────────────────────────────────────────── */
function useCounter(target: number, dur = 850) {
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

const fmtUp  = (s: number) => { const d = Math.floor(s/86400), h = Math.floor((s%86400)/3600), m = Math.floor((s%3600)/60); return d>0?`${d}d ${h}h`:h>0?`${h}h ${m}m`:`${m}m` }
const fmtNum = (n: number) => n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'')+'K' : String(n)
const fmtTs  = (ts: number) => new Date(ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'})

const EV_META: Record<string,{label:string;color:string}> = {
  msg:{label:'MSG',color:'#3B82F6'}, message:{label:'MSG',color:'#3B82F6'},
  cmd:{label:'CMD',color:'#8B5CF6'}, command:{label:'CMD',color:'#8B5CF6'},
  join:{label:'JOIN',color:'#10B981'}, lvl:{label:'LVL',color:'#F97316'},
  conn:{label:'SYS',color:'#06B6D4'}, ban:{label:'BAN',color:'#EF4444'},
  kick:{label:'KICK',color:'#F87171'}, error:{label:'ERR',color:'#EF4444'},
}
const evMeta = (t: string) => EV_META[t] ?? {label:t.slice(0,4).toUpperCase(),color:'#71717A'}

/* ── Anime silhouette ────────────────────────────────────── */
function AnimeSilhouette({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size*1.3)} viewBox="0 0 48 62"
      fill="currentColor" style={{ color:'rgba(245,158,11,.12)', display:'block', margin:'0 auto 4px' }}>
      <ellipse cx="24" cy="12" rx="9" ry="10"/>
      <path d="M15 8 L8 1 L17 6Z"/><path d="M33 8 L40 1 L31 6Z"/>
      <path d="M11 29 Q11 23 24 21 Q37 23 37 29 L39 54 L9 54Z"/>
      <path d="M11 29 L3 43 L8 45 L14 33Z"/><path d="M37 29 L45 43 L40 45 L34 33Z"/>
      <path d="M15 52 L13 62 L19 62 L21 52Z"/><path d="M33 52 L35 62 L29 62 L27 52Z"/>
    </svg>
  )
}

/* ── Metric card ─────────────────────────────────────────── */
const METRICS = [
  { icon:Users,         label:'Usuarios',  key:'users',         color:'#F59E0B', gradient:'linear-gradient(135deg,rgba(245,158,11,.16),rgba(245,158,11,.04))', glow:'rgba(245,158,11,.28)' },
  { icon:MessageSquare, label:'Grupos',    key:'groups',        color:'#EC4899', gradient:'linear-gradient(135deg,rgba(236,72,153,.16),rgba(236,72,153,.04))', glow:'rgba(236,72,153,.28)' },
  { icon:Zap,           label:'Cmds hoy', key:'commandsToday', color:'#8B5CF6', gradient:'linear-gradient(135deg,rgba(139,92,246,.16),rgba(139,92,246,.04))', glow:'rgba(139,92,246,.28)' },
  { icon:Activity,      label:'Mensajes',  key:'messages',      color:'#06B6D4', gradient:'linear-gradient(135deg,rgba(6,182,212,.16),rgba(6,182,212,.04))',   glow:'rgba(6,182,212,.28)'  },
  { icon:Shield,        label:'Eventos',   key:'_events',       color:'#10B981', gradient:'linear-gradient(135deg,rgba(16,185,129,.16),rgba(16,185,129,.04))', glow:'rgba(16,185,129,.28)' },
  { icon:Clock,         label:'Uptime',    key:'_uptime',       color:'#F97316', gradient:'linear-gradient(135deg,rgba(249,115,22,.16),rgba(249,115,22,.04))', glow:'rgba(249,115,22,.28)' },
]

function MetricCard({ icon:Icon, label, value, sub, delay=0, color, gradient, glow }: {
  icon:React.ElementType; label:string; value:number; sub?:string;
  delay?:number; color:string; gradient:string; glow:string
}) {
  const n = useCounter(value)
  return (
    <motion.div
      initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }}
      transition={{ delay:delay/1000, duration:.38, ease:[.16,1,.3,1] }}
      whileHover={{ y:-3, boxShadow:`0 0 30px ${glow}, 0 8px 30px rgba(0,0,0,.35)` } as never}
      style={{
        borderRadius:13, padding:'16px 18px', position:'relative', overflow:'hidden',
        background:gradient, border:`1px solid ${color}30`,
        boxShadow:`0 0 18px ${glow}`, cursor:'default',
        transition:'box-shadow .22s, transform .22s',
      }}
    >
      {/* Corner glow */}
      <div style={{ position:'absolute', top:-20, right:-20, width:70, height:70, borderRadius:'50%', background:`${color}10`, filter:'blur(20px)', pointerEvents:'none' }}/>
      {/* Bottom accent line */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color}60,transparent)` }}/>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <span style={{ fontSize:9, fontWeight:700, color, opacity:.75, textTransform:'uppercase', letterSpacing:'.08em' }}>{label}</span>
        <div style={{
          width:32, height:32, borderRadius:9, flexShrink:0,
          background:color+'18', border:`1px solid ${color}32`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 12px ${glow}`,
        }}>
          <Icon size={14} color={color} strokeWidth={2.2}/>
        </div>
      </div>

      <div style={{
        fontSize:30, fontWeight:800, letterSpacing:'-0.04em',
        lineHeight:1, color:'#F1F1F3', fontFamily:"'Noto Serif JP',serif",
      }}>
        {sub ?? fmtNum(n)}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:6 }}>
        <TrendingUp size={9} color={color} style={{ opacity:.55 }}/>
        <span style={{ fontSize:9, color, opacity:.5, fontWeight:600 }}>activo</span>
      </div>
    </motion.div>
  )
}

/* ── Bar chart ───────────────────────────────────────────── */
const BAR_COLORS = ['#F59E0B','#EC4899','#8B5CF6','#3B82F6','#10B981','#F97316','#06B6D4']

function BarChart({ data }: { data:{ label:string; value:number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, height:'100%' }}>
      <div style={{ display:'flex', alignItems:'flex-end', gap:6, flex:1, minHeight:90 }}>
        {data.map((d, i) => {
          const h = Math.max((d.value / max) * 100, d.value > 0 ? 8 : 2)
          const color = BAR_COLORS[i % 7]
          return (
            <div key={i} title={`${d.label}: ${d.value}`}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, height:'100%', justifyContent:'flex-end', cursor:'default' }}
              onMouseEnter={e => { const b = e.currentTarget.querySelector('.bar') as HTMLDivElement; if (b) b.style.filter='brightness(1.35)' }}
              onMouseLeave={e => { const b = e.currentTarget.querySelector('.bar') as HTMLDivElement; if (b) b.style.filter='' }}
            >
              {d.value > 0 && (
                <span style={{ fontSize:9, fontWeight:700, color, letterSpacing:'-0.02em' }}>{d.value}</span>
              )}
              <motion.div className="bar"
                initial={{ height:'2%' }} animate={{ height:h+'%' }}
                transition={{ duration:.65, ease:[.4,0,.2,1], delay:i*.06 }}
                style={{
                  width:'100%', maxWidth:28, borderRadius:'4px 4px 0 0',
                  background:`linear-gradient(180deg,${color},${color}55)`,
                  border:`1px solid ${color}50`, boxShadow:`0 0 10px ${color}25`,
                  transition:'filter .18s',
                }}
              />
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {data.map(d => (
          <span key={d.label} style={{ flex:1, textAlign:'center', fontSize:9, color:'var(--text3)', fontWeight:600, letterSpacing:'.04em' }}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}

/* ── Activity heatmap ────────────────────────────────────── */
function ActivityHeatmap({ events }: { events:ActivityEvent[] }) {
  const dateMap: Record<string,number> = {}
  for (const ev of events) { const d=new Date(ev.ts).toISOString().split('T')[0]; dateMap[d]=(dateMap[d]||0)+1 }
  const cells: { date:string; count:number }[] = []
  const today = new Date()
  for (let i=83; i>=0; i--) {
    const d = new Date(today); d.setDate(d.getDate()-i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date:key, count:dateMap[key]||0 })
  }
  const maxCount  = Math.max(...cells.map(c => c.count), 1)
  const totalEvs  = cells.reduce((s,c) => s+c.count, 0)
  const activeDays= cells.filter(c => c.count > 0).length
  const DAYS = ['L','M','X','J','V','S','D']

  return (
    <div className="card" style={{ padding:'15px 17px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:13 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'rgba(245,158,11,.10)', border:'1px solid rgba(245,158,11,.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BarChart2 size={13} color="#F59E0B"/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Serif JP',serif" }}>Actividad · 12 semanas</span>
        </div>
        <div style={{ display:'flex', gap:16 }}>
          {[
            { val:totalEvs,   label:'eventos', color:'#F59E0B' },
            { val:activeDays, label:'días act.', color:'#EC4899' },
          ].map(s => (
            <div key={s.label} style={{ textAlign:'right' }}>
              <div style={{ fontSize:17, fontWeight:800, color:s.color, letterSpacing:'-0.03em', lineHeight:1 }}>{s.val}</div>
              <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', gap:5, overflowX:'auto', paddingBottom:2 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:3, flexShrink:0, paddingTop:1 }}>
          {DAYS.map(d => <div key={d} style={{ height:11, fontSize:8, color:'var(--text3)', fontWeight:600, width:10, textAlign:'center', lineHeight:'11px' }}>{d}</div>)}
        </div>
        <div className="heatmap-grid" style={{ flexShrink:0 }}>
          {cells.map((c, i) => {
            const intensity = c.count===0?0:Math.max(.2,c.count/maxCount)
            const bg = c.count===0?'rgba(255,255,255,.04)':i%3===0?`rgba(236,72,153,${intensity})`:`rgba(245,158,11,${intensity})`
            return <div key={i} className="heatmap-cell" title={`${c.date}: ${c.count}`} style={{ background:bg, border:`1px solid ${c.count?bg:'rgba(255,255,255,.04)'}` }}/>
          })}
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:3, marginTop:9, justifyContent:'flex-end' }}>
        <span style={{ fontSize:8, color:'var(--text3)', marginRight:3 }}>Menos</span>
        {[0,.2,.42,.66,1].map((op,i) => (
          <div key={i} style={{ width:9, height:9, borderRadius:2, background:op===0?'rgba(255,255,255,.04)':i%2===0?`rgba(245,158,11,${op})`:`rgba(236,72,153,${op})` }}/>
        ))}
        <span style={{ fontSize:8, color:'var(--text3)', marginLeft:3 }}>Más</span>
      </div>
    </div>
  )
}

/* ── Health bar ──────────────────────────────────────────── */
function HealthBar({ label, val, max, color }: { label:string; val:number; max:number; color:string }) {
  const pct = max===0?0:Math.min((val/max)*100,100)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:11, fontWeight:500, color:'var(--text2)' }}>{label}</span>
        <span style={{ fontSize:12, fontWeight:700, color, letterSpacing:'-0.02em' }}>{val.toLocaleString()}</span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,.06)', borderRadius:3, overflow:'hidden' }}>
        <motion.div initial={{ width:0 }} animate={{ width:pct+'%' }}
          transition={{ duration:.9, ease:[.4,0,.2,1] }}
          style={{ height:'100%', background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:3, boxShadow:`0 0 8px ${color}50` }}/>
      </div>
    </div>
  )
}

/* ── Leaderboard row ─────────────────────────────────────── */
function LbRow({ user, pos, color, valKey }: { user:User; pos:number; color:string; valKey:'xp'|'commands' }) {
  const val = (user[valKey] ?? 0) as number
  const name = user.name || user.jid.split('@')[0]
  const initial = name.slice(0,2).toUpperCase()
  const posEl = pos===1
    ? <Crown size={11} color="#FBBF24"/>
    : pos===2 ? <Star size={10} color="#94A3B8"/>
    : pos===3 ? <Star size={10} color="#CD7F32"/>
    : <span style={{ fontSize:10, color:'var(--text3)', fontWeight:600 }}>{pos}</span>

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:9, padding:'8px 14px',
      borderBottom:'1px solid var(--border)', transition:'background .14s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background='var(--card-hover)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background='' }}
    >
      <div style={{ width:22, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{posEl}</div>
      <div style={{
        width:26, height:26, borderRadius:8, flexShrink:0,
        background:color+'12', border:`1px solid ${color}28`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:9, fontWeight:800, color, letterSpacing:'-.01em',
      }}>
        {initial}
      </div>
      <span style={{ flex:1, fontSize:12, fontWeight:500, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {name.length>16?name.slice(0,15)+'…':name}
      </span>
      <span style={{ fontSize:12, fontWeight:700, color, letterSpacing:'-0.02em', flexShrink:0 }}>
        {val >= 1000 ? (val/1000).toFixed(1)+'K' : val}
      </span>
    </div>
  )
}

/* ══ MAIN ═════════════════════════════════════════════════════ */
export default function Overview() {
  const [status, setStatus] = useState<BotStatus|null>(null)
  const [stats,  setStats]  = useState<BotStats|null>(null)
  const [users,  setUsers]  = useState<User[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading,setLoading]= useState(true)
  const [ref,    setRef]    = useState(false)

  const load = async (r = false) => {
    if (!isConfigured()) { setLoading(false); return }
    if (r) setRef(true)
    try {
      const [s,st,u,ev] = await Promise.allSettled([getStatus(),getStats(),getUsers(),getActivityHistory()])
      if (s.status==='fulfilled')  setStatus(s.value)
      if (st.status==='fulfilled') setStats(st.value)
      if (u.status==='fulfilled')  setUsers(u.value)
      if (ev.status==='fulfilled') setEvents(ev.value)
    } catch {}
    setLoading(false); setRef(false)
  }
  useEffect(() => { load(); const id=setInterval(load,20000); return()=>clearInterval(id) }, [])

  if (!isConfigured()) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
      <div className="card animate-scale-in" style={{ padding:36, textAlign:'center', maxWidth:380, width:'100%', borderRadius:16 }}>
        <AnimeSilhouette size={56}/>
        <AlertCircle size={24} color="#EC4899" style={{ margin:'10px auto 16px' }}/>
        <p style={{ fontSize:15, fontWeight:700, marginBottom:8, fontFamily:"'Noto Serif JP',serif" }}>Sin configurar</p>
        <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.8 }}>
          Agrega <code style={{ background:'rgba(236,72,153,.12)', border:'1px solid rgba(236,72,153,.22)', borderRadius:4, padding:'1px 6px', color:'#F9A8D4', fontSize:11 }}>VITE_API_URL</code> en las variables de entorno.
        </p>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div className="skeleton" style={{ height:56, borderRadius:11 }}/>
      <div className="grid-metrics">{[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{ height:100 }}/>)}</div>
      <div className="skeleton" style={{ height:140 }}/>
      <div className="grid-duo"><div className="skeleton" style={{ height:200 }}/><div className="skeleton" style={{ height:200 }}/></div>
      <div className="grid-trio">{[...Array(3)].map((_,i)=><div key={i} className="skeleton" style={{ height:210 }}/>)}</div>
    </div>
  )

  const connected  = status?.connected ?? false
  const uptimeSecs = stats?.uptime ?? 0
  const topUsers   = [...users].sort((a,b)=>(b.xp||0)-(a.xp||0)).slice(0,6)
  const topCmds    = [...users].sort((a,b)=>(b.commands||0)-(a.commands||0)).slice(0,6)
  const recentEvs  = events.slice(0,14)

  const evCounts: Record<string,number> = {}
  for (const ev of events.slice(0,150)) evCounts[ev.type]=(evCounts[ev.type]||0)+1

  const chartData = [
    { label:'MSG',  value:evCounts['message']||evCounts['msg']||0 },
    { label:'CMD',  value:evCounts['command']||evCounts['cmd']||0 },
    { label:'JOIN', value:evCounts['join']||0 },
    { label:'BAN',  value:evCounts['ban']||0 },
    { label:'KICK', value:evCounts['kick']||0 },
    { label:'LVL',  value:evCounts['lvl']||0 },
    { label:'ERR',  value:evCounts['error']||0 },
  ]

  const metricValues: Record<string,number> = {
    users:stats?.users??0, groups:stats?.groups??0,
    commandsToday:stats?.commandsToday??0, messages:stats?.messages??0,
    _events:events.length, _uptime:uptimeSecs,
  }

  const bdr = '1px solid var(--border)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── Status banner ── */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        style={{
          borderRadius:13, padding:'13px 18px',
          background:connected?'rgba(16,185,129,.06)':'rgba(236,72,153,.06)',
          border:`1px solid ${connected?'rgba(16,185,129,.22)':'rgba(236,72,153,.22)'}`,
          display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
          boxShadow:connected?'0 0 24px rgba(16,185,129,.10)':'0 0 24px rgba(236,72,153,.10)',
        }}>
        {/* Pulse dot */}
        <div style={{ position:'relative', width:10, height:10, flexShrink:0 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background:connected?'#10B981':'#EC4899' }}/>
          {connected && <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'#10B981', animation:'pulseRing 1.8s ease-out infinite' }}/>}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <span style={{ fontSize:14, fontWeight:700, color:connected?'#10B981':'#F9A8D4', fontFamily:"'Noto Serif JP',serif" }}>
            {connected?'Bot en línea — Activo':'Bot desconectado'}
          </span>
          <span style={{ fontSize:11, color:'var(--text3)', marginLeft:10 }}>
            · Uptime: <strong style={{ color:'var(--text2)' }}>{fmtUp(uptimeSecs)}</strong>
            {stats && <> · <strong style={{ color:'var(--text2)' }}>{stats.users}</strong> usuarios · <strong style={{ color:'var(--text2)' }}>{stats.groups}</strong> grupos</>}
          </span>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={ref}>
          <RefreshCw size={11} style={{ animation:ref?'spin 1s linear infinite':'none' }}/>
          Actualizar
        </button>
      </motion.div>

      {/* ── Metric cards ── */}
      <div className="aurora-wrap" style={{ position:'relative' }}>
        <div className="grid-metrics" style={{ position:'relative', zIndex:1 }}>
          {METRICS.map((m,i) => (
            <MetricCard key={m.key}
              icon={m.icon} label={m.label}
              value={metricValues[m.key]??0}
              sub={m.key==='_uptime'?fmtUp(uptimeSecs):undefined}
              delay={i*50} color={m.color} gradient={m.gradient} glow={m.glow}/>
          ))}
        </div>
      </div>

      {/* ── Heatmap ── */}
      <ActivityHeatmap events={events}/>

      {/* ── Chart + Live log ── */}
      <div className="grid-duo">
        {/* Bar chart */}
        <div className="card" style={{ padding:'15px 17px', display:'flex', flexDirection:'column', borderRadius:13 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:14 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(236,72,153,.10)', border:'1px solid rgba(236,72,153,.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BarChart2 size={13} color="#EC4899"/>
            </div>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Serif JP',serif" }}>Tipos de eventos</span>
          </div>
          <div style={{ flex:1, minHeight:110 }}>
            <BarChart data={chartData}/>
          </div>
        </div>

        {/* Live log */}
        <div className="card" style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRadius:13 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 15px', borderBottom:bdr, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'rgba(16,185,129,.10)', border:'1px solid rgba(16,185,129,.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Activity size={13} color="#10B981"/>
              </div>
              <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Serif JP',serif" }}>Log en vivo</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:'rgba(16,185,129,.06)', border:'1px solid rgba(16,185,129,.18)' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#10B981', animation:'livePulse 1.8s ease-in-out infinite' }}/>
              <span style={{ fontSize:9, color:'#10B981', fontWeight:700, letterSpacing:'.06em' }}>LIVE</span>
            </div>
          </div>
          <div style={{ flex:1, overflowY:'auto', maxHeight:220 }}>
            <AnimatePresence initial={false}>
              {recentEvs.length===0
                ? (<div className="empty-state"><AnimeSilhouette size={36}/><div className="empty-state-title">Sin eventos aún</div></div>)
                : recentEvs.map((ev,i) => {
                  const m = evMeta(ev.type)
                  const d = ev.data as Record<string,string>|null
                  return (
                    <motion.div key={ev.id??i}
                      initial={{ opacity:0, x:6 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay:i*.015 }}
                      className="event-entry">
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:`${m.color}14`, border:`1px solid ${m.color}22`, color:m.color, flexShrink:0, marginTop:1 }}>{m.label}</span>
                      <div className="event-text">
                        {d?.sender && <span style={{ color:'var(--text)', fontWeight:500 }}>{d.sender}</span>}
                        {d?.cmd    && <span style={{ color:'var(--text3)' }}> › {d.cmd}</span>}
                        {!d?.sender&&!d?.cmd&&<span>{ev.type}</span>}
                      </div>
                      <span className="event-time">{fmtTs(ev.ts)}</span>
                    </motion.div>
                  )
                })
              }
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Leaderboards + System ── */}
      <div className="grid-trio">

        {/* XP ranking */}
        <div className="card" style={{ display:'flex', flexDirection:'column', borderRadius:13 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'12px 15px', borderBottom:bdr }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(245,158,11,.12)', border:'1px solid rgba(245,158,11,.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 10px rgba(245,158,11,.20)' }}>
              <Award size={13} color="#F59E0B"/>
            </div>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Serif JP',serif" }}>Ranking XP</span>
          </div>
          {topUsers.length===0
            ? (<div className="empty-state" style={{ padding:'24px 12px' }}><AnimeSilhouette size={36}/><div className="empty-state-title">Sin hunters</div></div>)
            : topUsers.map((u,i) => <LbRow key={u.jid} user={u} pos={i+1} color="#F59E0B" valKey="xp"/>)
          }
        </div>

        {/* Cmds ranking */}
        <div className="card" style={{ display:'flex', flexDirection:'column', borderRadius:13 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'12px 15px', borderBottom:bdr }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(236,72,153,.12)', border:'1px solid rgba(236,72,153,.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 10px rgba(236,72,153,.18)' }}>
              <Zap size={13} color="#EC4899"/>
            </div>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Serif JP',serif" }}>Ranking Cmds</span>
          </div>
          {topCmds.length===0
            ? (<div className="empty-state" style={{ padding:'24px 12px' }}><AnimeSilhouette size={36}/><div className="empty-state-title">Sin datos</div></div>)
            : topCmds.map((u,i) => <LbRow key={u.jid} user={u} pos={i+1} color="#EC4899" valKey="commands"/>)
          }
        </div>

        {/* System stats */}
        <div className="card" style={{ display:'flex', flexDirection:'column', borderRadius:13 }}>
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'12px 15px', borderBottom:bdr }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 10px rgba(139,92,246,.18)' }}>
              <Shield size={13} color="#8B5CF6"/>
            </div>
            <span style={{ fontSize:13, fontWeight:700, fontFamily:"'Noto Serif JP',serif" }}>Sistema</span>
          </div>
          <div style={{ padding:'15px 15px 10px', flex:1 }}>
            {stats ? (
              <>
                <HealthBar label="Usuarios"  val={stats.users??0}         max={Math.max(stats.users??0,500)}          color="#F59E0B"/>
                <HealthBar label="Grupos"    val={stats.groups??0}        max={Math.max(stats.groups??0,100)}         color="#EC4899"/>
                <HealthBar label="Mensajes"  val={stats.messages??0}      max={Math.max(stats.messages??0,10000)}     color="#3B82F6"/>
                <HealthBar label="Cmds hoy"  val={stats.commandsToday??0} max={Math.max(stats.commandsToday??0,300)}  color="#8B5CF6"/>
              </>
            ) : (
              <div className="empty-state" style={{ padding:'24px 12px' }}><AnimeSilhouette size={36}/><div className="empty-state-title">Sin datos</div></div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height:4 }}/>
    </div>
  )
}
