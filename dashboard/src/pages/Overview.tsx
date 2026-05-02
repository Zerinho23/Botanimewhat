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
  const ref = useRef<ReturnType<typeof setInterval>|null>(null)
  useEffect(() => {
    if (ref.current) clearInterval(ref.current)
    if (target === 0) { setVal(0); return }
    const start = Date.now()
    ref.current = setInterval(() => {
      const p = Math.min((Date.now()-start)/duration, 1)
      setVal(Math.round(target*(1-Math.pow(1-p,3))))
      if (p>=1) { clearInterval(ref.current!); setVal(target) }
    },16)
    return () => { if (ref.current) clearInterval(ref.current) }
  },[target])
  return val
}

function fmtUptime(s: number) {
  const d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60)
  if(d>0) return d+'d '+h+'h'; if(h>0) return h+'h '+m+'m'; return m+'m'
}

function getRank(n: number, t: number[]) {
  const R=['E','D','C','B','A','S'] as const; let i=0
  for(let x=0;x<t.length;x++) if(n>=t[x]) i=x+1
  return R[Math.min(i,R.length-1)]
}

// ── Premium Metric Card ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, rank, sub, delay=0 }: {
  icon: React.ElementType; label: string; value: number; color: string
  rank?: string; sub?: string; delay?: number
}) {
  const displayed = useCounter(value)
  const [hov, setHov] = useState(false)
  const R_STYLES: Record<string,{ bg:string;border:string;color:string }> = {
    S: { bg:'rgba(250,204,21,0.15)', border:'rgba(250,204,21,0.5)', color:'#fde047' },
    A: { bg:'rgba(168,85,247,0.12)', border:'rgba(168,85,247,0.45)', color:'#c084fc' },
    B: { bg:'rgba(59,130,246,0.10)', border:'rgba(59,130,246,0.40)', color:'#60a5fa' },
    C: { bg:'rgba(34,197,94,0.10)',  border:'rgba(34,197,94,0.40)',  color:'#4ade80' },
    D: { bg:'rgba(156,163,175,0.08)',border:'rgba(156,163,175,0.30)',color:'#9ca3af' },
    E: { bg:'rgba(75,85,99,0.08)',   border:'rgba(75,85,99,0.25)',   color:'#6b7280' },
  }
  const rs = rank ? R_STYLES[rank] : null

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: 12,
        padding: '22px 20px 18px',
        /* Colored left border — the most visible change */
        borderLeft: `4px solid ${color}`,
        borderTop: `1px solid ${color}30`,
        borderRight: `1px solid rgba(255,255,255,0.06)`,
        borderBottom: `1px solid rgba(255,255,255,0.06)`,
        /* Card-unique gradient background */
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 30%, rgba(5,13,26,0.95) 65%)`,
        boxShadow: hov
          ? `0 8px 40px rgba(0,0,0,0.5), 0 0 30px ${color}20, inset 0 1px 0 rgba(255,255,255,0.04)`
          : `0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
        transform: hov ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        transition: 'all .22s cubic-bezier(.4,0,.2,1)',
        animation: `fadeUp .4s ease ${delay}ms both`,
        cursor: 'default',
      }}
    >
      {/* Background shimmer glow */}
      <div style={{
        position:'absolute', top:-30, left:-20,
        width:120, height:120,
        background:`radial-gradient(circle, ${color}20, transparent 65%)`,
        pointerEvents:'none',
        transition: 'opacity .3s',
        opacity: hov ? 1 : 0.5,
      }}/>

      {/* Top row: icon + rank */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
        <div style={{
          width:46, height:46, borderRadius:12, flexShrink:0,
          background:`${color}20`,
          border:`2px solid ${color}50`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 0 20px ${color}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}>
          <Icon size={20} color={color} strokeWidth={1.8}/>
        </div>
        {rank && rs && (
          <div style={{
            padding:'3px 10px', borderRadius:6,
            background:rs.bg, border:`1px solid ${rs.border}`,
            fontFamily:"'Orbitron',monospace", fontSize:10, fontWeight:900,
            color:rs.color, letterSpacing:'.12em',
            boxShadow:`0 0 10px ${rs.border}`,
          }}>{rank}</div>
        )}
      </div>

      {/* Number — BIG */}
      <div style={{
        fontFamily:"'Orbitron',monospace", fontSize:40, fontWeight:900,
        lineHeight:1, color,
        textShadow:`0 0 20px ${color}80, 0 0 40px ${color}30`,
        letterSpacing:'-.02em',
      }}>{displayed.toLocaleString()}</div>

      {/* Label */}
      <div style={{
        fontFamily:"'Rajdhani',sans-serif", fontSize:11, fontWeight:700,
        letterSpacing:'.22em', color:'rgba(148,163,184,0.55)',
        marginTop:10, textTransform:'uppercase',
      }}>{label}</div>

      {sub && <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:'rgba(148,163,184,0.30)', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── Health bar ────────────────────────────────────────────────────────────────
function HealthBar({ label, val, max, color }: { label:string;val:number;max:number;color:string }) {
  const pct = max===0 ? 0 : Math.min((val/max)*100, 100)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
        <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:700,letterSpacing:'.1em',color:'rgba(148,163,184,0.6)' }}>{label}</span>
        <span style={{ fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:'#e2e8f0' }}>
          {val.toLocaleString()} <span style={{ color:'rgba(148,163,184,0.30)',fontSize:9 }}>/ {max.toLocaleString()}</span>
        </span>
      </div>
      <div style={{ width:'100%',height:7,background:'rgba(255,255,255,0.06)',borderRadius:4,overflow:'hidden' }}>
        <div style={{
          width:pct+'%', height:'100%', borderRadius:4,
          background:`linear-gradient(90deg,${color},${color}99)`,
          boxShadow:`0 0 10px ${color}60`,
          transition:'width .8s cubic-bezier(.4,0,.2,1)',
          position:'relative', overflow:'hidden',
        }}>
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)',animation:'shimmerFill 2.5s ease-in-out infinite' }}/>
        </div>
      </div>
    </div>
  )
}

