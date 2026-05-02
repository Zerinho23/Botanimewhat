import { useState, useMemo } from 'react'
  import {
    Terminal, Search, Copy, Check, Shield, Users, Star,
    BookOpen, ChevronDown, ChevronRight, Filter, Zap
  } from 'lucide-react'

  interface Command {
    name: string
    description: string
    usage: string
    aliases: string[]
    permission: 'all' | 'admin' | 'owner'
    cooldown?: number
  }

  interface Category {
    id: string
    label: string
    icon: React.ElementType
    color: string
    description: string
    commands: Command[]
  }

  const CATEGORIES: Category[] = [
    {
      id: 'admin',
      label: 'ADMIN',
      icon: Shield,
      color: 'var(--red2)',
      description: 'Herramientas de moderación y gestión de grupo',
      commands: [
        { name: 'antilink',    description: 'Activa o desactiva el filtro de enlaces del grupo.',     usage: '!antilink [on|off]',   aliases: ['antilinks'],                  permission: 'admin' },
        { name: 'ban',         description: 'Expulsa permanentemente a un usuario del grupo.',        usage: '!ban @usuario',        aliases: ['expulsar'],                   permission: 'admin' },
        { name: 'kick',        description: 'Expulsa temporalmente a un usuario del grupo.',          usage: '!kick @usuario',       aliases: ['sacar'],                      permission: 'admin' },
        { name: 'mute',        description: 'Silencia a un usuario (sus mensajes son eliminados).',   usage: '!mute @usuario',       aliases: ['silenciar'],                  permission: 'admin' },
        { name: 'nuevos',      description: 'Lista los miembros que ingresaron recientemente.',       usage: '!nuevos [días]',       aliases: ['recientes', 'new'],           permission: 'admin' },
        { name: 'invocar',     description: 'Tagea a todos los integrantes del grupo.',               usage: '!invocar [mensaje]',   aliases: ['all','todos','llamar','convocar'], permission: 'admin' },
        { name: 'fantasmas',   description: 'Detecta miembros inactivos que no han escrito.',         usage: '!fantasmas [días]',    aliases: ['inactivos','ghosts'],         permission: 'admin' },
        { name: 'purga',       description: 'Expulsa masivamente a miembros inactivos (+30 días).',   usage: '!purga',               aliases: ['cleanup'],                    permission: 'admin', cooldown: 60 },
      ],
    },
    {
      id: 'anime',
      label: 'ANIME',
      icon: Star,
      color: 'var(--purple2)',
      description: 'Búsqueda de anime, noticias y recomendaciones',
      commands: [
        { name: 'buscar',           description: 'Busca un anime por nombre en MyAnimeList.',             usage: '!buscar [nombre]',     aliases: ['search','find'],  permission: 'all' },
        { name: 'noticias',         description: 'Muestra las últimas noticias del mundo anime.',          usage: '!noticias',            aliases: ['news'],           permission: 'all' },
        { name: 'recomendaciones',  description: 'Recomienda animes basados en tus gustos.',               usage: '!recomendaciones',     aliases: ['recomienda','rec'], permission: 'all' },
      ],
    },
    {
      id: 'user',
      label: 'USUARIO',
      icon: Users,
      color: 'var(--blue)',
      description: 'Comandos de perfil, nivel y ranking',
      commands: [
        { name: 'help',    description: 'Muestra el menú de todos los comandos disponibles.',  usage: '!help [comando]',   aliases: ['menu','ayuda','comandos'],   permission: 'all' },
        { name: 'perfil',  description: 'Muestra tu perfil otaku con nivel, XP y monedas.',   usage: '!perfil',           aliases: ['profile','me'],              permission: 'all' },
        { name: 'rank',    description: 'Muestra el top 10 de usuarios con más nivel.',        usage: '!rank',             aliases: ['leaderboard','lb'],          permission: 'all' },
      ],
    },
  ]

  const PERM_META = {
    all:   { label: 'TODOS',     color: 'var(--blue)',    bg: 'rgba(30,144,255,.1)',    border: 'rgba(30,144,255,.3)'    },
    admin: { label: 'ADMIN',     color: 'var(--gold)',    bg: 'rgba(251,191,36,.1)',    border: 'rgba(251,191,36,.35)'   },
    owner: { label: 'OWNER',     color: 'var(--purple2)', bg: 'rgba(168,85,247,.1)',   border: 'rgba(168,85,247,.3)'    },
  }

  function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const copy = () => {
      navigator.clipboard.writeText(text).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
    return (
      <button onClick={copy} className="btn btn-ghost btn-xs"
        style={{ padding: '3px 7px', color: copied ? 'var(--green2)' : 'var(--tx3)' }}
        title="Copiar comando">
        {copied ? <Check size={10} /> : <Copy size={10} />}
      </button>
    )
  }

  function CommandRow({ cmd, prefix, color }: { cmd: Command; prefix: string; color: string }) {
    const pm = PERM_META[cmd.permission]
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 2fr auto',
        gap: 12, padding: '10px 0',
        borderBottom: '1px solid rgba(30,144,255,.05)',
        alignItems: 'start', transition: 'background .12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(30,144,255,.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}>
        {/* Name + usage */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 13,
              color, textShadow: `0 0 8px ${color}55`,
            }}>
              {prefix}{cmd.name}
            </span>
            <CopyButton text={prefix + cmd.name} />
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'var(--tx3)', letterSpacing: '.04em' }}>
            {cmd.usage}
          </div>
          {cmd.aliases.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
              {cmd.aliases.map(a => (
                <span key={a} style={{
                  fontSize: 9, color: 'var(--tx3)', background: 'rgba(30,144,255,.04)',
                  border: '1px solid rgba(30,144,255,.1)', borderRadius: 2,
                  padding: '1px 5px', fontFamily: "'JetBrains Mono',monospace",
                }}>
                  {prefix}{a}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Description */}
        <div style={{ fontSize: 12, color: 'var(--tx2)', lineHeight: 1.6, paddingTop: 2 }}>
          {cmd.description}
        </div>
        {/* Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
          <span style={{
            fontFamily: "'Orbitron',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '.1em',
            padding: '2px 7px', borderRadius: 2,
            background: pm.bg, border: `1px solid ${pm.border}`, color: pm.color,
          }}>
            {pm.label}
          </span>
          {cmd.cooldown && (
            <span style={{ fontSize: 9, color: 'var(--tx3)', fontFamily: "'Orbitron',sans-serif" }}>
              ⏱ {cmd.cooldown}s
            </span>
          )}
        </div>
      </div>
    )
  }

  function CategorySection({ cat, prefix, defaultOpen }: { cat: Category; prefix: string; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen)
    const Icon = cat.icon
    return (
      <div className="card" style={{ padding: 0 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: open ? '1px solid var(--border)' : 'none',
          }}>
          {/* Top accent */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${cat.color}, transparent)`, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius)',
            background: cat.color + '15', border: `1px solid ${cat.color}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={14} color={cat.color} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700,
                letterSpacing: '.12em', color: cat.color, textShadow: `0 0 8px ${cat.color}44` }}>
                {cat.label}
              </span>
              <span className="rank rank-b" style={{ background: cat.color + '15', borderColor: cat.color + '40', color: cat.color, fontSize: 9 }}>
                {cat.commands.length} CMD
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx3)', marginTop: 2, fontFamily: "'Rajdhani',sans-serif", letterSpacing: '.04em' }}>
              {cat.description}
            </div>
          </div>
          {open ? <ChevronDown size={14} color="var(--tx3)" /> : <ChevronRight size={14} color="var(--tx3)" />}
        </button>

        {open && (
          <div style={{ padding: '4px 18px 14px' }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 12,
              padding: '8px 0', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'var(--tx3)' }}>COMANDO</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'var(--tx3)' }}>DESCRIPCIÓN</span>
              <span style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '.14em', color: 'var(--tx3)' }}>PERM</span>
            </div>
            {cat.commands.map(cmd => (
              <CommandRow key={cmd.name} cmd={cmd} prefix={prefix} color={cat.color} />
            ))}
          </div>
        )}
      </div>
    )
  }

  export default function Commands() {
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'all' | 'admin' | 'user'>('all')
    const [prefix] = useState('!')

    const totalCmds = CATEGORIES.reduce((s, c) => s + c.commands.length, 0)
    const adminCmds = CATEGORIES.find(c => c.id === 'admin')?.commands.length ?? 0
    const publicCmds = totalCmds - adminCmds

    const filteredCats = useMemo(() => {
      let cats = CATEGORIES
      if (filter === 'admin') cats = cats.map(c => ({ ...c, commands: c.commands.filter(x => x.permission === 'admin') })).filter(c => c.commands.length > 0)
      if (filter === 'user')  cats = cats.map(c => ({ ...c, commands: c.commands.filter(x => x.permission === 'all') })).filter(c => c.commands.length > 0)
      if (!search.trim()) return cats
      const q = search.toLowerCase()
      return cats
        .map(c => ({
          ...c,
          commands: c.commands.filter(x =>
            x.name.includes(q) || x.description.toLowerCase().includes(q) || x.aliases.some(a => a.includes(q))
          )
        }))
        .filter(c => c.commands.length > 0)
    }, [search, filter])

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-up">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="page-title">
              <span className="page-title-bracket">◈</span>
              COMMAND REGISTRY
              <span className="page-title-bracket">◈</span>
            </div>
            <div className="page-subtitle">
              {totalCmds} COMANDOS REGISTRADOS · PREFIJO: <span style={{ color: 'var(--blue)', fontFamily: "'JetBrains Mono',monospace" }}>{prefix}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--tx3)', pointerEvents: 'none' }} />
              <input className="input" placeholder="BUSCAR COMANDO…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 28, width: 200, fontFamily: "'Rajdhani',sans-serif", letterSpacing: '.06em', fontSize: 12 }} />
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 10 }}>
          {[
            { label: 'TOTAL',     val: totalCmds,          color: 'var(--blue)'    },
            { label: 'PÚBLICOS',  val: publicCmds,          color: 'var(--green2)'  },
            { label: 'ADMIN',     val: adminCmds,           color: 'var(--gold)'    },
            { label: 'CATEGORÍAS',val: CATEGORIES.length,   color: 'var(--purple2)' },
          ].map(s => (
            <div key={s.label} className="metric-card" style={{ padding: '12px 14px' }}>
              <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 800, fontSize: '1.5rem', color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: 9, color: 'var(--tx3)', marginTop: 5, letterSpacing: '.12em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { key: 'all',   label: `TODO (${totalCmds})` },
            { key: 'admin', label: `ADMIN (${adminCmds})`,   color: 'var(--gold)' },
            { key: 'user',  label: `PÚBLICO (${publicCmds})`, color: 'var(--blue)' },
          ] as { key: typeof filter; label: string; color?: string }[]).map(tab => (
            <button key={tab.key} className={`btn btn-xs ${filter === tab.key ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(tab.key)}
              style={filter !== tab.key && tab.color ? { color: tab.color, borderColor: tab.color + '30' } : undefined}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, padding: '10px 16px',
          background: 'rgba(30,144,255,.03)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--tx3)', fontFamily: "'Rajdhani',sans-serif", letterSpacing: '.06em' }}>
            <Terminal size={11} color="var(--blue)" />
            <span>Haz clic en el nombre del comando para copiarlo</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            {Object.entries(PERM_META).map(([k, pm]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--tx3)', fontFamily: "'Rajdhani',sans-serif" }}>
                <span style={{ width: 6, height: 6, borderRadius: 1, background: pm.color, boxShadow: `0 0 4px ${pm.color}` }} />
                {pm.label}
              </span>
            ))}
          </div>
        </div>

        {/* Category sections */}
        {filteredCats.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><BookOpen size={20} color="var(--tx3)" /></div>
              <div className="empty-state-title">SIN RESULTADOS</div>
              <div className="empty-state-sub">No se encontraron comandos con ese término</div>
            </div>
          </div>
        ) : filteredCats.map((cat, i) => (
          <CategorySection key={cat.id} cat={cat} prefix={prefix} defaultOpen={i === 0} />
        ))}

      </div>
    )
  }
  