import { useEffect, useState, useMemo } from 'react'
import { Search, RefreshCw, Users as UsersIcon, Zap, DollarSign, Trophy,
         MessageSquare, ChevronUp, ChevronDown, Filter } from 'lucide-react'
import { getUsers, isConfigured, type User } from '../api'

const RANK_TIERS = [
  { min:30, rank:'SS', label:'MONARCA',  color:'#F97316' },
  { min:20, rank:'S',  label:'NACIONAL', color:'#F59E0B' },
  { min:15, rank:'A',  label:'HÉROE',    color:'#EF4444' },
  { min:10, rank:'B',  label:'AVANZADO', color:'#8B5CF6' },
  { min: 5, rank:'C',  label:'INTER.',   color:'#3B82F6' },
  { min: 1, rank:'D',  label:'NOVATO',   color:'#10B981' },
  { min: 0, rank:'E',  label:'RANGO E',  color:'#52525B' },
]
function getTier(level: number) { return RANK_TIERS.find(t=>level>=t.min)??RANK_TIERS[RANK_TIERS.length-1] }
function timeAgo(ts?: number) {
  if(!ts) return '—'
  const d=Math.floor((Date.now()-ts)/86400000)
  return d===0?'hoy':d===1?'ayer':d+'d'
}

function XPBar({xp,level,color}:{xp:number;level:number;color:string}) {
  const needed=(level+1)*100; const pct=Math.min((xp/needed)*100,100)
  return (
    <div style={{marginTop:8}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:10,color:'var(--text3)'}}>XP {xp.toLocaleString()}</span>
        <span style={{fontSize:10,color:'var(--text3)'}}>LV {level}</span>
      </div>
      <div className="stat-bar">
        <div className="stat-fill" style={{width:pct+'%',background:`linear-gradient(90deg,${color},${color}80)`}}/>
      </div>
    </div>
  )
}

