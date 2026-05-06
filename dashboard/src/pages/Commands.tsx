import { useState, useMemo, useEffect } from 'react'
import {
  Terminal, Search, Copy, Check, Shield, Users, Star,
  BookOpen, Zap, DollarSign, Clock, Lock, Globe, ChevronRight,
  Heart,
} from 'lucide-react'

/* ─── Mobile breakpoint hook ─────────────────────────────── */
function useMobile() {
  const [m, setM] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setM(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return m
}

/* ─── Types ──────────────────────────────────────────────── */
interface Command {
  name: string
  description: string
  usage: string
  aliases: string[]
  permission: 'all' | 'admin' | 'owner'
  cooldown?: number
  example?: string
  isNew?: boolean
}

interface Category {
  id: string
  label: string
  icon: React.ElementType
  color: string
  gradient: string
  glowColor: string
  description: string
  commands: Command[]
}

/* ─── Category data ──────────────────────────────────────── */
const CATEGORIES: Category[] = [
  {
    id: 'admin', label: 'Administración', icon: Shield,
    color: '#EF4444', gradient: 'linear-gradient(135deg,rgba(239,68,68,.16),rgba(239,68,68,.04))',
    glowColor: 'rgba(239,68,68,.22)',
    description: 'Moderación y gestión de grupo',
    commands: [
      { name: 'antilink',  aliases: ['antilinks'],             permission: 'admin', usage: '!antilink [on|off]', example: '!antilink on',  description: 'Activa o desactiva el filtro de enlaces externos en el grupo.' },
      { name: 'ban',       aliases: ['expulsar'],              permission: 'admin', usage: '!ban @usuario',      example: '!ban @Juan',    description: 'Expulsa permanentemente a un usuario del grupo.' },
      { name: 'kick',      aliases: ['sacar'],                 permission: 'admin', usage: '!kick @usuario',     example: '!kick @María',  description: 'Expulsa temporalmente a un usuario del grupo.' },
      { name: 'mute',      aliases: ['silenciar'],             permission: 'admin', usage: '!mute @usuario',                               description: 'Silencia a un usuario (sus mensajes son eliminados automáticamente).' },
      { name: 'nuevos',    aliases: ['recientes','new'],       permission: 'admin', usage: '!nuevos [días]',     example: '!nuevos 7',     description: 'Lista los miembros que ingresaron recientemente al grupo.' },
      { name: 'invocar',   aliases: ['all','todos'],           permission: 'admin', usage: '!invocar [mensaje]',                           description: 'Menciona a todos los integrantes del grupo.' },
      { name: 'fantasmas', aliases: ['inactivos','ghosts'],    permission: 'admin', usage: '!fantasmas [días]',  example: '!fantasmas 30', description: 'Detecta miembros inactivos que no han escrito en X días.' },
      { name: 'purga',     aliases: ['cleanup'],               permission: 'admin', usage: '!purga', cooldown: 60,                         description: 'Expulsa masivamente a miembros inactivos (+30 días sin escribir).', isNew: true },
    ],
  },
  {
    id: 'anime', label: 'Anime', icon: Star,
    color: '#EC4899', gradient: 'linear-gradient(135deg,rgba(236,72,153,.16),rgba(236,72,153,.04))',
    glowColor: 'rgba(236,72,153,.22)',
    description: 'Búsqueda, noticias y recomendaciones',
    commands: [
      { name: 'buscar',          aliases: ['search','find'],  permission: 'all', usage: '!buscar [nombre]',          example: '!buscar Attack on Titan', description: 'Busca un anime por nombre en MyAnimeList con sinopsis, rating y más.' },
      { name: 'noticias',        aliases: ['news'],           permission: 'all', usage: '!noticias',                                                       description: 'Muestra las últimas noticias del mundo anime.' },
      { name: 'recomendaciones', aliases: ['rec'],            permission: 'all', usage: '!recomendaciones',                                                description: 'Recomienda animes basados en géneros y preferencias.' },
      { name: 'dinamica',        aliases: ['trivia','juego'], permission: 'all', usage: '!dinamica [tipo]',          example: '!dinamica trivia',           description: 'Inicia una dinámica de anime: trivia, adivina el anime o adivina el personaje.', isNew: true },
    ],
  },
  {
    id: 'user', label: 'Perfil & Niveles', icon: Users,
    color: '#3B82F6', gradient: 'linear-gradient(135deg,rgba(59,130,246,.16),rgba(59,130,246,.04))',
    glowColor: 'rgba(59,130,246,.22)',
    description: 'Perfil, XP, ranking y estadísticas',
    commands: [
      { name: 'help',    aliases: ['menu','ayuda'],      permission: 'all', usage: '!help [comando]', example: '!help ban', description: 'Muestra el menú de todos los comandos disponibles.' },
      { name: 'perfil',  aliases: ['profile','me'],      permission: 'all', usage: '!perfil',                              description: 'Muestra tu perfil otaku: nivel, XP, monedas, rango y estadísticas.' },
      { name: 'rank',    aliases: ['leaderboard','lb'],  permission: 'all', usage: '!rank',                                description: 'Muestra el top 10 de usuarios con más nivel y XP del grupo.' },
      { name: 'daily',   aliases: ['diario'],            permission: 'all', usage: '!daily', cooldown: 86400,               description: 'Recoge tus monedas diarias para usar en la economía del bot.' },
    ],
  },
  {
    id: 'economy', label: 'Economía', icon: DollarSign,
    color: '#F59E0B', gradient: 'linear-gradient(135deg,rgba(245,158,11,.16),rgba(245,158,11,.04))',
    glowColor: 'rgba(245,158,11,.22)',
    description: 'Coins, apuestas y tienda',
    commands: [
      { name: 'bal',       aliases: ['balance','monedas'],  permission: 'all', usage: '!bal',                                              description: 'Muestra tu saldo actual de coins.' },
      { name: 'shop',      aliases: ['tienda','store'],     permission: 'all', usage: '!shop',                                             description: 'Abre la tienda del bot para comprar items especiales.' },
      { name: 'coleccion', aliases: ['col','waifus'],       permission: 'all', usage: '!coleccion',                                        description: 'Muestra tu colección de waifus obtenidas.' },
      { name: 'waifu',     aliases: ['obtener'],            permission: 'all', usage: '!waifu',                                            description: 'Invoca una waifu aleatoria usando tus monedas.' },
      { name: 'duel',      aliases: ['batalla'],            permission: 'all', usage: '!duel @usuario [coins]', example: '!duel @Rival 500', description: 'Reta a otro usuario a un duelo por coins.' },
      { name: 'gift',      aliases: ['dar','transfer'],     permission: 'all', usage: '!gift @usuario [coins]', example: '!gift @Amigo 100', description: 'Envía coins a otro usuario.' },
      { name: 'transferir',aliases: ['send'],               permission: 'all', usage: '!transferir @usuario [monto]',                      description: 'Transfiere monedas a otro usuario del grupo.' },
    ],
  },
  {
    id: 'fun', label: 'Diversión', icon: Heart,
    color: '#8B5CF6', gradient: 'linear-gradient(135deg,rgba(139,92,246,.16),rgba(139,92,246,.04))',
    glowColor: 'rgba(139,92,246,.22)',
    description: 'Juegos, interacción y entretenimiento',
    commands: [
      { name: 'hug',    aliases: ['abrazar'],  permission: 'all', usage: '!hug @usuario',  example: '!hug @Amiga', description: 'Abraza a otro usuario con un GIF animado.', isNew: true },
      { name: 'ship',   aliases: ['amor'],     permission: 'all', usage: '!ship @a @b',    example: '!ship @Ana @Leo', description: 'Calcula el nivel de compatibilidad entre dos usuarios.', isNew: true },
    ],
  },
]

const PERM_META = {
  all:   { label: 'Público', color: '#3B82F6', bg: 'rgba(59,130,246,.12)',  border: 'rgba(59,130,246,.28)', icon: Globe  },
  admin: { label: 'Admin',   color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.30)', icon: Shield },
  owner: { label: 'Owner',   color: '#8B5CF6', bg: 'rgba(139,92,246,.12)', border: 'rgba(139,92,246,.28)', icon: Lock   },
}

/* ─── Copy button ────────────────────────────────────────── */
function CopyBtn({ text, size = 11 }: { text: string; size?: number }) {
  const [ok, setOk] = useState(false)
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).catch(() => {})
    setOk(true)
    setTimeout(() => setOk(false), 1800)
  }
  return (
    <button onClick={copy} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 26, height: 26, borderRadius: 7, flexShrink: 0, cursor: 'pointer',
      background: ok ? 'rgba(16,185,129,.10)' : 'rgba(255,255,255,.05)',
      border: `1px solid ${ok ? 'rgba(16,185,129,.30)' : 'rgba(255,255,255,.09)'}`,
      color: ok ? '#34D399' : 'rgba(255,255,255,.35)',
      transition: 'all .18s',
    }}>
      {ok ? <Check size={size} /> : <Copy size={size} />}
    </button>
  )
}

