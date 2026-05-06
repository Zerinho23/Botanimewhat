import { useEffect, useState, useMemo } from 'react'
import { Search, RefreshCw, Users as UsersIcon, Zap, DollarSign, Trophy,
         MessageSquare, ChevronUp, ChevronDown, Filter } from 'lucide-react'
import { getUsers, isConfigured, type User } from '../api'

const RANK_TIERS = [
  { min:30, rank:'SS', label:'MONARCA',  color:'var(--orange)',  },
  { min:20, rank:'S',  label:'NACIONAL', color:'var(--amber)',    },
  { min:15, rank:'A',  label:'HÉROE',    color:'var(--red)',    },
  { min:10, rank:'B',  label:'AVANZADO', color:'var(--purple)', },
  { min: 5, rank:'C',  label:'INTER.',   color:'var(--blue)',    },
  { min: 1, rank:'D',  label:'NOVATO',   color:'var(--green)',  },
  { min: 0, rank:'E',  label:'RANGO E',  color:'var(--text3)',     },
]
function getTier(level: number) { return RANK_TIERS.find(t=>level>=t.min)??RANK_TIERS[RANK_TIERS.length-1] }
function timeAgo(ts?: number) {
  if(!ts) return '—'
  const d=Math.floor((Date.now()-ts)/86400000)
  return d===0?'hoy':d===1?'ayer':d+'d atrás'
}

