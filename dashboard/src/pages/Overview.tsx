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

  const fmtUp = (s: number) => {
    const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60)
    if(d>0) return d+'d '+h+'h'; if(h>0) return h+'h '+m+'m'; return m+'m'
  }
  const getRank = (n: number, t: number[]) => {
    const R=['E','D','C','B','A','S'] as const; let i=0
    for(let x=0;x<t.length;x++) if(n>=t[x]) i=x+1
    return R[Math.min(i,R.length-1)]
  }

  // Each metric card keeps its own vivid color — structural elements are red
  const CARD_COLORS = [
    { color:'#3b82f6', glow:'rgba(59,130,246,0.13)'  },
    { color:'#8855ff', glow:'rgba(136,85,255,0.13)'  },
    { color:'#ffaa00', glow:'rgba(255,170,0,0.11)'   },
    { color:'#0099ff', glow:'rgba(0,153,255,0.11)'   },
    { color:'#00ff88', glow:'rgba(0,255,136,0.09)'   },
    { color:'#ff6600', glow:'rgba(255,102,0,0.11)'   },
  ]

  function MetricCard({ icon: Icon, label, value, color, glow, rank, sub, delay=0 }: {
    icon: React.ElementType; label: string; value: number
    color: string; glow: string; rank?: string; sub?: string; delay?: number
  }) {
    const n = useCounter(value)
    const [hov, setHov] = useState(false)
    const R_COLORS: Record<string,string> = { S:'#fde047',A:'#c084fc',B:'#ff4040',C:'#00ff88',D:'#94a3b8',E:'#64748b' }
    const rc = rank ? R_COLORS[rank] : null

    return (
      <div
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{
          position:'relative',borderRadius:4,padding:'18px 18px 16px',
          borderLeft:`3px solid ${color}`,
          borderTop:`1px solid ${hov?color+'50':color+'20'}`,
          borderRight:'1px solid rgba(196,26,26,0.10)',
          borderBottom:'1px solid rgba(196,26,26,0.10)',
          background:`linear-gradient(135deg,${glow} 0%,rgba(6,4,4,0.98) 55%)`,
          boxShadow:hov?`0 10px 38px rgba(0,0,0,0.60),0 0 28px ${glow},0 0 0 1px ${color}22`:'0 4px 22px rgba(0,0,0,0.45)',
          transform:hov?'translateY(-5px)':'none',
          transition:'all .22s cubic-bezier(.4,0,.2,1)',
          animation:`cardReveal .4s ease ${delay}ms both`,
          overflow:'hidden',
        }}
      >
        <div style={{ position:'absolute',top:-1,left:-1,width:13,height:13,borderTop:`2px solid ${color}`,borderLeft:`2px solid ${color}`,boxShadow:`-1px -1px 7px ${glow}` }}/>
        <div style={{ position:'absolute',bottom:-1,right:-1,width:13,height:13,borderBottom:`2px solid ${color}55`,borderRight:`2px solid ${color}55` }}/>
        <div style={{ position:'absolute',top:-22,left:-12,width:110,height:110,background:`radial-gradient(circle,${glow},transparent 68%)`,pointerEvents:'none' }}/>

        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14,position:'relative' }}>
          <div style={{
            width:40,height:40,borderRadius:4,flexShrink:0,
            background:`${color}18`,border:`1px solid ${color}45`,
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:`0 0 18px ${glow}`,
          }}>
            <Icon size={17} color={color} strokeWidth={1.8} style={{ filter:`drop-shadow(0 0 5px ${color})` }}/>
          </div>
          {rank&&rc&&(
            <div style={{
              fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:900,letterSpacing:'.14em',
              padding:'3px 9px',borderRadius:3,border:`1px solid ${rc}55`,
              background:`${rc}12`,color:rc,
              animation:rank==='S'?'sRankPulse 2.5s ease-in-out infinite':'none',
            }}>{rank}</div>
          )}
        </div>

        <div style={{
          fontFamily:"'Orbitron',monospace",fontSize:36,fontWeight:900,lineHeight:1,
          color,letterSpacing:'-.02em',
          textShadow:`0 0 22px ${color}80,0 0 44px ${color}22`,
        }}>{n.toLocaleString()}</div>

        <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:10 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:8,fontWeight:600,letterSpacing:'.16em',color:'rgba(196,26,26,0.38)',textTransform:'uppercase' }}>/// {label}</span>
          {sub&&<span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:7,color:'rgba(196,26,26,0.22)',marginLeft:'auto' }}>{sub}</span>}
        </div>
      </div>
    )
  }

  function BarChart({ data }: { data:{label:string;value:number;color:string}[] }) {
    const max = Math.max(...data.map(d=>d.value),1)
    return (
      <div style={{ display:'flex',alignItems:'flex-end',gap:8,height:90,padding:'0 2px' }}>
        {data.map((d,i)=>{
          const h = Math.max((d.value/max)*100,d.value>0?8:3)
          return (
            <div key={i} style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end' }}>
              {d.value>0&&<span style={{ fontSize:10,color:d.color,fontFamily:"'Orbitron',monospace",fontWeight:700,textShadow:`0 0 8px ${d.color}` }}>{d.value}</span>}
              <div style={{
                width:'100%',borderRadius:'2px 2px 0 0',height:h+'%',
                background:d.value>0?`linear-gradient(to top,${d.color},${d.color}70)`:'rgba(196,26,26,0.04)',
                boxShadow:d.value>0?`0 0 12px ${d.color}55`:'none',
                transition:'height .75s cubic-bezier(.4,0,.2,1)',position:'relative',overflow:'hidden',
              }}>
                {d.value>0&&<div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent)',animation:'shimmerFill 2.5s ease-in-out infinite' }}/>}
              </div>
              <span style={{ fontSize:8,color:'rgba(196,26,26,0.38)',fontFamily:"'JetBrains Mono',monospace",fontWeight:500,letterSpacing:'.06em' }}>{d.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  function HealthBar({ label, val, max, color }: { label:string;val:number;max:number;color:string }) {
    const pct = max===0?0:Math.min((val/max)*100,100)
    return (
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:500,letterSpacing:'.12em',color:'rgba(196,26,26,0.42)' }}>{label}</span>
          <span style={{ fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:'#f0e8e8' }}>
            {val.toLocaleString()} <span style={{ color:'rgba(196,26,26,0.32)',fontSize:9 }}>/ {max.toLocaleString()}</span>
          </span>
        </div>
        <div style={{ width:'100%',height:5,background:'rgba(196,26,26,0.07)',borderRadius:3,overflow:'hidden' }}>
          <div style={{ width:pct+'%',height:'100%',borderRadius:3,background:`linear-gradient(90deg,${color},${color}90)`,boxShadow:`0 0 10px ${color}55`,transition:'width .9s cubic-bezier(.4,0,.2,1)',position:'relative',overflow:'hidden' }}>
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)',animation:'shimmerFill 2.5s ease-in-out infinite' }}/>
          </div>
        </div>
      </div>
    )
  }

  const EV_META: Record<string,{label:string;color:string}> = {
    msg:  {label:'MSG', color:'#3b82f6'},
    cmd:  {label:'CMD', color:'#8855ff'},
    mod:  {label:'MOD', color:'#ff3355'},
    join: {label:'JOIN',color:'#00ff88'},
    lvl:  {label:'LVL', color:'#ffaa00'},
    conn: {label:'SYS', color:'#0099ff'},
  }
  const evMeta=(t:string)=>EV_META[t]??{label:t.slice(0,4).toUpperCase(),color:'rgba(196,26,26,0.5)'}
  const fmtTs=(ts:number)=>new Date(ts).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',second:'2-digit'})

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
        <div style={{ maxWidth:400,width:'100%',background:'rgba(10,6,6,0.98)',border:'1px solid rgba(196,26,26,0.22)',borderLeft:'3px solid #e02020',borderRadius:4,position:'relative',overflow:'hidden' }}>
          <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #e02020',borderLeft:'2px solid #e02020' }}/>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#e02020,transparent 50%)' }}/>
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(196,26,26,0.10)',background:'rgba(196,26,26,0.06)' }}>
            <AlertCircle size={12} color="#e02020" style={{ filter:'drop-shadow(0 0 4px #e02020)' }}/>
            <span style={{ fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,letterSpacing:'.18em',color:'#e02020' }}>[ SYSTEM ALERT ]</span>
          </div>
          <div style={{ padding:'22px 18px',fontSize:12,color:'rgba(158,136,136,0.80)',lineHeight:1.8 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace",color:'rgba(224,32,32,0.6)' }}>{'>'}</span>{' '}
            Configura <span style={{ color:'#e02020',fontFamily:"'JetBrains Mono',monospace",background:'rgba(224,32,32,0.10)',padding:'1px 5px',borderRadius:2 }}>VITE_API_URL</span> en Vercel → Settings → Environment Variables.
          </div>
        </div>
      </div>
    )

    if (loading) return (
      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        <div className="skeleton" style={{ height:66,borderRadius:4 }}/>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14 }}>
          {[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{ height:136,borderRadius:4 }}/>)}
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
      {label:'CMD', value:evCounts['cmd']||0,  color:'#8855ff'},
      {label:'MOD', value:evCounts['mod']||0,  color:'#ff3355'},
      {label:'JOIN',value:evCounts['join']||0, color:'#00ff88'},
      {label:'LVL', value:evCounts['lvl']||0,  color:'#ffaa00'},
      {label:'SYS', value:evCounts['conn']||0, color:'#0099ff'},
    ]

    return (
      <div style={{ display:'flex',flexDirection:'column',gap:20 }} className="animate-fade-up">

        {/* ── Header ── */}
        <div style={{
          padding:'16px 22px',borderRadius:4,
          borderLeft:'3px solid #e02020',
          border:'1px solid rgba(196,26,26,0.20)',
          background:'linear-gradient(90deg,rgba(196,26,26,0.11),rgba(6,4,4,0.97))',
          position:'relative',overflow:'hidden',
          display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,
          boxShadow:'0 4px 30px rgba(0,0,0,0.50)',
        }}>
          <div style={{ position:'absolute',top:-1,left:-1,width:16,height:16,borderTop:'2px solid #e02020',borderLeft:'2px solid #e02020',boxShadow:'-1px -1px 9px rgba(224,32,32,0.55)' }}/>
          <div style={{ position:'absolute',bottom:-1,right:-1,width:16,height:16,borderBottom:'2px solid rgba(224,32,32,0.38)',borderRight:'2px solid rgba(224,32,32,0.38)' }}/>
          <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#e02020,#ff6633cc,transparent 60%)' }}/>
          <div style={{ position:'absolute',top:0,left:0,width:220,height:'100%',background:'radial-gradient(ellipse at left,rgba(196,26,26,0.09),transparent 70%)',pointerEvents:'none' }}/>

          <div style={{ position:'relative' }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.18em',color:'rgba(224,32,32,0.45)',marginBottom:7 }}>
              [ SYSTEM ] /// STATUS WINDOW
            </div>
            <div style={{ fontFamily:"'Orbitron',monospace",fontSize:17,fontWeight:900,letterSpacing:'.10em',color:'#f0e8e8',display:'flex',alignItems:'center',gap:12 }}>
              <span style={{ color:'#e02020',textShadow:'0 0 14px rgba(224,32,32,0.75)',fontSize:14 }}>◈</span>
              BOTANIME CORE
              <span style={{ color:'#e02020',textShadow:'0 0 14px rgba(224,32,32,0.75)',fontSize:14 }}>◈</span>
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:500,letterSpacing:'.12em',color:'rgba(196,26,26,0.35)',marginTop:7,display:'flex',alignItems:'center',gap:8 }}>
              <span style={{ width:4,height:4,borderRadius:'50%',background:connected?'#00ff88':'#ff3355',boxShadow:connected?'0 0 6px rgba(0,255,136,0.7)':'none',display:'inline-block',flexShrink:0 }}/>
              {'>'} HUNTER: BOTANIME · {connected?'ONLINE — AWAKENED':'OFFLINE'} · UPTIME {fmtUp(uptimeSecs)}
            </div>
          </div>

          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            {connected
              ? <div style={{ fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:900,letterSpacing:'.16em',padding:'5px 12px',borderRadius:3,border:'1px solid rgba(255,200,0,0.50)',background:'rgba(255,200,0,0.10)',color:'#fde047',animation:'sRankPulse 2.5s ease-in-out infinite',userSelect:'none' }}>◈ S-RANK</div>
              : <div style={{ fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:900,letterSpacing:'.16em',padding:'5px 12px',borderRadius:3,border:'1px solid rgba(100,116,139,0.30)',background:'rgba(100,116,139,0.08)',color:'#64748b' }}>E-RANK</div>
            }
            <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={ref} style={{ minWidth:34 }} title="Actualizar">
              <RefreshCw size={12} style={{ animation:ref?'spin 1s linear infinite':'none',color:'rgba(224,32,32,0.65)' }}/>
            </button>
          </div>
        </div>

        {/* ── Metric Cards ── */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))',gap:14 }}>
          <MetricCard icon={Users}         label="HUNTERS"      value={stats?.users??0}         color={CARD_COLORS[0].color} glow={CARD_COLORS[0].glow} rank={getRank(stats?.users??0,[10,25,50,100,250])}            sub="registrados"  delay={0}   />
          <MetricCard icon={MessageSquare} label="GUILDS"       value={stats?.groups??0}        color={CARD_COLORS[1].color} glow={CARD_COLORS[1].glow} rank={getRank(stats?.groups??0,[5,10,20,50,100])}            sub="activos"      delay={55}  />
          <MetricCard icon={Zap}           label="CMDS HOY"     value={stats?.commandsToday??0} color={CARD_COLORS[2].color} glow={CARD_COLORS[2].glow} rank={getRank(stats?.commandsToday??0,[10,30,60,150,300])}   sub="ejecutados"   delay={110} />
          <MetricCard icon={Activity}      label="MENSAJES"     value={stats?.messages??0}      color={CARD_COLORS[3].color} glow={CARD_COLORS[3].glow} rank={getRank(stats?.messages??0,[100,500,1000,5000,10000])} sub="procesados"   delay={165} />
          <MetricCard icon={Shield}        label="EVENTOS"      value={events.length}           color={CARD_COLORS[4].color} glow={CARD_COLORS[4].glow}                                                               sub="en historial" delay={220} />
          <MetricCard icon={Clock}         label="UPTIME (SEG)" value={uptimeSecs}              color={CARD_COLORS[5].color} glow={CARD_COLORS[5].glow}                                                               sub={fmtUp(uptimeSecs)} delay={275} />
        </div>

        {/* ── Chart + Event Log ── */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:14 }}>

          {/* Activity chart */}
          <div style={{ background:'rgba(10,6,6,0.97)',border:'1px solid rgba(196,26,26,0.16)',borderLeft:'3px solid #3b82f6',borderRadius:4,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column' }}>
            <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #3b82f6',borderLeft:'2px solid #3b82f6',boxShadow:'-1px -1px 6px rgba(59,130,246,0.5)' }}/>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#3b82f6,transparent 50%)' }}/>
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(196,26,26,0.08)',background:'rgba(59,130,246,0.06)',flexShrink:0 }}>
              <BarChart2 size={11} color="#3b82f6" style={{ filter:'drop-shadow(0 0 4px #3b82f6)' }}/>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.16em',color:'#3b82f6' }}>[ ACTIVITY SCAN ]</span>
              <div style={{ marginLeft:'auto',display:'flex',gap:4 }}>
                {[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'rgba(59,130,246,0.45)',boxShadow:'0 0 5px rgba(59,130,246,0.6)' }}/>)}
              </div>
            </div>
            <div style={{ padding:'16px 18px 14px',flex:1 }}>
              <BarChart data={chartData}/>
              <div style={{ height:1,background:'linear-gradient(90deg,transparent,rgba(59,130,246,0.22),transparent)',margin:'14px 0 12px' }}/>
              <div style={{ display:'flex',flexWrap:'wrap',gap:10 }}>
                {chartData.map(d=>(
                  <span key={d.label} style={{ display:'flex',alignItems:'center',gap:5,fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(158,136,136,0.55)',letterSpacing:'.06em' }}>
                    <span style={{ width:8,height:8,borderRadius:2,background:d.color,boxShadow:`0 0 6px ${d.color}`,flexShrink:0 }}/>
                    {d.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Event log */}
          <div style={{ background:'rgba(10,6,6,0.97)',border:'1px solid rgba(196,26,26,0.16)',borderLeft:'3px solid #8855ff',borderRadius:4,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column' }}>
            <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #8855ff',borderLeft:'2px solid #8855ff',boxShadow:'-1px -1px 6px rgba(136,85,255,0.5)' }}/>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#8855ff,transparent 50%)' }}/>
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(196,26,26,0.08)',background:'rgba(136,85,255,0.06)',flexShrink:0 }}>
              <Activity size={11} color="#8855ff" style={{ filter:'drop-shadow(0 0 4px #8855ff)' }}/>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.16em',color:'#8855ff' }}>[ EVENT LOG ]</span>
              <div style={{ marginLeft:'auto',display:'flex',gap:4 }}>
                {[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:'rgba(136,85,255,0.45)',boxShadow:'0 0 5px rgba(136,85,255,0.6)' }}/>)}
              </div>
            </div>
            <div style={{ flex:1,overflowY:'auto',maxHeight:260 }}>
              {recentEvs.length===0
                ? <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:160,gap:8 }}>
                    <div style={{ width:32,height:32,borderRadius:'50%',border:'1px solid rgba(136,85,255,0.22)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <Activity size={14} color="rgba(136,85,255,0.35)"/>
                    </div>
                    <div style={{ fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,letterSpacing:'.18em',color:'rgba(196,26,26,0.22)' }}>SIN EVENTOS</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(196,26,26,0.16)' }}>// el log aparecerá aquí</div>
                  </div>
                : recentEvs.map((ev,i)=>{
                    const m=evMeta(ev.type); const d=ev.data as Record<string,string>|null
                    return (
                      <div key={i} style={{ display:'flex',alignItems:'flex-start',gap:10,padding:'8px 16px',borderBottom:'1px solid rgba(196,26,26,0.06)',transition:'background .14s',cursor:'default' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(136,85,255,0.04)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}
                      >
                        <div style={{ width:8,height:8,borderRadius:2,background:m.color,boxShadow:`0 0 7px ${m.color}`,flexShrink:0,marginTop:4 }}/>
                        <div style={{ flex:1,fontSize:12,color:'rgba(158,136,136,0.72)',lineHeight:1.5 }}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:7,fontWeight:700,letterSpacing:'.14em',color:m.color,background:`${m.color}12`,border:`1px solid ${m.color}30`,padding:'1px 6px',borderRadius:3,marginRight:8 }}>{m.label}</span>
                          {d?.sender&&<span style={{ color:'#f0e8e8',fontWeight:600 }}>{d.sender}</span>}
                          {d?.cmd&&<span style={{ color:'rgba(224,32,32,0.48)' }}> › {d.cmd}</span>}
                          {d?.group&&<span style={{ color:'rgba(196,26,26,0.30)',fontSize:10 }}> [{d.group}]</span>}
                          {!d?.sender&&!d?.cmd&&<span style={{ color:'rgba(196,26,26,0.35)' }}>{ev.type}</span>}
                        </div>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(196,26,26,0.28)',flexShrink:0,paddingTop:2 }}>{fmtTs(ev.ts)}</span>
                      </div>
                    )
                  })
              }
            </div>
          </div>
        </div>

        {/* ── Leaderboards + System Health ── */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14 }}>

          {[
            { title:'[ XP RANKING ]',  icon:Award, color:'#ffaa00', data:topUsers, valFn:(u:User)=>u.xp??0 },
            { title:'[ CMD RANKING ]', icon:Zap,   color:'#8855ff', data:topCmds,  valFn:(u:User)=>u.commands??0 },
          ].map(({title,icon:Ico,color,data,valFn})=>(
            <div key={title} style={{ background:'rgba(10,6,6,0.97)',border:'1px solid rgba(196,26,26,0.15)',borderLeft:`3px solid ${color}`,borderRadius:4,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column' }}>
              <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:`2px solid ${color}`,borderLeft:`2px solid ${color}`,boxShadow:`-1px -1px 6px ${color}55` }}/>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,${color},transparent 50%)` }}/>
              <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(196,26,26,0.08)',background:`${color}07`,flexShrink:0 }}>
                <Ico size={11} color={color} style={{ filter:`drop-shadow(0 0 4px ${color})` }}/>
                <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.14em',color }}>{title}</span>
              </div>
              <div style={{ flex:1,padding:'4px 0 10px' }}>
                {data.length===0
                  ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:100,fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(196,26,26,0.22)' }}>// sin datos</div>
                  : data.map((u,i)=>(
                    <div key={u.jid}
                      style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 16px',background:i===0?`${color}07`:'transparent',borderRadius:3,margin:'1px 6px',transition:'background .14s',cursor:'default' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=`${color}0e`)}
                      onMouseLeave={e=>(e.currentTarget.style.background=i===0?`${color}07`:'transparent')}
                    >
                      <span style={{ fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:900,width:22,textAlign:'center',flexShrink:0,color:i===0?color:i===1?'rgba(148,163,184,0.6)':i===2?'#cd7f32':'rgba(196,26,26,0.22)',textShadow:i===0?`0 0 12px ${color}`:'none' }}>
                        {i===0?'◈':i+1}
                      </span>
                      <span style={{ flex:1,fontSize:13,fontWeight:600,color:i===0?'#f0e8e8':'rgba(240,232,232,0.65)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                        {u.name||u.jid.split('@')[0]}
                      </span>
                      <span style={{ fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,color:i===0?color:'rgba(196,26,26,0.45)',textShadow:i===0?`0 0 8px ${color}55`:'none' }}>
                        {valFn(u).toLocaleString()}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          ))}

          {/* System Health */}
          <div style={{ background:'rgba(10,6,6,0.97)',border:'1px solid rgba(196,26,26,0.15)',borderLeft:'3px solid #0099ff',borderRadius:4,position:'relative',overflow:'hidden',display:'flex',flexDirection:'column' }}>
            <div style={{ position:'absolute',top:-1,left:-1,width:12,height:12,borderTop:'2px solid #0099ff',borderLeft:'2px solid #0099ff',boxShadow:'-1px -1px 6px rgba(0,153,255,0.5)' }}/>
            <div style={{ position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,#0099ff,transparent 50%)' }}/>
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 16px',borderBottom:'1px solid rgba(196,26,26,0.08)',background:'rgba(0,153,255,0.06)',flexShrink:0 }}>
              <Shield size={11} color="#0099ff" style={{ filter:'drop-shadow(0 0 4px #0099ff)' }}/>
              <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,letterSpacing:'.14em',color:'#0099ff' }}>[ SYSTEM HEALTH ]</span>
            </div>
            <div style={{ flex:1,padding:'16px 18px' }}>
              {stats
                ? <>
                    <HealthBar label="HUNTERS" val={stats.users??0}         max={Math.max(stats.users??0,500)}         color="#e02020"/>
                    <HealthBar label="GUILDS"  val={stats.groups??0}        max={Math.max(stats.groups??0,100)}        color="#8855ff"/>
                    <HealthBar label="CMDS"    val={stats.commandsToday??0} max={Math.max(stats.commandsToday??0,200)} color="#ffaa00"/>
                    <HealthBar label="MSGS"    val={stats.messages??0}      max={Math.max(stats.messages??0,5000)}     color="#0099ff"/>
                    <div style={{ height:1,background:'linear-gradient(90deg,transparent,rgba(0,153,255,0.22),transparent)',margin:'14px 0 12px' }}/>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(196,26,26,0.38)',letterSpacing:'.12em' }}>UPTIME</span>
                      <span style={{ fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:800,color:'#0099ff',textShadow:'0 0 10px rgba(0,153,255,0.55)' }}>{fmtUp(uptimeSecs)}</span>
                    </div>
                  </>
                : <div style={{ display:'flex',alignItems:'center',justifyContent:'center',height:100,fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:'rgba(196,26,26,0.22)' }}>// sin datos</div>
              }
            </div>
          </div>

        </div>
      </div>
    )
  }
  