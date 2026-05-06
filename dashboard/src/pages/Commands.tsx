import { useState, useMemo, useEffect } from 'react'
import {
  Terminal, Search, Copy, Check, Shield, Users, Star,
  BookOpen, ChevronDown, Zap, DollarSign, Clock, Lock, Globe, ChevronRight,
} from 'lucide-react'

function useMobile() {
  const [m, setM] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

interface Command {
  name: string; description: string; usage: string
  aliases: string[]; permission: 'all' | 'admin' | 'owner'
  cooldown?: number; example?: string
}
interface Category {
  id: string; label: string; icon: React.ElementType; color: string
  gradient: string; description: string; commands: Command[]
}

const CATEGORIES: Category[] = [
  {
    id:'admin', label:'Administración', icon:Shield, color:'#EF4444',
    gradient:'linear-gradient(135deg,rgba(239,68,68,.14),rgba(239,68,68,.04))',
    description:'Moderación y gestión de grupo',
    commands:[
      {name:'antilink',  description:'Activa o desactiva el filtro de enlaces externos en el grupo.', usage:'!antilink [on|off]', aliases:['antilinks'], permission:'admin', example:'!antilink on'},
      {name:'ban',       description:'Expulsa permanentemente a un usuario del grupo.', usage:'!ban @usuario', aliases:['expulsar'], permission:'admin', example:'!ban @Juan'},
      {name:'kick',      description:'Expulsa temporalmente a un usuario del grupo.', usage:'!kick @usuario', aliases:['sacar'], permission:'admin', example:'!kick @María'},
      {name:'mute',      description:'Silencia a un usuario (sus mensajes son eliminados automáticamente).', usage:'!mute @usuario', aliases:['silenciar'], permission:'admin'},
      {name:'nuevos',    description:'Lista los miembros que ingresaron recientemente al grupo.', usage:'!nuevos [días]', aliases:['recientes','new'], permission:'admin', example:'!nuevos 7'},
      {name:'invocar',   description:'Menciona a todos los integrantes del grupo.', usage:'!invocar [mensaje]', aliases:['all','todos'], permission:'admin'},
      {name:'fantasmas', description:'Detecta miembros inactivos que no han escrito en X días.', usage:'!fantasmas [días]', aliases:['inactivos','ghosts'], permission:'admin', example:'!fantasmas 30'},
      {name:'purga',     description:'Expulsa masivamente a miembros inactivos (+30 días sin escribir).', usage:'!purga', aliases:['cleanup'], permission:'admin', cooldown:60},
    ],
  },
  {
    id:'anime', label:'Anime', icon:Star, color:'#EC4899',
    gradient:'linear-gradient(135deg,rgba(236,72,153,.14),rgba(236,72,153,.04))',
    description:'Búsqueda, noticias y recomendaciones',
    commands:[
      {name:'buscar',          description:'Busca un anime por nombre en MyAnimeList con sinopsis, rating y más.', usage:'!buscar [nombre]', aliases:['search','find'], permission:'all', example:'!buscar Attack on Titan'},
      {name:'noticias',        description:'Muestra las últimas noticias del mundo anime.', usage:'!noticias', aliases:['news'], permission:'all'},
      {name:'recomendaciones', description:'Recomienda animes basados en géneros y preferencias.', usage:'!recomendaciones', aliases:['rec'], permission:'all'},
    ],
  },
  {
    id:'user', label:'Perfil & Niveles', icon:Users, color:'#3B82F6',
    gradient:'linear-gradient(135deg,rgba(59,130,246,.14),rgba(59,130,246,.04))',
    description:'Perfil, XP, ranking y estadísticas',
    commands:[
      {name:'help',   description:'Muestra el menú de todos los comandos disponibles.', usage:'!help [comando]', aliases:['menu','ayuda'], permission:'all', example:'!help ban'},
      {name:'perfil', description:'Muestra tu perfil otaku: nivel, XP, monedas, rango y estadísticas.', usage:'!perfil', aliases:['profile','me'], permission:'all'},
      {name:'rank',   description:'Muestra el top 10 de usuarios con más nivel y XP del grupo.', usage:'!rank', aliases:['leaderboard','lb'], permission:'all'},
      {name:'daily',  description:'Recoge tus monedas diarias para usar en la economía del bot.', usage:'!daily', aliases:['diario'], permission:'all', cooldown:86400},
    ],
  },
  {
    id:'economy', label:'Economía', icon:DollarSign, color:'#F59E0B',
    gradient:'linear-gradient(135deg,rgba(245,158,11,.14),rgba(245,158,11,.04))',
    description:'Coins, apuestas y tienda',
    commands:[
      {name:'bal',  description:'Muestra tu saldo actual de coins.', usage:'!bal', aliases:['balance','monedas'], permission:'all'},
      {name:'shop', description:'Abre la tienda del bot para comprar items especiales.', usage:'!shop', aliases:['tienda','store'], permission:'all'},
      {name:'duel', description:'Reta a otro usuario a un duelo por coins.', usage:'!duel @usuario [coins]', aliases:['batalla'], permission:'all', example:'!duel @Rival 500'},
      {name:'gift', description:'Envía coins a otro usuario.', usage:'!gift @usuario [cantidad]', aliases:['dar','transfer'], permission:'all', example:'!gift @Amigo 100'},
    ],
  },
]

const PERM_META = {
  all:   {label:'Público', color:'#3B82F6', bg:'rgba(59,130,246,.12)',  border:'rgba(59,130,246,.25)', icon:Globe },
  admin: {label:'Admin',   color:'#F59E0B', bg:'rgba(245,158,11,.12)',  border:'rgba(245,158,11,.28)', icon:Shield},
  owner: {label:'Owner',   color:'#8B5CF6', bg:'rgba(139,92,246,.12)', border:'rgba(139,92,246,.26)', icon:Lock  },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1800) }}
      style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        width:28, height:28, borderRadius:7, flexShrink:0,
        background:copied?'rgba(16,185,129,.10)':'rgba(255,255,255,.05)',
        border:`1px solid ${copied?'rgba(16,185,129,.28)':'rgba(255,255,255,.08)'}`,
        color:copied?'#34D399':'rgba(255,255,255,.40)',
        transition:'all .2s', cursor:'pointer',
      }}>
      {copied ? <Check size={11}/> : <Copy size={11}/>}
    </button>
  )
}

