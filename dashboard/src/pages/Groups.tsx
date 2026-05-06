import { useEffect, useState, type ElementType } from 'react'
import {
  Search, RefreshCw, MessageSquare, Shield, Link, Bell, Send,
  X, Check, Power, PowerOff, Trash2, AlertTriangle, ToggleLeft, ToggleRight,
  Users, Zap,
} from 'lucide-react'
import {
  getGroups, postBroadcast, patchGroupEnabled, deleteGroup, postGroupSettings,
  isConfigured, type Group,
} from '../api'

/* ─── Rank helpers ───────────────────────────────────────── */
function getGroupRank(g: Group): string {
  const active = [g.antiLink, g.antiSpam, g.welcome].filter(Boolean).length
  if (!g.botEnabled) return 'E'
  if (active === 3) return 'S'
  if (active === 2) return 'A'
  if (active === 1) return 'B'
  return 'C'
}

const RANK_META: Record<string,{ color:string; glow:string; bg:string; label:string }> = {
  S: { color:'#F59E0B', glow:'rgba(245,158,11,.30)', bg:'linear-gradient(135deg,rgba(245,158,11,.14),rgba(245,158,11,.04))', label:'S — Elite'   },
  A: { color:'#8B5CF6', glow:'rgba(139,92,246,.28)', bg:'linear-gradient(135deg,rgba(139,92,246,.14),rgba(139,92,246,.04))', label:'A — Avanzado' },
  B: { color:'#3B82F6', glow:'rgba(59,130,246,.28)',  bg:'linear-gradient(135deg,rgba(59,130,246,.14),rgba(59,130,246,.04))',  label:'B — Medio'    },
  C: { color:'#10B981', glow:'rgba(16,185,129,.25)',  bg:'linear-gradient(135deg,rgba(16,185,129,.12),rgba(16,185,129,.04))',  label:'C — Básico'   },
  E: { color:'#EF4444', glow:'rgba(239,68,68,.20)',   bg:'linear-gradient(135deg,rgba(239,68,68,.08),rgba(239,68,68,.02))',   label:'E — Sellado'  },
}

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ msg, ok, onClose }: { msg:string; ok:boolean; onClose:()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:999,
      display:'flex', alignItems:'center', gap:10, padding:'11px 18px',
      borderRadius:12, fontWeight:700, fontSize:13,
      background:ok?'rgba(16,185,129,.10)':'rgba(239,68,68,.10)',
      border:`1px solid ${ok?'rgba(16,185,129,.30)':'rgba(239,68,68,.30)'}`,
      color:ok?'#34D399':'#F87171',
      boxShadow:'0 8px 32px rgba(0,0,0,.55)', backdropFilter:'blur(14px)',
      animation:'fadeUp .22s cubic-bezier(.16,1,.3,1)',
    }}>
      {ok?<Check size={14}/>:<X size={14}/>}
      <span>{msg}</span>
      <button onClick={onClose} style={{ marginLeft:6, background:'none', border:'none', cursor:'pointer', color:'inherit', opacity:.5, padding:0 }}><X size={12}/></button>
    </div>
  )
}

