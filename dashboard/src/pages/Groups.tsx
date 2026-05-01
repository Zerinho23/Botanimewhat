import { useEffect, useState } from 'react'
  import { Search, RefreshCw, MessageSquare, Shield, Link, Bell, ToggleLeft, ToggleRight, Send, X, Check } from 'lucide-react'
  import { getGroups, postBroadcast, isConfigured, type Group } from '../api'

  export default function Groups() {
    const [groups,    setGroups]  = useState<Group[]>([])
    const [loading,   setLoad]    = useState(true)
    const [search,    setSearch]  = useState('')
    const [refreshing,setRef]     = useState(false)
    const [broadcast, setBc]      = useState(false)
    const [bcMsg,     setBcMsg]   = useState('')
    const [bcSending, setBcSend]  = useState(false)
    const [bcResult,  setBcRes]   = useState<{ok:boolean;text:string}|null>(null)
    const [selected,  setSelected]= useState<Set<string>>(new Set())

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setGroups(await getGroups()) } catch {}
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
        <span style={{ fontSize:13 }}>Cargando grupos…</span>
      </div>
    )

    const filtered = groups.filter(g => {
      const s = search.toLowerCase()
      return (g.name||'').toLowerCase().includes(s) || g.jid.includes(s)
    })

    const toggleSelect = (jid: string) => {
      setSelected(prev => {
        const n = new Set(prev)
        if (n.has(jid)) n.delete(jid); else n.add(jid)
        return n
      })
    }
    const selectAll = () => setSelected(new Set(filtered.map(g=>g.jid)))
    const clearSel  = () => setSelected(new Set())

    const sendBroadcast = async () => {
      if (!bcMsg.trim()) return
      setBcSend(true); setBcRes(null)
      try {
        const targets = selected.size > 0 ? [...selected] : groups.map(g=>g.jid)
        await postBroadcast(bcMsg.trim(), targets)
        setBcRes({ ok:true, text:`Mensaje enviado a ${targets.length} grupo(s)` })
        setBcMsg('')
        setSelected(new Set())
      } catch (e: unknown) {
        setBcRes({ ok:false, text: e instanceof Error ? e.message : 'Error al enviar' })
      }
      setBcSend(false)
    }

    const FEATS = [
      { key:'antiLink' as keyof Group, label:'Anti-Link', icon:Link,  color:'var(--red)' },
      { key:'antiSpam' as keyof Group, label:'Anti-Spam', icon:Shield,color:'var(--gold)' },
      { key:'welcome'  as keyof Group, label:'Bienvenida',icon:Bell,  color:'var(--green)' },
    ]

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:22 }} className="animate-fade-up">

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.6rem' }}>Grupos</h1>
            <p style={{ fontSize:12, color:'var(--tx3)', marginTop:3 }}>{groups.length} grupos gestionados por el bot</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <div style={{ position:'relative' }}>
              <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tx3)', pointerEvents:'none' }} />
              <input className="input" placeholder="Buscar grupo…" value={search}
                onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:30, width:200 }} />
            </div>
            <button className="btn btn-blue btn-sm" onClick={()=>setBc(b=>!b)}>
              <Send size={13} /> Broadcast
            </button>
            <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{ animation:refreshing?'spin 1s linear infinite':'none' }} />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10 }}>
          {[
            { label:'Total grupos',     val:groups.length,                          color:'var(--blue)' },
            { label:'Anti-link activo', val:groups.filter(g=>g.antiLink).length,    color:'var(--red)' },
            { label:'Anti-spam activo', val:groups.filter(g=>g.antiSpam).length,    color:'var(--gold)' },
            { label:'Bienvenida activa',val:groups.filter(g=>g.welcome).length,     color:'var(--green)' },
            { label:'Sin protección',   val:groups.filter(g=>!g.antiLink&&!g.antiSpam).length, color:'var(--tx3)' },
          ].map(s=>(
            <div key={s.label} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ fontWeight:700, fontSize:'1.5rem', color:s.color }}>{s.val}</div>
              <div style={{ fontSize:10, color:'var(--tx3)', marginTop:3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Broadcast panel */}
        {broadcast && (
          <div className="card animate-scale-in" style={{ padding:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <Send size={14} color="var(--blue)" />
                <strong style={{ fontSize:14 }}>Broadcast a grupos</strong>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={()=>{ setBc(false); setBcRes(null); setBcMsg(''); clearSel() }}>
                <X size={13} />
              </button>
            </div>

            {bcResult && (
              <div className={`alert ${bcResult.ok?'alert-ok':'alert-err'}`} style={{ marginBottom:14 }}>
                {bcResult.ok ? <Check size={14} /> : <X size={14} />}
                {bcResult.text}
              </div>
            )}

            <div style={{ marginBottom:12 }}>
              <label className="label">MENSAJE A ENVIAR</label>
              <textarea className="textarea" placeholder="Escribe el mensaje para todos los grupos…"
                value={bcMsg} onChange={e=>setBcMsg(e.target.value)} style={{ minHeight:90 }} />
            </div>

            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <label className="label" style={{ margin:0 }}>
                  GRUPOS DESTINO ({selected.size > 0 ? selected.size : groups.length} seleccionados)
                </label>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={selectAll}>Seleccionar todos</button>
                  {selected.size > 0 && <button className="btn btn-ghost btn-xs" onClick={clearSel}>Limpiar</button>}
                </div>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxHeight:100, overflowY:'auto' }}>
                {filtered.map(g => (
                  <button key={g.jid} onClick={()=>toggleSelect(g.jid)}
                    className={`btn btn-xs ${selected.has(g.jid)?'btn-blue':'btn-ghost'}`}
                    style={{ maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {selected.has(g.jid) && <Check size={10} />}
                    {g.name || g.jid.split('@')[0].slice(0,15)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button className="btn btn-primary" onClick={sendBroadcast} disabled={bcSending||!bcMsg.trim()}>
                {bcSending ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Send size={13} />}
                {bcSending ? 'Enviando…' : `Enviar a ${selected.size>0?selected.size:groups.length} grupo(s)`}
              </button>
            </div>
          </div>
        )}

        {/* Group cards */}
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><MessageSquare size={22} color="var(--tx3)" /></div>
              <div className="empty-state-title">{search ? 'Sin resultados' : 'Sin grupos aún'}</div>
              <div className="empty-state-sub">{search ? 'Intenta otro término' : 'El bot no está en ningún grupo'}</div>
            </div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:12 }}>
            {filtered.map(g => {
              const activeCount = [g.antiLink, g.antiSpam, g.welcome].filter(Boolean).length
              const isSel = selected.has(g.jid)
              return (
                <div key={g.jid} className="card" style={{ padding:18, position:'relative', overflow:'hidden', cursor:'pointer',
                  border: isSel ? '1px solid rgba(59,130,246,.4)' : undefined,
                  background: isSel ? 'rgba(59,130,246,.05)' : undefined }}
                  onClick={()=>broadcast&&toggleSelect(g.jid)}>
                  {/* Top accent */}
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:'2px',
                    background: activeCount===3?'var(--green)':activeCount>=2?'var(--blue)':activeCount>=1?'var(--gold)':'var(--border)' }} />

                  {broadcast && isSel && (
                    <div style={{ position:'absolute', top:10, right:10 }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--blue)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <Check size={10} color="white" />
                      </div>
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:16 }}>
                    <div className="icon-badge" style={{ background:activeCount>0?'rgba(59,130,246,.1)':'rgba(255,255,255,.04)', width:40, height:40, borderRadius:10 }}>
                      <MessageSquare size={17} color={activeCount>0?'var(--blue)':'var(--tx3)'} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {g.name || 'Sin nombre'}
                      </div>
                      <div style={{ fontSize:9, color:'var(--tx3)', marginTop:2, fontFamily:"'JetBrains Mono',monospace" }}>
                        {g.jid.split('@')[0]}
                      </div>
                      <div style={{ marginTop:6 }}>
                        <span className="badge" style={{ fontSize:9,
                          background:activeCount===3?'rgba(16,185,129,.1)':activeCount>=1?'rgba(59,130,246,.1)':'rgba(255,255,255,.05)',
                          color:activeCount===3?'var(--green)':activeCount>=1?'var(--blue)':'var(--tx3)',
                          border:`1px solid ${activeCount===3?'rgba(16,185,129,.2)':activeCount>=1?'rgba(59,130,246,.2)':'rgba(255,255,255,.08)'}` }}>
                          {activeCount}/3 módulos activos
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {FEATS.map(feat => {
                      const on = g[feat.key] as boolean
                      return (
                        <div key={feat.key} className={`feat-chip ${on?'on':'off'}`}
                          style={{ color: on ? feat.color : undefined, borderColor: on ? feat.color+'33' : undefined,
                            background: on ? feat.color+'15' : undefined }}>
                          {on ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                          <feat.icon size={11} />
                          {feat.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }
  