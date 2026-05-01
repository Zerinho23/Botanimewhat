import { useEffect, useState, useCallback } from 'react'
  import {
    Shield, RefreshCw, Search, AlertTriangle,
    UserX, Volume2, VolumeX, Trash2, ChevronDown, ChevronRight,
    Clock, Users, Zap, CheckCircle, X, Crown
  } from 'lucide-react'
  import {
    getModHistory, getGroups, getModGroup, postModAction,
    isConfigured,
    type ModEntry, type Group, type GroupModData, type GroupMember
  } from '../api'

  // ─── helpers ────────────────────────────────────────────────────────────────
  const ACTION_META: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
    ban:        { color: '#ff3355', bg: 'rgba(255,51,85,.15)',   label: 'Ban',          icon: UserX },
    kick:       { color: '#ff5252', bg: 'rgba(255,82,82,.12)',   label: 'Expulsado',    icon: UserX },
    warn:       { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  label: 'Advertencia',  icon: AlertTriangle },
    clearwarns: { color: '#10b981', bg: 'rgba(16,185,129,.12)',  label: 'Warns borr.',  icon: Trash2 },
    mute:       { color: '#3b82f6', bg: 'rgba(59,130,246,.12)',  label: 'Muteado',      icon: VolumeX },
    unmute:     { color: '#10b981', bg: 'rgba(16,185,129,.12)',  label: 'Desmuteado',   icon: Volume2 },
  }
  const metaOf = (a: string) =>
    ACTION_META[a] ?? { color: 'var(--tx3)', bg: 'rgba(255,255,255,.06)', label: a, icon: Shield }

  function fmtTs(ts: number) {
    return new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  function avatarColor(jid: string) {
    const n = jid.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const hues = [0, 25, 200, 260, 130, 320, 170]
    return `hsl(${hues[n % hues.length]}, 70%, 55%)`
  }

  // ─── toast hook ──────────────────────────────────────────────────────────────
  type Toast = { id: number; text: string; ok: boolean }
  function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([])
    const add = useCallback((text: string, ok = true) => {
      const id = Date.now()
      setToasts(t => [...t, { id, text, ok }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
    }, [])
    return { toasts, add }
  }

  // ─── MemberRow ───────────────────────────────────────────────────────────────
  function MemberRow({
    member, muted, warns, onAction, busy,
  }: {
    member: GroupMember
    muted: boolean
    warns: number
    onAction: (jid: string, action: string) => Promise<void>
    busy: boolean
  }) {
    const num = member.jid.split('@')[0].split(':')[0]
    const displayName = member.name || num
    const color = avatarColor(member.jid)

    return (
      <tr style={{ opacity: busy ? .55 : 1, transition: 'opacity .2s' }}>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: color + '1a', border: `1px solid ${color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800, color, fontFamily: "'Rajdhani',sans-serif",
            }}>
              {displayName[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{displayName}</span>
                {member.isAdmin && (
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: 'var(--gold)',
                    background: 'rgba(255,200,0,.1)', border: '1px solid rgba(255,200,0,.3)',
                    padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3,
                  }}>
                    <Crown size={8} /> ADMIN
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, color: 'var(--tx3)', fontFamily: "'JetBrains Mono',monospace" }}>+{num}</div>
            </div>
          </div>
        </td>

        <td>
          {muted
            ? <span className="badge badge-red"><VolumeX size={10} /> Muteado</span>
            : <span className="badge badge-green"><Volume2 size={10} /> Activo</span>}
        </td>

        <td>
          {warns > 0
            ? <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: warns >= 3 ? 'rgba(255,51,85,.15)' : 'rgba(245,158,11,.12)',
                color: warns >= 3 ? '#ff3355' : '#f59e0b',
                border: `1px solid ${warns >= 3 ? 'rgba(255,51,85,.3)' : 'rgba(245,158,11,.25)'}`,
                padding: '2px 9px', borderRadius: 5, fontSize: 12, fontWeight: 800,
              }}>
                <AlertTriangle size={10} /> {warns}
              </span>
            : <span style={{ color: 'var(--tx3)', fontSize: 12 }}>—</span>}
        </td>

        <td>
          {member.isAdmin
            ? <span style={{ fontSize: 11, color: 'var(--tx3)', fontStyle: 'italic' }}>Sin acciones disponibles</span>
            : (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-ghost btn-xs"
                  style={{ color: muted ? '#10b981' : '#3b82f6', borderColor: muted ? 'rgba(16,185,129,.3)' : 'rgba(59,130,246,.3)' }}
                  onClick={() => onAction(member.jid, muted ? 'unmute' : 'mute')}
                  disabled={busy}
                >
                  {muted ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  {muted ? 'Desmutear' : 'Mutear'}
                </button>

                <button
                  className="btn btn-ghost btn-xs"
                  style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,.3)' }}
                  onClick={() => onAction(member.jid, 'warn')}
                  disabled={busy}
                >
                  <AlertTriangle size={11} /> +Warn
                </button>

                {warns > 0 && (
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ color: '#10b981', borderColor: 'rgba(16,185,129,.3)' }}
                    onClick={() => onAction(member.jid, 'clearwarns')}
                    disabled={busy}
                  >
                    <Trash2 size={11} /> Borrar warns
                  </button>
                )}

                <button
                  className="btn btn-ghost btn-xs"
                  style={{ color: 'var(--red)', borderColor: 'rgba(229,57,53,.25)' }}
                  onClick={() => {
                    if (confirm(`¿Expulsar a ${displayName} (+${num}) del grupo?`)) {
                      void onAction(member.jid, 'kick')
                    }
                  }}
                  disabled={busy}
                >
                  <UserX size={11} /> Expulsar
                </button>
              </div>
            )}
        </td>
      </tr>
    )
  }

  // ─── NotConfigured ────────────────────────────────────────────────────────────
  function NotConfigured() {
    return (
      <div className="empty-state" style={{ height: 360 }}>
        <div className="empty-state-icon"><AlertTriangle size={28} color="var(--gold)" /></div>
        <div className="empty-state-title" style={{ color: 'var(--gold)' }}>VITE_API_URL no configurada</div>
        <div className="empty-state-sub">Ve a Vercel → Settings → Environment Variables</div>
      </div>
    )
  }

  // ─── Main page ────────────────────────────────────────────────────────────────
  export default function Moderation() {
    const [groups,          setGroups]          = useState<Group[]>([])
    const [selectedJid,     setSelectedJid]     = useState<string>('')
    const [modData,         setModData]         = useState<GroupModData | null>(null)
    const [history,         setHistory]         = useState<ModEntry[]>([])
    const [loadingGroups,   setLoadingGroups]   = useState(true)
    const [loadingMembers,  setLoadingMembers]  = useState(false)
    const [refreshingHist,  setRefreshingHist]  = useState(false)
    const [search,          setSearch]          = useState('')
    const [filterStatus,    setFilter]          = useState<'all' | 'muted' | 'warned'>('all')
    const [busyJids,        setBusy]            = useState<Set<string>>(new Set())
    const [showHistory,     setShowHistory]     = useState(true)
    const [historyFilter,   setHF]              = useState<string>('all')
    const { toasts, add: addToast }             = useToasts()

    const configured = isConfigured()

    const loadGroups = useCallback(async () => {
      if (!configured) { setLoadingGroups(false); return }
      try { setGroups(await getGroups()) }
      catch { addToast('Error cargando grupos', false) }
      setLoadingGroups(false)
    }, [configured, addToast])

    const loadMembers = useCallback(async (jid: string) => {
      if (!jid || !configured) return
      setLoadingMembers(true); setModData(null)
      try { setModData(await getModGroup(jid)) }
      catch { addToast('Error cargando miembros del grupo', false) }
      setLoadingMembers(false)
    }, [configured, addToast])

    const loadHistory = useCallback(async (silent = false) => {
      if (!configured) return
      if (!silent) setRefreshingHist(true)
      try { setHistory(await getModHistory()) } catch {}
      setRefreshingHist(false)
    }, [configured])

    useEffect(() => {
      loadGroups()
      loadHistory()
    }, [loadGroups, loadHistory])

    useEffect(() => {
      if (selectedJid) void loadMembers(selectedJid)
    }, [selectedJid, loadMembers])

    const handleAction = async (userJid: string, action: string) => {
      if (!selectedJid) return
      setBusy(prev => new Set(prev).add(userJid))
      try {
        await postModAction({ groupJid: selectedJid, userJid, action })
        const labels: Record<string, string> = {
          mute: 'Usuario muteado ✓', unmute: 'Usuario desmuteado ✓',
          warn: 'Advertencia agregada ✓', clearwarns: 'Warns eliminados ✓',
          kick: 'Usuario expulsado ✓',
        }
        addToast(labels[action] ?? `"${action}" ejecutado`, true)
        await Promise.all([loadMembers(selectedJid), loadHistory(true)])
      } catch (e: unknown) {
        addToast(e instanceof Error ? e.message : 'Error al ejecutar acción', false)
      }
      setBusy(prev => { const s = new Set(prev); s.delete(userJid); return s })
    }

    // ── Derived data ───────────────────────────────────────────────────────────
    const mutedCount  = modData?.muted.length ?? 0
    const warnedCount = modData ? Object.values(modData.warnings).filter(w => w > 0).length : 0
    const memberCount = modData?.members.length ?? 0
    const adminCount  = modData?.members.filter(m => m.isAdmin).length ?? 0

    const filteredMembers = (modData?.members ?? []).filter((m: GroupMember) => {
      const s = search.toLowerCase()
      const matchSearch = (m.name ?? '').toLowerCase().includes(s) || m.jid.includes(s)
      if (filterStatus === 'muted'  && !modData!.muted.includes(m.jid))           return false
      if (filterStatus === 'warned' && !(modData!.warnings[m.jid] ?? 0))          return false
      return matchSearch
    })

    const historyActionCounts: Record<string, number> = {}
    history.forEach(e => { historyActionCounts[e.action] = (historyActionCounts[e.action] ?? 0) + 1 })

    const filteredHistory = history.filter(e =>
      historyFilter === 'all' || e.action === historyFilter
    )

    // ── Render ─────────────────────────────────────────────────────────────────
    if (!configured) return <NotConfigured />

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }} className="animate-fade-up">

        {/* Toast stack */}
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column-reverse', gap: 8 }}>
          {toasts.map(t => (
            <div key={t.id} className="animate-scale-in" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 16px', borderRadius: 10, minWidth: 220, maxWidth: 340,
              background: t.ok ? 'rgba(16,185,129,.15)' : 'rgba(229,57,53,.15)',
              border: `1px solid ${t.ok ? 'rgba(16,185,129,.35)' : 'rgba(229,57,53,.35)'}`,
              boxShadow: '0 8px 32px rgba(0,0,0,.5)', backdropFilter: 'blur(12px)',
              fontSize: 13, fontWeight: 600,
              color: t.ok ? '#10b981' : 'var(--red)',
            }}>
              {t.ok ? <CheckCircle size={14} /> : <X size={14} />}
              {t.text}
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={20} color="var(--red)" /> Moderación
            </h1>
            <p style={{ fontSize: 12, color: 'var(--tx3)', marginTop: 3 }}>Gestiona usuarios directamente desde el panel</p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { if (selectedJid) void loadMembers(selectedJid); void loadHistory() }}
            disabled={loadingMembers}
          >
            <RefreshCw size={13} style={{ animation: loadingMembers ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>

        {/* Group selector */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Users size={14} color="var(--tx3)" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', color: 'var(--tx3)', textTransform: 'uppercase' }}>Grupo</span>
            </div>

            {loadingGroups ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--tx3)', fontSize: 12 }}>
                <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Cargando grupos…
              </div>
            ) : (
              <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 400 }}>
                <select
                  className="select"
                  value={selectedJid}
                  onChange={e => setSelectedJid(e.target.value)}
                  style={{ paddingRight: 32 }}
                >
                  <option value="">— Seleccionar grupo —</option>
                  {groups.map(g => (
                    <option key={g.jid} value={g.jid}>{g.name || g.jid.split('@')[0]}</option>
                  ))}
                </select>
                <ChevronDown size={14} style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--tx3)', pointerEvents: 'none',
                }} />
              </div>
            )}

            {selectedJid && modData && (
              <span style={{ fontSize: 12, color: 'var(--tx3)' }}>
                {memberCount} miembros · {adminCount} admins · {mutedCount} muteados · {warnedCount} con warns
              </span>
            )}
          </div>
        </div>

        {/* No group selected */}
        {!selectedJid && !loadingGroups && (
          <div className="empty-state" style={{ height: 200 }}>
            <div className="empty-state-icon"><Users size={26} color="var(--tx3)" /></div>
            <div className="empty-state-title">Selecciona un grupo</div>
            <div className="empty-state-sub">Elige un grupo arriba para ver y gestionar sus miembros</div>
          </div>
        )}

        {/* Loading members */}
        {selectedJid && loadingMembers && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10, color: 'var(--tx3)' }}>
            <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13 }}>Cargando miembros…</span>
          </div>
        )}

        {/* Stats + table */}
        {selectedJid && modData && !loadingMembers && (
          <>
            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: 10 }}>
              {[
                { label: 'Total miembros',    val: memberCount, color: 'var(--blue)',  Icon: Users },
                { label: 'Admins',            val: adminCount,  color: 'var(--gold)',  Icon: Crown },
                { label: 'Muteados',          val: mutedCount,  color: '#3b82f6',      Icon: VolumeX },
                { label: 'Con advertencias',  val: warnedCount, color: '#f59e0b',      Icon: AlertTriangle },
              ].map(({ label, val, color, Icon }) => (
                <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="icon-badge" style={{ background: color + '20' }}>
                    <Icon size={14} color={color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.4rem', color, fontFamily: "'Rajdhani',sans-serif", lineHeight: 1 }}>{val}</div>
                    <div style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.07em', marginTop: 2 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 180, maxWidth: 280 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
                <input
                  className="input"
                  placeholder="Buscar miembro…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ paddingLeft: 30 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {(['all', 'muted', 'warned'] as const).map(f => (
                  <button key={f} className={`btn btn-xs ${filterStatus === f ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setFilter(f)}>
                    {f === 'all' ? 'Todos' : f === 'muted' ? 'Muteados' : 'Con warns'}
                  </button>
                ))}
              </div>
            </div>

            {/* Members table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={14} color="var(--red)" />
                <strong style={{ fontSize: 13 }}>
                  {modData.groupName || selectedJid.split('@')[0]}
                </strong>
                <span style={{ fontSize: 11, color: 'var(--tx3)', marginLeft: 4 }}>
                  {filteredMembers.length} de {memberCount} miembros
                </span>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="empty-state" style={{ padding: '32px 0' }}>
                  <div className="empty-state-icon"><Users size={22} color="var(--tx3)" /></div>
                  <div className="empty-state-title">Sin resultados</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Miembro</th>
                        <th>Estado</th>
                        <th>Warns</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((m: GroupMember) => (
                        <MemberRow
                          key={m.jid}
                          member={m}
                          muted={modData!.muted.includes(m.jid)}
                          warns={modData!.warnings[m.jid] ?? 0}
                          onAction={handleAction}
                          busy={busyJids.has(m.jid)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* History */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '14px 20px',
              borderBottom: showHistory ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setShowHistory(s => !s)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} color="var(--tx3)" />
              <strong style={{ fontSize: 13 }}>Historial de acciones</strong>
              <span className="badge badge-blue" style={{ fontSize: 10 }}>{history.length}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-ghost btn-xs"
                onClick={e => { e.stopPropagation(); void loadHistory() }}
                disabled={refreshingHist}
              >
                <RefreshCw size={11} style={{ animation: refreshingHist ? 'spin 1s linear infinite' : 'none' }} />
              </button>
              {showHistory
                ? <ChevronDown size={14} color="var(--tx3)" />
                : <ChevronRight size={14} color="var(--tx3)" />}
            </div>
          </div>

          {showHistory && (
            <>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className={`btn btn-xs ${historyFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setHF('all')}>
                  Todos
                </button>
                {Object.entries(historyActionCounts).map(([action, count]) => {
                  const m = metaOf(action)
                  return (
                    <button key={action}
                      className={`btn btn-xs ${historyFilter === action ? 'btn-primary' : 'btn-ghost'}`}
                      style={historyFilter === action ? {} : { color: m.color, borderColor: m.color + '33' }}
                      onClick={() => setHF(f => f === action ? 'all' : action)}>
                      <m.icon size={10} /> {m.label} ({count})
                    </button>
                  )
                })}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 0' }}>
                  <div className="empty-state-icon"><Clock size={20} color="var(--tx3)" /></div>
                  <div className="empty-state-title">Sin historial aún</div>
                  <div className="empty-state-sub">Las acciones de moderación aparecerán aquí</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr><th>Acción</th><th>Usuario</th><th>Grupo</th><th>Fecha</th></tr>
                    </thead>
                    <tbody>
                      {filteredHistory.slice(0, 80).map((e, i) => {
                        const m = metaOf(e.action)
                        return (
                          <tr key={i}>
                            <td>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                fontWeight: 700, fontSize: 11, color: m.color,
                                background: m.bg, border: `1px solid ${m.color}33`,
                                padding: '3px 9px', borderRadius: 5,
                                textTransform: 'uppercase', letterSpacing: '.06em',
                              }}>
                                <m.icon size={10} /> {m.label}
                              </span>
                            </td>
                            <td style={{ fontSize: 12 }}>
                              <div style={{ fontWeight: 600 }}>{e.userName || '—'}</div>
                              {e.userJid && (
                                <div style={{ fontSize: 9, color: 'var(--tx3)', fontFamily: "'JetBrains Mono',monospace" }}>
                                  +{e.userJid.split('@')[0]}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--tx2)' }}>
                              {e.groupName || e.groupJid?.split('@')[0] || '—'}
                            </td>
                            <td>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--tx3)' }}>
                                <Zap size={10} />{fmtTs(e.ts)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }
  