/* ─── Confirm modal ──────────────────────────────────────── */
function ConfirmModal({ group, onConfirm, onCancel, loading }: {
  group:Group; onConfirm:()=>void; onCancel:()=>void; loading:boolean
}) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200, display:'flex',
      alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,.88)', backdropFilter:'blur(12px)',
    }} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="card animate-scale-in" style={{
        width:340, padding:24,
        border:'1px solid rgba(239,68,68,.32)',
        boxShadow:'0 0 48px rgba(239,68,68,.12), 0 24px 60px rgba(0,0,0,.7)',
        borderRadius:14,
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.25)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px rgba(239,68,68,.20)' }}>
            <AlertTriangle size={16} color="#EF4444"/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#F87171' }}>Confirmar eliminación</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>Esta acción no se puede deshacer</div>
          </div>
        </div>
        {/* Group preview */}
        <div style={{ background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.14)', borderRadius:9, padding:'10px 13px', marginBottom:18 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{group.name || 'GRUPO SIN NOMBRE'}</div>
          <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace', marginTop:2 }}>{group.jid.split('@')[0]}</div>
        </div>
        <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7, marginBottom:20 }}>
          El bot <strong style={{ color:'var(--text)' }}>dejará de responder</strong> en este grupo y se borrará su configuración.
        </p>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="btn btn-red" style={{ flex:1 }} onClick={onConfirm} disabled={loading}>
            {loading?<RefreshCw size={11} style={{ animation:'spin 1s linear infinite' }}/>:<Trash2 size={11}/>}
            {loading?'Eliminando…':'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Dungeon card ───────────────────────────────────────── */
function DungeonCard({
  group, onToggleEnabled, onDelete, onToggleFeat,
  loading, deleting, selected, onSelect, broadcast,
}: {
  group:Group; onToggleEnabled:()=>void; onDelete:()=>void
  onToggleFeat:(key:'antiLink'|'antiSpam'|'welcome',val:boolean)=>void
  loading:boolean; deleting:boolean; selected:boolean; onSelect:()=>void; broadcast:boolean
}) {
  const [hovered, setHovered] = useState(false)
  const enabled     = group.botEnabled !== false
  const rank        = getGroupRank(group)
  const rm          = RANK_META[rank] ?? RANK_META['C']
  const activeCount = [group.antiLink, group.antiSpam, group.welcome].filter(Boolean).length

  const FEATS: { key:'antiLink'|'antiSpam'|'welcome'; label:string; icon:ElementType; color:string }[] = [
    { key:'antiLink', label:'Anti-Link', icon:Link,   color:'#EF4444' },
    { key:'antiSpam', label:'Anti-Spam', icon:Shield, color:'#F59E0B' },
    { key:'welcome',  label:'Welcome',   icon:Bell,   color:'#10B981' },
  ]

  const isActive = hovered || selected

  return (
    <div
      className={!enabled ? 'sealed' : ''}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={broadcast ? onSelect : undefined}
      style={{
        borderRadius:13, padding:15, position:'relative', overflow:'hidden',
        cursor:broadcast?'pointer':'default', transition:'all .2s',
        background: isActive ? rm.bg : 'rgba(255,255,255,.032)',
        border:`1px solid ${isActive ? rm.color+'45' : 'rgba(255,255,255,.072)'}`,
        boxShadow:isActive?`0 0 28px ${rm.glow}, 0 4px 20px rgba(0,0,0,.3)`:'0 2px 8px rgba(0,0,0,.12)',
        opacity:!enabled?.55:1,
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, height:2,
        background:enabled
          ?`linear-gradient(90deg,${rm.color},${rm.color}55,transparent)`
          :'linear-gradient(90deg,rgba(239,68,68,.5),transparent)',
        transition:'opacity .2s', opacity:isActive?1:.6,
      }}/>

      {/* Rank + status badges top-right */}
      <div style={{ position:'absolute', top:11, right:12, display:'flex', gap:5, alignItems:'center' }}>
        {selected && broadcast && (
          <div style={{ width:18, height:18, borderRadius:5, background:'#3B82F6', border:'1px solid #60A5FA', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 10px rgba(59,130,246,.5)' }}>
            <Check size={10} color="white"/>
          </div>
        )}
        <span style={{
          fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:20,
          background:rm.bg, color:rm.color, border:`1px solid ${rm.color}35`,
          boxShadow:`0 0 8px ${rm.glow}`, letterSpacing:'.05em',
        }}>{rank}</span>
        {!enabled && <span className="badge badge-red" style={{ fontSize:8, letterSpacing:'.04em' }}>SEALED</span>}
      </div>

      {/* Group info */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:11, marginBottom:13, paddingRight:76 }}>
        <div style={{
          width:40, height:40, flexShrink:0, borderRadius:11,
          background:enabled?rm.bg:'rgba(239,68,68,.06)',
          border:`1.5px solid ${enabled?rm.color+'40':'rgba(239,68,68,.20)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:enabled?`0 0 14px ${rm.glow}`:'none',
        }}>
          <MessageSquare size={15} color={enabled?rm.color:'#F87171'}/>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)', marginBottom:3 }}>
            {group.name || 'Sin nombre'}
          </div>
          <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'monospace', marginBottom:4 }}>
            {group.jid.split('@')[0].slice(0, 22)}
          </div>
          {/* Module progress bar */}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ flex:1, height:3, background:'rgba(255,255,255,.06)', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${(activeCount/3)*100}%`, background:`linear-gradient(90deg,${rm.color},${rm.color}88)`, borderRadius:2, boxShadow:`0 0 6px ${rm.glow}`, transition:'width .5s' }}/>
            </div>
            <span style={{ fontSize:9, color:rm.color, fontWeight:700, flexShrink:0 }}>{activeCount}/3</span>
          </div>
        </div>
      </div>

      {/* Feature chips */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:13 }}>
        {FEATS.map(feat => {
          const on = group[feat.key] as boolean
          return (
            <button key={feat.key}
              onClick={e => { e.stopPropagation(); if (enabled) onToggleFeat(feat.key, !on) }}
              disabled={!enabled || loading}
              style={{
                display:'inline-flex', alignItems:'center', gap:4,
                padding:'4px 9px', borderRadius:7, fontSize:10, fontWeight:on?700:500,
                cursor:enabled?'pointer':'not-allowed', transition:'all .16s',
                background:on?`linear-gradient(135deg,${feat.color}14,${feat.color}06)`:'rgba(255,255,255,.03)',
                border:`1px solid ${on?feat.color+'35':'rgba(255,255,255,.08)'}`,
                color:on?feat.color:'var(--text3)',
                boxShadow:on?`0 0 8px ${feat.color}20`:'none',
              }}>
              {on?<ToggleRight size={11}/>:<ToggleLeft size={11}/>}
              <feat.icon size={9}/>
              {feat.label}
            </button>
          )
        })}
      </div>

      {/* Action row */}
      <div style={{ display:'flex', gap:6, paddingTop:11, borderTop:`1px solid ${rm.color}18`, alignItems:'center' }}>
        <button
          onClick={e => { e.stopPropagation(); onToggleEnabled() }}
          disabled={loading}
          style={{
            display:'inline-flex', alignItems:'center', gap:6, padding:'6px 14px',
            borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer',
            transition:'all .16s', letterSpacing:'.04em',
            background:enabled?'rgba(239,68,68,.08)':'rgba(16,185,129,.08)',
            border:`1px solid ${enabled?'rgba(239,68,68,.25)':'rgba(16,185,129,.25)'}`,
            color:enabled?'#F87171':'#34D399',
            boxShadow:enabled?'0 0 10px rgba(239,68,68,.10)':'0 0 10px rgba(16,185,129,.10)',
          }}>
          {loading
            ?<RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }}/>
            :enabled?<><PowerOff size={10}/> Sellar</> : <><Power size={10}/> Activar</>
          }
        </button>

        <div style={{ flex:1 }}/>

        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          disabled={deleting}
          title="Eliminar del bot"
          style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:30, height:30, borderRadius:8, cursor:'pointer', transition:'all .16s',
            background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.16)',
            color:'rgba(239,68,68,.45)',
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.background='rgba(239,68,68,.14)'; b.style.color='#F87171'; b.style.borderColor='rgba(239,68,68,.35)' }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.background='rgba(239,68,68,.06)'; b.style.color='rgba(239,68,68,.45)'; b.style.borderColor='rgba(239,68,68,.16)' }}>
          {deleting?<RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }}/>:<Trash2 size={10}/>}
        </button>
      </div>
    </div>
  )
}

