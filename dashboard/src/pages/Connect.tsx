import { useEffect, useState } from 'react'
  import { QrCode, Smartphone, RefreshCcw, LogOut, AlertTriangle } from 'lucide-react'
  import { getStatus, postPairingCode, postReset, getApiUrl } from '../api'
  import type { BotStatus } from '../api'

  export default function Connect() {
    const [status, setStatus] = useState<BotStatus | null>(null)
    const [phone, setPhone] = useState('')
    const [pairingCode, setPairingCode] = useState<string|null>(null)
    const [loading, setLoading] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [error, setError] = useState<string|null>(null)
    const [confirmReset, setConfirmReset] = useState(false)

    useEffect(() => {
      const f = () => getStatus().then(setStatus).catch(()=>{})
      f(); const id = setInterval(f,6000); return ()=>clearInterval(id)
    }, [])

    const handlePairing = async () => {
      if (!phone.trim()) return
      setLoading(true); setError(null); setPairingCode(null)
      try {
        const res = await postPairingCode(phone.trim())
        if (res.code) setPairingCode(res.code)
        else setError(res.error??'No se pudo generar el código')
      } catch { setError('Error de conexión') }
      finally { setLoading(false) }
    }

    const handleReset = async () => {
      setResetLoading(true)
      try { await postReset(); setConfirmReset(false) }
      catch { setError('Error al resetear') }
      finally { setResetLoading(false) }
    }

    const apiUrl = getApiUrl()
    const connected = status?.connected ?? false

    return (
      <div style={{display:'flex',flexDirection:'column',gap:16,maxWidth:640}}>
        {/* Status */}
        <div className="panel" style={{padding:'18px 22px',position:'relative',
                                       borderColor:connected?'rgba(0,255,170,0.2)':'rgba(255,26,60,0.2)',
                                       background:connected?'rgba(0,255,170,0.02)':'rgba(255,26,60,0.02)'}}>
          <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:connected?'var(--green)':'var(--red)',
                         boxShadow:connected?'0 0 12px var(--green)':'0 0 12px var(--red)',animation:'pulse-glow 2s infinite'}} />
            <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:'0.9rem',
                         color:connected?'var(--green)':'var(--red)',letterSpacing:'0.08em',textTransform:'uppercase'}}>
              {connected?'[ WHATSAPP VINCULADO ]':'[ SIN CONEXIÓN ACTIVA ]'}
            </div>
          </div>
        </div>

        {/* QR */}
        <div className="panel panel-accent" style={{padding:'22px 24px',position:'relative'}}>
          <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
          <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://QR_SCANNER</div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white',marginBottom:12}}>
            ESCANEAR CÓDIGO QR
          </div>
          <div className="sys-label" style={{marginBottom:14}}>
            WHATSAPP → DISPOSITIVOS VINCULADOS → VINCULAR DISPOSITIVO → ESCANEAR QR
          </div>
          {apiUrl ? (
            <a href={`${apiUrl}/`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{display:'inline-flex'}}>
              <QrCode size={13} /> ABRIR PÁGINA QR DEL BOT
            </a>
          ) : (
            <div style={{display:'flex',alignItems:'center',gap:8,color:'var(--amber)',fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>
              <AlertTriangle size={12} /> CONFIGURA VITE_API_URL EN TU .ENV
            </div>
          )}
        </div>

        {/* Pairing code */}
        <div className="panel panel-accent" style={{padding:'22px 24px',position:'relative'}}>
          <span className="br-bl" style={{position:'absolute'}} /><span className="br-br" style={{position:'absolute'}} />
          <div className="sys-label" style={{color:'var(--blue)',opacity:0.7,marginBottom:2}}>SYS://PAIRING_CODE</div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white',marginBottom:12}}>
            CÓDIGO DE EMPAREJAMIENTO
          </div>
          <div className="sys-label" style={{marginBottom:14}}>INGRESA TU NÚMERO CON CÓDIGO DE PAÍS</div>
          <div style={{display:'flex',gap:10}}>
            <input className="input" style={{flex:1}} placeholder="549XXXXXXXXXX"
                   value={phone} onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,''))}
                   onKeyDown={e=>e.key==='Enter'&&handlePairing()} />
            <button className="btn btn-primary" onClick={handlePairing} disabled={loading||!phone.trim()}>
              {loading ? <div style={{width:14,height:14,border:'2px solid rgba(0,195,255,0.2)',borderTopColor:'var(--blue)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} /> : <Smartphone size={13}/>}
              GENERAR
            </button>
          </div>
          {error && (
            <div style={{marginTop:10,display:'flex',alignItems:'center',gap:6,color:'var(--red)',fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>
              <AlertTriangle size:11 />{error}
            </div>
          )}
          {pairingCode && (
            <div style={{marginTop:16,padding:'20px',background:'rgba(0,195,255,0.04)',border:'1px solid rgba(0,195,255,0.2)',textAlign:'center'}}>
              <div className="sys-label" style={{marginBottom:10,textAlign:'center'}}>CÓDIGO DE EMPAREJAMIENTO</div>
              <div style={{fontFamily:"'Orbitron',sans-serif",fontWeight:900,fontSize:'2.5rem',color:'var(--blue)',
                           textShadow:'0 0 20px rgba(0,195,255,0.6), 0 0 60px rgba(0,195,255,0.2)',letterSpacing:'0.3em'}}>
                {pairingCode}
              </div>
              <div className="sys-label" style={{marginTop:10}}>WA → DISPOSITIVOS → VINCULAR CON NÚMERO</div>
            </div>
          )}
        </div>

        {/* Reset */}
        <div className="panel" style={{padding:'22px 24px',position:'relative',borderColor:'rgba(255,26,60,0.12)'}}>
          <span className="br-bl" style={{position:'absolute',borderColor:'var(--red)'}} /><span className="br-br" style={{position:'absolute',borderColor:'var(--red)'}} />
          <div className="sys-label" style={{color:'var(--red)',opacity:0.8,marginBottom:2}}>SYS://DANGER_ZONE</div>
          <div style={{fontFamily:"'Orbitron',sans-serif",fontSize:'0.75rem',fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase',color:'white',marginBottom:10}}>ZONA DE PELIGRO</div>
          <div className="sys-label" style={{marginBottom:14}}>BORRA LA SESIÓN ACTUAL Y EL BACKUP REMOTO. TENDRÁS QUE REVINCULAR.</div>
          {!confirmReset ? (
            <button className="btn btn-danger" onClick={()=>setConfirmReset(true)}>
              <LogOut size={13}/> CERRAR SESIÓN Y RE-VINCULAR
            </button>
          ) : (
            <div style={{padding:16,background:'rgba(255,26,60,0.05)',border:'1px solid rgba(255,26,60,0.2)'}}>
              <div style={{display:'flex',alignItems:'center',gap:8,color:'var(--red)',fontFamily:"'Share Tech Mono',monospace",fontSize:12,marginBottom:14}}>
                <AlertTriangle size={13}/> [ ESTA ACCIÓN NO SE PUEDE DESHACER ]
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-danger" onClick={handleReset} disabled={resetLoading}>
                  {resetLoading ? <div style={{width:14,height:14,border:'2px solid rgba(255,26,60,0.2)',borderTopColor:'var(--red)',borderRadius:'50%',animation:'spin 0.7s linear infinite'}} /> : <RefreshCcw size={13}/>}
                  CONFIRMAR
                </button>
                <button className="btn btn-ghost" onClick={()=>setConfirmReset(false)}>CANCELAR</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
  