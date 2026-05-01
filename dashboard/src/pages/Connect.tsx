import { useEffect, useState } from 'react'
  import { Wifi, WifiOff, RefreshCw, Smartphone, Key, AlertTriangle, CheckCircle } from 'lucide-react'
  import { getStatus, postPairingCode, postReset, getApiUrl, isConfigured, type BotStatus } from '../api'

  export default function Connect() {
    const [status,  setStatus]  = useState<BotStatus | null>(null)
    const [loading, setLoad]    = useState(true)
    const [phone,   setPhone]   = useState('')
    const [code,    setCode]    = useState<string|null>(null)
    const [codeErr, setCodeErr] = useState<string|null>(null)
    const [loadCode,setLoadCode]= useState(false)
    const [resetting,setReset]  = useState(false)
    const [resetMsg, setResetMsg]= useState<string|null>(null)
    const apiUrl = getApiUrl()

    if (!isConfigured()) return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:320,gap:14,textAlign:'center'}}>
        <AlertTriangle size={28} color="var(--gold)"/>
        <div style={{fontWeight:700,fontSize:'0.9rem',color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.08em'}}>
          VITE_API_URL no configurada
        </div>
        <div style={{fontSize:12,color:'var(--tx3)'}}>Ve a Vercel → Settings → Environment Variables y agrega:</div>
        <div style={{padding:'10px 16px',background:'var(--card)',border:'1px solid rgba(255,255,255,.1)',
          borderRadius:8,fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:'var(--blue)'}}>
          VITE_API_URL = https://tu-bot.railway.app
        </div>
      </div>
    )

    const fetchStatus = async () => {
      try { setStatus(await getStatus()) } catch {}
      setLoad(false)
    }
    useEffect(()=>{ fetchStatus(); const id=setInterval(fetchStatus,8000); return()=>clearInterval(id) },[])

    const requestCode = async () => {
      if (!phone.trim()) return
      setLoadCode(true); setCode(null); setCodeErr(null)
      try {
        const r = await postPairingCode(phone.trim())
        if (r.code) setCode(r.code)
        else setCodeErr(r.error||'No se recibió código')
      } catch (e:unknown) { setCodeErr(e instanceof Error?e.message:'Error al solicitar código') }
      setLoadCode(false)
    }

    const reset = async () => {
      if (!confirm('¿Reiniciar la sesión del bot? Necesitarás volver a escanear el QR.')) return
      setReset(true); setResetMsg(null)
      try { await postReset(); setResetMsg('Sesión reiniciada. El bot necesita reconectarse.') }
      catch (e:unknown) { setResetMsg(e instanceof Error?e.message:'Error al reiniciar') }
      setReset(false)
    }

    const connected = status?.connected

    return (
      <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:700}}>
        <div>
          <h1 style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,fontSize:'1.4rem'}}>Conexión</h1>
          <p style={{fontSize:12,color:'var(--tx3)',marginTop:2}}>Gestiona la sesión WhatsApp del bot</p>
        </div>

        {/* Status card */}
        <div className="card" style={{padding:20}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div className="icon-badge" style={{width:44,height:44,background:connected?'rgba(16,185,129,.12)':'rgba(229,57,53,.12)'}}>
              {loading ? <RefreshCw size={20} color="var(--tx3)" style={{animation:'spin 1s linear infinite'}}/>
                : connected ? <Wifi size={20} color="var(--green)"/>
                : <WifiOff size={20} color="var(--red2)"/>}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:'1.1rem',color:connected?'var(--green)':loading?'var(--tx3)':'var(--red2)'}}>
                {loading ? 'Verificando…' : connected ? 'Bot conectado' : 'Bot desconectado'}
              </div>
              <div style={{fontSize:11,color:'var(--tx3)',marginTop:2}}>
                {apiUrl ? `API: ${apiUrl}` : 'Sin URL de API'}
              </div>
            </div>
            <button onClick={fetchStatus} className="btn btn-ghost btn-sm" style={{marginLeft:'auto'}}>
              <RefreshCw size={13}/>
            </button>
          </div>

          {status && !connected && (
            <div style={{marginTop:14,padding:'10px 14px',borderRadius:8,
              background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',
              fontSize:12,color:'var(--gold)',display:'flex',alignItems:'center',gap:8}}>
              <AlertTriangle size={13}/>
              {status.hasQR ? 'Esperando escaneo del QR en Railway'
                : status.hasPairingCode ? 'Código de vinculación solicitado'
                : 'El bot no está autenticado con WhatsApp'}
            </div>
          )}
          {connected && (
            <div style={{marginTop:14,padding:'10px 14px',borderRadius:8,
              background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.2)',
              fontSize:12,color:'var(--green)',display:'flex',alignItems:'center',gap:8}}>
              <CheckCircle size={13}/>Sesión WhatsApp activa y funcionando correctamente
            </div>
          )}
        </div>

        {/* Pairing code */}
        {!connected && (
          <div className="card" style={{padding:20}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <Key size={15} color="var(--blue)"/>
              <strong style={{fontSize:13}}>Código de vinculación</strong>
            </div>
            <p style={{fontSize:12,color:'var(--tx3)',marginBottom:14}}>
              Ingresa el número de teléfono del bot (sin + ni espacios) para recibir el código de 8 dígitos en WhatsApp.
            </p>
            <div style={{display:'flex',gap:10}}>
              <div style={{position:'relative',flex:1}}>
                <Smartphone size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--tx3)'}}/>
                <input className="input" placeholder="521234567890" value={phone}
                  onChange={e=>setPhone(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&requestCode()}
                  style={{paddingLeft:30}}/>
              </div>
              <button className="btn btn-primary" onClick={requestCode} disabled={loadCode||!phone.trim()}>
                {loadCode ? <RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/> : <Key size={13}/>}
                {loadCode ? 'Solicitando…' : 'Obtener código'}
              </button>
            </div>
            {code && (
              <div style={{marginTop:14,padding:'14px 20px',borderRadius:8,textAlign:'center',
                background:'rgba(99,102,241,.1)',border:'1px solid rgba(99,102,241,.3)'}}>
                <div style={{fontSize:10,color:'var(--tx3)',marginBottom:6,letterSpacing:'.08em'}}>CÓDIGO DE VINCULACIÓN</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'1.8rem',fontWeight:700,
                  color:'var(--indigo)',letterSpacing:'0.25em'}}>{code}</div>
                <div style={{fontSize:11,color:'var(--tx3)',marginTop:6}}>Ingresa este código en WhatsApp en los próximos 60 segundos</div>
              </div>
            )}
            {codeErr && (
              <div style={{marginTop:10,padding:'10px 14px',borderRadius:8,fontSize:12,
                background:'rgba(229,57,53,.1)',border:'1px solid rgba(229,57,53,.25)',color:'var(--red2)'}}>
                {codeErr}
              </div>
            )}
          </div>
        )}

        {/* Reset session */}
        <div className="card" style={{padding:20}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
            <AlertTriangle size={15} color="var(--gold)"/>
            <strong style={{fontSize:13}}>Reiniciar sesión</strong>
          </div>
          <p style={{fontSize:12,color:'var(--tx3)',marginBottom:14}}>
            Cierra la sesión actual del bot. Necesitarás volver a vincular WhatsApp con el código de vinculación.
          </p>
          {resetMsg && (
            <div style={{padding:'10px 14px',borderRadius:8,fontSize:12,marginBottom:12,
              background:'rgba(245,158,11,.08)',border:'1px solid rgba(245,158,11,.2)',color:'var(--gold)'}}>
              {resetMsg}
            </div>
          )}
          <button className="btn btn-red btn-sm" onClick={reset} disabled={resetting}>
            <RefreshCw size={13} style={{animation:resetting?'spin 1s linear infinite':'none'}}/>
            {resetting?'Reiniciando…':'Reiniciar sesión'}
          </button>
        </div>
      </div>
    )
  }
  