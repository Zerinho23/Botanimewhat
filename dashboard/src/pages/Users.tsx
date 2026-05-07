import { useEffect, useState, useMemo } from 'react'
import {
  Search, RefreshCw, Users as UsersIcon, Zap, DollarSign, Trophy,
  MessageSquare, ChevronUp, ChevronDown, Filter, Crown, Star, TrendingUp, Pencil, X,
} from 'lucide-react'
import { getUsers, adjustUser, isConfigured, type User } from '../api'

/* ─── Rank tiers ──────────────────────────────────────────── */
const RANK_TIERS = [
  { min:1000, rank:'神', label:'DIOSA',    color:'#E879F9', glow:'rgba(232,121,249,.55)', bg:'linear-gradient(135deg,rgba(232,121,249,.22),rgba(232,121,249,.08))' },
  { min:  30, rank:'SS', label:'MONARCA',  color:'#F97316', glow:'rgba(249,115,22,.35)', bg:'linear-gradient(135deg,rgba(249,115,22,.18),rgba(249,115,22,.06))' },
  { min:  20, rank:'S',  label:'NACIONAL', color:'#F59E0B', glow:'rgba(245,158,11,.35)', bg:'linear-gradient(135deg,rgba(245,158,11,.18),rgba(245,158,11,.06))' },
  { min:  15, rank:'A',  label:'HÉROE',    color:'#EF4444', glow:'rgba(239,68,68,.30)',  bg:'linear-gradient(135deg,rgba(239,68,68,.16),rgba(239,68,68,.06))'  },
  { min:  10, rank:'B',  label:'AVANZADO', color:'#8B5CF6', glow:'rgba(139,92,246,.30)', bg:'linear-gradient(135deg,rgba(139,92,246,.16),rgba(139,92,246,.06))' },
  { min:   5, rank:'C',  label:'INTER.',   color:'#3B82F6', glow:'rgba(59,130,246,.30)', bg:'linear-gradient(135deg,rgba(59,130,246,.16),rgba(59,130,246,.06))'  },
  { min:   1, rank:'D',  label:'NOVATO',   color:'#10B981', glow:'rgba(16,185,129,.28)', bg:'linear-gradient(135deg,rgba(16,185,129,.14),rgba(16,185,129,.05))' },
  { min:   0, rank:'E',  label:'RANGO E',  color:'#52525B', glow:'rgba(82,82,91,.18)',   bg:'linear-gradient(135deg,rgba(82,82,91,.10),rgba(82,82,91,.03))'     },
]
function getTier(level: number) { return RANK_TIERS.find(t => level >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1] }

function timeAgo(ts?: number) {
  if (!ts) return '—'
  const d = Math.floor((Date.now() - ts) / 86400000)
  return d === 0 ? 'hoy' : d === 1 ? 'ayer' : `${d}d`
}

