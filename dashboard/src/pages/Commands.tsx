import { useState, useMemo, useEffect } from 'react'
import {
  Terminal, Search, Copy, Check, Shield, Users, Star,
  BookOpen, ChevronRight, Zap, DollarSign, Clock, Lock, Globe,
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
  id: string; label: string; icon: React.ElementType; color: string; description: string; commands: Command[]
}

const CATEGORIES: Category[] = [
  {
    id: 'admin', label: 'Administración', icon: Shield, color: '#EF4444',
    description: 'Moderación y gestión de grupo',
    commands: [
      { name: 'antilink',  description: 'Activa o desactiva el filtro de enlaces externos en el grupo.', usage: '!antilink [on|off]', aliases: ['antilinks'], permission: 'admin', example: '!antilink on' },
      { name: 'ban',       description: 'Expulsa permanentemente a un usuario del grupo.', usage: '!ban @usuario', aliases: ['expulsar'], permission: 'admin', example: '!ban @Juan' },
      { name: 'kick',      description: 'Expulsa temporalmente a un usuario del grupo.', usage: '!kick @usuario', aliases: ['sacar'], permission: 'admin', example: '!kick @María' },
      { name: 'mute',      description: 'Silencia a un usuario (sus mensajes son eliminados automáticamente).', usage: '!mute @usuario', aliases: ['silenciar'], permission: 'admin' },
      { name: 'nuevos',    description: 'Lista los miembros que ingresaron recientemente al grupo.', usage: '!nuevos [días]', aliases: ['recientes','new'], permission: 'admin', example: '!nuevos 7' },
      { name: 'invocar',   description: 'Menciona a todos los integrantes del grupo.', usage: '!invocar [mensaje]', aliases: ['all','todos','llamar'], permission: 'admin' },
      { name: 'fantasmas', description: 'Detecta miembros inactivos que no han escrito en X días.', usage: '!fantasmas [días]', aliases: ['inactivos','ghosts'], permission: 'admin', example: '!fantasmas 30' },
      { name: 'purga',     description: 'Expulsa masivamente a miembros inactivos (+30 días sin escribir).', usage: '!purga', aliases: ['cleanup'], permission: 'admin', cooldown: 60 },
    ],
  },
  {
    id: 'anime', label: 'Anime', icon: Star, color: '#EC4899',
    description: 'Búsqueda, noticias y recomendaciones',
    commands: [
      { name: 'buscar',          description: 'Busca un anime por nombre en MyAnimeList con sinopsis, rating y más.', usage: '!buscar [nombre]', aliases: ['search','find'], permission: 'all', example: '!buscar Attack on Titan' },
      { name: 'noticias',        description: 'Muestra las últimas noticias del mundo anime.', usage: '!noticias', aliases: ['news'], permission: 'all' },
      { name: 'recomendaciones', description: 'Recomienda animes basados en géneros y preferencias.', usage: '!recomendaciones', aliases: ['rec'], permission: 'all' },
    ],
  },
  {
    id: 'user', label: 'Perfil & Niveles', icon: Users, color: '#3B82F6',
    description: 'Perfil, XP, ranking y estadísticas',
    commands: [
      { name: 'help',   description: 'Muestra el menú de todos los comandos disponibles en el bot.', usage: '!help [comando]', aliases: ['menu','ayuda'], permission: 'all', example: '!help ban' },
      { name: 'perfil', description: 'Muestra tu perfil otaku: nivel, XP, monedas, rango y estadísticas.', usage: '!perfil', aliases: ['profile','me'], permission: 'all' },
      { name: 'rank',   description: 'Muestra el top 10 de usuarios con más nivel y XP del grupo.', usage: '!rank', aliases: ['leaderboard','lb'], permission: 'all' },
      { name: 'daily',  description: 'Recoge tus monedas diarias para usar en la economía del bot.', usage: '!daily', aliases: ['diario'], permission: 'all', cooldown: 86400 },
    ],
  },
  {
    id: 'economy', label: 'Economía', icon: DollarSign, color: '#F59E0B',
    description: 'Coins, apuestas y tienda',
    commands: [
      { name: 'bal',  description: 'Muestra tu saldo actual de coins.', usage: '!bal', aliases: ['balance','monedas'], permission: 'all' },
      { name: 'shop', description: 'Abre la tienda del bot para comprar items especiales.', usage: '!shop', aliases: ['tienda','store'], permission: 'all' },
      { name: 'duel', description: 'Reta a otro usuario a un duelo por coins.', usage: '!duel @usuario [coins]', aliases: ['batalla'], permission: 'all', example: '!duel @Rival 500' },
      { name: 'gift', description: 'Envía coins a otro usuario.', usage: '!gift @usuario [cantidad]', aliases: ['dar','transfer'], permission: 'all', example: '!gift @Amigo 100' },
    ],
  },
]