function CommandCard({ cmd, prefix, color, gradient }: { cmd: Command; prefix: string; color: string; gradient: string }) {
  const [expanded, setExpanded] = useState(false)
  const pm = PERM_META[cmd.permission]
  const PmIcon = pm.icon

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        borderRadius: 11, border: `1px solid ${color}22`,
        background: expanded ? gradient : 'var(--card)',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'all .2s',
        boxShadow: expanded ? `0 0 20px ${color}10` : 'none',
      }}
      onMouseEnter={e => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.background = gradient
        ;(e.currentTarget as HTMLDivElement).style.borderColor = color + '40'
      }}
      onMouseLeave={e => {
        if (!expanded) (e.currentTarget as HTMLDivElement).style.background = 'var(--card)'
        ;(e.currentTarget as HTMLDivElement).style.borderColor = color + '22'
      }}
    >
      {/* Left accent bar */}
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:`linear-gradient(180deg,${color},${color}55)`, borderRadius:'11px 0 0 11px' }}/>

      <div style={{ padding:'12px 12px 12px 17px' }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
          <div style={{ flex:1, minWidth:0 }}>
            {/* Command name + badges */}
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:4 }}>
              <code style={{
                fontFamily:'ui-monospace,monospace', fontWeight:800, fontSize:14,
                color, letterSpacing:'.01em',
              }}>
                {prefix}{cmd.name}
              </code>
              <span style={{
                fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:20,
                background:pm.bg, color:pm.color, border:`1px solid ${pm.border}`,
                display:'inline-flex', alignItems:'center', gap:3, flexShrink:0,
              }}>
                <PmIcon size={8}/>{pm.label}
              </span>
              {cmd.cooldown && (
                <span style={{ fontSize:9, fontWeight:600, color:'var(--text3)', display:'inline-flex', alignItems:'center', gap:3, flexShrink:0, background:'rgba(255,255,255,.04)', border:'1px solid var(--border)', borderRadius:20, padding:'2px 7px' }}>
                  <Clock size={8}/>{cmd.cooldown>=3600?Math.round(cmd.cooldown/3600)+'h':cmd.cooldown+'s'}
                </span>
              )}
            </div>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, wordBreak:'break-word' }}>{cmd.description}</p>
          </div>

          <div style={{ display:'flex', gap:5, flexShrink:0, alignItems:'center' }}>
            <CopyButton text={prefix+cmd.name}/>
            <div style={{
              width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--text3)',
              transition:'transform .2s',
              transform: expanded ? 'rotate(90deg)' : 'none',
            }}>
              <ChevronRight size={14}/>
            </div>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div style={{ marginTop:12, paddingTop:12, borderTop:`1px solid ${color}20` }}>
            {/* Usage */}
            <div style={{ marginBottom:10, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:9, fontWeight:700, color:color, letterSpacing:'.07em', textTransform:'uppercase', background:color+'12', border:`1px solid ${color}22`, borderRadius:4, padding:'2px 6px', flexShrink:0 }}>USO</span>
              <code style={{ fontFamily:'ui-monospace,monospace', fontSize:11, color:'var(--text2)', background:'rgba(255,255,255,.05)', padding:'3px 9px', borderRadius:5, wordBreak:'break-all' }}>{cmd.usage}</code>
            </div>

            {/* Example */}
            {cmd.example && (
              <div style={{ marginBottom:10 }}>
                <span style={{ fontSize:9, fontWeight:700, color:color, letterSpacing:'.07em', textTransform:'uppercase', background:color+'12', border:`1px solid ${color}22`, borderRadius:4, padding:'2px 6px', display:'inline-block', marginBottom:8 }}>EJEMPLO</span>
                <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                  <div style={{ width:26, height:26, borderRadius:'50%', flexShrink:0, background:color+'18', border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>👤</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'inline-block', background:'rgba(37,211,102,.08)', border:'1px solid rgba(37,211,102,.22)', borderRadius:'10px 10px 10px 2px', padding:'5px 11px', fontFamily:'ui-monospace,monospace', fontSize:12, fontWeight:600, color:color, wordBreak:'break-all', maxWidth:'100%' }}>{cmd.example}</div>
                    <div style={{ fontSize:9, color:'var(--text3)', marginTop:3, paddingLeft:4 }}>✓✓ enviado</div>
                  </div>
                  <CopyButton text={cmd.example}/>
                </div>
              </div>
            )}

            {/* Aliases */}
            {cmd.aliases.length>0 && (
              <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
                <span style={{ fontSize:9, fontWeight:700, color:color, letterSpacing:'.07em', textTransform:'uppercase', background:color+'12', border:`1px solid ${color}22`, borderRadius:4, padding:'2px 6px', flexShrink:0 }}>ALIAS</span>
                {cmd.aliases.map(a=>(
                  <span key={a} style={{ fontFamily:'ui-monospace,monospace', fontSize:10, color:'var(--text3)', background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', borderRadius:5, padding:'1px 7px' }}>
                    {prefix}{a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Commands() {
  const [search,     setSearch]  = useState('')
  const [activeId,   setActiveId]= useState('admin')
  const [permFilter, setPermF]   = useState<'all'|'admin'|'owner'|''>('')
  const isMobile = useMobile()
  const prefix = '!'

  const totalCmds = CATEGORIES.reduce((s,c)=>s+c.commands.length,0)

  const filteredCats = useMemo(()=>{
    let cats = CATEGORIES
    if(permFilter) cats=cats.map(c=>({...c,commands:c.commands.filter(x=>x.permission===permFilter)})).filter(c=>c.commands.length>0)
    if(!search.trim()) return cats
    const q=search.toLowerCase()
    return cats.map(c=>({...c,commands:c.commands.filter(x=>x.name.includes(q)||x.description.toLowerCase().includes(q)||x.aliases.some(a=>a.includes(q)))})).filter(c=>c.commands.length>0)
  },[search,permFilter])

  const activeCategory = search.trim()?null:filteredCats.find(c=>c.id===activeId)??filteredCats[0]??null

  const STATS = [
    {label:'Total',    val:totalCmds,                                                                  color:'#EC4899', icon:Terminal },
    {label:'Públicos', val:CATEGORIES.flatMap(c=>c.commands).filter(c=>c.permission==='all').length,   color:'#10B981', icon:Globe    },
    {label:'Admin',    val:CATEGORIES.flatMap(c=>c.commands).filter(c=>c.permission==='admin').length, color:'#F59E0B', icon:Shield   },
    {label:'Categ.',   val:CATEGORIES.length,                                                          color:'#8B5CF6', icon:BookOpen },
  ]

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}} className="animate-fade-up">

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div>
          <div className="page-title"><Terminal size={17} color="#EC4899"/>Comandos</div>
          <div className="page-subtitle">
            {totalCmds} comandos · prefijo{' '}
            <code style={{fontFamily:'monospace',color:'#EC4899',background:'rgba(236,72,153,.12)',border:'1px solid rgba(236,72,153,.22)',padding:'1px 6px',borderRadius:5}}>{prefix}</code>
          </div>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{position:'relative'}}>
            <Search size={11} style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none'}}/>
            <input className="input" placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{paddingLeft:27,width:isMobile?140:190,fontSize:12}}/>
          </div>
          <div style={{display:'flex',gap:4}}>
            {([['','Todos'],['all','Público'],['admin','Admin']] as [string,string][]).map(([k,l])=>(
              <button key={k} className={`btn btn-xs ${permFilter===k?'btn-primary':'btn-ghost'}`}
                onClick={()=>setPermF(k as ''|'all'|'admin'|'owner')}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats — 2×2 on mobile */}
      <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:8}}>
        {STATS.map(({label,val,color,icon:Icon})=>(
          <div key={label} style={{
            borderRadius:11, padding:'13px 14px',
            background:`linear-gradient(135deg,${color}12,${color}04)`,
            border:`1px solid ${color}25`,
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{width:34,height:34,borderRadius:9,background:color+'16',border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:`0 0 12px ${color}14`}}>
              <Icon size={14} color={color}/>
            </div>
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:22,color,letterSpacing:'-0.04em',lineHeight:1}}>{val}</div>
              <div style={{fontSize:9,color:color,opacity:.65,fontWeight:700,textTransform:'uppercase',letterSpacing:'.05em',marginTop:2,whiteSpace:'nowrap'}}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search results */}
      {search.trim() ? (
        filteredCats.length===0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Terminal size={18} color="var(--text3)"/></div>
              <div className="empty-state-title">Sin resultados para "{search}"</div>
            </div>
          </div>
        ) : filteredCats.map(cat=>(
          <div key={cat.id} style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'0 2px'}}>
              <div style={{width:22,height:22,borderRadius:6,background:cat.color+'18',border:`1px solid ${cat.color}30`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <cat.icon size={11} color={cat.color}/>
              </div>
              <span style={{fontSize:12,fontWeight:700,color:cat.color}}>{cat.label}</span>
              <span className="badge badge-blue">{cat.commands.length}</span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              {cat.commands.map(cmd=><CommandCard key={cmd.name} cmd={cmd} prefix={prefix} color={cat.color} gradient={cat.gradient}/>)}
            </div>
          </div>
        ))

      /* Mobile layout */
      ) : isMobile ? (
        <>
          {/* Horizontal category pills */}
          <div style={{display:'flex',gap:7,overflowX:'auto',paddingBottom:2,scrollbarWidth:'none',WebkitOverflowScrolling:'touch'} as React.CSSProperties}>
            {CATEGORIES.map(cat=>{
              const isActive=activeId===cat.id
              return (
                <button key={cat.id} onClick={()=>setActiveId(cat.id)} style={{
                  display:'flex',alignItems:'center',gap:7,padding:'9px 14px',
                  borderRadius:22,flexShrink:0,cursor:'pointer',transition:'all .2s',
                  background:isActive?cat.gradient:'rgba(255,255,255,.04)',
                  border:`1px solid ${isActive?cat.color+'50':'rgba(255,255,255,.08)'}`,
                  boxShadow:isActive?`0 0 16px ${cat.color}20`:'none',
                }}>
                  <div style={{width:22,height:22,borderRadius:6,background:isActive?cat.color+'22':'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <cat.icon size={11} color={isActive?cat.color:'var(--text3)'}/>
                  </div>
                  <span style={{fontSize:12,fontWeight:isActive?700:500,color:isActive?cat.color:'var(--text3)',whiteSpace:'nowrap'}}>{cat.label}</span>
                  <span style={{
                    fontSize:10,fontWeight:700,
                    color:isActive?'white':'var(--text3)',
                    background:isActive?cat.color:'rgba(255,255,255,.06)',
                    border:`1px solid ${isActive?cat.color+'50':'rgba(255,255,255,.08)'}`,
                    borderRadius:20,padding:'1px 7px',
                  }}>{cat.commands.length}</span>
                </button>
              )
            })}
          </div>

          {/* Active category header */}
          {activeCategory && (
            <div style={{
              borderRadius:11,padding:'12px 14px',
              background:activeCategory.gradient,
              border:`1px solid ${activeCategory.color}35`,
              display:'flex',alignItems:'center',gap:11,
            }}>
              <div style={{width:36,height:36,borderRadius:10,background:activeCategory.color+'20',border:`1px solid ${activeCategory.color}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <activeCategory.icon size={16} color={activeCategory.color}/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:activeCategory.color,fontFamily:"'Noto Serif JP',serif"}}>{activeCategory.label}</div>
                <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{activeCategory.description} · {activeCategory.commands.length} comandos</div>
              </div>
            </div>
          )}

          {/* Full-width command list */}
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            {(activeCategory?.commands??[]).map(cmd=>(
              <CommandCard key={cmd.name} cmd={cmd} prefix={prefix} color={activeCategory!.color} gradient={activeCategory!.gradient}/>
            ))}
          </div>

          {/* Permission legend */}
          <div className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'var(--text3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:10}}>Permisos</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {Object.entries(PERM_META).map(([k,pm])=>{
                const Icon=pm.icon
                return (
                  <div key={k} style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:22,height:22,borderRadius:6,background:pm.bg,border:`1px solid ${pm.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <Icon size={10} color={pm.color}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:pm.color}}>{pm.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>

      /* Desktop layout */
      ) : (
        <div style={{display:'flex',gap:14}}>
          {/* Sidebar */}
          <div style={{width:210,flexShrink:0,display:'flex',flexDirection:'column',gap:5}}>
            {CATEGORIES.map(cat=>{
              const isActive=activeId===cat.id
              return (
                <button key={cat.id} onClick={()=>setActiveId(cat.id)} style={{
                  display:'flex',alignItems:'center',gap:10,padding:'11px 13px',borderRadius:11,
                  background:isActive?cat.gradient:'rgba(255,255,255,.025)',
                  border:`1px solid ${isActive?cat.color+'40':'rgba(255,255,255,.07)'}`,
                  cursor:'pointer',textAlign:'left',transition:'all .2s',width:'100%',
                  boxShadow:isActive?`0 0 18px ${cat.color}14`:'none',
                }}>
                  <div style={{width:30,height:30,borderRadius:8,background:cat.color+'18',border:`1px solid ${cat.color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <cat.icon size={13} color={cat.color}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:isActive?700:500,color:isActive?cat.color:'var(--text2)'}}>{cat.label}</div>
                    <div style={{fontSize:9,color:'var(--text3)',marginTop:1}}>{cat.commands.length} comandos</div>
                  </div>
                  {isActive&&<ChevronRight size={12} color={cat.color}/>}
                </button>
              )
            })}

            <div className="card" style={{padding:'12px 14px',marginTop:4}}>
              <div style={{fontSize:10,fontWeight:700,color:'var(--text3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:10}}>Permisos</div>
              {Object.entries(PERM_META).map(([k,pm])=>{
                const Icon=pm.icon
                return (
                  <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{width:22,height:22,borderRadius:6,background:pm.bg,border:`1px solid ${pm.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <Icon size={10} color={pm.color}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:pm.color}}>{pm.label}</span>
                  </div>
                )
              })}
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',fontSize:10,color:'var(--text3)',display:'flex',alignItems:'center',gap:5}}>
                <Zap size={10}/>Haz clic para ver detalles
              </div>
            </div>
          </div>

          {/* Commands panel */}
          <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:8}}>
            {activeCategory ? (
              <>
                <div style={{
                  borderRadius:11,padding:'14px 16px',
                  background:activeCategory.gradient,
                  border:`1px solid ${activeCategory.color}35`,
                  display:'flex',alignItems:'center',gap:12,marginBottom:4,
                }}>
                  <div style={{width:38,height:38,borderRadius:11,background:activeCategory.color+'20',border:`1px solid ${activeCategory.color}35`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <activeCategory.icon size={17} color={activeCategory.color}/>
                  </div>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:activeCategory.color,fontFamily:"'Noto Serif JP',serif"}}>{activeCategory.label}</div>
                    <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{activeCategory.description} · {activeCategory.commands.length} comandos</div>
                  </div>
                </div>
                {activeCategory.commands.map(cmd=>(
                  <CommandCard key={cmd.name} cmd={cmd} prefix={prefix} color={activeCategory.color} gradient={activeCategory.gradient}/>
                ))}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Terminal size={18} color="var(--text3)"/></div>
                <div className="empty-state-title">Selecciona una categoría</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{height:4}}/>
    </div>
  )
}
