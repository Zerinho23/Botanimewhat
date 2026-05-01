import { useEffect, useState } from 'react'
  import { Shield, RefreshCw, Clock } from 'lucide-react'
  import { getModHistory, isConfigured, type ModEntry } from '../api'

  const ACTION_COLORS: Record<string,string> = {
    ban:'var(--red)', kick:'var(--red2)', warn:'var(--gold)',
    mute:'var(--blue)', unmute:'var(--blue)', unban:'var(--green)', promote:'var(--purple)',
  }

  export default function Moderation() {
    const [history, setHistory] = useState<ModEntry[]>([])
    const [loading, setLoad]    = useState(true)
    const [refreshing, setRef]  = useState(false)

    const load = async (r=false) => {
      if (!isConfigured()) { setLoad(false); return }
      if (r) setRef(true)
      try { setHistory(await getModHistory()) } catch {}
      setLoad(false); setRef(false)
    }
    useEffect(()=>{ load() },[])

    if (!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <p style={{color:'var(--gold)',fontSize:13}}>VITE_API_URL no configurada en Vercel</p>
      </div>
    )

    if (loading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,gap:10,color:'var(--tx3)'}}>
        <RefreshCw size={16} style={{animation:'spin 1s linear infinite'}}/><span>Cargando historial…</span>
      </div>
    )

    const actionCounts: Record<string,number> = {}
    history.forEach(e=>{ actionCounts[e.action]=(actionCounts[e.action]||0)+1 })

    return (
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'1.4rem'}}>Moderación</h1>
            <p style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>{history.length} acciones registradas</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>load(true)} disabled={refreshing}>
            <RefreshCw size={13} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/>Actualizar
          </button>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {Object.entries(actionCounts).slice(0,6).map(([action,count])=>(
            <div key={action} className="card" style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
              <div className="icon-badge" style={{background:(ACTION_COLORS[action]||'var(--tx3)')+'22'}}>
                <Shield size={14} color={ACTION_COLORS[action]||'var(--tx3)'}/>
              </div>
              <div>
                <div style={{fontWeight:700,color:ACTION_COLORS[action]||'var(--tx2)'}}>{count}</div>
                <div style={{fontSize:10,color:'var(--tx3)',textTransform:'uppercase'}}>{action}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          {history.length === 0 ? (
            <div style={{padding:32,textAlign:'center',color:'var(--tx3)',fontSize:12}}>Sin historial de moderación</div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="data-table">
                <thead><tr><th>Acción</th><th>Usuario</th><th>Grupo</th><th>Fecha</th></tr></thead>
                <tbody>
                  {history.slice(0,100).map((e,i)=>{
                    const c = ACTION_COLORS[e.action]||'var(--tx3)'
                    return (
                      <tr key={i}>
                        <td><span style={{fontWeight:700,color:c,fontSize:11,textTransform:'uppercase',background:c+'18',padding:'2px 8px',borderRadius:4}}>{e.action}</span></td>
                        <td style={{fontSize:12,color:'var(--tx2)'}}>{e.userName||e.userJid?.split('@')[0]||'—'}</td>
                        <td style={{fontSize:12,color:'var(--tx2)'}}>{e.groupName||e.groupJid?.split('@')[0]||'—'}</td>
                        <td><div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--tx3)'}}><Clock size={10}/>{new Date(e.ts).toLocaleString('es-MX')}</div></td>
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
  