const PERM_META = {
  all:   { label: 'Público', color: '#3B82F6', bg: 'rgba(59,130,246,.10)',  icon: Globe  },
  admin: { label: 'Admin',   color: '#F59E0B', bg: 'rgba(245,158,11,.10)',  icon: Shield },
  owner: { label: 'Owner',   color: '#8B5CF6', bg: 'rgba(139,92,246,.10)', icon: Lock   },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text).catch(()=>{}); setCopied(true); setTimeout(()=>setCopied(false),1800) }}
      className="btn btn-ghost btn-xs" title="Copiar"
      style={{ padding:'3px 8px', color: copied?'#10B981':'var(--text3)', transition:'color .2s', flexShrink:0 }}>
      {copied ? <Check size={10}/> : <Copy size={10}/>}
    </button>
  )
}

function CommandCard({ cmd, prefix, color }: { cmd: Command; prefix: string; color: string }) {
  const [expanded, setExpanded] = useState(false)
  const pm = PERM_META[cmd.permission]
  const PmIcon = pm.icon

  return (
    <div className="cmd-card" onClick={() => setExpanded(e => !e)}
      style={{ cursor:'pointer', borderLeft:`2px solid ${color}50` }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${color}55,transparent)` }}/>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5, flexWrap:'wrap' }}>
            <code style={{ fontFamily:'ui-monospace,monospace', fontWeight:700, fontSize:13, color }}>
              {prefix}{cmd.name}
            </code>
            <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:pm.bg, color:pm.color, display:'inline-flex', alignItems:'center', gap:3, border:`1px solid ${pm.color}25`, flexShrink:0 }}>
              <PmIcon size={8}/>{pm.label}
            </span>
            {cmd.cooldown && (
              <span style={{ fontSize:9, fontWeight:600, color:'var(--text3)', display:'inline-flex', alignItems:'center', gap:3, flexShrink:0 }}>
                <Clock size={9}/>{cmd.cooldown>=3600?Math.round(cmd.cooldown/3600)+'h':cmd.cooldown+'s'}
              </span>
            )}
          </div>
          <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, wordBreak:'break-word' }}>{cmd.description}</p>
        </div>
        <div style={{ display:'flex', gap:4, flexShrink:0, alignItems:'center' }}>
          <CopyButton text={prefix+cmd.name}/>
          <ChevronRight size={13} color="var(--text3)"
            style={{ transform:expanded?'rotate(90deg)':'none', transition:'transform .2s', marginTop:1 }}/>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
          <div style={{ marginBottom:10 }}>
            <span style={{ fontSize:9, fontWeight:700, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase', marginRight:8 }}>USO</span>
            <code style={{ fontFamily:'ui-monospace,monospace', fontSize:11, color:'var(--text2)', background:'rgba(255,255,255,.04)', padding:'2px 8px', borderRadius:4, wordBreak:'break-all' }}>{cmd.usage}</code>
          </div>
          {cmd.example && (
            <div style={{ marginBottom:10 }}>
              <span style={{ fontSize:9, fontWeight:700, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:7 }}>EJEMPLO</span>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:color+'18', border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11 }}>👤</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="wa-bubble" style={{ color, borderColor:color+'30', background:color+'0a', wordBreak:'break-all' }}>{cmd.example}</div>
                  <div style={{ fontSize:9, color:'var(--text3)', marginTop:3, paddingLeft:4 }}>✓✓ enviado</div>
                </div>
                <CopyButton text={cmd.example}/>
              </div>
            </div>
          )}
          {cmd.aliases.length>0 && (
            <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
              <span style={{ fontSize:9, fontWeight:700, color:'var(--text3)', letterSpacing:'.06em', textTransform:'uppercase' }}>ALIAS</span>
              {cmd.aliases.map(a=>(
                <span key={a} style={{ fontFamily:'ui-monospace,monospace', fontSize:10, color:'var(--text3)', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:4, padding:'1px 6px' }}>
                  {prefix}{a}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Commands() {
  const [search,    setSearch]  = useState('')
  const [activeId,  setActiveId]= useState('admin')
  const [permFilter,setPermF]   = useState<'all'|'admin'|'owner'|''>('')
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
    { label:'Total',     val:totalCmds,                                                                  color:'#EC4899', icon:Terminal  },
    { label:'Públicos',  val:CATEGORIES.flatMap(c=>c.commands).filter(c=>c.permission==='all').length,   color:'#10B981', icon:Globe     },
    { label:'Admin',     val:CATEGORIES.flatMap(c=>c.commands).filter(c=>c.permission==='admin').length, color:'#F59E0B', icon:Shield    },
    { label:'Categ.',    val:CATEGORIES.length,                                                          color:'#8B5CF6', icon:BookOpen  },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="animate-fade-up">

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div>
          <div className="page-title"><Terminal size={17} color="#EC4899"/>Comandos</div>
          <div className="page-subtitle">
            {totalCmds} comandos · prefijo{' '}
            <code style={{ fontFamily:'monospace', color:'#EC4899', background:'rgba(236,72,153,.12)', padding:'0 5px', borderRadius:4 }}>{prefix}</code>
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input className="input" placeholder="Buscar comando…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ paddingLeft:26, width:isMobile?150:200, fontSize:12 }}/>
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {([['','Todos'],['all','Público'],['admin','Admin']] as [string,string][]).map(([k,l])=>(
              <button key={k} className={`btn btn-xs ${permFilter===k?'btn-primary':'btn-ghost'}`}
                onClick={()=>setPermF(k as ''|'all'|'admin'|'owner')}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats — 2×2 on mobile, 4-col on desktop */}
      <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:8 }}>
        {STATS.map(({label,val,color,icon:Icon})=>(
          <div key={label} className="card"
            style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10, borderTop:`2px solid ${color}50` }}>
            <div style={{ width:30, height:30, borderRadius:8, background:color+'12', border:`1px solid ${color}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={13} color={color}/>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:800, fontSize:20, color, letterSpacing:'-0.03em', lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em', marginTop:2, whiteSpace:'nowrap' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── SEARCH RESULTS (any viewport) ── */}
      {search.trim() ? (
        filteredCats.length===0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Terminal size={18} color="var(--text3)"/></div>
              <div className="empty-state-title">Sin resultados para "{search}"</div>
            </div>
          </div>
        ) : filteredCats.map(cat=>(
          <div key={cat.id}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, padding:'0 2px' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:cat.color+'18', border:`1px solid ${cat.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <cat.icon size={11} color={cat.color}/>
              </div>
              <span style={{ fontSize:12, fontWeight:600, color:cat.color }}>{cat.label}</span>
              <span className="badge badge-blue">{cat.commands.length}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {cat.commands.map(cmd=><CommandCard key={cmd.name} cmd={cmd} prefix={prefix} color={cat.color}/>)}
            </div>
          </div>
        ))

      /* ── MOBILE: tabs + stacked list ── */
      ) : isMobile ? (
        <>
          {/* Horizontal scrollable category tabs */}
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
            {CATEGORIES.map(cat=>{
              const isActive=activeId===cat.id
              return (
                <button key={cat.id} onClick={()=>setActiveId(cat.id)} style={{
                  display:'flex', alignItems:'center', gap:7, padding:'8px 13px',
                  borderRadius:20, flexShrink:0, cursor:'pointer', transition:'all .18s',
                  background:isActive?cat.color+'15':'rgba(255,255,255,.04)',
                  border:`1px solid ${isActive?cat.color+'45':'rgba(255,255,255,.08)'}`,
                  boxShadow:isActive?`0 0 12px ${cat.color}18`:'none',
                }}>
                  <cat.icon size={12} color={isActive?cat.color:'var(--text3)'}/>
                  <span style={{ fontSize:12, fontWeight:isActive?600:500, color:isActive?cat.color:'var(--text3)', whiteSpace:'nowrap' }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize:10, fontWeight:700, color:isActive?cat.color:'var(--text3)', opacity:.7 }}>
                    {cat.commands.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Active category header */}
          {activeCategory && (
            <div className="card" style={{ padding:'12px 14px', borderLeft:`3px solid ${activeCategory.color}`, background:activeCategory.color+'06' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:activeCategory.color+'18', border:`1px solid ${activeCategory.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <activeCategory.icon size={14} color={activeCategory.color}/>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:activeCategory.color, fontFamily:"'Noto Serif JP',serif" }}>{activeCategory.label}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:1 }}>{activeCategory.description} · {activeCategory.commands.length} cmds</div>
                </div>
              </div>
            </div>
          )}

          {/* Commands full-width list */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(activeCategory?.commands??[]).map(cmd=>(
              <CommandCard key={cmd.name} cmd={cmd} prefix={prefix} color={activeCategory!.color}/>
            ))}
          </div>

          {/* Permission legend */}
          <div className="card" style={{ padding:'12px 14px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>Permisos</div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {Object.entries(PERM_META).map(([k,pm])=>{
                const Icon=pm.icon
                return (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:20, height:20, borderRadius:5, background:pm.bg, border:`1px solid ${pm.color}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={10} color={pm.color}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:pm.color }}>{pm.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>

      /* ── DESKTOP: sidebar + content panel ── */
      ) : (
        <div style={{ display:'flex', gap:14 }}>
          {/* Category sidebar */}
          <div style={{ width:200, flexShrink:0, display:'flex', flexDirection:'column', gap:4 }}>
            {CATEGORIES.map(cat=>{
              const isActive=activeId===cat.id
              return (
                <button key={cat.id} onClick={()=>setActiveId(cat.id)} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10,
                  background:isActive?cat.color+'12':'rgba(255,255,255,.025)',
                  border:`1px solid ${isActive?cat.color+'35':'rgba(255,255,255,.06)'}`,
                  cursor:'pointer', textAlign:'left', transition:'all .18s', width:'100%',
                  boxShadow:isActive?`0 0 14px ${cat.color}12`:'none',
                }}>
                  <div style={{ width:28, height:28, borderRadius:7, background:cat.color+'18', border:`1px solid ${cat.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <cat.icon size={13} color={cat.color}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:isActive?600:500, color:isActive?cat.color:'var(--text2)' }}>{cat.label}</div>
                    <div style={{ fontSize:9, color:'var(--text3)', marginTop:1 }}>{cat.commands.length} cmds</div>
                  </div>
                  {isActive && <ChevronRight size={12} color={cat.color}/>}
                </button>
              )
            })}

            <div className="card" style={{ padding:'12px 14px', marginTop:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'.05em', textTransform:'uppercase', marginBottom:10 }}>Permisos</div>
              {Object.entries(PERM_META).map(([k,pm])=>{
                const Icon=pm.icon
                return (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
                    <div style={{ width:20, height:20, borderRadius:5, background:pm.bg, border:`1px solid ${pm.color}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon size={10} color={pm.color}/>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, color:pm.color }}>{pm.label}</span>
                  </div>
                )
              })}
              <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', fontSize:10, color:'var(--text3)', display:'flex', alignItems:'center', gap:5 }}>
                <Zap size={10}/>Haz clic para ver detalles
              </div>
            </div>
          </div>

          {/* Command detail */}
          <div style={{ flex:1, minWidth:0 }}>
            {activeCategory ? (
              <>
                <div className="card" style={{ padding:'14px 18px', marginBottom:12, borderLeft:`3px solid ${activeCategory.color}`, background:activeCategory.color+'04' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:activeCategory.color+'18', border:`1px solid ${activeCategory.color}30`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <activeCategory.icon size={16} color={activeCategory.color}/>
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:activeCategory.color, fontFamily:"'Noto Serif JP',serif" }}>{activeCategory.label}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{activeCategory.description} · {activeCategory.commands.length} comandos</div>
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {activeCategory.commands.map(cmd=><CommandCard key={cmd.name} cmd={cmd} prefix={prefix} color={activeCategory.color}/>)}
                </div>
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

      <div style={{ height:4 }}/>
    </div>
  )
}
