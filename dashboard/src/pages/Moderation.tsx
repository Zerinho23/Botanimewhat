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

const ACTION_META: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  ban:        { color: '#ff3355', bg: 'rgba(255,51,85,.15)',   label: 'Ban',          icon: UserX },
  kick:       { color: '#ff5252', bg: 'rgba(255,82,82,.12)',   label: 'Expulsado',    icon: UserX },
  warn:       { color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  label: 'Advertencia',  icon: AlertTriangle },
  clearwarns: { color: '#10b981', bg: 'rgba(16,185,129,.12)',  label: 'Warns borr.',  icon: Trash2 },
  mute:       { color: '#3b82f6', bg: 'rgba(59,130,246,.12)',  label: 'Muteado',      icon: VolumeX },
  unmute:     { color: '#10b981', bg: 'rgba(16,185,129,.12)',  label: 'Desmuteado',   icon: Volume2 },
}
const metaOf = (a: string) =>
  ACTION_META[a] ?? { color: 'var(--text3)', bg: 'rgba(255,255,255,.06)', label: a, icon: Shield }

function fmtTs(ts: number) {
  return new Date(ts).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function avatarColor(jid: string) {
  const n = jid.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const hues = [0, 25, 200, 260, 130, 320, 170]
  return `hsl(${hues[n % hues.length]}, 70%, 55%)`
}

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
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: color + '1a', border: `1px solid ${color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color, fontFamily: "'Inter', sans-serif",
          }}>
            {displayName[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{displayName}</span>
              {member.isAdmin && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.02em', color: 'var(--amber)',
                  background: 'rgba(255,200,0,.1)', border: '1px solid rgba(255,200,0,.3)',
                  padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3,
                }}>
                  <Crown size={8} /> ADMIN
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>+{num}</div>
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
          : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
      </td>

      <td>
        {member.isAdmin
          ? <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>Sin acciones disponibles</span>
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

function NotConfigured() {
  return (
    <div className="empty-state" style={{ height: 360 }}>
      <div className="empty-state-icon"><AlertTriangle size={28} color="var(--amber)" /></div>
      <div className="empty-state-title" style={{ color: 'var(--amber)' }}>VITE_API_URL no configurada</div>
      <div className="empty-state-sub">Ve a Vercel → Settings → Environment Variables</div>
    </div>
  )
}

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

  if (!configured) return <NotConfigured />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-up">

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
          <div className="page-title">
            <Shield size={18} color="var(--red)" />
            Moderación
          </div>
          <div className="page-subtitle">Gestiona usuarios directamente desde el panel</div>
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
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <Users size={13} color="var(--text3)" />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: 'var(--text3)', textTransform: 'uppercase' }}>Grupo</span>
          </div>

          {loadingGroups ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text3)', fontSize: 12 }}>
              <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Cargando grupos…
            </div>
          ) : (
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 380 }}>
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
              <ChevronDown size={13} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text3)', pointerEvents: 'none',
              }} />
            </div>
          )}

          {selectedJid && modData && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {memberCount} miembros · {adminCount} admins · {mutedCount} muteados · {warnedCount} con warns
            </span>
          )}
        </div>
      </div>

      {/* No group selected */}
      {!selectedJid && !loadingGroups && (
        <div className="empty-state" style={{ minHeight: 140 }}>
          <div className="empty-state-icon"><Users size={22} color="var(--text3)" /></div>
          <div className="empty-state-title">Selecciona un grupo</div>
          <div className="empty-state-sub">Elige un grupo arriba para ver y gestionar sus miembros</div>
        </div>
      )}

      {/* Loading members */}
      {selectedJid && loadingMembers && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, gap: 10, color: 'var(--text3)' }}>
          <RefreshCw size={17} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Cargando miembros…</span>
        </div>
      )}

      {/* Stats + table */}
      {selectedJid && modData && !loadingMembers && (
        <>
          {/* Mini stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
            {[
              { label: 'Total miembros',    val: memberCount, color: 'var(--blue)',  Icon: Users },
              { label: 'Admins',            val: adminCount,  color: 'var(--amber)', Icon: Crown },
              { label: 'Muteados',          val: mutedCount,  color: '#3b82f6',      Icon: VolumeX },
              { label: 'Con advertencias',  val: warnedCount, color: '#f59e0b',      Icon: AlertTriangle },
            ].map(({ label, val, color, Icon }) => (
              <div key={label} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="icon-badge" style={{ background: color + '18', width: 32, height: 32, borderRadius: 8 }}>
                  <Icon size={13} color={color} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color, fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 2 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 170, maxWidth: 260 }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
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
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={13} color="var(--red)" />
              <strong style={{ fontSize: 13 }}>
                {modData.groupName || selectedJid.split('@')[0]}
              </strong>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>
                {filteredMembers.length} de {memberCount} miembros
              </span>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="empty-state" style={{ padding: '28px 0' }}>
                <div className="empty-state-icon"><Users size={20} color="var(--text3)" /></div>
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
            padding: '12px 18px',
            borderBottom: showHistory ? '1px solid var(--border)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
          }}
          onClick={() => setShowHistory(s => !s)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={13} color="var(--text3)" />
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
              ? <ChevronDown size={13} color="var(--text3)" />
              : <ChevronRight size={13} color="var(--text3)" />}
          </div>
        </div>

        {showHistory && (
          <>
            {/* Action filter tabs */}
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <button className={`btn btn-xs ${historyFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setHF('all')}>
                Todos
              </button>
              {Object.keys(historyActionCounts).map(action => {
                const meta = metaOf(action)
                return (
                  <button
                    key={action}
                    className={`btn btn-xs ${historyFilter === action ? 'btn-primary' : 'btn-ghost'}`}
                    style={historyFilter !== action ? { color: meta.color, borderColor: meta.color + '30' } : undefined}
                    onClick={() => setHF(action)}
                  >
                    {meta.label} <span style={{ opacity: .65, marginLeft: 2 }}>({historyActionCounts[action]})</span>
                  </button>
                )
              })}
            </div>

            {/* History entries */}
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {filteredHistory.length === 0 ? (
                <div className="empty-state" style={{ padding: '28px 0' }}>
                  <div className="empty-state-icon"><Clock size={18} color="var(--text3)" /></div>
                  <div className="empty-state-title">Sin historial aún</div>
                </div>
              ) : filteredHistory.map((entry, i) => {
                const meta = metaOf(entry.action)
                const Icon = meta.icon
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 18px', borderBottom: '1px solid var(--border)',
                    transition: 'background .14s',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--card-hover)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={13} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {entry.userName || entry.userJid.split('@')[0]}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                          background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30`,
                        }}>
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.groupName || entry.groupJid.split('@')[0]}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0, fontFamily: 'monospace' }}>
                      {fmtTs(entry.ts)}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Bottom spacer for safe area */}
      <div style={{ height: 8 }} />
    </div>
  )
}
