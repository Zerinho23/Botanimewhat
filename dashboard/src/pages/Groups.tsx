import { useEffect, useState } from 'react'
  import {
    Search, RefreshCw, MessageSquare, Shield, Link, Bell, Send,
    X, Check, Power, PowerOff, Trash2, AlertTriangle, ToggleLeft, ToggleRight
  } from 'lucide-react'
  import {
    getGroups, postBroadcast, patchGroupEnabled, deleteGroup, postGroupSettings, isConfigured, type Group
  } from '../api'

  // ── Toast ───────────────────────────────────────────────────────────────────
  function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
    return (
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 18px', borderRadius: 10, maxWidth: 360,
        background: ok ? 'rgba(16,185,129,.12)' : 'rgba(229,57,53,.12)',
        border: `1px solid ${ok ? 'rgba(16,185,129,.3)' : 'rgba(229,57,53,.3)'}`,
        color: ok ? 'var(--green)' : 'var(--red2)',
        boxShadow: '0 8px 32px rgba(0,0,0,.4)',
        animation: 'fadeUp .22s cubic-bezier(.16,1,.3,1)',
        backdropFilter: 'blur(12px)',
      }}>
        {ok ? <Check size={15} /> : <X size={15} />}
        <span style={{ fontSize: 13, fontWeight: 600 }}>{msg}</span>
        <button onClick={onClose} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: .6, padding: 0 }}><X size={13} /></button>
      </div>
    )
  }

  // ── Confirm modal ──────────────────────────────────────────────────────────
  function ConfirmModal({ group, onConfirm, onCancel, loading }: {
    group: Group; onConfirm: () => void; onCancel: () => void; loading: boolean
  }) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)',
      }} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
        <div className="card animate-scale-in" style={{
          width: 380, padding: 26, position: 'relative',
          border: '1px solid rgba(229,57,53,.3)',
          boxShadow: '0 0 40px rgba(229,57,53,.15), 0 20px 60px rgba(0,0,0,.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(229,57,53,.12)', border: '1px solid rgba(229,57,53,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} color="var(--red2)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'white' }}>Eliminar grupo</div>
              <div style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 2 }}>Esta acción no se puede deshacer</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid var(--border)', borderRadius: 9, padding: '12px 14px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 3 }}>
              {group.name || 'Grupo sin nombre'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', fontFamily: "'JetBrains Mono',monospace" }}>
              {group.jid.split('@')[0]}
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.6, marginBottom: 22 }}>
            El bot <strong style={{ color: 'white' }}>dejará de responder</strong> en este grupo y se eliminará toda su configuración guardada. El bot seguirá en el grupo como número normal.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>
              Cancelar
            </button>
            <button className="btn btn-red" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
              {loading ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
              {loading ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Group card ─────────────────────────────────────────────────────────────
  function GroupCard({
    group, onToggleEnabled, onDelete, onToggleFeat, loading, deleting, selected, onSelect, broadcast,
  }: {
    group: Group
    onToggleEnabled: () => void
    onDelete: () => void
    onToggleFeat: (key: 'antiLink' | 'antiSpam' | 'welcome', val: boolean) => void
    loading: boolean
    deleting: boolean
    selected: boolean
    onSelect: () => void
    broadcast: boolean
  }) {
    const enabled = group.botEnabled !== false
    const activeCount = [group.antiLink, group.antiSpam, group.welcome].filter(Boolean).length

    const FEATS: { key: 'antiLink' | 'antiSpam' | 'welcome'; label: string; icon: React.ElementType; color: string }[] = [
      { key: 'antiLink', label: 'Anti-Link', icon: Link,   color: 'var(--red)' },
      { key: 'antiSpam', label: 'Anti-Spam', icon: Shield, color: 'var(--gold)' },
      { key: 'welcome',  label: 'Bienvenida',icon: Bell,   color: 'var(--green)' },
    ]

    return (
      <div
        className="card"
        style={{
          padding: 18, position: 'relative', overflow: 'hidden',
          opacity: !enabled ? .6 : 1,
          border: selected
            ? '1px solid rgba(59,130,246,.4)'
            : !enabled
              ? '1px solid rgba(229,57,53,.15)'
              : '1px solid var(--border)',
          background: selected ? 'rgba(59,130,246,.05)' : !enabled ? 'rgba(229,57,53,.03)' : undefined,
          transition: 'all .2s',
          cursor: broadcast ? 'pointer' : 'default',
        }}
        onClick={broadcast ? onSelect : undefined}
      >
        {/* Top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: !enabled
            ? 'linear-gradient(90deg, rgba(229,57,53,.4), transparent)'
            : activeCount === 3
              ? 'linear-gradient(90deg, rgba(16,185,129,.6), rgba(16,185,129,.2))'
              : activeCount >= 1
                ? 'linear-gradient(90deg, rgba(59,130,246,.5), rgba(59,130,246,.15))'
                : 'var(--border)',
        }} />

        {/* Broadcast checkbox */}
        {broadcast && selected && (
          <div style={{ position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={11} color="white" />
          </div>
        )}

        {/* Disabled badge */}
        {!enabled && (
          <div style={{ position: 'absolute', top: 10, right: broadcast ? 36 : 10 }}>
            <span className="badge badge-red" style={{ fontSize: 9 }}>BOT INACTIVO</span>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: enabled ? 'rgba(59,130,246,.1)' : 'rgba(229,57,53,.08)',
            border: `1px solid ${enabled ? 'rgba(59,130,246,.2)' : 'rgba(229,57,53,.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={17} color={enabled ? 'var(--blue)' : 'var(--red2)'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.name || 'Sin nombre'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
              {group.jid.split('@')[0]}
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span className="badge" style={{
                fontSize: 9,
                background: activeCount === 3 ? 'rgba(16,185,129,.1)' : activeCount >= 1 ? 'rgba(59,130,246,.1)' : 'rgba(255,255,255,.05)',
                color: activeCount === 3 ? 'var(--green)' : activeCount >= 1 ? 'var(--blue)' : 'var(--tx3)',
                border: `1px solid ${activeCount === 3 ? 'rgba(16,185,129,.2)' : activeCount >= 1 ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.08)'}`,
              }}>
                {activeCount}/3 módulos
              </span>
            </div>
          </div>
        </div>

        {/* Feature toggles */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, opacity: !enabled ? .5 : 1 }}>
          {FEATS.map(feat => {
            const on = group[feat.key] as boolean
            return (
              <button
                key={feat.key}
                className={`feat-chip ${on ? 'active' : ''}`}
                style={{
                  cursor: 'pointer', background: 'none', border: 'none', padding: 0,
                  color: on ? feat.color : undefined,
                  borderColor: on ? feat.color + '33' : undefined,
                }}
                onClick={e => { e.stopPropagation(); if (enabled) onToggleFeat(feat.key, !on) }}
                disabled={!enabled || loading}
              >
                {on ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
                <feat.icon size={11} />
                {feat.label}
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 7, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button
            className={`btn btn-xs ${enabled ? 'btn-red' : 'btn-green'}`}
            style={{ flex: 1 }}
            onClick={e => { e.stopPropagation(); onToggleEnabled() }}
            disabled={loading}
            title={enabled ? 'Desactivar bot en este grupo' : 'Activar bot en este grupo'}
          >
            {loading ? (
              <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />
            ) : enabled ? (
              <><PowerOff size={11} /> Desactivar bot</>
            ) : (
              <><Power size={11} /> Activar bot</>
            )}
          </button>
          <button
            className="btn btn-xs btn-ghost"
            style={{ color: 'var(--red2)', borderColor: 'rgba(229,57,53,.2)' }}
            onClick={e => { e.stopPropagation(); onDelete() }}
            disabled={deleting}
            title="Eliminar grupo del bot (queda como número normal)"
          >
            {deleting ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>
    )
  }

  // ── Main page ──────────────────────────────────────────────────────────────
  type Filter = 'all' | 'active' | 'inactive'

  export default function Groups() {
    const [groups,     setGroups]  = useState<Group[]>([])
    const [loading,    setLoad]    = useState(true)
    const [search,     setSearch]  = useState('')
    const [filter,     setFilter]  = useState<Filter>('all')
    const [refreshing, setRef]     = useState(false)
    const [broadcast,  setBc]      = useState(false)
    const [bcMsg,      setBcMsg]   = useState('')
    const [bcSending,  setBcSend]  = useState(false)
    const [bcResult,   setBcRes]   = useState<{ ok: boolean; text: string } | null>(null)
    const [selected,   setSelected]= useState<Set<string>>(new Set())
    const [toggling,   setToggling]= useState<Set<string>>(new Set())
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmGroup, setConfirmGroup] = useState<Group | null>(null)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

    const showToast = (msg: string, ok = true) => setToast({ msg, ok })

    const load = async (r = false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setGroups(await getGroups()) } catch {}
      setLoad(false); setRef(false)
    }
    useEffect(() => { load() }, [])

    if (!isConfigured()) return (
      <div className="empty-state" style={{ height: 320 }}>
        <div className="empty-state-icon"><AlertTriangle size={24} color="var(--gold)" /></div>
        <div className="empty-state-title" style={{ color: 'var(--gold)' }}>VITE_API_URL no configurada</div>
        <div className="empty-state-sub">Ve a Vercel → Settings → Environment Variables</div>
      </div>
    )

    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 190, borderRadius: 14 }} />)}
        </div>
      </div>
    )

    // ── Filtering ──
    const filtered = groups
      .filter(g => {
        const s = search.toLowerCase()
        return (g.name || '').toLowerCase().includes(s) || g.jid.includes(s)
      })
      .filter(g => {
        if (filter === 'active')   return g.botEnabled !== false
        if (filter === 'inactive') return g.botEnabled === false
        return true
      })

    const activeGroups   = groups.filter(g => g.botEnabled !== false)
    const inactiveGroups = groups.filter(g => g.botEnabled === false)

    // ── Actions ──
    const handleToggleEnabled = async (g: Group) => {
      const newEnabled = g.botEnabled === false
      setToggling(prev => new Set(prev).add(g.jid))
      try {
        await patchGroupEnabled(g.jid, newEnabled)
        setGroups(prev => prev.map(x => x.jid === g.jid ? { ...x, botEnabled: newEnabled } : x))
        showToast(newEnabled ? `Bot activado en "${g.name || g.jid.split('@')[0]}"` : `Bot desactivado en "${g.name || g.jid.split('@')[0]}"`, newEnabled)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al actualizar', false)
      }
      setToggling(prev => { const n = new Set(prev); n.delete(g.jid); return n })
    }

    const handleDelete = async (g: Group) => {
      setDeletingId(g.jid)
      try {
        await deleteGroup(g.jid)
        setGroups(prev => prev.filter(x => x.jid !== g.jid))
        setConfirmGroup(null)
        showToast(`Grupo "${g.name || g.jid.split('@')[0]}" eliminado del bot`)
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al eliminar', false)
      }
      setDeletingId(null)
    }

    const handleToggleFeat = async (g: Group, key: 'antiLink' | 'antiSpam' | 'welcome', val: boolean) => {
      setGroups(prev => prev.map(x => x.jid === g.jid ? { ...x, [key]: val } : x))
      try {
        await postGroupSettings(g.jid, { [key]: val })
        showToast(`${key} ${val ? 'activado' : 'desactivado'}`)
      } catch (err) {
        setGroups(prev => prev.map(x => x.jid === g.jid ? { ...x, [key]: !val } : x))
        showToast(err instanceof Error ? err.message : 'Error al actualizar', false)
      }
    }

    const toggleSelect = (jid: string) => {
      setSelected(prev => { const n = new Set(prev); n.has(jid) ? n.delete(jid) : n.add(jid); return n })
    }

    const sendBroadcast = async () => {
      if (!bcMsg.trim()) return
      setBcSend(true); setBcRes(null)
      try {
        const targets = selected.size > 0 ? [...selected] : groups.map(g => g.jid)
        await postBroadcast(bcMsg.trim(), targets)
        setBcRes({ ok: true, text: `Enviado a ${targets.length} grupo(s)` })
        setBcMsg(''); setSelected(new Set())
      } catch (e) {
        setBcRes({ ok: false, text: e instanceof Error ? e.message : 'Error al enviar' })
      }
      setBcSend(false)
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }} className="animate-fade-up">

        {/* Toast */}
        {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}

        {/* Confirm modal */}
        {confirmGroup && (
          <ConfirmModal
            group={confirmGroup}
            onConfirm={() => handleDelete(confirmGroup)}
            onCancel={() => setConfirmGroup(null)}
            loading={deletingId === confirmGroup.jid}
          />
        )}

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '1.7rem', letterSpacing: '.03em' }}>
              Grupos
            </h1>
            <p style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 3 }}>
              {groups.length} grupos · {activeGroups.length} activos · {inactiveGroups.length} desactivados
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
              <input className="input" placeholder="Buscar grupo…" value={search}
                onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30, width: 190 }} />
            </div>
            <button className="btn btn-blue btn-sm" onClick={() => { setBc(b => !b); if (broadcast) setBcRes(null) }}>
              <Send size={13} /> Broadcast
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Stat strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
          {[
            { label: 'Total grupos',     val: groups.length,                                  color: 'var(--blue)' },
            { label: 'Bot activo',       val: activeGroups.length,                            color: 'var(--green)' },
            { label: 'Bot desactivado',  val: inactiveGroups.length,                          color: 'var(--red2)' },
            { label: 'Anti-link',        val: groups.filter(g => g.antiLink).length,          color: 'var(--red)' },
            { label: 'Anti-spam',        val: groups.filter(g => g.antiSpam).length,          color: 'var(--gold)' },
            { label: 'Bienvenida',       val: groups.filter(g => g.welcome).length,           color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.6rem', color: s.color, fontFamily: "'Rajdhani',sans-serif", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 4, letterSpacing: '.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { key: 'all',      label: `Todos (${groups.length})` },
            { key: 'active',   label: `Activos (${activeGroups.length})`, color: 'var(--green)' },
            { key: 'inactive', label: `Desactivados (${inactiveGroups.length})`, color: 'var(--red2)' },
          ] as { key: Filter; label: string; color?: string }[]).map(tab => (
            <button
              key={tab.key}
              className={`btn btn-xs ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(tab.key)}
              style={filter !== tab.key && tab.color ? { color: tab.color, borderColor: tab.color + '33' } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Broadcast panel ── */}
        {broadcast && (
          <div className="card animate-scale-in" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Send size={14} color="var(--blue)" />
                <strong style={{ fontSize: 14 }}>Broadcast a grupos</strong>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => { setBc(false); setBcRes(null); setBcMsg(''); setSelected(new Set()) }}>
                <X size={13} />
              </button>
            </div>
            {bcResult && (
              <div className={`alert ${bcResult.ok ? 'alert-ok' : 'alert-err'}`} style={{ marginBottom: 14 }}>
                {bcResult.ok ? <Check size={14} /> : <X size={14} />}
                {bcResult.text}
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label className="label">MENSAJE</label>
              <textarea className="textarea" placeholder="Escribe el mensaje para los grupos…"
                value={bcMsg} onChange={e => setBcMsg(e.target.value)} style={{ minHeight: 80 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <label className="label" style={{ margin: 0 }}>
                  GRUPOS ({selected.size > 0 ? selected.size : activeGroups.length} seleccionados)
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => setSelected(new Set(activeGroups.map(g => g.jid)))}>Todos activos</button>
                  {selected.size > 0 && <button className="btn btn-ghost btn-xs" onClick={() => setSelected(new Set())}>Limpiar</button>}
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--tx3)', marginBottom: 8 }}>
                Haz clic en las tarjetas de grupo para seleccionarlos, o usa el botón de arriba.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={sendBroadcast} disabled={bcSending || !bcMsg.trim()}>
                {bcSending ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                {bcSending ? 'Enviando…' : `Enviar a ${selected.size > 0 ? selected.size : activeGroups.length} grupo(s)`}
              </button>
            </div>
          </div>
        )}

        {/* ── Group grid ── */}
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><MessageSquare size={22} color="var(--tx3)" /></div>
              <div className="empty-state-title">{search || filter !== 'all' ? 'Sin resultados' : 'Sin grupos aún'}</div>
              <div className="empty-state-sub">{search ? 'Intenta otro término' : filter !== 'all' ? 'No hay grupos en esta categoría' : 'El bot no está en ningún grupo'}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(290px,1fr))', gap: 12 }}>
            {filtered.map(g => (
              <GroupCard
                key={g.jid}
                group={g}
                onToggleEnabled={() => handleToggleEnabled(g)}
                onDelete={() => setConfirmGroup(g)}
                onToggleFeat={(key, val) => handleToggleFeat(g, key, val)}
                loading={toggling.has(g.jid)}
                deleting={deletingId === g.jid}
                selected={selected.has(g.jid)}
                onSelect={() => toggleSelect(g.jid)}
                broadcast={broadcast}
              />
            ))}
          </div>
        )}

      </div>
    )
  }
  