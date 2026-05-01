import { useEffect, useState } from 'react'
  import { Wifi, WifiOff, RefreshCw, Smartphone, Key, AlertTriangle, CheckCircle, RotateCcw, Copy, ExternalLink } from 'lucide-react'
  import { getStatus, postPairingCode, postReset, getApiUrl, isConfigured, type BotStatus } from '../api'

  function StepCard({ num, title, desc, active, done }: { num: number; title: string; desc: string; active?: boolean; done?: boolean }) {
    return (
      <div style={{ display:'flex', gap:14, padding:'14px 0',
        borderBottom:'1px solid rgba(255,255,255,.05)', opacity: done||active ? 1 : .5 }}>
        <div style={{ width:32, height:32, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
          background: done?'rgba(16,185,129,.15)':active?'rgba(229,57,53,.15)':'rgba(255,255,255,.06)',
          border: `1px solid ${done?'rgba(16,185,129,.3)':active?'rgba(229,57,53,.3)':'rgba(255,255,255,.08)'}`,
          fontSize:12, fontWeight:800, color:done?'var(--green)':active?'var(--red)':'var(--tx3)' }}>
          {done ? '✓' : num}
        </div>
        <div>
          <div style={{ fontWeight:700, fontSize:13, color:done?'var(--green)':active?'white':'var(--tx2)', marginBottom:3 }}>{title}</div>
          <div style={{ fontSize:11, color:'var(--tx3)' }}>{desc}</div>
        </div>
      </div>
    )
  }

  export default function Connect() {
    const [status,   setStatus]  = useState<BotStatus | null>(null)
    const [loading,  setLoad]    = useState(true)
    const [phone,    setPhone]   = useState('')
    const [code,     setCode]    = useState<string|null>(null)
    const [codeErr,  setCodeErr] = useState<string|null>(null)
    const [loadCode, setLoadCode]= useState(false)
    const [resetting,setReset]   = useState(false)
    const [resetMsg, setResetMsg]= useState<{type:'ok'|'err'; text:string}|null>(null)
    const [copied,   setCopied]  = useState(false)
    const apiUrl = getApiUrl()

    if (!isConfigured()) return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:360, gap:16, textAlign:'center' }}>
        <div className="icon-badge-lg" style={{ background:'rgba(245,158,11,.1)', width:64, height:64, borderRadius:18 }}>
          <AlertTriangle size={30} color="var(--gold)" />
        </div>
        <div style={{ fontWeight:700, fontSize:'1rem', color:'var(--gold)', textTransform:'uppercase', letterSpacing:'.08em' }}>VITE_API_URL no configurada</div>
        <div style={{ fontSize:12, color:'var(--tx3)', maxWidth:360 }}>Ve a Vercel → Settings → Environment Variables y agrega:</div>
        <div className="code-block" style={{ fontSize:13 }}>VITE_API_URL = https://tu-bot.railway.app</div>
      </div>
    )

    const fetchStatus = async () => {
      try { setStatus(await getStatus()) } catch {}
      setLoad(false)
    }
    useEffect(() => { fetchStatus(); const id=setInterval(fetchStatus,8000); return()=>clearInterval(id) }, [])

    const requestCode = async () => {
      if (!phone.trim()) return
      setLoadCode(true); setCode(null); setCodeErr(null)
      try {
        const r = await postPairingCode(phone.trim())
        if (r.code) setCode(r.code)
        else setCodeErr(r.error||'No se recibió código')
      } catch (e: unknown) { setCodeErr(e instanceof Error?e.message:'Error al solicitar código') }
      setLoadCode(false)
    }

    const reset = async () => {
      if (!confirm('¿Reiniciar la sesión del bot? Necesitarás volver a vincular WhatsApp.')) return
      setReset(true); setResetMsg(null)
      try { await postReset(); setResetMsg({ type:'ok', text:'Sesión reiniciada correctamente. El bot solicitará re-vinculación.' }) }
      catch (e: unknown) { setResetMsg({ type:'err', text: e instanceof Error?e.message:'Error al reiniciar' }) }
      setReset(false)
    }

    const copyCode = () => {
      if (code) { navigator.clipboard.writeText(code); setCopied(true); setTimeout(()=>setCopied(false), 2000) }
    }

    const connected = status?.connected

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:22, maxWidth:720 }} className="animate-fade-up">
        <div>
          <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.6rem' }}>Conexión WhatsApp</h1>
          <p style={{ fontSize:12, color:'var(--tx3)', marginTop:3 }}>Gestiona la sesión y vinculación del bot</p>
        </div>

        {/* ── Main status card ── */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:18 }}>
            {/* Connection ring */}
            <div className={`conn-ring ${loading?'loading':connected?'online':'offline'}`}>
              {loading
                ? <RefreshCw size={26} color="var(--blue)" style={{ animation:'spin 1s linear infinite' }} />
                : connected
                  ? <Wifi size={26} color="var(--green)" />
                  : <WifiOff size={26} color="var(--red2)" />}
            </div>

            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:'1.25rem',
                color:connected?'var(--green)':loading?'var(--tx3)':'var(--red2)', marginBottom:4 }}>
                {loading ? 'Verificando conexión…' : connected ? '✅ Bot conectado' : '❌ Bot desconectado'}
              </div>
              <div style={{ fontSize:12, color:'var(--tx3)', display:'flex', alignItems:'center', gap:6 }}>
                <ExternalLink size={11} />
                {apiUrl || 'Sin URL configurada'}
              </div>
              {connected && status && (
                <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span className="badge badge-green">Sesión activa</span>
                  {status.hasPairingCode && <span className="badge badge-blue">Código solicitado</span>}
                </div>
              )}
            </div>

            <button onClick={fetchStatus} className="btn btn-ghost btn-sm">
              <RefreshCw size={13} /> Verificar
            </button>
          </div>

          {/* Status messages */}
          {!loading && !connected && status && (
            <div className="alert alert-warn" style={{ marginTop:16 }}>
              <AlertTriangle size={14} />
              {status.hasQR
                ? 'QR disponible — escanéalo desde la URL del bot en Railway'
                : status.hasPairingCode
                  ? 'Código de vinculación solicitado — ingresa el código en WhatsApp'
                  : 'El bot no tiene sesión activa. Vincula WhatsApp abajo.'}
            </div>
          )}
          {!loading && connected && (
            <div className="alert alert-ok" style={{ marginTop:16 }}>
              <CheckCircle size={14} />
              Sesión WhatsApp activa y funcionando correctamente
            </div>
          )}
        </div>

        {/* ── Connection guide (only when disconnected) ── */}
        {!loading && !connected && (
          <div className="card" style={{ padding:22 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <Key size={14} color="var(--blue)" />
              <strong style={{ fontSize:14 }}>Pasos para vincular WhatsApp</strong>
            </div>
            <div style={{ marginBottom:18 }}>
              <StepCard num={1} title="Ingresa el número del bot" desc="El número de teléfono SIN +, guiones ni espacios (ej: 521234567890)" active={!code} done={!!code} />
              <StepCard num={2} title="Solicita el código de vinculación" desc="Haz clic en 'Obtener código' y espera el código de 8 dígitos" active={false} done={!!code} />
              <StepCard num={3} title="Ingresa el código en WhatsApp" desc="Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo → Código de vinculación" active={!!code} done={false} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <div style={{ position:'relative', flex:1 }}>
                <Smartphone size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--tx3)', pointerEvents:'none' }} />
                <input className="input" placeholder="521234567890" value={phone}
                  onChange={e=>setPhone(e.target.value.replace(/[^0-9]/g,''))}
                  onKeyDown={e=>e.key==='Enter'&&requestCode()}
                  style={{ paddingLeft:30 }} />
              </div>
              <button className="btn btn-primary" onClick={requestCode} disabled={loadCode||!phone.trim()}>
                {loadCode ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Key size={13} />}
                {loadCode ? 'Solicitando…' : 'Obtener código'}
              </button>
            </div>

            {/* Code display */}
            {code && (
              <div style={{ marginTop:18, padding:'20px 24px', borderRadius:12, textAlign:'center',
                background:'linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08))',
                border:'1px solid rgba(99,102,241,.3)' }}>
                <div style={{ fontSize:10, color:'var(--tx3)', marginBottom:8, letterSpacing:'.1em', textTransform:'uppercase' }}>
                  CÓDIGO DE VINCULACIÓN — válido por 60 segundos
                </div>
                <div className="pairing-code">{code}</div>
                <button onClick={copyCode} className="btn btn-ghost btn-sm" style={{ marginTop:12 }}>
                  {copied ? <><CheckCircle size={12} /> ¡Copiado!</> : <><Copy size={12} /> Copiar código</>}
                </button>
                <div style={{ fontSize:11, color:'var(--tx3)', marginTop:10 }}>
                  Ingresa este código en WhatsApp → Dispositivos vinculados → Vincular dispositivo → Ingresar código manualmente
                </div>
              </div>
            )}

            {codeErr && (
              <div className="alert alert-err" style={{ marginTop:14 }}>
                <AlertTriangle size={14} />{codeErr}
              </div>
            )}
          </div>
        )}

        {/* ── Reset session ── */}
        <div className="card" style={{ padding:22, borderColor:'rgba(229,57,53,.12)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div className="icon-badge" style={{ background:'rgba(229,57,53,.1)' }}>
              <RotateCcw size={15} color="var(--red)" />
            </div>
            <div>
              <strong style={{ fontSize:14 }}>Reiniciar sesión</strong>
              <div style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>Úsalo solo si el bot no puede conectarse o está en un estado inválido</div>
            </div>
          </div>

          <div className="alert alert-warn" style={{ marginBottom:16 }}>
            <AlertTriangle size={14} />
            Al reiniciar la sesión, el bot se desconectará y necesitarás volver a vincular WhatsApp con un código nuevo.
          </div>

          {resetMsg && (
            <div className={`alert ${resetMsg.type==='ok'?'alert-ok':'alert-err'}`} style={{ marginBottom:14 }}>
              {resetMsg.type==='ok' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {resetMsg.text}
            </div>
          )}

          <button className="btn btn-red btn-sm" onClick={reset} disabled={resetting}>
            <RotateCcw size={13} style={{ animation:resetting?'spin 1s linear infinite':'none' }} />
            {resetting ? 'Reiniciando sesión…' : 'Cerrar sesión y re-vincular'}
          </button>
        </div>

        {/* ── API info ── */}
        <div className="card" style={{ padding:22 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
            <Wifi size={14} color="var(--tx3)" /> Información de la API
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'URL del bot', val: apiUrl || 'No configurada', mono:true },
              { label:'Estado', val: loading?'Verificando…':connected?'✅ Conectado':'❌ Desconectado' },
              { label:'QR disponible', val: status?.hasQR?'Sí':'No' },
              { label:'Código activo', val: status?.hasPairingCode?'Sí':'No' },
            ].map(item => (
              <div key={item.label} style={{ background:'var(--card2)', borderRadius:8, padding:'10px 14px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:9, color:'var(--tx3)', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', marginBottom:4 }}>{item.label}</div>
                <div style={{ fontSize:12, color:'var(--tx2)', fontFamily:item.mono?"'JetBrains Mono',monospace":undefined,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  