function UserCard({user,pos}:{user:User;pos:number}) {
  const [exp,setExp]=useState(false)
  const t=getTier(user.level)
  const jidShort=user.jid.split('@')[0]
  const name=user.name||jidShort

  return (
    <div
      className="dungeon-card"
      style={{padding:12,cursor:'pointer'}}
      onClick={()=>setExp(e=>!e)}
    >
      {/* Top accent line */}
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${t.color},transparent)`}}/>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
        {/* Avatar */}
        <div style={{
          width:36,height:36,borderRadius:9,flexShrink:0,
          background:t.color+'18',border:`1px solid ${t.color}30`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontWeight:800,fontSize:13,color:t.color,letterSpacing:'-.01em',
        }}>
          {name.slice(0,2).toUpperCase()}
        </div>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:5,marginBottom:1}}>
            <span style={{fontWeight:700,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:120,color:'var(--text)'}}>
              {name.length>16?name.slice(0,15)+'…':name}
            </span>
            <span className={`rank rank-${t.rank.toLowerCase()}`}>{t.rank}</span>
          </div>
          <div style={{fontSize:9,color:'var(--text3)',fontFamily:'monospace'}}>{jidShort.slice(0,18)}</div>
        </div>

        {/* Position */}
        <div style={{flexShrink:0,textAlign:'right'}}>
          {pos<=3
            ? <span style={{fontSize:14,fontWeight:800,color:pos===1?'#FBBF24':pos===2?'#94A3B8':'#CD7F32'}}>#{pos}</span>
            : <span style={{fontSize:11,color:'var(--text3)',fontWeight:600}}>#{pos}</span>
          }
        </div>
      </div>

      {/* XP bar */}
      <XPBar xp={user.xp} level={user.level} color={t.color}/>

      {/* Stats row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:5,marginTop:8}}>
        {([
          {icon:MessageSquare,val:user.messages??0,label:'MSG',  color:'#3B82F6'},
          {icon:Zap,          val:user.commands??0,label:'CMDS', color:'#8B5CF6'},
          {icon:DollarSign,   val:user.coins??0,   label:'COINS',color:'#F59E0B'},
        ] as {icon:React.ElementType;val:number;label:string;color:string}[]).map(s=>(
          <div key={s.label} style={{
            background:s.color+'0a',border:`1px solid ${s.color}18`,
            borderRadius:6,padding:'5px 6px',textAlign:'center',
          }}>
            <div style={{fontWeight:700,fontSize:12,color:s.color}}>{s.val.toLocaleString()}</div>
            <div style={{fontSize:8,color:'var(--text3)',fontWeight:700,letterSpacing:'.04em',marginTop:1}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Expanded details */}
      {exp && (
        <div style={{marginTop:10,paddingTop:9,borderTop:'1px solid var(--border)'}}>
          {[
            {label:'Rango',       val:`${t.rank} · ${t.label}`, color:t.color},
            {label:'Daily',       val:timeAgo(user.lastDaily),   color:'var(--text3)'},
            {label:'Registrado',  val:timeAgo(user.createdAt),   color:'var(--text3)'},
          ].map(row=>(
            <div key={row.label} style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <span style={{color:'var(--text3)',fontWeight:600,fontSize:10,letterSpacing:'.04em'}}>{row.label}</span>
              <span style={{fontFamily:'monospace',fontSize:10,color:row.color}}>{row.val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expand chevron */}
      <div style={{display:'flex',justifyContent:'center',marginTop:exp?6:4}}>
        {exp
          ? <ChevronUp size={11} color="var(--text3)"/>
          : <ChevronDown size={11} color="var(--text3)" style={{opacity:.4}}/>
        }
      </div>
    </div>
  )
}

type SortKey='xp'|'level'|'commands'|'messages'|'coins'

export default function Users() {
  const [users,     setUsers]  =useState<User[]>([])
  const [loading,   setLoad]   =useState(true)
  const [search,    setSearch] =useState('')
  const [sortBy,    setSort]   =useState<SortKey>('xp')
  const [sortAsc,   setAsc]    =useState(false)
  const [refreshing,setRef]    =useState(false)

  const load=async(r=false)=>{
    if(!isConfigured()){setLoad(false);return}
    if(r)setRef(true)
    try{setUsers(await getUsers())}catch{}
    setLoad(false);setRef(false)
  }
  useEffect(()=>{load()},[])

  const sorted=useMemo(()=>{
    let list=[...users]
    if(search)list=list.filter(u=>(u.name||'').toLowerCase().includes(search.toLowerCase())||u.jid.includes(search))
    list.sort((a,b)=>{
      const av=(a as unknown as Record<string,number>)[sortBy]??0
      const bv=(b as unknown as Record<string,number>)[sortBy]??0
      return sortAsc?av-bv:bv-av
    })
    return list
  },[users,search,sortBy,sortAsc])

  const rankDist:Record<string,number>={}
  for(const u of users){const r=getTier(u.level).rank;rankDist[r]=(rankDist[r]||0)+1}

  if(!isConfigured()) return (
    <div className="empty-state">
      <div className="empty-state-icon"><UsersIcon size={20} color="var(--text3)"/></div>
      <div className="empty-state-title">API sin configurar</div>
    </div>
  )

  if(loading) return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:10,marginTop:4}}>
      {[...Array(9)].map((_,i)=><div key={i} className="skeleton" style={{height:155}}/>)}
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}} className="animate-fade-up">

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div>
          <div className="page-title"><UsersIcon size={17} color="var(--amber)"/>Usuarios</div>
          <div className="page-subtitle">{users.length} hunters registrados</div>
        </div>
        <div style={{display:'flex',gap:7}}>
          <div style={{position:'relative'}}>
            <Search size={11} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none'}}/>
            <input className="input" placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{paddingLeft:26,width:160,fontSize:12}}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
            <RefreshCw size={11} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/>
          </button>
        </div>
      </div>

      {/* Rank distribution strip */}
      <div className="rank-strip">
        {RANK_TIERS.map(t=>(
          <div key={t.rank} className="rank-strip-item card"
            style={{padding:'8px 12px',gap:8,minWidth:70,flexDirection:'column',alignItems:'flex-start'}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <span className={`rank rank-${t.rank.toLowerCase()}`}>{t.rank}</span>
              <span style={{fontWeight:700,fontSize:16,color:t.color,lineHeight:1}}>{rankDist[t.rank]??0}</span>
            </div>
            <span style={{fontSize:9,color:'var(--text3)',fontWeight:600,letterSpacing:'.04em'}}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:10,color:'var(--text3)',fontWeight:700,letterSpacing:'.04em',display:'flex',alignItems:'center',gap:3}}>
          <Filter size={10}/>ORDENAR:
        </span>
        {(['xp','level','commands','messages','coins'] as SortKey[]).map(k=>(
          <button key={k} className={`btn btn-xs ${sortBy===k?'btn-primary':'btn-ghost'}`}
            onClick={()=>{if(sortBy===k)setAsc(a=>!a);else{setSort(k);setAsc(false)}}}>
            {k==='commands'?'CMDS':k==='messages'?'MSG':k.toUpperCase()}
            {sortBy===k&&(sortAsc?<ChevronUp size={8}/>:<ChevronDown size={8}/>)}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:10,color:'var(--text3)',fontWeight:600}}>{sorted.length} usuarios</span>
      </div>

      {/* User grid */}
      {sorted.length===0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={18} color="var(--text3)"/></div>
            <div className="empty-state-title">Sin usuarios</div>
            <div className="empty-state-sub">No hay hunters registrados aún</div>
          </div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:8}}>
          {sorted.map((u,i)=><UserCard key={u.jid} user={u} pos={i+1}/>)}
        </div>
      )}

      <div style={{height:4}}/>
    </div>
  )
}
