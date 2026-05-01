import { useEffect, useState } from 'react'
  import { getModHistory, isConfigured } from '../api'
  import type { ModEntry } from '../api'
  import { shortJid, timeAgo } from '../lib/utils'

  const ACTION_COLORS: Record<string,string> = {
    kick:'badge-red', ban:'badge-red', warn:'badge-amber',
    mute:'badge-amber', promote:'badge-green', demote:'badge-blue', add:'badge-blue'
  }
  const ACTION_LABELS: Record<string,string> = {
    kick:'EXPULSADO', ban:'BANEADO', warn:'ADVERTIDO',
    mute:'SILENCIADO', promote:'PROMOVIDO', demote:'DEGRADADO', add:'AGREGADO'
  }

  export default function Moderation() {
    const [history, setHistory] = useState<ModEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      getModHistory().then(d=>setHistory(Array.isArray(d)?d:[])).catch(()=>{}).finally(()=>setLoading(false))
    }, [])

    if (!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <div className="sys-label" style={{color:'var(--amber)'}}>[ VITE_API_URL no configurada en Vercel ]</div>
      </div>
    )

    if (loading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <div style={{width:36,height:36,border:'2px solid rgba(0,195,255,0.1)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} />
      </div>
    )

    return (
      <div className="panel panel-accent" style={{padding:'22px 24px',position:'relative'}}>
        <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
        <div style={{marginBottom:16}}>
          <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://MODERATION_LOG</div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white'}}>
            HISTORIAL DE SANCIONES ({history.length})
          </div>
          <div className="hud-divider" style={{marginTop:10}} />
        </div>
        {history.length===0 ? (
          <div className="sys-label" style={{textAlign:'center',padding:'40px 0'}}>/// SIN ACCIONES REGISTRADAS ///</div>
        ) : history.map((e,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(0,195,255,0.05)'}}>
            <span className={`badge ${ACTION_COLORS[e.action]??'badge-blue'}`} style={{minWidth:90,justifyContent:'center'}}>
              {ACTION_LABELS[e.action]??e.action.toUpperCase()}
            </span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:12,color:'var(--tx)',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>
                {shortJid(e.userJid)}
              </div>
              <div className="sys-label" style={{marginTop:1}}>GRUPO: {shortJid(e.groupJid)}</div>
            </div>
            <span className="sys-label" style={{whiteSpace:'nowrap',flexShrink:0}}>{timeAgo(e.ts)}</span>
          </div>
        ))}
      </div>
    )
  }
  