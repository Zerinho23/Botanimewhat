import { useEffect, useState } from 'react'
  import { Save, RotateCcw } from 'lucide-react'
  import { getConfig, postConfig, isConfigured } from '../api'
  import type { BotConfig } from '../api'

  function Toast({ msg, ok }: { msg: string; ok: boolean }) {
    return (
      <div style={{position:'fixed',bottom:20,right:20,display:'flex',alignItems:'center',gap:10,padding:'12px 18px',
                   background: ok ? 'rgba(0,255,170,0.07)' : 'rgba(255,26,60,0.07)',
                   border: `1px solid ${ok ? 'rgba(0,255,170,0.3)' : 'rgba(255,26,60,0.3)'}`,
                   color: ok ? 'var(--green)' : 'var(--red)',
                   fontFamily:"'Share Tech Mono',monospace",fontSize:12,letterSpacing:'0.05em',
                   zIndex:9999,backdropFilter:'blur(12px)'}}>
        {ok ? '[ OK ]' : '[ ERROR ]'} {msg}
      </div>
    )
  }

  export default function Config() {
    const [config, setConfig] = useState<BotConfig | null>(null)
    const [form, setForm] = useState<Partial<BotConfig>>({})
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{msg:string;ok:boolean}|null>(null)
    const [loading, setLoading] = useState(true)

    const showToast = (msg: string, ok: boolean) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000) }

    useEffect(() => {
      getConfig().then(c=>{setConfig(c);setForm(c)}).catch(()=>{}).finally(()=>setLoading(false))
    }, [])

    const handleSave = async () => {
      setSaving(true)
      try { await postConfig(form); setConfig(prev=>prev?{...prev,...form}:null); showToast('Configuración actualizada',true) }
      catch { showToast('Error al guardar',false) }
      finally { setSaving(false) }
    }

    const set = (k: keyof BotConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev=>({...prev,[k]:e.target.value}))

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
      <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:680}}>
        {toast && <Toast {...toast} />}
        <div className="panel panel-accent" style={{padding:'22px 24px',position:'relative'}}>
          <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
          <div style={{marginBottom:18}}>
            <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://CONFIG_MODULE</div>
            <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white'}}>CONFIGURACIÓN GENERAL</div>
            <div className="hud-divider" style={{marginTop:12}} />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {[
              {k:'prefix' as keyof BotConfig,label:'PREFIJO DE COMANDOS',ph:'!'},
              {k:'botName' as keyof BotConfig,label:'NOMBRE DEL BOT',ph:'BotAnime'},
              {k:'ownerNumber' as keyof BotConfig,label:'NÚMERO DEL OWNER',ph:'549XXXXXXXXXX'},
              {k:'commandCooldown' as keyof BotConfig,label:'COOLDOWN (ms)',ph:'3000'},
            ].map(({k,label,ph})=>(
              <div key={k}>
                <label className="label">{label}</label>
                <input className="input" value={(form[k]??'') as string} onChange={set(k)} placeholder={ph} />
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button className="btn btn-primary" style={{flex:1}} onClick={handleSave} disabled={saving}>
              {saving ? <div style={{width:14,height:14,border:'2px solid rgba(0,195,255,0.2)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} /> : <Save size={13} />}
              {saving ? 'GUARDANDO...' : 'GUARDAR CONFIG'}
            </button>
            <button className="btn btn-ghost" onClick={()=>config&&setForm(config)}>
              <RotateCcw size={13} /> REVERTIR
            </button>
          </div>
        </div>

        {config && (
          <div className="panel panel-accent" style={{padding:'22px 24px',position:'relative'}}>
            <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
            <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:10}}>SYS://CURRENT_CONFIG</div>
            <pre style={{fontFamily:"'Share Tech Mono',monospace",fontSize:11,color:'var(--tx2)',background:'rgba(0,0,0,0.5)',border:'1px solid var(--border)',padding:16,overflowX:'auto',lineHeight:1.7}}>
              {JSON.stringify(config,null,2)}
            </pre>
          </div>
        )}
      </div>
    )
  }
  