type FilterTab = 'all' | 'active' | 'inactive'

/* ══ MAIN ═════════════════════════════════════════════════════ */
export default function Groups() {
  const [groups,       setGroups]     = useState<Group[]>([])
  const [loading,      setLoad]       = useState(true)
  const [search,       setSearch]     = useState('')
  const [filter,       setFilter]     = useState<FilterTab>('all')
  const [refreshing,   setRef]        = useState(false)
  const [broadcast,    setBc]         = useState(false)
  const [bcMsg,        setBcMsg]      = useState('')
  const [bcSending,    setBcSend]     = useState(false)
  const [bcResult,     setBcRes]      = useState<{ok:boolean;text:string}|null>(null)
  const [selected,     setSelected]   = useState<Set<string>>(new Set())
  const [toggling,     setToggling]   = useState<Set<string>>(new Set())
  const [deletingId,   setDeletingId] = useState<string|null>(null)
  const [confirmGroup, setConfirmGroup] = useState<Group|null>(null)
  const [toast,        setToast]      = useState<{msg:string;ok:boolean}|null>(null)

  const showToast = (msg: string, ok = true) => setToast({ msg, ok })

  const load = async (r = false) => {
    if (!isConfigured()) { setLoad(false); return }
    if (r) setRef(true)
    try { setGroups(await getGroups()) } catch {}
    setLoad(false); setRef(false)
  }
  useEffect(() => { load() }, [])

  if (!isConfigured()) return (
    <div className="empty-state">
      <div className="empty-state-icon"><AlertTriangle size={20} color="var(--amber)"/></div>
      <div className="empty-state-title">API sin configurar</div>
      <div className="empty-state-sub">Ve a Vercel → Settings → Environment Variables</div>
    </div>
  )
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div className="skeleton" style={{ height:48, borderRadius:9 }}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:10 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height:210 }}/>)}
      </div>
    </div>
  )

  const activeGroups   = groups.filter(g => g.botEnabled !== false)
  const inactiveGroups = groups.filter(g => g.botEnabled === false)
  const filtered = groups
    .filter(g => (g.name||'').toLowerCase().includes(search.toLowerCase()) || g.jid.includes(search))
    .filter(g => filter==='active'?g.botEnabled!==false:filter==='inactive'?g.botEnabled===false:true)

  const handleToggleEnabled = async (g: Group) => {
    const newEnabled = g.botEnabled === false
    setToggling(prev => new Set(prev).add(g.jid))
    try {
      await patchGroupEnabled(g.jid, newEnabled)
      setGroups(prev => prev.map(x => x.jid===g.jid?{...x,botEnabled:newEnabled}:x))
      showToast(newEnabled?`Activado: "${g.name||g.jid.split('@')[0]}"`:`Sellado: "${g.name||g.jid.split('@')[0]}"`, newEnabled)
    } catch (err) { showToast(err instanceof Error?err.message:'Error', false) }
    setToggling(prev => { const n=new Set(prev); n.delete(g.jid); return n })
  }

  const handleDelete = async (g: Group) => {
    setDeletingId(g.jid)
    try {
      await deleteGroup(g.jid)
      setGroups(prev => prev.filter(x => x.jid!==g.jid))
      setConfirmGroup(null)
      showToast(`"${g.name||g.jid.split('@')[0]}" eliminado del sistema`)
    } catch (err) { showToast(err instanceof Error?err.message:'Error', false) }
    setDeletingId(null)
  }

  const handleToggleFeat = async (g: Group, key: 'antiLink'|'antiSpam'|'welcome', val: boolean) => {
    setGroups(prev => prev.map(x => x.jid===g.jid?{...x,[key]:val}:x))
    try {
      await postGroupSettings(g.jid, { [key]: val })
      showToast(`${key} → ${val?'ON':'OFF'}`)
    } catch (err) {
      setGroups(prev => prev.map(x => x.jid===g.jid?{...x,[key]:!val}:x))
      showToast(err instanceof Error?err.message:'Error', false)
    }
  }

  const toggleSelect = (jid: string) =>
    setSelected(prev => { const n=new Set(prev); n.has(jid)?n.delete(jid):n.add(jid); return n })

  const sendBroadcast = async () => {
    if (!bcMsg.trim()) return
    setBcSend(true); setBcRes(null)
    try {
      const targets = selected.size>0?[...selected]:activeGroups.map(g=>g.jid)
      await postBroadcast(bcMsg.trim(), targets)
      setBcRes({ ok:true, text:`Enviado a ${targets.length} grupo(s)` })
      setBcMsg(''); setSelected(new Set())
    } catch (e) { setBcRes({ ok:false, text:e instanceof Error?e.message:'ERROR' }) }
    setBcSend(false)
  }

  const rankDist: Record<string,number> = {}
  for (const g of groups) { const r=getGroupRank(g); rankDist[r]=(rankDist[r]||0)+1 }

  const STAT_CARDS = [
    { label:'Total',    val:groups.length,        color:'#3B82F6', icon:MessageSquare },
    { label:'Activos',  val:activeGroups.length,  color:'#10B981', icon:Power        },
    { label:'Sellados', val:inactiveGroups.length, color:'#EF4444', icon:PowerOff     },
    { label:'S-Rank',   val:rankDist['S']||0,     color:'#F59E0B', icon:Zap          },
    { label:'A-Rank',   val:rankDist['A']||0,     color:'#8B5CF6', icon:Shield       },
    { label:'Usuarios', val:groups.reduce((s,g)=>s+(g.memberCount??0),0) || groups.length, color:'#06B6D4', icon:Users },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="animate-fade-up">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={()=>setToast(null)}/>}
      {confirmGroup && (
        <ConfirmModal group={confirmGroup}
          onConfirm={() => handleDelete(confirmGroup)}
          onCancel={() => setConfirmGroup(null)}
          loading={deletingId===confirmGroup.jid}/>
      )}

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div className="page-title"><MessageSquare size={17} color="#3B82F6"/>Grupos</div>
          <div className="page-subtitle">{groups.length} grupos · {activeGroups.length} activos · {inactiveGroups.length} sellados</div>
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input className="input" placeholder="Buscar grupo…" value={search} onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:27, width:175, fontSize:12 }}/>
          </div>
          <button className="btn btn-blue btn-sm" onClick={() => { setBc(b=>!b); if (broadcast) setBcRes(null) }}>
            <Send size={11}/> Broadcast
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={11} style={{ animation:refreshing?'spin 1s linear infinite':'none' }}/>
          </button>
        </div>
      </div>

      {/* ── Stats strip — gradient cards ── */}
      <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' } as React.CSSProperties}>
        {STAT_CARDS.map(s => (
          <div key={s.label} style={{
            flexShrink:0, borderRadius:11, padding:'10px 14px', minWidth:80,
            background:`linear-gradient(135deg,${s.color}14,${s.color}04)`,
            border:`1px solid ${s.color}28`,
            display:'flex', flexDirection:'column', gap:5,
            boxShadow:`0 0 14px ${s.color}14`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:22, height:22, borderRadius:6, background:s.color+'18', border:`1px solid ${s.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <s.icon size={11} color={s.color}/>
              </div>
              <span style={{ fontWeight:800, fontSize:19, color:s.color, lineHeight:1, letterSpacing:'-0.04em' }}>{s.val}</span>
            </div>
            <span style={{ fontSize:9, color:s.color, opacity:.65, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
        {([
          { key:'all',      label:`Todos (${groups.length})` },
          { key:'active',   label:`Activos (${activeGroups.length})`,   color:'#10B981' },
          { key:'inactive', label:`Sellados (${inactiveGroups.length})`, color:'#EF4444' },
        ] as { key:FilterTab; label:string; color?:string }[]).map(tab => (
          <button key={tab.key}
            className={`btn btn-xs ${filter===tab.key?'btn-primary':'btn-ghost'}`}
            onClick={() => setFilter(tab.key)}
            style={filter!==tab.key&&tab.color?{color:tab.color,borderColor:tab.color+'28'}:undefined}>
            {tab.label}
          </button>
        ))}
        {search && (
          <button className="btn btn-xs btn-ghost" onClick={() => setSearch('')} style={{ marginLeft:4 }}>
            <X size={10}/> Limpiar
          </button>
        )}
      </div>

      {/* ── Broadcast panel ── */}
      {broadcast && (
        <div className="card animate-scale-in" style={{ padding:0, borderRadius:13 }}>
          <div className="sys-header" style={{ borderRadius:'13px 13px 0 0' }}>
            <Send size={12} color="#3B82F6"/>
            <span className="sys-header-title">Broadcast a grupos</span>
            <button className="btn btn-ghost btn-xs" style={{ marginLeft:'auto', padding:'2px 6px' }}
              onClick={() => { setBc(false); setBcRes(null); setBcMsg(''); setSelected(new Set()) }}>
              <X size={11}/>
            </button>
          </div>
          <div style={{ padding:'14px 16px' }}>
            {bcResult && (
              <div className={`alert ${bcResult.ok?'alert-ok':'alert-err'}`} style={{ marginBottom:12 }}>
                {bcResult.ok?<Check size={13}/>:<X size={13}/>} {bcResult.text}
              </div>
            )}
            <div style={{ marginBottom:10 }}>
              <label className="label">Mensaje</label>
              <textarea className="textarea" placeholder="Escribe el mensaje de broadcast…"
                value={bcMsg} onChange={e => setBcMsg(e.target.value)} style={{ minHeight:72 }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <label className="label" style={{ margin:0 }}>
                Destino: <strong style={{ color:'var(--text)' }}>{selected.size>0?`${selected.size} seleccionados`:`${activeGroups.length} activos`}</strong>
              </label>
              <div style={{ display:'flex', gap:5 }}>
                <button className="btn btn-xs btn-ghost" onClick={() => setSelected(new Set(activeGroups.map(g=>g.jid)))}>Todos</button>
                {selected.size>0&&<button className="btn btn-xs btn-ghost" onClick={() => setSelected(new Set())}>Limpiar</button>}
              </div>
            </div>
            <p style={{ fontSize:10, color:'var(--text3)', marginBottom:12 }}>Toca las tarjetas para seleccionar grupos destino.</p>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-primary" onClick={sendBroadcast} disabled={bcSending||!bcMsg.trim()}>
                {bcSending?<RefreshCw size={11} style={{ animation:'spin 1s linear infinite' }}/>:<Send size={11}/>}
                {bcSending?'Enviando…':`Enviar → ${selected.size>0?selected.size:activeGroups.length} grupo(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Groups grid ── */}
      {filtered.length===0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><MessageSquare size={18} color="var(--text3)"/></div>
            <div className="empty-state-title">{search?'Sin resultados':filter!=='all'?'Categoría vacía':'Sin grupos'}</div>
            <div className="empty-state-sub">{search?'Intenta con otro término':filter!=='all'?'No hay grupos en esta categoría':'El bot no está en ningún grupo'}</div>
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:10 }}>
          {filtered.map(g => (
            <DungeonCard key={g.jid} group={g}
              onToggleEnabled={() => handleToggleEnabled(g)}
              onDelete={() => setConfirmGroup(g)}
              onToggleFeat={(key,val) => handleToggleFeat(g,key,val)}
              loading={toggling.has(g.jid)}
              deleting={deletingId===g.jid}
              selected={selected.has(g.jid)}
              onSelect={() => toggleSelect(g.jid)}
              broadcast={broadcast}/>
          ))}
        </div>
      )}

      <div style={{ height:4 }}/>
    </div>
  )
}