/* ─── Cooldown badge ─────────────────────────────────────── */
function CooldownBadge({ seconds }: { seconds: number }) {
  const label = seconds >= 3600
    ? `${Math.round(seconds / 3600)}h`
    : seconds >= 60
      ? `${Math.round(seconds / 60)}m`
      : `${seconds}s`
  return (
    <span style={{
      fontSize: 9, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
      gap: 3, flexShrink: 0, color: 'var(--text3)',
      background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
      borderRadius: 20, padding: '2px 7px',
    }}>
      <Clock size={8} />{label}
    </span>
  )
}

/* ─── Command card ───────────────────────────────────────── */
function CommandCard({ cmd, prefix, color, gradient }: {
  cmd: Command; prefix: string; color: string; gradient: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [hovered,  setHovered]  = useState(false)
  const pm = PERM_META[cmd.permission]
  const PmIcon = pm.icon
  const active = expanded || hovered

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 11, cursor: 'pointer', position: 'relative',
        overflow: 'hidden', transition: 'all .2s',
        background: active ? gradient : 'rgba(255,255,255,.028)',
        border: `1px solid ${active ? color + '45' : 'rgba(255,255,255,.07)'}`,
        boxShadow: expanded ? `0 0 22px ${color}14, inset 0 0 20px ${color}05` : 'none',
      }}
    >
      {/* Left accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg,${color},${color}44)`,
        borderRadius: '11px 0 0 11px',
        opacity: active ? 1 : 0.5,
        transition: 'opacity .2s',
      }} />

      {/* Top glow line when expanded */}
      {expanded && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg,transparent,${color}60,transparent)`,
        }} />
      )}

      <div style={{ padding: '11px 11px 11px 16px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
              <code style={{
                fontFamily: 'ui-monospace,monospace', fontWeight: 800,
                fontSize: 14, color, letterSpacing: '.01em',
              }}>
                {prefix}{cmd.name}
              </code>

              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: pm.bg, color: pm.color, border: `1px solid ${pm.border}`,
                display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
              }}>
                <PmIcon size={8} />{pm.label}
              </span>

              {cmd.cooldown && <CooldownBadge seconds={cmd.cooldown} />}

              {cmd.isNew && (
                <span style={{
                  fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 20,
                  background: 'rgba(16,185,129,.12)', color: '#34D399',
                  border: '1px solid rgba(16,185,129,.28)', flexShrink: 0,
                  letterSpacing: '.06em',
                }}>NUEVO</span>
              )}
            </div>

            <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, wordBreak: 'break-word' }}>
              {cmd.description}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }}>
            <CopyBtn text={`${prefix}${cmd.name}`} />
            <div style={{
              width: 22, height: 22, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: active ? color : 'var(--text3)',
              transition: 'transform .22s, color .2s',
              transform: expanded ? 'rotate(90deg)' : 'none',
            }}>
              <ChevronRight size={13} />
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div style={{ marginTop: 13, paddingTop: 13, borderTop: `1px solid ${color}20` }}>

            {/* Usage */}
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <Tag label="USO" color={color} />
              <code style={{
                fontFamily: 'ui-monospace,monospace', fontSize: 11, color: 'var(--text2)',
                background: 'rgba(255,255,255,.05)', padding: '3px 9px',
                borderRadius: 5, wordBreak: 'break-all',
              }}>
                {cmd.usage}
              </code>
            </div>

            {/* Example */}
            {cmd.example && (
              <div style={{ marginBottom: 10 }}>
                <Tag label="EJEMPLO" color={color} />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 7 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: color + '18', border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                  }}>👤</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'inline-block', maxWidth: '100%',
                      background: 'rgba(37,211,102,.07)', border: '1px solid rgba(37,211,102,.22)',
                      borderRadius: '10px 10px 10px 2px', padding: '5px 11px',
                      fontFamily: 'ui-monospace,monospace', fontSize: 12, fontWeight: 600,
                      color, wordBreak: 'break-all',
                    }}>
                      {cmd.example}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 3, paddingLeft: 4 }}>✓✓ entregado</div>
                  </div>
                  <CopyBtn text={cmd.example} />
                </div>
              </div>
            )}

            {/* Aliases */}
            {cmd.aliases.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                <Tag label="ALIAS" color={color} />
                {cmd.aliases.map(a => (
                  <span key={a} style={{
                    fontFamily: 'ui-monospace,monospace', fontSize: 10, color: 'var(--text3)',
                    background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)',
                    borderRadius: 5, padding: '1px 7px',
                  }}>
                    {prefix}{a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Small label tag ────────────────────────────────────── */
function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, color, letterSpacing: '.07em', textTransform: 'uppercase',
      background: color + '12', border: `1px solid ${color}22`, borderRadius: 4, padding: '2px 6px',
      flexShrink: 0, display: 'inline-block',
    }}>
      {label}
    </span>
  )
}

/* ─── Category header banner ─────────────────────────────── */
function CategoryBanner({ cat }: { cat: Category }) {
  return (
    <div style={{
      borderRadius: 11, padding: '12px 14px',
      background: cat.gradient, border: `1px solid ${cat.color}35`,
      display: 'flex', alignItems: 'center', gap: 11,
      boxShadow: `0 0 28px ${cat.glowColor}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: cat.color + '20', border: `1px solid ${cat.color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 14px ${cat.glowColor}`,
      }}>
        <cat.icon size={15} color={cat.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: cat.color, fontFamily: "'Noto Serif JP',serif" }}>
          {cat.label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
          {cat.description} · {cat.commands.length} comandos
        </div>
      </div>
      <span style={{
        fontSize: 18, fontWeight: 800, color: cat.color, letterSpacing: '-0.04em',
        opacity: 0.7, flexShrink: 0,
      }}>
        {cat.commands.length}
      </span>
    </div>
  )
}