// ── Mini chart ────────────────────────────────────────────────────────────────
function BarChart({ data }: { data:{ label:string;value:number;color:string }[] }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{ display:'flex',alignItems:'flex-end',gap:8,height:96,padding:'0 2px' }}>
      {data.map((d,i) => {
        const h = Math.max((d.value/max)*100, d.value>0 ? 10 : 5)
        return (
          <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5,height:'100%',justifyContent:'flex-end' }}>
            {d.value>0 && <span style={{ fontSize:10,color:d.color,fontFamily:"'Orbitron',monospace",fontWeight:700,textShadow:`0 0 8px ${d.color}` }}>{d.value}</span>}
            <div style={{
              width:'100%', borderRadius:'3px 3px 0 0', height:h+'%',
              background:d.value>0 ? `linear-gradient(to top,${d.color},${d.color}70)` : 'rgba(255,255,255,0.04)',
              boxShadow:d.value>0 ? `0 0 12px ${d.color}60` : 'none',
              transition:'height .7s cubic-bezier(.4,0,.2,1)',
              position:'relative', overflow:'hidden',
            }}>
              {d.value>0 && <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)',animation:'shimmerFill 2.5s ease-in-out infinite' }}/>}
            </div>
            <span style={{ fontSize:9,color:'rgba(148,163,184,0.45)',fontFamily:"'Rajdhani',sans-serif",fontWeight:700,letterSpacing:'.06em' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

const EV_META: Record<string,{label:string;color:string}> = {
  msg:  { label:'MSG',    color:'#3b82f6' },
  cmd:  { label:'CMD',    color:'#a855f7' },
  mod:  { label:'MOD',    color:'#ef4444' },
  join: { label:'JOIN',   color:'#22c55e' },
  lvl:  { label:'LVL',    color:'#f59e0b' },
  conn: { label:'SYS',    color:'#06b6d4' },
}
const evMeta = (t: string) => EV_META[t] ?? { label:t.slice(0,4).toUpperCase(), color:'rgba(148,163,184,0.5)' }
const fmtTs  = (ts: number) => new Date(ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'})

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function Overview() {
  const [status, setStatus] = useState<BotStatus|null>(null)
  const [stats,  setStats]  = useState<BotStats|null>(null)
  const [users,  setUsers]  = useState<User[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading,setLoading]= useState(true)
  const [refreshing,setRef] = useState(false)

  const load = async (r=false) => {
    if(!isConfigured()){ setLoading(false); return }
    if(r) setRef(true)
    try {
      const [s,st,u,ev] = await Promise.allSettled([getStatus(),getStats(),getUsers(),getActivityHistory()])
      if(s.status==='fulfilled')  setStatus(s.value)
      if(st.status==='fulfilled') setStats(st.value)
      if(u.status==='fulfilled')  setUsers(u.value)
      if(ev.status==='fulfilled') setEvents(ev.value)
    } catch{}
    setLoading(false); setRef(false)
  }

  useEffect(()=>{ load(); const id=setInterval(()=>load(),20000); return()=>clearInterval(id) },[])

  if(!isConfigured()) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:320 }}>
      <div className="card animate-scale-in" style={{ padding:32,textAlign:'center',maxWidth:360 }}>
        <div className="sys-header" style={{ margin:'-18px -18px 18px',borderRadius:'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <AlertCircle size={13} color="#f59e0b"/>
          <span className="sys-header-title" style={{ color:'#f59e0b' }}>SYSTEM ALERT</span>
        </div>
        <div style={{ fontSize:12,color:'var(--tx2)',lineHeight:1.7 }}>
          Configura <span style={{ color:'#3b82f6',fontFamily:"'JetBrains Mono',monospace" }}>VITE_API_URL</span> en Vercel → Settings → Environment Variables.
        </div>
      </div>
    </div>
  )

  if(loading) return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <div className="skeleton" style={{ height:60,borderRadius:10 }}/>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14 }}>
        {[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{ height:140,borderRadius:12 }}/>)}
      </div>
    </div>
  )

  const topUsers  = [...users].sort((a,b)=>(b.xp||0)-(a.xp||0)).slice(0,6)
  const topCmds   = [...users].sort((a,b)=>(b.commands||0)-(a.commands||0)).slice(0,6)
  const recentEvs = events.slice(0,12)
  const connected = status?.connected ?? false
  const uptimeSecs= stats?.uptime ?? 0

  const evCounts: Record<string,number>={}
  for(const ev of events.slice(0,100)) evCounts[ev.type]=(evCounts[ev.type]||0)+1
  const chartData=[
    {label:'MSG', value:evCounts['msg']||0,  color:'#3b82f6'},
    {label:'CMD', value:evCounts['cmd']||0,  color:'#a855f7'},
    {label:'MOD', value:evCounts['mod']||0,  color:'#ef4444'},
    {label:'JOIN',value:evCounts['join']||0, color:'#22c55e'},
    {label:'LVL', value:evCounts['lvl']||0,  color:'#f59e0b'},
    {label:'SYS', value:evCounts['conn']||0, color:'#06b6d4'},
  ]

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }} className="animate-fade-up">

      {/* ── Page header ── */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,
        padding:'16px 22px',
        borderRadius:12,
        background:'linear-gradient(135deg,rgba(59,130,246,0.12),rgba(5,13,26,0.95))',
        border:'1px solid rgba(59,130,246,0.25)',
        borderLeft:'4px solid #3b82f6',
        boxShadow:'0 4px 24px rgba(0,0,0,0.4)',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,#3b82f6,#06b6d4cc,transparent 60%)' }}/>
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace",fontSize:17,fontWeight:900,letterSpacing:'.10em',color:'#f1f5f9',display:'flex',alignItems:'center',gap:12 }}>
            <span style={{ color:'#06b6d4' }}>◈</span> STATUS WINDOW <span style={{ color:'#06b6d4' }}>◈</span>
          </div>
          <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:10,fontWeight:700,letterSpacing:'.16em',color:'rgba(148,163,184,0.50)',marginTop:6 }}>
            HUNTER: BOTANIME · {connected ? 'ONLINE — AWAKENED' : 'OFFLINE'} · UPTIME {fmtUptime(uptimeSecs)}
          </div>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          {connected
            ? <span className="rank rank-s" style={{ fontSize:10,padding:'4px 14px' }}>◈ S-RANK</span>
            : <span className="rank rank-e">OFFLINE</span>
          }
          <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing} style={{ minWidth:36 }}>
            <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }}/>
          </button>
        </div>
      </div>

      {/* ── 6 METRIC CARDS ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))',gap:14 }}>
        <StatCard icon={Users}        label="HUNTERS"      value={stats?.users??0}         color="#3b82f6" rank={getRank(stats?.users??0,[10,25,50,100,250])} sub="usuarios registrados" delay={0}  />
        <StatCard icon={MessageSquare}label="GUILDS"       value={stats?.groups??0}        color="#a855f7" rank={getRank(stats?.groups??0,[5,10,20,50,100])}  sub="grupos activos"       delay={60} />
        <StatCard icon={Zap}          label="CMDS HOY"     value={stats?.commandsToday??0} color="#f59e0b" rank={getRank(stats?.commandsToday??0,[10,30,60,150,300])} sub="comandos ejecutados" delay={120}/>
        <StatCard icon={Activity}     label="MENSAJES"     value={stats?.messages??0}      color="#06b6d4" rank={getRank(stats?.messages??0,[100,500,1000,5000,10000])} sub="mensajes procesados" delay={180}/>
        <StatCard icon={Shield}       label="EVENTOS"      value={events.length}           color="#22c55e"  sub="en historial"         delay={240}/>
        <StatCard icon={Clock}        label="UPTIME (seg)" value={uptimeSecs}              color="#f97316"  sub={fmtUptime(uptimeSecs)} delay={300}/>
      </div>

      {/* ── Chart + Log row ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:14 }}>
        <div className="card" style={{ padding:0 }}>
          <div className="sys-header">
            <BarChart2 size={12} color="#3b82f6"/>
            <span className="sys-header-title">ACTIVITY SCAN</span>
            <div className="sys-dots"><div className="sys-dot"/><div className="sys-dot"/><div className="sys-dot"/></div>
          </div>
          <div style={{ padding:'18px 20px' }}>
            <BarChart data={chartData}/>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginTop:14 }}>
              {chartData.map(d=>(
                <span key={d.label} style={{ display:'flex',alignItems:'center',gap:5,fontFamily:"'Rajdhani',sans-serif",fontSize:10,fontWeight:700,color:'rgba(148,163,184,0.55)',letterSpacing:'.08em' }}>
                  <span style={{ width:8,height:8,borderRadius:2,background:d.color,boxShadow:`0 0 6px ${d.color}`,flexShrink:0 }}/>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding:0 }}>
          <div className="sys-header">
            <Activity size={12} color="#a855f7"/>
            <span className="sys-header-title" style={{ color:'#a855f7' }}>EVENT LOG</span>
            <div className="sys-dots"><div className="sys-dot"/><div className="sys-dot"/><div className="sys-dot"/></div>
          </div>
          <div style={{ padding:'4px 14px 14px',maxHeight:280,overflowY:'auto' }}>
            {recentEvs.length===0 ? (
              <div className="empty-state" style={{ height:160 }}><div className="empty-state-title">SIN EVENTOS</div><div className="empty-state-sub">El log aparecerá aquí</div></div>
            ) : recentEvs.map((ev,i)=>{
              const m=evMeta(ev.type); const d=ev.data as Record<string,string>|null
              return (
                <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width:9,height:9,borderRadius:3,background:m.color,boxShadow:`0 0 8px ${m.color}`,flexShrink:0,marginTop:3 }}/>
                  <div style={{ flex:1,fontSize:12,color:'rgba(148,163,184,0.75)',lineHeight:1.5 }}>
                    <span style={{ fontFamily:"'Orbitron',monospace",fontSize:7,fontWeight:700,letterSpacing:'.14em',color:m.color,background:m.color+'18',border:`1px solid ${m.color}35`,padding:'1px 6px',borderRadius:3,marginRight:8 }}>{m.label}</span>
                    {d?.sender && <span style={{ color:'#e2e8f0',fontWeight:600 }}>{d.sender}</span>}
                    {d?.cmd    && <span style={{ color:'rgba(148,163,184,0.55)' }}> › {d.cmd}</span>}
                    {d?.group  && <span style={{ color:'rgba(148,163,184,0.35)',fontSize:10 }}> [{d.group}]</span>}
                    {!d?.sender&&!d?.cmd && <span style={{ color:'rgba(148,163,184,0.40)' }}>{ev.type}</span>}
                  </div>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(148,163,184,0.30)',flexShrink:0 }}>{fmtTs(ev.ts)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Leaderboards + Health ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14 }}>

        {[
          { title:'XP RANKING',   icon:Award,  color:'#f59e0b', data:topUsers,  valFn:(u:User)=>u.xp??0 },
          { title:'CMD RANKING',  icon:Zap,    color:'#a855f7', data:topCmds,   valFn:(u:User)=>u.commands??0 },
        ].map(({ title,icon:Ico,color,data,valFn }) => (
          <div key={title} className="card" style={{ padding:0 }}>
            <div className="sys-header" style={{ background:`linear-gradient(90deg,${color}14,transparent)` }}>
              <Ico size={12} color={color}/>
              <span className="sys-header-title" style={{ color,textShadow:`0 0 10px ${color}60` }}>{title}</span>
            </div>
            <div style={{ padding:'4px 0 10px' }}>
              {data.length===0
                ? <div className="empty-state" style={{ height:120 }}><div className="empty-state-sub">Sin datos</div></div>
                : data.map((u,i)=>(
                  <div key={u.jid} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'9px 16px',
                    background:i===0?`${color}09`:'transparent',
                    borderRadius:6,margin:'1px 6px',transition:'background .14s',
                  }}>
                    <span style={{
                      fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:900,
                      width:22,textAlign:'center',flexShrink:0,
                      color:i===0?color:i===1?'rgba(148,163,184,0.8)':i===2?'#cd7f32':'rgba(148,163,184,0.30)',
                      textShadow:i===0?`0 0 12px ${color}`:i<3?`0 0 6px rgba(148,163,184,0.3)`:'none',
                    }}>{i===0?'◈':i+1}</span>
                    <span style={{ flex:1,fontSize:13,fontWeight:500,color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {u.name||u.jid.split('@')[0]}
                    </span>
                    <span style={{ fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color,textShadow:`0 0 8px ${color}50` }}>
                      {valFn(u).toLocaleString()}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        ))}

        <div className="card" style={{ padding:0 }}>
          <div className="sys-header" style={{ background:'linear-gradient(90deg,rgba(34,197,94,0.12),transparent)' }}>
            <Shield size={12} color="#22c55e"/>
            <span className="sys-header-title" style={{ color:'#22c55e',textShadow:'0 0 10px rgba(34,197,94,0.6)' }}>SYSTEM HEALTH</span>
          </div>
          <div style={{ padding:'18px 20px' }}>
            <HealthBar label="HUNTERS"  val={stats?.users??0}         max={Math.max(500, stats?.users??0)}         color="#3b82f6"/>
            <HealthBar label="GUILDS"   val={stats?.groups??0}        max={Math.max(100, stats?.groups??0)}        color="#a855f7"/>
            <HealthBar label="CMDS"     val={stats?.commandsToday??0} max={Math.max(200, stats?.commandsToday??0)} color="#f59e0b"/>
            <HealthBar label="MSGS"     val={stats?.messages??0}      max={Math.max(5000,stats?.messages??0)}      color="#22c55e"/>
            <div style={{ display:'flex',justifyContent:'space-between',marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,color:'rgba(148,163,184,0.35)',letterSpacing:'.12em' }}>UPTIME</span>
              <span style={{ fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:connected?'#22c55e':'#ef4444',textShadow:connected?'0 0 10px rgba(34,197,94,0.5)':'none' }}>
                {fmtUptime(uptimeSecs)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
