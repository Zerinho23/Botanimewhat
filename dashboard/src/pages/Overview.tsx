import { useEffect, useState, useRef } from 'react'
import {
  RefreshCw, Users, MessageSquare, Activity, Zap,
  Shield, Clock, Award, BarChart2, AlertCircle
} from 'lucide-react'
import {
  getStatus, getStats, getUsers, getActivityHistory, isConfigured,
  type BotStats, type BotStatus, type User, type ActivityEvent
} from '../api'

// ── Helpers ──────────────────────────────────────────────────────────────────
function useCounter(target: number, dur = 900) {
  const [v, setV] = useState(0); const r = useRef<ReturnType<typeof setInterval>|null>(null)
  useEffect(() => {
    if (r.current) clearInterval(r.current)
    if (target === 0) { setV(0); return }
    const t0 = Date.now()
    r.current = setInterval(() => {
      const p = Math.min((Date.now()-t0)/dur,1); setV(Math.round(target*(1-Math.pow(1-p,3))))
      if (p>=1) { clearInterval(r.current!); setV(target) }
    }, 16)
    return () => { if (r.current) clearInterval(r.current) }
  }, [target])
  return v
}
const fmtUp = (s: number) => { const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60); if(d>0)return d+'d '+h+'h'; if(h>0)return h+'h '+m+'m'; return m+'m' }
const getRank = (n: number, t: number[]) => { const R=['E','D','C','B','A','S'] as const; let i=0; for(let x=0;x<t.length;x++) if(n>=t[x]) i=x+1; return R[Math.min(i,R.length-1)] }

// ── AnimeFLEX-style metric card ───────────────────────────────────────────────
// Corner brackets + colored left border + bracket label + big number
function MetricCard({ icon: Icon, label, value, color, glow, rank, delay=0 }: {
  icon: React.ElementType; label: string; value: number
  color: string; glow: string; rank?: string; delay?: number
}) {
  const n = useCounter(value)
  const [hov, setHov] = useState(false)
  const R_COLORS: Record<string,string> = { S:'#fde047',A:'#c084fc',B:'#6688ff',C:'#00ff88',D:'#94a3b8',E:'#64748b' }
  const rc = rank ? R_COLORS[rank] : null

  return (
    <div
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        position:'relative', borderRadius:4, padding:'18px 18px 14px',
        /* Colored left border — the main visual cue */
        borderLeft: `3px solid ${color}`,
        borderTop: `1px solid ${hov ? color+'50' : color+'20'}`,
        borderRight: `1px solid rgba(30,58,255,0.12)`,
        borderBottom: `1px solid rgba(30,58,255,0.12)`,
        /* Tinted background matching the color */
        background: `linear-gradient(135deg, ${glow} 0%, rgba(5,8,16,0.97) 50%)`,
        boxShadow: hov ? `0 6px 30px rgba(0,0,0,0.5), 0 0 20px ${glow}` : `0 4px 20px rgba(0,0,0,0.4)`,
        transform: hov ? 'translateY(-3px)' : 'none',
        transition: 'all .20s cubic-bezier(.4,0,.2,1)',
        animation: `fadeUp .35s ease ${delay}ms both`,
        overflow: 'hidden',
      }}
    >
      {/* AnimeFLEX-style corner brackets */}
      <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:`2px solid ${color}`,borderLeft:`2px solid ${color}`,boxShadow:`-1px -1px 5px ${glow}` }}/>
      <div style={{ position:'absolute',bottom:-1,right:-1,width:12,height:12,borderBottom:`2px solid ${color}80`,borderRight:`2px solid ${color}80` }}/>

      {/* Background radial */}
      <div style={{ position:'absolute',top:-20,left:-10,width:100,height:100,background:`radial-gradient(circle,${glow},transparent 65%)`,pointerEvents:'none' }}/>

      {/* Header row */}
      <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14 }}>
        <div style={{
          width:40,height:40,borderRadius:4,flexShrink:0,
          background:`${color}18`, border:`1px solid ${color}45`,
          display:'flex',alignItems:'center',justifyContent:'center',
          boxShadow:`0 0 16px ${glow}`,
        }}>
          <Icon size={17} color={color} strokeWidth={1.8}/>
        </div>
        {rank && rc && (
          <div style={{
            fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:900,letterSpacing:'.14em',
            padding:'2px 8px',borderRadius:3,border:`1px solid ${rc}60`,
            background:`${rc}14`,color:rc,
          }}>{rank}</div>
        )}
      </div>

      {/* Big number */}
      <div style={{
        fontFamily:"'Orbitron',monospace", fontSize:38, fontWeight:900, lineHeight:1,
        color, textShadow:`0 0 18px ${color}80, 0 0 35px ${color}25`,
        letterSpacing:'-.02em',
      }}>{n.toLocaleString()}</div>

      {/* Bracket label — AnimeFLEX style */}
      <div style={{
        fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:600,
        letterSpacing:'.16em', color:'rgba(68,102,255,0.40)', marginTop:10,
        textTransform:'uppercase',
      }}>/// {label}</div>
    </div>
  )
}

// ── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({ data }: { data:{label:string;value:number;color:string}[] }) {
  const max = Math.max(...data.map(d=>d.value), 1)
  return (
    <div style={{ display:'flex',alignItems:'flex-end',gap:8,height:88,padding:'0 2px' }}>
      {data.map((d,i) => {
        const h = Math.max((d.value/max)*100, d.value>0 ? 8 : 4)
        return (
          <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5,height:'100%',justifyContent:'flex-end' }}>
            {d.value>0 && <span style={{ fontSize:10,color:d.color,fontFamily:"'Orbitron',monospace",fontWeight:700,textShadow:`0 0 8px ${d.color}` }}>{d.value}</span>}
            <div style={{
              width:'100%',borderRadius:'2px 2px 0 0',height:h+'%',
              background:d.value>0?`linear-gradient(to top,${d.color},${d.color}70)`:'rgba(30,58,255,0.04)',
              boxShadow:d.value>0?`0 0 10px ${d.color}50`:' none',
              transition:'height .7s cubic-bezier(.4,0,.2,1)',position:'relative',overflow:'hidden',
            }}>
              {d.value>0&&<div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)',animation:'shimmerFill 2.5s ease-in-out infinite' }}/>}
            </div>
            <span style={{ fontSize:8,color:'rgba(68,102,255,0.40)',fontFamily:"'JetBrains Mono',monospace",fontWeight:500,letterSpacing:'.06em' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Health bar (AnimeFLEX card style) ────────────────────────────────────────
function HealthBar({ label, val, max, color }: { label:string;val:number;max:number;color:string }) {
  const pct = max===0 ? 0 : Math.min((val/max)*100,100)
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:500,letterSpacing:'.12em',color:'rgba(68,102,255,0.45)' }}>{label}</span>
        <span style={{ fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:'#dde6ff' }}>
          {val.toLocaleString()} <span style={{ color:'rgba(30,58,255,0.35)',fontSize:9 }}>/ {max.toLocaleString()}</span>
        </span>
      </div>
      <div style={{ width:'100%',height:6,background:'rgba(30,58,255,0.07)',borderRadius:3,overflow:'hidden' }}>
        <div style={{
          width:pct+'%',height:'100%',borderRadius:3,
          background:`linear-gradient(90deg,${color},${color}99)`,
          boxShadow:`0 0 8px ${color}60`,
          transition:'width .8s cubic-bezier(.4,0,.2,1)',
          position:'relative',overflow:'hidden',
        }}>
          <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)',animation:'shimmerFill 2.5s ease-in-out infinite' }}/>
        </div>
      </div>
    </div>
  )
}

const EV_META: Record<string,{label:string;color:string}> = {
  msg:  {label:'MSG',color:'#1e3aff'},
  cmd:  {label:'CMD',color:'#8855ff'},
  mod:  {label:'MOD',color:'#ff3355'},
  join: {label:'JOIN',color:'#00ff88'},
  lvl:  {label:'LVL',color:'#ffaa00'},
  conn: {label:'SYS',color:'#0099ff'},
}
const evMeta=(t:string)=>EV_META[t]??{label:t.slice(0,4).toUpperCase(),color:'rgba(68,102,255,0.5)'}
const fmtTs=(ts:number)=>new Date(ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'})

// Card colors — AnimeFLEX aesthetic, blue palette
const CARD_COLORS = [
  { color:'#3b82f6', glow:'rgba(59,130,246,0.10)' },
  { color:'#8855ff', glow:'rgba(136,85,255,0.10)'  },
  { color:'#ffaa00', glow:'rgba(255,170,0,0.08)'   },
  { color:'#0099ff', glow:'rgba(0,153,255,0.08)'   },
  { color:'#00ff88', glow:'rgba(0,255,136,0.07)'   },
  { color:'#ff6600', glow:'rgba(255,102,0,0.08)'   },
]

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function Overview() {
  const [status,  setStatus]  = useState<BotStatus|null>(null)
  const [stats,   setStats]   = useState<BotStats|null>(null)
  const [users,   setUsers]   = useState<User[]>([])
  const [events,  setEvents]  = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [ref,     setRef]     = useState(false)

  const load = async (r=false) => {
    if (!isConfigured()) { setLoading(false); return }
    if (r) setRef(true)
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

  if (!isConfigured()) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:320 }}>
      <div style={{
        padding:0, maxWidth:380, width:'100%',
        background:'rgba(7,12,24,0.97)',
        border:'1px solid rgba(30,58,255,0.25)',
        borderLeft:'3px solid #ff3355', borderRadius:4,
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #ff3355',borderLeft:'2px solid #ff3355' }}/>
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderBottom:'1px solid rgba(30,58,255,0.12)',background:'rgba(255,51,85,0.07)' }}>
          <AlertCircle size={12} color="#ff3355"/>
          <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,letterSpacing:'.18em',color:'#ff3355' }}>[ SYSTEM ALERT ]</span>
        </div>
        <div style={{ padding:'20px 18px',fontSize:12,color:'rgba(136,152,204,0.8)',lineHeight:1.7 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",color:'rgba(30,58,255,0.5)' }}>{'>'}</span>
          {' '}Configura <span style={{ color:'#4466ff',fontFamily:"'JetBrains Mono',monospace" }}>VITE_API_URL</span> en Vercel → Settings → Environment Variables para activar el sistema.
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
      <div className="skeleton" style={{ height:56,borderRadius:4 }}/>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:14 }}>
        {[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{ height:130,borderRadius:4 }}/>)}
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
    {label:'MSG',value:evCounts['msg']||0,color:'#3b82f6'},
    {label:'CMD',value:evCounts['cmd']||0,color:'#8855ff'},
    {label:'MOD',value:evCounts['mod']||0,color:'#ff3355'},
    {label:'JOIN',value:evCounts['join']||0,color:'#00ff88'},
    {label:'LVL',value:evCounts['lvl']||0,color:'#ffaa00'},
    {label:'SYS',value:evCounts['conn']||0,color:'#0099ff'},
  ]

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:20 }} className="animate-fade-up">

      {/* ── AnimeFLEX-style page header ── */}
      <div style={{
        padding:'14px 20px', borderRadius:4,
        borderLeft:'3px solid #4466ff',
        border:'1px solid rgba(30,58,255,0.22)',
        background:'linear-gradient(90deg,rgba(30,58,255,0.12),rgba(5,8,16,0.96))',
        position:'relative', overflow:'hidden',
        display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,
        boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
      }}>
        {/* corner brackets */}
        <div style={{ position:'absolute',top:-1,left:-1,width:14,height:14,borderTop:'2px solid #4466ff',borderLeft:'2px solid #4466ff',boxShadow:'-1px -1px 6px rgba(68,102,255,0.4)' }}/>
        <div style={{ position:'absolute',bottom:-1,right:-1,width:14,height:14,borderBottom:'2px solid rgba(68,102,255,0.5)',borderRight:'2px solid rgba(68,102,255,0.5)' }}/>
        {/* Top accent */}
        <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#4466ff,#0099ffcc,transparent 60%)' }}/>

        <div>
          {/* [ SYSTEM ] header */}
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.18em',color:'rgba(68,102,255,0.45)',marginBottom:6 }}>
            [ SYSTEM ] /// STATUS WINDOW
          </div>
          <div style={{ fontFamily:"'Orbitron',monospace",fontSize:16,fontWeight:900,letterSpacing:'.10em',color:'#dde6ff',display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ color:'#4466ff',textShadow:'0 0 12px rgba(68,102,255,0.6)',fontSize:13 }}>◈</span>
            BOTANIME CORE
            <span style={{ color:'#4466ff',textShadow:'0 0 12px rgba(68,102,255,0.6)',fontSize:13 }}>◈</span>
          </div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:500,letterSpacing:'.14em',color:'rgba(68,102,255,0.35)',marginTop:6 }}>
            {'>'} HUNTER: BOTANIME · {connected?'ONLINE — AWAKENED':'OFFLINE'} · UPTIME {fmtUp(uptimeSecs)}
          </div>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          {connected
            ? <span className="rank rank-s" style={{ fontSize:10,letterSpacing:'.16em',animation:'sRankPulse 2s ease-in-out infinite' }}>◈ S-RANK</span>
            : <span className="rank rank-e">OFFLINE</span>
          }
          <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={ref} style={{ minWidth:34 }}>
            <RefreshCw size={12} style={{ animation:ref?'spin 1s linear infinite':'none' }}/>
          </button>
        </div>
      </div>

      {/* ── Metric cards ── */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:14 }}>
        <MetricCard icon={Users}        label="HUNTERS"      value={stats?.users??0}         color={CARD_COLORS[0].color} glow={CARD_COLORS[0].glow} rank={getRank(stats?.users??0,[10,25,50,100,250])} delay={0}  />
        <MetricCard icon={MessageSquare}label="GUILDS"       value={stats?.groups??0}        color={CARD_COLORS[1].color} glow={CARD_COLORS[1].glow} rank={getRank(stats?.groups??0,[5,10,20,50,100])} delay={60} />
        <MetricCard icon={Zap}          label="CMDS HOY"     value={stats?.commandsToday??0} color={CARD_COLORS[2].color} glow={CARD_COLORS[2].glow} rank={getRank(stats?.commandsToday??0,[10,30,60,150,300])} delay={120}/>
        <MetricCard icon={Activity}     label="MENSAJES"     value={stats?.messages??0}      color={CARD_COLORS[3].color} glow={CARD_COLORS[3].glow} rank={getRank(stats?.messages??0,[100,500,1000,5000,10000])} delay={180}/>
        <MetricCard icon={Shield}       label="EVENTOS"      value={events.length}           color={CARD_COLORS[4].color} glow={CARD_COLORS[4].glow} delay={240}/>
        <MetricCard icon={Clock}        label="UPTIME (seg)" value={uptimeSecs}              color={CARD_COLORS[5].color} glow={CARD_COLORS[5].glow} delay={300}/>
      </div>

      {/* ── Chart + Log ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:14 }}>

        {/* Activity chart */}
        <div style={{ background:'rgba(7,12,24,0.95)',border:'1px solid rgba(30,58,255,0.18)',borderLeft:'3px solid #3b82f6',borderRadius:4,padding:0,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #3b82f6',borderLeft:'2px solid #3b82f6',boxShadow:'-1px -1px 5px rgba(59,130,246,0.4)' }}/>
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderBottom:'1px solid rgba(30,58,255,0.12)',background:'rgba(59,130,246,0.07)' }}>
            <BarChart2 size={11} color="#3b82f6"/>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.16em',color:'#3b82f6' }}>[ ACTIVITY SCAN ]</span>
            <div style={{ marginLeft:'auto',display:'flex',gap:4 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'rgba(59,130,246,0.4)',boxShadow:'0 0 4px rgba(59,130,246,0.5)' }}/>)}
            </div>
          </div>
          <div style={{ padding:'16px 18px' }}>
            <BarChart data={chartData}/>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginTop:14 }}>
              {chartData.map(d=>(
                <span key={d.label} style={{ display:'flex',alignItems:'center',gap:4,fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:500,color:'rgba(68,102,255,0.50)',letterSpacing:'.06em' }}>
                  <span style={{ width:8,height:8,borderRadius:2,background:d.color,boxShadow:`0 0 5px ${d.color}`,flexShrink:0 }}/>
                  {d.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Event log */}
        <div style={{ background:'rgba(7,12,24,0.95)',border:'1px solid rgba(30,58,255,0.18)',borderLeft:'3px solid #8855ff',borderRadius:4,padding:0,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #8855ff',borderLeft:'2px solid #8855ff',boxShadow:'-1px -1px 5px rgba(136,85,255,0.4)' }}/>
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderBottom:'1px solid rgba(30,58,255,0.12)',background:'rgba(136,85,255,0.07)' }}>
            <Activity size={11} color="#8855ff"/>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.16em',color:'#8855ff' }}>[ EVENT LOG ]</span>
            <div style={{ marginLeft:'auto',display:'flex',gap:4 }}>
              {[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'rgba(136,85,255,0.4)',boxShadow:'0 0 4px rgba(136,85,255,0.5)' }}/>)}
            </div>
          </div>
          <div style={{ padding:'4px 14px 14px',maxHeight:270,overflowY:'auto' }}>
            {recentEvs.length===0
              ? <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:160,gap:6 }}>
                  <div style={{ fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,letterSpacing:'.18em',color:'rgba(30,58,255,0.25)' }}>SIN EVENTOS</div>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(30,58,255,0.18)' }}>// el log aparecerá aquí</div>
                </div>
              : recentEvs.map((ev,i)=>{
                  const m=evMeta(ev.type); const d=ev.data as Record<string,string>|null
                  return (
                    <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'8px 0',borderBottom:'1px solid rgba(30,58,255,0.06)' }}>
                      <div style={{ width:8,height:8,borderRadius:2,background:m.color,boxShadow:`0 0 6px ${m.color}`,flexShrink:0,marginTop:3 }}/>
                      <div style={{ flex:1,fontSize:12,color:'rgba(136,152,204,0.75)',lineHeight:1.5 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:7,fontWeight:600,letterSpacing:'.14em',color:m.color,background:`${m.color}14`,border:`1px solid ${m.color}35`,padding:'1px 6px',borderRadius:3,marginRight:8 }}>{m.label}</span>
                        {d?.sender&&<span style={{ color:'#dde6ff',fontWeight:600 }}>{d.sender}</span>}
                        {d?.cmd&&<span style={{ color:'rgba(68,102,255,0.55)' }}> › {d.cmd}</span>}
                        {d?.group&&<span style={{ color:'rgba(30,58,255,0.35)',fontSize:10 }}> [{d.group}]</span>}
                        {!d?.sender&&!d?.cmd&&<span style={{ color:'rgba(68,102,255,0.40)' }}>{ev.type}</span>}
                      </div>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(30,58,255,0.30)',flexShrink:0 }}>{fmtTs(ev.ts)}</span>
                    </div>
                  )
                })
            }
          </div>
        </div>
      </div>

      {/* ── Leaderboards + Health ── */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14 }}>

        {[
          { title:'[ XP RANKING ]',  icon:Award, color:'#ffaa00', data:topUsers, valFn:(u:User)=>u.xp??0 },
          { title:'[ CMD RANKING ]', icon:Zap,   color:'#8855ff', data:topCmds,  valFn:(u:User)=>u.commands??0 },
        ].map(({title,icon:Ico,color,data,valFn})=>(
          <div key={title} style={{ background:'rgba(7,12,24,0.95)',border:'1px solid rgba(30,58,255,0.18)',borderLeft:`3px solid ${color}`,borderRadius:4,position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:`2px solid ${color}`,borderLeft:`2px solid ${color}`,boxShadow:`-1px -1px 5px ${color}50` }}/>
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderBottom:'1px solid rgba(30,58,255,0.10)',background:`${color}09` }}>
              <Ico size={11} color={color}/>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.14em',color }}>{title}</span>
            </div>
            <div style={{ padding:'4px 0 10px' }}>
              {data.length===0
                ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:100,fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(30,58,255,0.25)' }}>// sin datos</div>
                : data.map((u,i)=>(
                  <div key={u.jid} style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:i===0?`${color}08`:'transparent',borderRadius:3,margin:'1px 6px',transition:'background .14s' }}>
                    <span style={{ fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:900,width:22,textAlign:'center',flexShrink:0,color:i===0?color:i===1?'rgba(148,163,184,0.7)':i===2?'#cd7f32':'rgba(30,58,255,0.25)',textShadow:i===0?`0 0 10px ${color}`:'none' }}>
                      {i===0?'◈':i+1}
                    </span>
                    <span style={{ flex:1,fontSize:13,fontWeight:500,color:'#dde6ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
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

        {/* System health */}
        <div style={{ background:'rgba(7,12,24,0.95)',border:'1px solid rgba(30,58,255,0.18)',borderLeft:'3px solid #00ff88',borderRadius:4,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #00ff88',borderLeft:'2px solid #00ff88',boxShadow:'-1px -1px 5px rgba(0,255,136,0.4)' }}/>
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderBottom:'1px solid rgba(30,58,255,0.10)',background:'rgba(0,255,136,0.07)' }}>
            <Shield size={11} color="#00ff88"/>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.14em',color:'#00ff88' }}>[ SYSTEM HEALTH ]</span>
          </div>
          <div style={{ padding:'16px 18px' }}>
            <HealthBar label="HUNTERS" val={stats?.users??0}         max={Math.max(500, stats?.users??0)}         color="#3b82f6"/>
            <HealthBar label="GUILDS"  val={stats?.groups??0}        max={Math.max(100, stats?.groups??0)}        color="#8855ff"/>
            <HealthBar label="CMDS"    val={stats?.commandsToday??0} max={Math.max(200, stats?.commandsToday??0)} color="#ffaa00"/>
            <HealthBar label="MSGS"    val={stats?.messages??0}      max={Math.max(5000,stats?.messages??0)}      color="#00ff88"/>
            <div style={{ display:'flex',justifyContent:'space-between',marginTop:14,paddingTop:12,borderTop:'1px solid rgba(30,58,255,0.08)' }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:500,letterSpacing:'.14em',color:'rgba(30,58,255,0.35)' }}>UPTIME</span>
              <span style={{ fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:connected?'#00ff88':'#ff3355',textShadow:connected?'0 0 8px rgba(0,255,136,0.5)':'none' }}>
                {fmtUp(uptimeSecs)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