/* ══ MAIN ════════════════════════════════════════════════════ */
export default function Commands() {
  const [search,     setSearch]  = useState('')
  const [activeId,   setActiveId]= useState('admin')
  const [permFilter, setPermF]   = useState<'' | 'all' | 'admin' | 'owner'>('')
  const isMobile = useMobile()
  const prefix = '!'

  const totalCmds = CATEGORIES.reduce((s, c) => s + c.commands.length, 0)

  const filteredCats = useMemo(() => {
    let cats = CATEGORIES
    if (permFilter) cats = cats.map(c => ({ ...c, commands: c.commands.filter(x => x.permission === permFilter) })).filter(c => c.commands.length > 0)
    const q = search.trim().toLowerCase()
    if (!q) return cats
    return cats
      .map(c => ({ ...c, commands: c.commands.filter(x => x.name.includes(q) || x.description.toLowerCase().includes(q) || x.aliases.some(a => a.includes(q))) }))
      .filter(c => c.commands.length > 0)
  }, [search, permFilter])

  const isSearching = search.trim().length > 0
  const activeCategory = isSearching
    ? null
    : filteredCats.find(c => c.id === activeId) ?? filteredCats[0] ?? null

  /* ── Stat cards ── */
  const STATS = [
    { label: 'Total',    val: totalCmds,                                                                    color: '#EC4899', icon: Terminal   },
    { label: 'Público',  val: CATEGORIES.flatMap(c => c.commands).filter(c => c.permission === 'all').length,  color: '#10B981', icon: Globe      },
    { label: 'Admin',    val: CATEGORIES.flatMap(c => c.commands).filter(c => c.permission === 'admin').length, color: '#F59E0B', icon: Shield     },
    { label: 'Categ.',   val: CATEGORIES.length,                                                              color: '#8B5CF6', icon: BookOpen   },
  ]

  /* ── Mobile pill scroll ── */
  const MobilePills = () => (
    <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 3, scrollbarWidth: 'none' } as React.CSSProperties}>
      {CATEGORIES.map(cat => {
        const isActive = activeId === cat.id
        return (
          <button key={cat.id} onClick={() => setActiveId(cat.id)} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px',
            borderRadius: 22, flexShrink: 0, cursor: 'pointer', transition: 'all .2s',
            background: isActive ? cat.gradient : 'rgba(255,255,255,.04)',
            border: `1px solid ${isActive ? cat.color + '55' : 'rgba(255,255,255,.08)'}`,
            boxShadow: isActive ? `0 0 18px ${cat.glowColor}` : 'none',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              background: isActive ? cat.color + '22' : 'rgba(255,255,255,.06)',
              border: `1px solid ${isActive ? cat.color + '40' : 'rgba(255,255,255,.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <cat.icon size={11} color={isActive ? cat.color : 'var(--text3)'} />
            </div>
            <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? cat.color : 'var(--text3)', whiteSpace: 'nowrap' }}>
              {cat.label}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 7px',
              color: isActive ? 'white' : 'var(--text3)',
              background: isActive ? cat.color : 'rgba(255,255,255,.06)',
              border: `1px solid ${isActive ? cat.color + '55' : 'rgba(255,255,255,.08)'}`,
            }}>
              {cat.commands.length}
            </span>
          </button>
        )
      })}
    </div>
  )

  /* ── Desktop sidebar ── */
  const DesktopSidebar = () => (
    <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {CATEGORIES.map(cat => {
        const isActive = activeId === cat.id
        return (
          <button key={cat.id} onClick={() => setActiveId(cat.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 11,
            background: isActive ? cat.gradient : 'rgba(255,255,255,.025)',
            border: `1px solid ${isActive ? cat.color + '45' : 'rgba(255,255,255,.07)'}`,
            cursor: 'pointer', textAlign: 'left', transition: 'all .2s', width: '100%',
            boxShadow: isActive ? `0 0 18px ${cat.glowColor}` : 'none',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, background: cat.color + '18',
              border: `1px solid ${cat.color + '30'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <cat.icon size={13} color={cat.color} />
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? cat.color : 'var(--text2)' }}>
                {cat.label}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 1 }}>{cat.commands.length} comandos</div>
            </div>
            {isActive && <ChevronRight size={12} color={cat.color} />}
          </button>
        )
      })}

      {/* Permission legend */}
      <div className="card" style={{ padding: '12px 14px', marginTop: 6 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
          Permisos
        </div>
        {Object.entries(PERM_META).map(([, pm]) => {
          const Icon = pm.icon
          return (
            <div key={pm.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, background: pm.bg,
                border: `1px solid ${pm.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={10} color={pm.color} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: pm.color }}>{pm.label}</span>
            </div>
          )
        })}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Zap size={10} />Clic en un comando para ver detalles
        </div>
      </div>
    </div>
  )

  /* ── Command list panel ── */
  const CommandList = ({ cat }: { cat: Category }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {cat.commands.map(cmd => (
        <CommandCard key={cmd.name} cmd={cmd} prefix={prefix} color={cat.color} gradient={cat.gradient} />
      ))}
    </div>
  )

  /* ── Search results ── */
  const SearchResults = () => {
    if (filteredCats.length === 0) {
      return (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Terminal size={18} color="var(--text3)" /></div>
            <div className="empty-state-title">Sin resultados para "{search}"</div>
          </div>
        </div>
      )
    }
    return (
      <>
        {filteredCats.map(cat => (
          <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 2px' }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: cat.color + '18', border: `1px solid ${cat.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <cat.icon size={11} color={cat.color} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.label}</span>
              <span className="badge badge-blue">{cat.commands.length}</span>
            </div>
            <CommandList cat={cat} />
          </div>
        ))}
      </>
    )
  }

  /* ── Permission legend (mobile) ── */
  const PermLegend = () => (
    <div className="card" style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
        Permisos
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {Object.entries(PERM_META).map(([, pm]) => {
          const Icon = pm.icon
          return (
            <div key={pm.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, background: pm.bg,
                border: `1px solid ${pm.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={10} color={pm.color} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: pm.color }}>{pm.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="animate-fade-up">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="page-title"><Terminal size={17} color="#EC4899" />Comandos</div>
          <div className="page-subtitle">
            {totalCmds} comandos · prefijo{' '}
            <code style={{ fontFamily: 'monospace', color: '#EC4899', background: 'rgba(236,72,153,.12)', border: '1px solid rgba(236,72,153,.22)', padding: '1px 6px', borderRadius: 5 }}>
              {prefix}
            </code>
          </div>
        </div>

        {/* Search + filter row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input
              className="input" placeholder="Buscar comando…"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 28, width: isMobile ? 148 : 200, fontSize: 12 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {([['', 'Todos'], ['all', 'Público'], ['admin', 'Admin']] as [string, string][]).map(([k, l]) => (
              <button key={k}
                className={`btn btn-xs ${permFilter === k ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPermF(k as '' | 'all' | 'admin' | 'owner')}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 8 }}>
        {STATS.map(({ label, val, color, icon: Icon }) => (
          <div key={label} style={{
            borderRadius: 11, padding: '13px 14px',
            background: `linear-gradient(135deg,${color}13,${color}04)`,
            border: `1px solid ${color}28`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: color + '16', border: `1px solid ${color}32`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 14px ${color}16`,
            }}>
              <Icon size={15} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 22, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 9, color: color, opacity: .6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2, whiteSpace: 'nowrap' }}>
                {label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Content area ── */}
      {isSearching ? (
        <SearchResults />
      ) : isMobile ? (
        /* Mobile */
        <>
          <MobilePills />
          {activeCategory && <CategoryBanner cat={activeCategory} />}
          {activeCategory && <CommandList cat={activeCategory} />}
          <PermLegend />
        </>
      ) : (
        /* Desktop */
        <div style={{ display: 'flex', gap: 14 }}>
          <DesktopSidebar />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeCategory ? (
              <>
                <CategoryBanner cat={activeCategory} />
                <CommandList cat={activeCategory} />
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Terminal size={18} color="var(--text3)" /></div>
                <div className="empty-state-title">Selecciona una categoría</div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ height: 4 }} />
    </div>
  )
}
