import { useEffect, useState, type ElementType } from 'react'
  import {
    Search, RefreshCw, MessageSquare, Shield, Link, Bell, Send,
    X, Check, Power, PowerOff, Trash2, AlertTriangle, ToggleLeft, ToggleRight
  } from 'lucide-react'
  import {
    getGroups, postBroadcast, patchGroupEnabled, deleteGroup, postGroupSettings,
    isConfigured, type Group
  } from '../api'

  // ── Rank helper ──────────────────────────────────────────────────────────────
  function getGroupRank(g: Group): string {
    const active = [g.antiLink, g.antiSpam, g.welcome].filter(Boolean).length
    if (!g.botEnabled) return 'E'
    if (active === 3)   return 'S'
    if (active === 2)   return 'A'
    if (active === 1)   return 'B'
    return 'C'
  }

  // ── Toast ────────────────────────────────────────────────────────────────────
  function Toast({ msg, ok, onClose }: { msg: string; ok: boolean; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
    return (
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 999,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 'var(--radius)',
        background: ok ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
        border: `1px solid ${ok ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
        color: ok ? 'var(--green2)' : 'var(--red2)',
        boxShadow: '0 8px 32px rgba(0,0,0,.5)',
        backdropFilter: 'blur(12px)',
        animation: 'fadeUp .2s cubic-bezier(.16,1,.3,1)',
        fontFamily: "'Rajdhani',sans-serif",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '.04em',
      }}>
        {ok ? <Check size={14} /> : <X size={14} />}
        <span>{msg}</span>
        <button onClick={onClose} style={{ marginLeft: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: .5, padding: 0 }}><X size={12} /></button>
      </div>
    )
  }

  // ── Confirm modal ─────────────────────────────────────────────────────────────
  function ConfirmModal({ group, onConfirm, onCancel, loading }: {
    group: Group; onConfirm: () => void; onCancel: () => void; loading: boolean
  }) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(10px)',
      }} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
        <div className="card animate-scale-in" style={{
          width: 380, padding: 24,
          border: '1px solid rgba(239,68,68,.35)',
          boxShadow: '0 0 40px rgba(239,68,68,.12), 0 20px 60px rgba(0,0,0,.7)',
        }}>
          <div className="sys-header" style={{ margin: '-24px -24px 20px', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
            <AlertTriangle size={12} color="var(--red2)" />
            <span className="sys-header-title" style={{ color: 'var(--red2)' }}>SYSTEM ALERT</span>
            <div className="sys-dots" style={{ marginLeft: 'auto' }}>
              <div className="sys-dot" style={{ background: 'var(--red2)', opacity: .6 }} />
              <div className="sys-dot" style={{ background: 'var(--red2)', opacity: .4 }} />
              <div className="sys-dot" style={{ background: 'var(--red2)', opacity: .2 }} />
            </div>
          </div>

          <div style={{ background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 18 }}>
            <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, color: 'var(--tx1)', marginBottom: 3 }}>
              {group.name || 'GRUPO SIN NOMBRE'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: "'JetBrains Mono',monospace" }}>
              ID: {group.jid.split('@')[0]}
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--tx2)', lineHeight: 1.7, marginBottom: 22, fontFamily: "'Inter',sans-serif" }}>
            El bot <strong style={{ color: 'var(--tx1)' }}>dejará de responder</strong> en este grupo permanentemente. La configuración guardada será eliminada. El número seguirá en el grupo.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel} disabled={loading}>CANCELAR</button>
            <button className="btn btn-red" style={{ flex: 1 }} onClick={onConfirm} disabled={loading}>
              {loading ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
              {loading ? 'ELIMINANDO…' : 'CONFIRMAR'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Dungeon (Group) Card ──────────────────────────────────────────────────────
  function DungeonCard({
    group, onToggleEnabled, onDelete, onToggleFeat,
    loading, deleting, selected, onSelect, broadcast,
  }: {
    group: Group
    onToggleEnabled: () => void
    onDelete: () => void
    onToggleFeat: (key: 'antiLink' | 'antiSpam' | 'welcome', val: boolean) => void
    loading: boolean; deleting: boolean; selected: boolean; onSelect: () => void; broadcast: boolean
  }) {
    const enabled     = group.botEnabled !== false
    const rank        = getGroupRank(group)
    const activeCount = [group.antiLink, group.antiSpam, group.welcome].filter(Boolean).length

    const FEATS: { key: 'antiLink' | 'antiSpam' | 'welcome'; label: string; icon: ElementType; color: string }[] = [
      { key: 'antiLink', label: 'ANTI-LINK', icon: Link,   color: 'var(--red2)'    },
      { key: 'antiSpam', label: 'ANTI-SPAM', icon: Shield, color: 'var(--gold)'    },
      { key: 'welcome',  label: 'WELCOME',   icon: Bell,   color: 'var(--green2)'  },
    ]

    const rankColor: Record<string,string> = {
      S: 'var(--gold)', A: 'var(--red2)', B: 'var(--purple2)', C: 'var(--blue)', E: 'var(--tx3)',
    }

    return (
      <div
        className={`dungeon-card ${!enabled ? 'sealed' : ''} ${selected ? 'selected' : ''}`}
        style={{ padding: 16, cursor: broadcast ? 'pointer' : 'default' }}
        onClick={broadcast ? onSelect : undefined}
      >
        {/* Rank accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: enabled
            ? `linear-gradient(90deg, ${rankColor[rank]}, transparent)`
            : 'linear-gradient(90deg, rgba(239,68,68,.5), transparent)',
        }} />

        {/* Rank badge + broadcast checkbox */}
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`rank rank-${rank.toLowerCase()}`}>{rank}</span>
          {broadcast && selected && (
            <div style={{ width: 16, height: 16, borderRadius: 2, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 6px var(--blue)' }}>
              <Check size={9} color="white" />
            </div>
          )}
          {!enabled && (
            <span className="badge badge-red" style={{ fontSize: 8 }}>SEALED</span>
          )}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, paddingRight: 80 }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 'var(--radius)',
            background: enabled ? 'rgba(30,144,255,.1)' : 'rgba(239,68,68,.08)',
            border: `1px solid ${enabled ? 'rgba(30,144,255,.2)' : 'rgba(239,68,68,.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={15} color={enabled ? 'var(--blue)' : 'var(--red2)'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {group.name || 'SIN NOMBRE'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2, fontFamily: "'JetBrains Mono',monospace" }}>
              {group.jid.split('@')[0].slice(0, 22)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--tx3)', marginTop: 4, fontFamily: "'Orbitron',sans-serif", letterSpacing: '.08em' }}>
              {activeCount}/3 MODULES ACTIVE
            </div>
          </div>
        </div>

        {/* Feature chips */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12, opacity: !enabled ? .4 : 1 }}>
          {FEATS.map(feat => {
            const on = group[feat.key] as boolean
            return (
              <button
                key={feat.key}
                className={`feat-chip ${on ? 'active' : ''}`}
                style={{ color: on ? feat.color : undefined, borderColor: on ? feat.color + '30' : undefined, background: on ? feat.color + '10' : undefined }}
                onClick={e => { e.stopPropagation(); if (enabled) onToggleFeat(feat.key, !on) }}
                disabled={!enabled || loading}
              >
                {on ? <ToggleRight size={11} /> : <ToggleLeft size={11} />}
                <feat.icon size={10} />
                {feat.label}
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <button
            className={`btn btn-xs ${enabled ? 'btn-red' : 'btn-green'}`}
            style={{ flex: 1, letterSpacing: '.08em' }}
            onClick={e => { e.stopPropagation(); onToggleEnabled() }}
            disabled={loading}
          >
            {loading
              ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
              : enabled ? <><PowerOff size={10} /> SEAL</> : <><Power size={10} /> UNSEAL</>
            }
          </button>
          <button
            className="btn btn-xs btn-ghost"
            style={{ color: 'rgba(239,68,68,.6)', borderColor: 'rgba(239,68,68,.15)', padding: '4px 10px' }}
            onClick={e => { e.stopPropagation(); onDelete() }}
            disabled={deleting}
            title="Eliminar del bot"
          >
            {deleting ? <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={10} />}
          </button>
        </div>
      </div>
    )
  }

  // ── Main page ─────────────────────────────────────────────────────────────────
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
    const [bcResult,     setBcRes]      = useState<{ ok: boolean; text: string } | null>(null)
    const [selected,     setSelected]   = useState<Set<string>>(new Set())
    const [toggling,     setToggling]   = useState<Set<string>>(new Set())
    const [deletingId,   setDeletingId] = useState<string | null>(null)
    const [confirmGroup, setConfirmGroup] = useState<Group | null>(null)
    const [toast,        setToast]      = useState<{ msg: string; ok: boolean } | null>(null)

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
        <div className="empty-state-icon"><AlertTriangle size={22} color="var(--gold)" /></div>
        <div className="empty-state-title" style={{ color: 'var(--gold)' }}>API SIN CONFIGURAR</div>
        <div className="empty-state-sub">Ve a Vercel → Settings → Environment Variables</div>
      </div>
    )

    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="skeleton" style={{ height: 52, borderRadius: 6 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height: 200 }} />)}
        </div>
      </div>
    )

    const activeGroups   = groups.filter(g => g.botEnabled !== false)
    const inactiveGroups = groups.filter(g => g.botEnabled === false)
    const filtered = groups
      .filter(g => (g.name || '').toLowerCase().includes(search.toLowerCase()) || g.jid.includes(search))
      .filter(g => filter === 'active' ? g.botEnabled !== false : filter === 'inactive' ? g.botEnabled === false : true)

    // Actions
    const handleToggleEnabled = async (g: Group) => {
      const newEnabled = g.botEnabled === false
      setToggling(prev => new Set(prev).add(g.jid))
      try {
        await patchGroupEnabled(g.jid, newEnabled)
        setGroups(prev => prev.map(x => x.jid === g.jid ? { ...x, botEnabled: newEnabled } : x))
        showToast(newEnabled ? `UNSEALED: "${g.name || g.jid.split('@')[0]}"` : `SEALED: "${g.name || g.jid.split('@')[0]}"`, newEnabled)
      } catch (err) { showToast(err instanceof Error ? err.message : 'Error', false) }
      setToggling(prev => { const n = new Set(prev); n.delete(g.jid); return n })
    }

    const handleDelete = async (g: Group) => {
      setDeletingId(g.jid)
      try {
        await deleteGroup(g.jid)
        setGroups(prev => prev.filter(x => x.jid !== g.jid))
        setConfirmGroup(null)
        showToast(`"${g.name || g.jid.split('@')[0]}" eliminado del sistema`)
      } catch (err) { showToast(err instanceof Error ? err.message : 'Error', false) }
      setDeletingId(null)
    }

    const handleToggleFeat = async (g: Group, key: 'antiLink' | 'antiSpam' | 'welcome', val: boolean) => {
      setGroups(prev => prev.map(x => x.jid === g.jid ? { ...x, [key]: val } : x))
      try {
        await postGroupSettings(g.jid, { [key]: val })
        showToast(`${key} ${val ? 'ON' : 'OFF'}`)
      } catch (err) {
        setGroups(prev => prev.map(x => x.jid === g.jid ? { ...x, [key]: !val } : x))
        showToast(err instanceof Error ? err.message : 'Error', false)
      }
    }

    const toggleSelect = (jid: string) =>
      setSelected(prev => { const n = new Set(prev); n.has(jid) ? n.delete(jid) : n.add(jid); return n })

    const sendBroadcast = async () => {
      if (!bcMsg.trim()) return
      setBcSend(true); setBcRes(null)
      try {
        const targets = selected.size > 0 ? [...selected] : activeGroups.map(g => g.jid)
        await postBroadcast(bcMsg.trim(), targets)
        setBcRes({ ok: true, text: `ENVIADO A ${targets.length} GUILD(S)` })
        setBcMsg(''); setSelected(new Set())
      } catch (e) { setBcRes({ ok: false, text: e instanceof Error ? e.message : 'ERROR' }) }
      setBcSend(false)
    }

    const rankDist: Record<string,number> = {}
    for (const g of groups) { const r = getGroupRank(g); rankDist[r] = (rankDist[r] || 0) + 1 }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-up">
        {toast && <Toast msg={toast.msg} ok={toast.ok} onClose={() => setToast(null)} />}
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
            <div className="page-title">
              <span className="page-title-bracket">◈</span>
              DUNGEON MAP
              <span className="page-title-bracket">◈</span>
            </div>
            <div className="page-subtitle">
              {groups.length} DUNGEONS · {activeGroups.length} ACTIVE · {inactiveGroups.length} SEALED
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
              <input className="input" placeholder="BUSCAR DUNGEON…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 28, width: 200, fontFamily: "'Rajdhani',sans-serif", letterSpacing: '.06em', fontSize: 12 }} />
            </div>
            <button className="btn btn-blue btn-sm" onClick={() => { setBc(b => !b); if (broadcast) setBcRes(null) }}>
              <Send size={12} /> BROADCAST
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ── Rank distribution strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
          {[
            { label: 'TOTAL',   val: groups.length,               color: 'var(--blue)'    },
            { label: 'ACTIVE',  val: activeGroups.length,         color: 'var(--green2)'  },
            { label: 'SEALED',  val: inactiveGroups.length,       color: 'var(--red2)'    },
            { label: 'S-RANK',  val: rankDist['S'] || 0,          color: 'var(--gold)'    },
            { label: 'A-RANK',  val: rankDist['A'] || 0,          color: 'var(--red2)'    },
            { label: 'MODULES', val: groups.filter(g=>g.antiLink||g.antiSpam||g.welcome).length, color: 'var(--purple2)' },
          ].map(s => (
            <div key={s.label} className="metric-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 9, color: 'var(--tx3)', marginTop: 5, letterSpacing: '.12em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {([
            { key: 'all',      label: `ALL (${groups.length})` },
            { key: 'active',   label: `ACTIVE (${activeGroups.length})`,  color: 'var(--green2)' },
            { key: 'inactive', label: `SEALED (${inactiveGroups.length})`, color: 'var(--red2)' },
          ] as { key: Filter; label: string; color?: string }[]).map(tab => (
            <button
              key={tab.key}
              className={`btn btn-xs ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(tab.key)}
              style={filter !== tab.key && tab.color ? { color: tab.color, borderColor: tab.color + '30' } : undefined}
            >
              {tab.label}
            </button>
          ))}
          {search && (
            <button className="btn btn-xs btn-ghost" onClick={() => setSearch('')} style={{ marginLeft: 4 }}>
              <X size={10} /> CLEAR
            </button>
          )}
        </div>

        {/* ── Broadcast panel ── */}
        {broadcast && (
          <div className="card animate-scale-in" style={{ padding: 0 }}>
            <div className="sys-header">
              <Send size={12} color="var(--blue)" />
              <span className="sys-header-title">BROADCAST TRANSMISSION</span>
              <button className="btn btn-ghost btn-xs" style={{ marginLeft: 'auto', padding: '2px 6px' }}
                onClick={() => { setBc(false); setBcRes(null); setBcMsg(''); setSelected(new Set()) }}>
                <X size={12} />
              </button>
            </div>
            <div style={{ padding: '16px 18px' }}>
              {bcResult && (
                <div className={`alert ${bcResult.ok ? 'alert-ok' : 'alert-err'}`} style={{ marginBottom: 14 }}>
                  {bcResult.ok ? <Check size={13} /> : <X size={13} />}
                  {bcResult.text}
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label className="label">MENSAJE</label>
                <textarea className="textarea" placeholder="Escribe el mensaje de broadcast…"
                  value={bcMsg} onChange={e => setBcMsg(e.target.value)} style={{ minHeight: 80 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="label" style={{ margin: 0 }}>
                  DESTINO: {selected.size > 0 ? `${selected.size} seleccionados` : `${activeGroups.length} activos`}
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-xs btn-ghost" onClick={() => setSelected(new Set(activeGroups.map(g => g.jid)))}>
                    SELECT ALL
                  </button>
                  {selected.size > 0 && (
                    <button className="btn btn-xs btn-ghost" onClick={() => setSelected(new Set())}>CLEAR</button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 10, color: 'var(--tx3)', marginBottom: 14, fontFamily: "'Rajdhani',sans-serif", letterSpacing: '.06em' }}>
                Haz clic en las tarjetas para seleccionar grupos destino.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={sendBroadcast} disabled={bcSending || !bcMsg.trim()}>
                  {bcSending ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
                  {bcSending ? 'TRANSMITIENDO…' : `SEND → ${selected.size > 0 ? selected.size : activeGroups.length} GUILD(S)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Dungeon grid ── */}
        {filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><MessageSquare size={20} color="var(--tx3)" /></div>
              <div className="empty-state-title">{search ? 'SIN RESULTADOS' : filter !== 'all' ? 'CATEGORÍA VACÍA' : 'SIN DUNGEONS'}</div>
              <div className="empty-state-sub">{search ? 'Intenta con otro término' : filter !== 'all' ? 'No hay grupos en esta categoría' : 'El bot no está en ningún grupo'}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {filtered.map(g => (
              <DungeonCard
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
  