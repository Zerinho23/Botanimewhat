import { useEffect, useState } from 'react'
  import { RefreshCw, Key, AlertTriangle, CheckCircle, RotateCcw, Copy, ExternalLink, Radio, Wifi } from 'lucide-react'
  import { getStatus, postPairingCode, postReset, getApiUrl, isConfigured, type BotStatus } from '../api'

  function StepCard({num,title,desc,active,done}:{num:number;title:string;desc:string;active?:boolean;done?:boolean}) {
    const color=done?'var(--green)':active?'var(--blue)':'var(--text3)'
    return (
      <div style={{display:'flex',gap:14,padding:'12px 0',borderBottom:'1px solid var(--border)',opacity:done||active?1:.4,transition:'opacity .2s'}}>
        <div style={{width:32,height:32,borderRadius:2,flexShrink:0,background:color+'15',border:'1px solid '+color+'30',display:'flex',alignItems:'center',justifyContent:'center',fontFamily: "'Inter', sans-serif",fontWeight:800,fontSize:12,color}}>
          {done?<CheckCircle size={14}/>:num}
        </div>
        <div>
          <div style={{fontFamily: "'Inter', sans-serif",fontWeight:700,fontSize:13,letterSpacing:'.06em',color:active?'var(--text)':'var(--text2)',marginBottom:3}}>{title}</div>
          <div style={{fontSize:11,color:'var(--text3)',lineHeight:1.6}}>{desc}</div>
        </div>
      </div>
    )
  }

  export default function Connect() {
    const [status,   setStatus]  = useState<BotStatus|null>(null)
    const [phone,    setPhone]   = useState('')
    const [code,     setCode]    = useState<string|null>(null)
    const [loading,  setLoad]    = useState(true)
    const [sending,  setSend]    = useState(false)
    const [resetting,setReset]   = useState(false)
    const [toast,    setToast]   = useState<{msg:string;ok:boolean}|null>(null)
    const [copied,   setCopied]  = useState(false)
    const apiUrl = getApiUrl()

    const showToast=(msg:string,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),4000)}

    const fetchStatus=async()=>{
      if(!isConfigured()){setLoad(false);return}
      try{setStatus(await getStatus())}catch{}
      setLoad(false)
    }
    useEffect(()=>{fetchStatus();const id=setInterval(fetchStatus,8000);return()=>clearInterval(id)},[])

    const requestCode=async()=>{
      if(!phone.trim())return
      setSend(true);setCode(null)
      try{
        const res=await postPairingCode(phone.trim())
        setCode((res as {code?:string}).code??JSON.stringify(res))
        showToast('CÓDIGO GENERADO — ingresa en tu WhatsApp')
      }catch(e){showToast(e instanceof Error?e.message:'Error al solicitar código',false)}
      setSend(false)
    }
    const resetBot=async()=>{
      if(!confirm('¿Confirmas reiniciar la sesión? El bot se desconectará.'))return
      setReset(true)
      try{await postReset();setStatus(null);setCode(null);showToast('SESIÓN REINICIADA')}
      catch(e){showToast(e instanceof Error?e.message:'Error',false)}
      setReset(false)
    }
    const copyCode=()=>{
      if(code){navigator.clipboard.writeText(code).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000)}
    }

    if(!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
        <div className="card animate-scale-in" style={{padding:32,textAlign:'center',maxWidth:400}}>
          <div className="sys-header" style={{margin:'-32px -32px 24px',borderRadius:'var(--radius-lg) var(--radius-lg) 0 0'}}>
            <AlertTriangle size={12} color="var(--amber)"/>
            <span className="sys-header-title" style={{color:'var(--amber)'}}>PORTAL SIN CONFIGURAR</span>
          </div>
          <p style={{fontSize:12,color:'var(--text2)',lineHeight:1.8,marginBottom:16}}>
            Define <span style={{color:'var(--blue)',fontFamily: 'monospace'}}>VITE_API_URL</span> en Vercel → Settings → Environment Variables.
          </p>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'rgba(30,144,255,.05)',border:'1px solid var(--border)',borderRadius:'var(--radius)'}}>
            <span style={{fontFamily: 'monospace',fontSize:10,color:'var(--text3)'}}>VITE_API_URL = https://tu-bot.railway.app</span>
          </div>
        </div>
      </div>
    )

    const connected=status?.connected??false

    return (
      <div style={{display:'flex',flexDirection:'column',gap:18}} className="animate-fade-up">
        {toast&&(
          <div style={{position:'fixed',bottom:24,right:24,zIndex:999}} className="animate-fade-up">
            <div className={`alert ${toast.ok?'alert-ok':'alert-err'}`} style={{boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
              {toast.ok?<CheckCircle size={14}/>:<AlertTriangle size={14}/>}{toast.msg}
            </div>
          </div>
        )}

        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
          <div>
            <div className="page-title">
              <span className="page-title-bracket">◈</span>CONNECTION PORTAL<span className="page-title-bracket">◈</span>
            </div>
            <div className="page-subtitle">VINCULACIÓN DE WHATSAPP · BOT SESSION</div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div className={`sidebar-status ${connected?'online':loading?'loading':'offline'}`} style={{padding:'6px 12px',borderRadius:'var(--radius)',margin:0}}>
              <div className="live-dot"/>
              <span style={{fontSize:11,fontWeight:700,fontFamily: "'Inter', sans-serif",letterSpacing:'.08em'}}>
                {loading?'VERIFICANDO…':connected?'SESIÓN ACTIVA':'SIN SESIÓN'}
              </span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw size={12} style={{animation:loading?'spin 1s linear infinite':'none'}}/>
            </button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {/* Steps */}
          <div className="card" style={{padding:0}}>
            <div className="sys-header">
              <Radio size={12} color="var(--blue)"/>
              <span className="sys-header-title">PROTOCOLO DE CONEXIÓN</span>
            </div>
            <div style={{padding:'8px 18px 18px'}}>
              <StepCard num={1} title="BOT EN RAILWAY" desc="El bot debe estar desplegado y corriendo en Railway." done active={!connected}/>
              <StepCard num={2} title="SOLICITAR CÓDIGO" desc="Ingresa tu número de WhatsApp y solicita el código de vinculación." active={!connected} done={connected}/>
              <StepCard num={3} title="INGRESAR CÓDIGO EN WA" desc="WhatsApp → Dispositivos vinculados → Vincular dispositivo → Ingresar código manualmente." active={!!code&&!connected} done={connected}/>
              <StepCard num={4} title="SESIÓN ACTIVA" desc="El bot comenzará a responder comandos en todos los grupos configurados." active={connected} done={connected}/>
            </div>
          </div>

          {/* Action panel */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {!connected&&(
              <div className="card" style={{padding:0}}>
                <div className="sys-header">
                  <Key size={12} color="var(--blue)"/>
                  <span className="sys-header-title">CÓDIGO DE VINCULACIÓN</span>
                </div>
                <div style={{padding:18}}>
                  <label className="label">NÚMERO DE WHATSAPP</label>
                  <div style={{display:'flex',gap:8,marginBottom:10}}>
                    <input className="input" placeholder="521234567890" value={phone}
                      onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,''))}
                      style={{fontFamily: 'monospace'}}
                      onKeyDown={e=>e.key==='Enter'&&requestCode()}/>
                    <button className="btn btn-primary" onClick={requestCode} disabled={sending||!phone.trim()}>
                      {sending?<RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>:<Key size={12}/>}
                      {sending?'…':'PEDIR'}
                    </button>
                  </div>
                  <p style={{fontSize:10,color:'var(--text3)',fontFamily: "'Inter', sans-serif",letterSpacing:'.04em',lineHeight:1.6,marginBottom:code?14:0}}>
                    Sin + ni espacios. Ej: 521234567890 (MX) · 541234567890 (AR)
                  </p>
                  {code&&(
                    <div style={{padding:20,background:'rgba(30,144,255,.05)',border:'1px solid var(--border3)',borderRadius:'var(--radius)',textAlign:'center'}} className="animate-scale-in">
                      <div style={{fontFamily: "'Inter', sans-serif",fontSize:9,fontWeight:700,letterSpacing: '.02em',color:'var(--text3)',marginBottom:10}}>CÓDIGO DE ACCESO</div>
                      <div style={{fontFamily: "'Inter', sans-serif",fontWeight:800,fontSize:30,letterSpacing: '.02em',color:'var(--blue)',textShadow:'0 0 24px rgba(30,144,255,.55)',marginBottom:10}}>
                        {code}
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={copyCode} style={{color:copied?'var(--green)':'var(--text2)'}}>
                        <Copy size={11}/>{copied?'COPIADO ✓':'COPIAR'}
                      </button>
                      <p style={{fontSize:10,color:'var(--text3)',marginTop:10,fontFamily: "'Inter', sans-serif",letterSpacing:'.04em',lineHeight:1.6}}>
                        WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo → Código
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {connected&&(
              <div className="card animate-scale-in" style={{padding:0}}>
                <div className="sys-header">
                  <CheckCircle size={12} color="var(--green)"/>
                  <span className="sys-header-title" style={{color:'var(--green)'}}>SESIÓN ACTIVA</span>
                </div>
                <div style={{padding:20,textAlign:'center'}}>
                  <div style={{width:56,height:56,borderRadius:'var(--radius)',background:'rgba(16,185,129,.1)',border:'1px solid rgba(16,185,129,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 0 20px rgba(16,185,129,.12)'}}>
                    <Wifi size={22} color="var(--green)"/>
                  </div>
                  <div style={{fontFamily: "'Inter', sans-serif",fontWeight:700,fontSize:12,letterSpacing: '.02em',color:'var(--green)',marginBottom:6}}>BOT CONECTADO</div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:18,fontFamily: "'Inter', sans-serif"}}>La sesión está activa y procesando mensajes</div>
                </div>
              </div>
            )}

            <div className="card" style={{padding:0}}>
              <div className="sys-header">
                <ExternalLink size={12} color="var(--text3)"/>
                <span className="sys-header-title">API ENDPOINT</span>
              </div>
              <div style={{padding:14}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'var(--bg2)',borderRadius:'var(--radius)',border:'1px solid var(--border)'}}>
                  <span style={{fontFamily: 'monospace',fontSize:10,color:'var(--text2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{apiUrl||'Sin configurar'}</span>
                </div>
              </div>
            </div>

            <div className="card" style={{padding:0,border:'1px solid rgba(239,68,68,.15)'}}>
              <div className="sys-header">
                <RotateCcw size={12} color="var(--red)"/>
                <span className="sys-header-title" style={{color:'var(--red)'}}>ZONA PELIGROSA</span>
              </div>
              <div style={{padding:14}}>
                <p style={{fontSize:11,color:'var(--text3)',lineHeight:1.7,marginBottom:12,fontFamily: "'Inter', sans-serif"}}>
                  Reiniciar la sesión desconecta el bot de WhatsApp. Deberás vincular el dispositivo nuevamente.
                </p>
                <button className="btn btn-red btn-sm" onClick={resetBot} disabled={resetting} style={{width:'100%',justifyContent:'center'}}>
                  {resetting?<RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>:<RotateCcw size={12}/>}
                  {resetting?'REINICIANDO…':'REINICIAR SESIÓN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  