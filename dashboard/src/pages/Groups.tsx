import { useEffect, useState, type ElementType } from 'react'
import {
  Search, RefreshCw, MessageSquare, Shield, Link, Bell, Send,
  X, Check, Power, PowerOff, Trash2, AlertTriangle, ToggleLeft, ToggleRight
} from 'lucide-react'
import {
  getGroups, postBroadcast, patchGroupEnabled, deleteGroup, postGroupSettings,
  isConfigured, type Group
} from '../api'

function getGroupRank(g: Group): string {
  const active = [g.antiLink, g.antiSpam, g.welcome].filter(Boolean).length
  if (!g.botEnabled) return 'E'
  if (active === 3) return 'S'
  if (active === 2) return 'A'
  if (active === 1) return 'B'
  return 'C'
}

function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderRadius: 'var(--radius)',
      background: ok ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.08)',
      border: `1px solid ${ok ? 'rgba(16,185,129,.25)' : 'rgba(239,68,68,.25)'}`,
      color: ok ? '#34D399' : '#F87171',
      boxShadow: '0 8px 32px rgba(0,0,0,.5)', backdropFilter: 'blur(12px)',
      fontWeight: 700, fontSize: 13, animation: 'fadeUp .2s cubic-bezier(.16,1,.3,1)',
    }}>
      {ok ? <Check size={14}/> : <X size={14}/>}
      <span>{msg}</span>
      <button onClick={onClose} style={{ marginLeft:6, background:'none', border:'none', cursor:'pointer', color:'inherit', opacity:.5, padding:0 }}><X size={12}/></button>
    </div>
  )
}

