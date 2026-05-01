import { useEffect, useState } from 'react'
  import { Settings, Save, RefreshCw, AlertCircle } from 'lucide-react'
  import { getConfig, postConfig, isConfigured, type BotConfig } from '../api'

  export default function Config() {
    const [cfg,    setCfg]    = useState<BotConfig | null>(null)
    const [form,   setForm]   = useState<Partial<BotConfig>>({})
    const [loading,setLoad]   = useState(true)
    const [saving, setSave]   = useState(false)
    const [msg,    setMsg]    = useState<{type:'ok'|'err',text:string}|null>(null)

    useEffect(()=>{
      if (!isConfigured()) { setLoad(false); return }
      getConfig().then(c=>{ setCfg(c); setForm(c); setLoad(false) }).catch(()=>setLoad(false))
    },[])

    if (!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
        <p style={{color:'var(--gold)',fontSize:13}}>VITE_API_URL no configurada en Vercel</p>
      </div>
    )

    const save = async () => {
      setSave(true); setMsg(null)
      try {
        await postConfig(form)
        setMsg({type:'ok',text:'Configuración guardada correctamente'})
      } catch (e:unknown) {
        setMsg({type:'err',text:e instanceof Error ? e.message : 'Error al guardar'})
      }
      setSave(false)
    }

    if (loading) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256,gap:10,color:'var(--tx3)'}}>
        <RefreshCw size={16} style={{animation:'spin 1s linear infinite'}}/><span>Cargando config…</span>
      </div>
    )

    return (
      <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:700}}>
        <div>
          <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'1.4rem'}}>Configuración</h1>
          <p style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>Ajusta el comportamiento del bot en tiempo real</p>
        </div>

        {msg && (
          <div style={{padding:'10px 14px',borderRadius:8,fontSize:12,fontWeight:600,
            background:msg.type==='ok'?'rgba(16,185,129,.1)':'rgba(229,57,53,.1)',
            border:`1px solid ${msg.type==='ok'?'rgba(16,185,129,.25)':'rgba(229,57,53,.25)'}`,
            color:msg.type==='ok'?'var(--green)':'var(--red2)',display:'flex',alignItems:'center',gap:8}}>
            <AlertCircle size={14}/>{msg.text}
          </div>
        )}

        <div className="card" style={{padding:24}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:20}}>
            <Settings size={15} color="var(--blue)"/>
            <strong style={{fontSize:14}}>Parámetros generales</strong>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[
              {key:'botName',    label:'Nombre del bot', ph:'BotAnime'},
              {key:'prefix',     label:'Prefijo de comandos', ph:'!'},
              {key:'ownerNumber',label:'Número del owner', ph:'521234567890'},
              {key:'commandCooldown',label:'Cooldown (segundos)', ph:'3'},
            ].map(f=>(
              <div key={f.key}>
                <label className="label">{f.label.toUpperCase()}</label>
                <input className="input" placeholder={f.ph}
                  value={(form[f.key as keyof BotConfig] as string)||''}
                  onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
              </div>
            ))}
          </div>

          {cfg && (
            <div style={{marginTop:20}}>
              <div className="divider"/>
              <div style={{fontSize:11,color:'var(--tx3)',marginBottom:10,fontWeight:600,letterSpacing:'.05em'}}>MÓDULOS AVANZADOS (solo lectura)</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,
                background:'var(--card2)',padding:12,borderRadius:6,
                border:'1px solid var(--border)',color:'var(--tx2)',
                overflowX:'auto',whiteSpace:'pre-wrap',wordBreak:'break-all',
                maxHeight:200,overflow:'auto'}}>
                {JSON.stringify({level:cfg.level,economy:cfg.economy,antiSpam:cfg.antiSpam},null,2)}
              </div>
            </div>
          )}

          <div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              <Save size={14}/>{saving?'Guardando…':'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    )
  }
  