/* ─── XP progress bar ────────────────────────────────────── */
function XPBar({ xp, level, color }: { xp: number; level: number; color: string }) {
  const needed = (level + 1) * 100
  const pct = Math.min((xp / needed) * 100, 100)
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>XP <strong style={{ color }}>{xp.toLocaleString()}</strong></span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Lv <strong style={{ color: 'var(--text2)' }}>{level}</strong> → {level + 1}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg,${color},${color}aa)`,
          boxShadow: `0 0 8px ${color}60`,
          transition: 'width .8s cubic-bezier(.4,0,.2,1)',
        }}/>
      </div>
    </div>
  )
}

/* ─── Position badge ─────────────────────────────────────── */
function PosBadge({ pos }: { pos: number }) {
  if (pos === 1) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', background:'rgba(251,191,36,.15)', border:'1px solid rgba(251,191,36,.35)', boxShadow:'0 0 12px rgba(251,191,36,.25)', flexShrink:0 }}><Crown size={13} color="#FBBF24"/></div>
  if (pos === 2) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', background:'rgba(148,163,184,.10)', border:'1px solid rgba(148,163,184,.25)', flexShrink:0 }}><Star size={12} color="#94A3B8"/></div>
  if (pos === 3) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', background:'rgba(205,127,50,.10)', border:'1px solid rgba(205,127,50,.25)', flexShrink:0 }}><Star size={12} color="#CD7F32"/></div>
  return <span style={{ fontSize:11, color:'var(--text3)', fontWeight:600, width:28, textAlign:'center', flexShrink:0 }}>#{pos}</span>
}

/* ─── Edit User Modal ────────────────────────────────────── */
function EditUserModal({
  user, onClose, onSaved,
}: { user: User; onClose: () => void; onSaved: (u: User) => void }) {
  const t = getTier(user.level)
  const name = user.name || user.jid.split('@')[0]
  const [coinsAmt, setCoinsAmt] = useState(100)
  const [levelAmt, setLevelAmt] = useState(1)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function apply(field: 'coins' | 'level', dir: 1 | -1) {
    const amount = field === 'coins' ? coinsAmt : levelAmt
    if (amount < 1) { setMsg('Ingresa un valor mayor a 0'); return }
    setBusy(true); setMsg('')
    try {
      const delta = dir * amount
      const res = await adjustUser(
        user.jid,
        field === 'coins' ? delta : undefined,
        field === 'level' ? delta : undefined,
      )
      onSaved(res.user)
      setMsg(
        field === 'coins'
          ? (dir > 0 ? `✓ +${amount} monedas añadidas` : `✓ −${amount} monedas quitadas`)
          : (dir > 0 ? `✓ Nivel subido +${amount}` : `✓ Nivel bajado −${amount}`)
      )
    } catch (e: unknown) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'Error'))
    }
    setBusy(false)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#0d0d1a', border: `1px solid ${t.color}40`,
        borderRadius: 16, padding: 24, maxWidth: 400, width: '100%',
        boxShadow: `0 0 40px ${t.glow}, 0 20px 60px rgba(0,0,0,.5)`,
        position: 'relative',
      }}>
        {/* Top accent */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, borderRadius:'16px 16px 0 0', background:`linear-gradient(90deg,${t.color},${t.color}44,transparent)` }}/>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
          <div style={{
            width:48, height:48, borderRadius:12, flexShrink:0,
            background: t.bg, border:`2px solid ${t.color}60`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontWeight:800, fontSize:16, color:t.color,
            boxShadow:`0 0 20px ${t.glow}`,
          }}>
            {name.slice(0,2).toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#fff', marginBottom:3 }}>{name.length>18?name.slice(0,17)+'…':name}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{
                fontSize:10, fontWeight:800, padding:'2px 8px', borderRadius:20,
                background:`${t.color}22`, color:t.color, border:`1px solid ${t.color}40`,
                boxShadow:`0 0 8px ${t.glow}`, letterSpacing:'.05em',
              }}>
                {t.rank} · {t.label}
              </span>
              <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace' }}>LV.{user.level}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4, borderRadius:6 }}>
            <X size={16}/>
          </button>
        </div>

        {/* Coins section */}
        <div style={{ background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:10, padding:14, marginBottom:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#F59E0B', letterSpacing:'.05em', textTransform:'uppercase' }}>🪙 Monedas</span>
            <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#F59E0B' }}>
              {(user.coins ?? 0).toLocaleString()} actuales
            </span>
          </div>
          <input
            type="number" min={1} value={coinsAmt}
            onChange={e => setCoinsAmt(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width:'100%', boxSizing:'border-box',
              background:'rgba(0,0,0,.4)', border:'1px solid rgba(245,158,11,.25)',
              borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:14,
              fontFamily:'monospace', outline:'none', marginBottom:8,
            }}
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button
              disabled={busy}
              onClick={() => apply('coins', 1)}
              style={{ padding:'10px 0', borderRadius:8, border:'1px solid rgba(16,185,129,.4)', background:'rgba(16,185,129,.12)', color:'#10B981', fontWeight:700, fontSize:13, cursor:'pointer' }}
            >+ DAR</button>
            <button
              disabled={busy}
              onClick={() => apply('coins', -1)}
              style={{ padding:'10px 0', borderRadius:8, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.1)', color:'#EF4444', fontWeight:700, fontSize:13, cursor:'pointer' }}
            >− QUITAR</button>
          </div>
        </div>

        {/* Level section */}
        <div style={{ background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:10, padding:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:11, fontWeight:700, color:'#3B82F6', letterSpacing:'.05em', textTransform:'uppercase' }}>⬡ Nivel</span>
            <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#3B82F6' }}>
              LV.{user.level ?? 1} actual
            </span>
          </div>
          <input
            type="number" min={1} value={levelAmt}
            onChange={e => setLevelAmt(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width:'100%', boxSizing:'border-box',
              background:'rgba(0,0,0,.4)', border:'1px solid rgba(59,130,246,.25)',
              borderRadius:8, padding:'9px 12px', color:'#fff', fontSize:14,
              fontFamily:'monospace', outline:'none', marginBottom:8,
            }}
          />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button
              disabled={busy}
              onClick={() => apply('level', 1)}
              style={{ padding:'10px 0', borderRadius:8, border:'1px solid rgba(16,185,129,.4)', background:'rgba(16,185,129,.12)', color:'#10B981', fontWeight:700, fontSize:13, cursor:'pointer' }}
            >+ SUBIR</button>
            <button
              disabled={busy}
              onClick={() => apply('level', -1)}
              style={{ padding:'10px 0', borderRadius:8, border:'1px solid rgba(239,68,68,.4)', background:'rgba(239,68,68,.1)', color:'#EF4444', fontWeight:700, fontSize:13, cursor:'pointer' }}
            >− BAJAR</button>
          </div>
        </div>

        {/* DIOSA special button */}
        {user.level < 1000 ? (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true); setMsg('')
              try {
                const delta = 1000 - user.level
                const res = await adjustUser(user.jid, undefined, delta)
                onSaved(res.user)
                setMsg('✓ 🌸 ¡Rango DIOSA otorgado!')
              } catch (e: unknown) {
                setMsg('❌ ' + (e instanceof Error ? e.message : 'Error'))
              }
              setBusy(false)
            }}
            style={{
              marginTop:10, width:'100%', padding:'12px 0', borderRadius:10,
              border:'2px solid rgba(253,224,71,.5)',
              background:'linear-gradient(135deg,rgba(253,224,71,.18),rgba(253,224,71,.06))',
              color:'#FDE047', fontWeight:800, fontSize:14, cursor:'pointer',
              letterSpacing:'.06em', boxShadow:'0 0 20px rgba(253,224,71,.25)',
            }}
          >🌸 OTORGAR RANGO DIOSA</button>
        ) : (
          <div style={{
            marginTop:10, padding:'10px', borderRadius:10, textAlign:'center',
            border:'2px solid rgba(253,224,71,.4)',
            background:'linear-gradient(135deg,rgba(253,224,71,.12),rgba(253,224,71,.04))',
            color:'#FDE047', fontWeight:800, fontSize:13, letterSpacing:'.04em',
          }}>
            🌸 Ya tiene rango DIOSA
          </div>
        )}

        {/* Feedback */}
        {msg && (
          <div style={{
            marginTop:10, padding:'8px 12px', borderRadius:8,
            background: msg.startsWith('✓') ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)',
            border: `1px solid ${msg.startsWith('✓') ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
            color: msg.startsWith('✓') ? '#10B981' : '#EF4444',
            fontSize:12, fontWeight:600, fontFamily:'monospace',
          }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── User card ──────────────────────────────────────────── */