function ConfirmModal({ group, onConfirm, onCancel, loading }: {
  group: Group; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(10px)',
    }} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="card animate-scale-in" style={{ width: 340, padding: 22, border: '1px solid rgba(239,68,68,.30)', boxShadow: '0 0 40px rgba(239,68,68,.10), 0 20px 60px rgba(0,0,0,.7)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'rgba(239,68,68,.10)', border:'1px solid rgba(239,68,68,.22)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <AlertTriangle size={14} color="#EF4444"/>
          </div>
          <span style={{ fontSize:13, fontWeight:700, color:'#F87171' }}>Confirmar eliminación</span>
        </div>

        <div style={{ background:'rgba(239,68,68,.04)', border:'1px solid rgba(239,68,68,.12)', borderRadius:8, padding:'9px 12px', marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{group.name || 'GRUPO SIN NOMBRE'}</div>
          <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace', marginTop:2 }}>{group.jid.split('@')[0]}</div>
        </div>

        <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7, marginBottom:18 }}>
          El bot <strong style={{ color:'var(--text)' }}>dejará de responder</strong> en este grupo. La configuración será eliminada.
        </p>

        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={onCancel} disabled={loading}>Cancelar</button>
          <button className="btn btn-red" style={{ flex:1 }} onClick={onConfirm} disabled={loading}>
            {loading ? <RefreshCw size={11} style={{ animation:'spin 1s linear infinite' }}/> : <Trash2 size={11}/>}
            {loading ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DungeonCard({
  group, onToggleEnabled, onDelete, onToggleFeat,
  loading, deleting, selected, onSelect, broadcast,
}: {
  group: Group; onToggleEnabled: () => void; onDelete: () => void
  onToggleFeat: (key: 'antiLink'|'antiSpam'|'welcome', val: boolean) => void
  loading: boolean; deleting: boolean; selected: boolean; onSelect: () => void; broadcast: boolean
}) {
  const enabled     = group.botEnabled !== false
  const rank        = getGroupRank(group)
  const activeCount = [group.antiLink, group.antiSpam, group.welcome].filter(Boolean).length

  const FEATS: { key: 'antiLink'|'antiSpam'|'welcome'; label: string; icon: ElementType; color: string }[] = [
    { key: 'antiLink', label: 'ANTI-LINK', icon: Link,   color: '#EF4444' },
    { key: 'antiSpam', label: 'ANTI-SPAM', icon: Shield, color: '#F59E0B' },
    { key: 'welcome',  label: 'WELCOME',   icon: Bell,   color: '#10B981' },
  ]
  const rankColor: Record<string,string> = {
    S: '#F59E0B', A: '#8B5CF6', B: '#3B82F6', C: '#10B981', E: 'rgba(255,255,255,.18)',
  }
  const rc = rankColor[rank] ?? 'rgba(255,255,255,.18)'

  return (
    <div
      className={`dungeon-card ${!enabled ? 'sealed' : ''} ${selected ? 'selected' : ''}`}
      style={{ padding: 14, cursor: broadcast ? 'pointer' : 'default' }}
      onClick={broadcast ? onSelect : undefined}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: enabled
          ? `linear-gradient(90deg, ${rc}, transparent)`
          : 'linear-gradient(90deg, rgba(239,68,68,.4), transparent)',
      }}/>

      {/* Rank badge + broadcast checkbox */}
      <div style={{ position:'absolute', top:10, right:12, display:'flex', gap:5, alignItems:'center' }}>
        <span className={`rank rank-${rank.toLowerCase()}`}>{rank}</span>
        {broadcast && selected && (
          <div style={{ width:15, height:15, borderRadius:3, background:'#3B82F6', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 6px #3B82F6' }}>
            <Check size={9} color="white"/>
          </div>
        )}
        {!enabled && (
          <span className="badge badge-red" style={{ fontSize:8 }}>SEALED</span>
        )}
      </div>

      {/* Group info header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:11, paddingRight:72 }}>
        <div style={{
          width:36, height:36, flexShrink:0, borderRadius:9,
          background: enabled ? 'rgba(59,130,246,.08)' : 'rgba(239,68,68,.06)',
          border: `1px solid ${enabled ? 'rgba(59,130,246,.18)' : 'rgba(239,68,68,.16)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          <MessageSquare size={14} color={enabled ? '#3B82F6' : '#F87171'}/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' }}>
            {group.name || 'Sin nombre'}
          </div>
          <div style={{ fontSize:9, color:'var(--text3)', marginTop:2, fontFamily:'monospace' }}>
            {group.jid.split('@')[0].slice(0,22)}
          </div>
          <div style={{ fontSize:9, color:'var(--text3)', marginTop:4, letterSpacing:'.06em' }}>
            {activeCount}/3 módulos activos
          </div>
        </div>
      </div>

      {/* Feature chips */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:11, opacity:!enabled?.4:1 }}>
        {FEATS.map(feat => {
          const on = group[feat.key] as boolean
          return (
            <button key={feat.key}
              className={`feat-chip ${on ? 'active' : ''}`}
              style={{ color:on?feat.color:undefined, borderColor:on?feat.color+'28':undefined, background:on?feat.color+'0c':undefined }}
              onClick={e => { e.stopPropagation(); if (enabled) onToggleFeat(feat.key, !on) }}
              disabled={!enabled || loading}>
              {on ? <ToggleRight size={10}/> : <ToggleLeft size={10}/>}
              <feat.icon size={9}/>
              {feat.label}
            </button>
          )
        })}
      </div>

      {/* Action row — compact, not full width */}
      <div style={{ display:'flex', gap:6, paddingTop:10, borderTop:'1px solid var(--border)', alignItems:'center' }}>
        <button
          onClick={e => { e.stopPropagation(); onToggleEnabled() }}
          disabled={loading}
          style={{
            display:'flex', alignItems:'center', gap:5, padding:'5px 13px',
            borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer',
            background: enabled ? 'rgba(239,68,68,.07)' : 'rgba(16,185,129,.07)',
            border: `1px solid ${enabled ? 'rgba(239,68,68,.22)' : 'rgba(16,185,129,.22)'}`,
            color: enabled ? '#F87171' : '#34D399',
            transition: 'all .16s', letterSpacing:'.04em',
          }}>
          {loading
            ? <RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }}/>
            : enabled ? <><PowerOff size={10}/> Seal</> : <><Power size={10}/> Unseal</>
          }
        </button>

        {/* Spacer */}
        <div style={{ flex:1 }}/>

        {/* Delete button — icon only, minimal */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          disabled={deleting}
          title="Eliminar del bot"
          style={{
            display:'flex', alignItems:'center', justifyContent:'center',
            width:28, height:28, borderRadius:7, cursor:'pointer',
            background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.14)',
            color:'rgba(239,68,68,.55)', transition:'all .16s',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(239,68,68,.12)';(e.currentTarget as HTMLButtonElement).style.color='#F87171'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(239,68,68,.05)';(e.currentTarget as HTMLButtonElement).style.color='rgba(239,68,68,.55)'}}>
          {deleting ? <RefreshCw size={10} style={{ animation:'spin 1s linear infinite' }}/> : <Trash2 size={10}/>}
        </button>
      </div>
    </div>
  )
}

type Filter = 'all' | 'active' | 'inactive'

export default function Groups() {
  const [groups,       setGroups]     = useState<Group[]>([])
  const [loading,      setLoad]       = useState(true)
  const [search,       setSearch]     = useState('')
  const [filter,       setFilter]     = useState<Filter>('all')
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
      <div className="skeleton" style={{ height:48, borderRadius:8 }}/>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{ height:190 }}/>)}
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
      showToast(newEnabled?`Unsealed: "${g.name||g.jid.split('@')[0]}"`:`Sealed: "${g.name||g.jid.split('@')[0]}"`, newEnabled)
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
      showToast(`${key} ${val?'ON':'OFF'}`)
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

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }} className="animate-fade-up">
      {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={()=>setToast(null)}/>}
      {confirmGroup && (
        <ConfirmModal group={confirmGroup}
          onConfirm={()=>handleDelete(confirmGroup)}
          onCancel={()=>setConfirmGroup(null)}
          loading={deletingId===confirmGroup.jid}/>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div>
          <div className="page-title"><MessageSquare size={17} color="var(--blue)"/>Grupos</div>
          <div className="page-subtitle">{groups.length} grupos · {activeGroups.length} activos · {inactiveGroups.length} sellados</div>
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <Search size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input className="input" placeholder="Buscar grupo…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{ paddingLeft:26, width:180, fontSize:12 }}/>
          </div>
          <button className="btn btn-blue btn-sm" onClick={()=>{setBc(b=>!b);if(broadcast)setBcRes(null)}}>
            <Send size={11}/> Broadcast
          </button>
          <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
            <RefreshCw size={11} style={{ animation:refreshing?'spin 1s linear infinite':'none' }}/>
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="rank-strip">
        {[
          { label:'Total',    val:groups.length,               color:'#3B82F6'  },
          { label:'Activos',  val:activeGroups.length,         color:'#10B981'  },
          { label:'Sellados', val:inactiveGroups.length,       color:'#EC4899'  },
          { label:'S-Rank',   val:rankDist['S']||0,            color:'#F59E0B'  },
          { label:'A-Rank',   val:rankDist['A']||0,            color:'#8B5CF6'  },
          { label:'Módulos',  val:groups.filter(g=>g.antiLink||g.antiSpam||g.welcome).length, color:'#06B6D4' },
        ].map(s=>(
          <div key={s.label} className="rank-strip-item card"
            style={{ padding:'9px 14px', minWidth:80, flexDirection:'column', alignItems:'flex-start', gap:3 }}>
            <div style={{ fontWeight:800, fontSize:20, color:s.color, lineHeight:1 }}>{s.val}</div>
            <div style={{ fontSize:9, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.05em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:5, alignItems:'center' }}>
        {([
          { key:'all',      label:`Todos (${groups.length})` },
          { key:'active',   label:`Activos (${activeGroups.length})`,  color:'var(--green)' },
          { key:'inactive', label:`Sellados (${inactiveGroups.length})`, color:'var(--red)' },
        ] as {key:Filter;label:string;color?:string}[]).map(tab=>(
          <button key={tab.key}
            className={`btn btn-xs ${filter===tab.key?'btn-primary':'btn-ghost'}`}
            onClick={()=>setFilter(tab.key)}
            style={filter!==tab.key&&tab.color?{color:tab.color,borderColor:tab.color+'25'}:undefined}>
            {tab.label}
          </button>
        ))}
        {search && (
          <button className="btn btn-xs btn-ghost" onClick={()=>setSearch('')} style={{ marginLeft:4 }}>
            <X size={10}/> Limpiar
          </button>
        )}
      </div>

      {/* Broadcast panel */}
      {broadcast && (
        <div className="card animate-scale-in" style={{ padding:0 }}>
          <div className="sys-header">
            <Send size={11} color="var(--blue)"/>
            <span className="sys-header-title">Broadcast</span>
            <button className="btn btn-ghost btn-xs" style={{ marginLeft:'auto', padding:'2px 6px' }}
              onClick={()=>{setBc(false);setBcRes(null);setBcMsg('');setSelected(new Set())}}>
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
                value={bcMsg} onChange={e=>setBcMsg(e.target.value)} style={{ minHeight:72 }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <label className="label" style={{ margin:0 }}>
                Destino: {selected.size>0?`${selected.size} seleccionados`:`${activeGroups.length} activos`}
              </label>
              <div style={{ display:'flex', gap:5 }}>
                <button className="btn btn-xs btn-ghost" onClick={()=>setSelected(new Set(activeGroups.map(g=>g.jid)))}>Todos</button>
                {selected.size>0&&<button className="btn btn-xs btn-ghost" onClick={()=>setSelected(new Set())}>Limpiar</button>}
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

      {/* Groups grid */}
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
          {filtered.map(g=>(
            <DungeonCard key={g.jid} group={g}
              onToggleEnabled={()=>handleToggleEnabled(g)}
              onDelete={()=>setConfirmGroup(g)}
              onToggleFeat={(key,val)=>handleToggleFeat(g,key,val)}
              loading={toggling.has(g.jid)}
              deleting={deletingId===g.jid}
              selected={selected.has(g.jid)}
              onSelect={()=>toggleSelect(g.jid)}
              broadcast={broadcast}/>
          ))}
        </div>
      )}

      <div style={{ height:4 }}/>
    </div>
  )
}
