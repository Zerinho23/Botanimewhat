import { useEffect, useState } from 'react'
  import { Shield, RefreshCw, Clock, UserX, Volume2, VolumeX, AlertTriangle, ChevronDown, Search, Check, X } from 'lucide-react'
  import { getModHistory, getGroups, postModAction, isConfigured, type ModEntry, type Group } from '../api'

  const ACTION_META: Record<string, { color: string; label: string; icon: React.ElementType }> = {
    ban:     { color:'#e53935', label:'Ban',        icon: UserX },
    kick:    { color:'#ff5252', label:'Expulsión',  icon: UserX },
    warn:    { color:'#f59e0b', label:'Advertencia', icon: AlertTriangle },
    mute:    { color:'#3b82f6', label:'Silenciar',  icon: VolumeX },
    unmute:  { color:'#10b981', label:'Desmutear',  icon: Volume2 },
    unban:   { color:'#10b981', label:'Desbanear',  icon: Shield },
  }
  function metaOf(action: string) {
    return ACTION_META[action] || { color:'rgba(240,240,245,.4)', label:action, icon:Shield }
  }

  function fmtTs(ts: number) {
    return new Date(ts).toLocaleString('es-MX', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
  }

  export default function Moderation() {
    const [history,  setHistory] = useState<ModEntry[]>([])
    const [groups,   setGroups]  = useState<Group[]>([])
    const [loading,  setLoad]    = useState(true)
    const [refreshing,setRef]    = useState(false)
    const [search,   setSearch]  = useState('')
    const [filterAct,setFA]      = useState<string>('all')
    const [showForm, setForm]    = useState(false)
    const [fGroup,   setFGroup]  = useState('')
    const [fUser,    setFUser]   = useState('')
    const [fAction,  setFAction] = useState('warn')
    const [fReason,  setFReason] = useState('')
    const [sending,  setSending] = useState(false)
    const [sendMsg,  setSendMsg] = useState<{type:'ok'|'err'; text:string}|null>(null)

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try {
        const [hist, grps] = await Promise.allSettled([getModHistory(), getGroups()])
        if (hist.status === 'fulfilled') setHistory(hist.value)
        if (grps.status === 'fulfilled') setGroups(grps.value)
      } catch {}
      setLoad(false); setRef(false)
    }
    useEffect(() => { load() }, [])

    if (!isConfigured()) return (
      <div className="empty-state" style={{ height:320 }}>
        <div className="empty-state-title" style={{ color:'var(--gold)' }}>VITE_API_URL no configurada en Vercel</div>
      </div>
    )
    if (loading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, gap:10, color:'var(--tx3)' }}>
        <RefreshCw size={18} style={{ animation:'spin 1s linear infinite' }} />
        <span style={{ fontSize:13 }}>Cargando historial…</span>
      </div>
    )

    const actionCounts: Record<string, number> = {}
    history.forEach(e => { actionCounts[e.action] = (actionCounts[e.action]||0)+1 })

    const filtered = history.filter(e => {
      const s = search.toLowerCase()
      const matchSearch = (e.userName||'').toLowerCase().includes(s) || (e.userJid||'').includes(s) || (e.groupName||'').toLowerCase().includes(s)
      const matchAction = filterAct === 'all' || e.action === filterAct
      return matchSearch && matchAction
    })

    const sendAction = async () => {
      if (!fUser.trim() || !fGroup) return
      setSending(true); setSendMsg(null)
      try {
        await postModAction({ groupJid: fGroup, userJid: fUser.trim() + '@s.whatsapp.net', action: fAction, reason: fReason.trim() })
        setSendMsg({ type:'ok', text:`Acción "${fAction}" ejecutada correctamente` })
        setFUser(''); setFReason('')
        setTimeout(() => { setSendMsg(null); load(true) }, 3000)
      } catch (e: unknown) {
        setSendMsg({ type:'err', text: e instanceof Error ? e.message : 'Error al ejecutar acción' })
      }
      setSending(false)
    }

    const ACTIONS = ['warn','kick','ban','mute','unmute','unban']

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:22 }} className="animate-fade-up">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.6rem' }}>Moderación</h1>
            <p style={{ fontSize:12, color:'var(--tx3)', marginTop:3 }}>{history.length} acciones registradas</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className={`btn btn-sm ${showForm?'btn-primary':'btn-red'}`} onClick={()=>setForm(f=>!f)}>
              <Shield size={13} /> {showForm ? 'Cancelar' : 'Nueva acción'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10 }}>
          {Object.entries(actionCounts).map(([action, count]) => {
            const m = metaOf(action)
            return (
              <div key={action} className="card" style={{ padding:'14px 16px', display:'flex', alignItems:'center', gap:10,
                cursor:'pointer', borderColor:filterAct===action?m.color+'44':undefined }}
                onClick={() => setFA(f => f===action?'all':action)}>
                <div className="icon-badge" style={{ background:m.color+'20' }}>
                  <m.icon size={14} color={m.color} />
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:'1.2rem', color:m.color }}>{count}</div>
                  <div style={{ fontSize:10, color:'var(--tx3)', textTransform:'uppercase' }}>{m.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* New action form */}
        {showForm && (
          <div className="card animate-scale-in" style={{ padding:22, borderColor:'rgba(229,57,53,.2)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:18 }}>
              <Shield size={15} color="var(--red)" />
              <strong style={{ fontSize:14 }}>Ejecutar acción de moderación</strong>
            </div>

            {sendMsg && (
              <div className={`alert ${sendMsg.type==='ok'?'alert-ok':'alert-err'}`} style={{ marginBottom:16 }}>
                {sendMsg.type==='ok' ? <Check size={14} /> : <X size={14} />}
                {sendMsg.text}
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div>
                <label className="label">GRUPO</label>
                <select className="select" value={fGroup} onChange={e=>setFGroup(e.target.value)}>
                  <option value="">— Seleccionar grupo —</option>
                  {groups.map(g => <option key={g.jid} value={g.jid}>{g.name||g.jid.split('@')[0]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">NÚMERO DE USUARIO (sin +)</label>
                <input className="input" placeholder="521234567890" value={fUser} onChange={e=>setFUser(e.target.value)} />
              </div>
              <div>
                <label className="label">ACCIÓN</label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {ACTIONS.map(a => {
                    const m = metaOf(a)
                    return (
                      <button key={a} onClick={()=>setFAction(a)}
                        className={`btn btn-xs ${fAction===a?'btn-primary':'btn-ghost'}`}
                        style={fAction===a ? {} : { color:m.color, borderColor:m.color+'33' }}>
                        <m.icon size={11} />
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="label">RAZÓN (opcional)</label>
                <input className="input" placeholder="Motivo de la acción…" value={fReason} onChange={e=>setFReason(e.target.value)} />
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:18, gap:10 }}>
              <button className="btn btn-ghost btn-sm" onClick={()=>{ setForm(false); setSendMsg(null) }}>Cancelar</button>
              <button className="btn btn-primary" onClick={sendAction} disabled={sending||!fUser.trim()||!fGroup}>
                {sending ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Shield size={13} />}
                {sending ? 'Ejecutando…' : `Ejecutar ${metaOf(fAction).label}`}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200, maxWidth:280 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tx3)', pointerEvents:'none' }} />
            <input className="input" placeholder="Buscar usuario o grupo…" value={search}
              onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:30 }} />
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setFA('all')} className={`btn btn-xs ${filterAct==='all'?'btn-primary':'btn-ghost'}`}>Todos</button>
            {Object.keys(actionCounts).map(a => {
              const m = metaOf(a)
              return (
                <button key={a} onClick={()=>setFA(f=>f===a?'all':a)}
                  className={`btn btn-xs ${filterAct===a?'btn-primary':'btn-ghost'}`}
                  style={filterAct===a?{}:{ color:m.color, borderColor:m.color+'33' }}>
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* History table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Shield size={22} color="var(--tx3)" /></div>
              <div className="empty-state-title">{search || filterAct!=='all' ? 'Sin resultados para el filtro' : 'Sin historial de moderación'}</div>
              <div className="empty-state-sub">Las acciones de moderación aparecerán aquí</div>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Acción</th><th>Usuario</th><th>Grupo</th><th>Fecha</th></tr>
                </thead>
                <tbody>
                  {filtered.slice(0,100).map((e,i) => {
                    const m = metaOf(e.action)
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div className="icon-badge" style={{ background:m.color+'18', width:28, height:28, borderRadius:7 }}>
                              <m.icon size={13} color={m.color} />
                            </div>
                            <span style={{ fontWeight:700, color:m.color, fontSize:11, textTransform:'uppercase',
                              background:m.color+'15', padding:'2px 8px', borderRadius:4 }}>
                              {m.label}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize:12 }}>
                          <div style={{ fontWeight:600 }}>{e.userName || '—'}</div>
                          {e.userJid && <div style={{ fontSize:9, color:'var(--tx3)', fontFamily:"'JetBrains Mono',monospace" }}>+{e.userJid.split('@')[0]}</div>}
                        </td>
                        <td style={{ fontSize:12, color:'var(--tx2)' }}>{e.groupName || e.groupJid?.split('@')[0] || '—'}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--tx3)' }}>
                            <Clock size={10} />{fmtTs(e.ts)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )
  }
  