function UserCard({ user, pos, onEdit }: { user: User; pos: number; onEdit: (u: User) => void }) {
  const [exp, setExp] = useState(false)
  const t = getTier(user.level)
  const jidShort = user.jid.split('@')[0]
  const name = user.name || jidShort
  const initials = name.slice(0, 2).toUpperCase()

  const STATS = [
    { icon: MessageSquare, val: user.messages ?? 0, label: 'MSG',   color: '#3B82F6' },
    { icon: Zap,           val: user.commands ?? 0, label: 'CMDS',  color: '#8B5CF6' },
    { icon: DollarSign,    val: user.coins    ?? 0, label: 'COINS', color: '#F59E0B' },
  ]

  return (
    <div
      onClick={() => setExp(e => !e)}
      style={{
        borderRadius: 12, padding: 14, cursor: 'pointer', position: 'relative',
        overflow: 'hidden', transition: 'all .2s',
        background: exp ? t.bg : 'rgba(255,255,255,.032)',
        border: `1px solid ${exp ? t.color + '40' : 'rgba(255,255,255,.072)'}`,
        boxShadow: exp ? `0 0 24px ${t.glow}, 0 4px 20px rgba(0,0,0,.3)` : '0 2px 8px rgba(0,0,0,.15)',
      }}
      onMouseEnter={e => { if (!exp) { (e.currentTarget as HTMLDivElement).style.borderColor = t.color + '35'; (e.currentTarget as HTMLDivElement).style.background = t.bg } }}
      onMouseLeave={e => { if (!exp) { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.072)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.032)' } }}
    >
      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg,${t.color},${t.color}44,transparent)`,
        opacity: exp ? 1 : 0.5, transition: 'opacity .2s',
      }}/>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: t.bg, border: `1.5px solid ${t.color}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 14, color: t.color, letterSpacing: '-.01em',
          boxShadow: `0 0 16px ${t.glow}`,
          fontFamily: "'Noto Serif JP', serif",
        }}>
          {initials}
        </div>

        {/* Name + rank */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>
              {name.length > 16 ? name.slice(0, 15) + '…' : name}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 20,
              background: t.bg, color: t.color, border: `1px solid ${t.color}35`,
              boxShadow: `0 0 8px ${t.glow}`, flexShrink: 0, letterSpacing: '.04em',
            }}>
              {t.rank}
            </span>
          </div>
          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'monospace' }}>
            {jidShort.slice(0, 18)}
          </div>
          <div style={{ fontSize: 9, color: t.color, opacity: .65, marginTop: 2, fontWeight: 600, letterSpacing: '.04em' }}>
            {t.label}
          </div>
        </div>

        {/* Position */}
        <PosBadge pos={pos}/>
      </div>

      {/* XP bar */}
      <XPBar xp={user.xp} level={user.level} color={t.color}/>

      {/* Stats micro-grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginTop: 10 }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            background: `linear-gradient(135deg,${s.color}0d,${s.color}04)`,
            border: `1px solid ${s.color}22`,
            borderRadius: 8, padding: '6px 4px', textAlign: 'center',
          }}>
            <s.icon size={11} color={s.color} style={{ display: 'block', margin: '0 auto 3px' }}/>
            <div style={{ fontWeight: 700, fontSize: 13, color: s.color, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {s.val >= 1000 ? (s.val / 1000).toFixed(1) + 'K' : s.val}
            </div>
            <div style={{ fontSize: 8, color: 'var(--text3)', fontWeight: 700, letterSpacing: '.05em', marginTop: 2, textTransform: 'uppercase' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Expanded detail */}
      {exp && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.color}20` }}>
          {[
            { label: 'Rango completo', val: `${t.rank} · ${t.label}`, color: t.color },
            { label: 'Daily reclamado', val: timeAgo(user.lastDaily),  color: 'var(--text2)' },
            { label: 'Registrado',      val: timeAgo(user.createdAt),  color: 'var(--text2)' },
            { label: 'Waifus',          val: String((user.waifus as unknown[] | undefined)?.length ?? 0) + ' 🌸', color: '#EC4899' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ color: 'var(--text3)', fontWeight: 500, fontSize: 11 }}>{row.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 600, color: row.color }}>{row.val}</span>
            </div>
          ))}

          {/* Edit button */}
          <button
            onClick={e => { e.stopPropagation(); onEdit(user) }}
            style={{
              marginTop: 10, width: '100%', padding: '8px', borderRadius: 8,
              border: `1px solid ${t.color}40`, background: t.bg,
              color: t.color, fontWeight: 700, fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              letterSpacing: '.04em',
            }}
          >
            <Pencil size={11}/> EDITAR MONEDAS / NIVEL
          </button>
        </div>
      )}

      {/* Chevron */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: exp ? 8 : 6 }}>
        {exp
          ? <ChevronUp size={11} color={t.color} style={{ opacity: .7 }}/>
          : <ChevronDown size={11} color="var(--text3)" style={{ opacity: .35 }}/>
        }
      </div>
    </div>
  )
}

type SortKey = 'xp' | 'level' | 'commands' | 'messages' | 'coins'

/* ══ MAIN ═════════════════════════════════════════════════════ */
export default function Users() {
  const [users,     setUsers]  = useState<User[]>([])
  const [loading,   setLoad]   = useState(true)
  const [search,    setSearch] = useState('')
  const [sortBy,    setSort]   = useState<SortKey>('xp')
  const [sortAsc,   setAsc]    = useState(false)
  const [refreshing,setRef]    = useState(false)
  const [editing,   setEditing] = useState<User | null>(null)

  const load = async (r = false) => {
    if (!isConfigured()) { setLoad(false); return }
    if (r) setRef(true)
    try { setUsers(await getUsers()) } catch {}
    setLoad(false); setRef(false)
  }
  useEffect(() => { load() }, [])

  function handleSaved(updated: User) {
    setUsers(prev => prev.map(u => u.jid === updated.jid ? updated : u))
    setEditing(updated)
  }

  const sorted = useMemo(() => {
    let list = [...users]
    if (search) list = list.filter(u => (u.name || '').toLowerCase().includes(search.toLowerCase()) || u.jid.includes(search))
    list.sort((a, b) => {
      const av = (a as unknown as Record<string, number>)[sortBy] ?? 0
      const bv = (b as unknown as Record<string, number>)[sortBy] ?? 0
      return sortAsc ? av - bv : bv - av
    })
    return list
  }, [users, search, sortBy, sortAsc])

  const rankDist: Record<string, number> = {}
  for (const u of users) { const r = getTier(u.level).rank; rankDist[r] = (rankDist[r] || 0) + 1 }

  const totalMsgs = users.reduce((s, u) => s + (u.messages ?? 0), 0)
  const totalCmds = users.reduce((s, u) => s + (u.commands ?? 0), 0)

  if (!isConfigured()) return (
    <div className="empty-state">
      <div className="empty-state-icon"><UsersIcon size={20} color="var(--text3)"/></div>
      <div className="empty-state-title">API sin configurar</div>
    </div>
  )
  if (loading) return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10, marginTop:4 }}>
      {[...Array(9)].map((_, i) => <div key={i} className="skeleton" style={{ height:180 }}/>)}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="animate-fade-up">

      {/* Edit modal */}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
        <div>
          <div className="page-title"><UsersIcon size={17} color="#F59E0B"/>Usuarios</div>
          <div className="page-subtitle">{users.length} hunters · {totalMsgs.toLocaleString()} mensajes · {totalCmds.toLocaleString()} comandos</div>
        </div>
        <div style={{ display:'flex', gap:7 }}>
          <div style={{ position:'relative' }}>
            <Search size={11} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input className="input" placeholder="Buscar hunter…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:27, width:165, fontSize:12 }}/>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={11} style={{ animation:refreshing ? 'spin 1s linear infinite' : 'none' }}/>
          </button>
        </div>
      </div>

      {/* ── Rank distribution — colorful cards ── */}
      <div style={{ display:'flex', gap:7, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' } as React.CSSProperties}>
        {RANK_TIERS.map(t => (
          <div key={t.rank} style={{
            flexShrink:0, borderRadius:11, padding:'10px 14px',
            background:t.bg, border:`1px solid ${t.color}30`,
            minWidth:72, display:'flex', flexDirection:'column', gap:4,
            boxShadow:`0 0 14px ${t.glow}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ fontSize:9, fontWeight:800, padding:'2px 6px', borderRadius:20, background:t.color+'22', color:t.color, border:`1px solid ${t.color}35`, letterSpacing:'.05em' }}>
                {t.rank}
              </span>
              <span style={{ fontWeight:800, fontSize:18, color:t.color, lineHeight:1, letterSpacing:'-0.04em' }}>{rankDist[t.rank] ?? 0}</span>
            </div>
            <span style={{ fontSize:9, color:t.color, opacity:.65, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase' }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* ── Sort controls ── */}
      <div style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap' }}>
        <span style={{ fontSize:10, color:'var(--text3)', fontWeight:700, letterSpacing:'.04em', display:'flex', alignItems:'center', gap:3 }}>
          <Filter size={10}/> ORDENAR:
        </span>
        {(['xp','level','commands','messages','coins'] as SortKey[]).map(k => (
          <button key={k}
            className={`btn btn-xs ${sortBy === k ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { if (sortBy === k) setAsc(a => !a); else { setSort(k); setAsc(false) } }}>
            {k === 'commands' ? 'CMDS' : k === 'messages' ? 'MSG' : k.toUpperCase()}
            {sortBy === k && (sortAsc ? <ChevronUp size={8}/> : <ChevronDown size={8}/>)}
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
          <TrendingUp size={10} color="var(--text3)"/>
          <span style={{ fontSize:10, color:'var(--text3)', fontWeight:600 }}>{sorted.length} hunters</span>
        </div>
      </div>

      {/* ── User grid ── */}
      {sorted.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={18} color="var(--text3)"/></div>
            <div className="empty-state-title">Sin hunters</div>
            <div className="empty-state-sub">No hay usuarios registrados aún</div>
          </div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:9 }}>
          {sorted.map((u, i) => <UserCard key={u.jid} user={u} pos={i + 1} onEdit={setEditing}/>)}
        </div>
      )}

      <div style={{ height:4 }}/>
    </div>
  )
}