function XPBar({xp,level,color}:{xp:number;level:number;color:string}) {
  const needed=(level+1)*100; const pct=Math.min((xp/needed)*100,100)
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
        <span style={{fontSize:10,color:'var(--text3)'}}>XP {xp.toLocaleString()}</span>
        <span style={{fontSize:10,color:'var(--text3)'}}>LV {level}</span>
      </div>
      <div className="stat-bar">
        <div className="stat-fill" style={{width:pct+'%',background:`linear-gradient(90deg,${color},${color}99)`}} />
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
    <div className="dungeon-card animate-fade-up" style={{padding:14,cursor:'pointer'}} onClick={()=>setExp(e=>!e)}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${t.color},transparent)`}} />
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
        <div style={{
          width:38,height:38,borderRadius:10,flexShrink:0,
          background:t.color+'15',border:`1px solid ${t.color}35`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontWeight:800,fontSize:14,color:t.color,
        }}>
          {name.slice(0,2).toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            <span style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:140}}>{name}</span>
            <span className={`rank rank-${t.rank.toLowerCase()}`}>{t.rank}</span>
          </div>
          <div style={{fontSize:10,color:'var(--text3)',fontFamily:'monospace',marginTop:1}}>{jidShort.slice(0,20)}</div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          {pos<=3?(
            <span style={{fontSize:15,fontWeight:800,color:pos===1?'var(--amber)':pos===2?'var(--text2)':'#cd7f32'}}>#{pos}</span>
          ):(
            <span style={{fontSize:12,color:'var(--text3)',fontWeight:700}}>#{pos}</span>
          )}
        </div>
      </div>
      <XPBar xp={user.xp} level={user.level} color={t.color} />
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginTop:10}}>
        {([
          {icon:MessageSquare,val:user.messages??0,label:'MSG',  color:'var(--blue)'   },
          {icon:Zap,          val:user.commands??0,label:'CMDS', color:'var(--purple)'},
          {icon:DollarSign,   val:user.coins??0,   label:'COINS',color:'var(--amber)'   },
        ] as {icon:React.ElementType;val:number;label:string;color:string}[]).map(s=>(
          <div key={s.label} style={{background:s.color+'0a',border:'1px solid '+s.color+'20',borderRadius:8,padding:'6px 8px',textAlign:'center'}}>
            <div style={{fontWeight:700,fontSize:13,color:s.color}}>{s.val.toLocaleString()}</div>
            <div style={{fontSize:9,color:'var(--text3)',fontWeight:700,letterSpacing:'.04em',marginTop:1}}>{s.label}</div>
          </div>
        ))}
      </div>
      {exp&&(
        <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid var(--border)',fontSize:11}}>
          {[
            {label:'RANGO',    val:`${t.rank} · ${t.label}`,    color:t.color},
            {label:'DAILY',    val:timeAgo(user.lastDaily),         color:'var(--text3)'},
            {label:'REGISTRADO',val:timeAgo(user.createdAt),        color:'var(--text3)'},
          ].map(row=>(
            <div key={row.label} style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
              <span style={{color:'var(--text3)',letterSpacing:'.05em',fontWeight:700,fontSize:10}}>{row.label}</span>
              <span style={{fontFamily:'monospace',fontSize:10,color:row.color}}>{row.val}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{display:'flex',justifyContent:'center',marginTop:exp?6:0}}>
        {exp
          ? <ChevronUp size={12} color="var(--text3)" />
          : null
        }
      </div>
    </div>
  )
}

type SortKey='xp'|'level'|'commands'|'messages'|'coins'

export default function Users() {
  const [users,   setUsers]  =useState<User[]>([])
  const [loading, setLoad]   =useState(true)
  const [search,  setSearch] =useState('')
  const [sortBy,  setSort]   =useState<SortKey>('xp')
  const [sortAsc, setAsc]    =useState(false)
  const [refreshing,setRef]  =useState(false)

  const load=async(r=false)=>{
    if(!isConfigured()){setLoad(false);return}
    if(r)setRef(true)
    try{setUsers(await getUsers())}catch{}
    setLoad(false);setRef(false)
  }
  useEffect(()=>{load()},[])

  const sorted=useMemo(()=>{
    let list=[...users]
    if(search) list=list.filter(u=>(u.name||'').toLowerCase().includes(search.toLowerCase())||u.jid.includes(search))
    list.sort((a,b)=>{
      const av=(a as unknown as Record<string,number>)[sortBy]??0
      const bv=(b as unknown as Record<string,number>)[sortBy]??0
      return sortAsc?av-bv:bv-av
    })
    return list
  },[users,search,sortBy,sortAsc])

  const rankDist:Record<string,number>={}
  for(const u of users){const r=getTier(u.level).rank;rankDist[r]=(rankDist[r]||0)+1}

  if(!isConfigured()) return(<div className="empty-state"><div className="empty-state-icon"><UsersIcon size={22} color="var(--text3)"/></div><div className="empty-state-title">API sin configurar</div></div>)
  if(loading) return(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12,marginTop:16}}>{[...Array(9)].map((_,i)=><div key={i} className="skeleton" style={{height:170}}/>)}</div>)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}} className="animate-fade-up">

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div>
          <div className="page-title">
            <UsersIcon size={18} color="var(--amber)" />
            Usuarios
          </div>
          <div className="page-subtitle">{users.length} hunters registrados</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <div style={{position:'relative'}}>
            <Search size={12} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none'}}/>
            <input className="input" placeholder="Buscar usuario…" value={search} onChange={e=>setSearch(e.target.value)} style={{paddingLeft:28,width:180,fontSize:12}}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
            <RefreshCw size={12} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/>
          </button>
        </div>
      </div>

      {/* Rank distribution — horizontal scrollable strip */}
      <div className="rank-strip">
        {RANK_TIERS.map(t=>(
          <div key={t.rank} className="rank-strip-item" style={{background:t.color+'0a',border:'1px solid '+t.color+'25'}}>
            <span className={`rank rank-${t.rank.toLowerCase()}`}>{t.rank}</span>
            <span style={{fontWeight:700,fontSize:14,color:t.color}}>{rankDist[t.rank]??0}</span>
            <span style={{fontSize:10,color:'var(--text3)',fontWeight:600}}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
        <span style={{fontSize:10,color:'var(--text3)',fontWeight:700,letterSpacing:'.04em',display:'flex',alignItems:'center',gap:4}}>
          <Filter size={10}/>ORDENAR:
        </span>
        {(['xp','level','commands','messages','coins'] as SortKey[]).map(k=>(
          <button key={k} className={`btn btn-xs ${sortBy===k?'btn-primary':'btn-ghost'}`}
            onClick={()=>{if(sortBy===k)setAsc(a=>!a);else{setSort(k);setAsc(false)}}}>
            {k.toUpperCase()}{sortBy===k&&(sortAsc?<ChevronUp size={9}/>:<ChevronDown size={9}/>)}
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:10,color:'var(--text3)',fontWeight:600}}>{sorted.length} usuarios</span>
      </div>

      {/* User grid */}
      {sorted.length===0?(
        <div className="card"><div className="empty-state">
          <div className="empty-state-icon"><Trophy size={20} color="var(--text3)"/></div>
          <div className="empty-state-title">Sin usuarios</div>
          <div className="empty-state-sub">No hay usuarios registrados aún</div>
        </div></div>
      ):(
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:10}}>
          {sorted.map((u,i)=><UserCard key={u.jid} user={u} pos={i+1}/>)}
        </div>
      )}

      <div style={{height:8}}/>
    </div>
  )
}
