import { useEffect, useState } from 'react'
import { RefreshCw, Key, AlertTriangle, CheckCircle, RotateCcw, Copy, ExternalLink, Wifi, ArrowRight, Server } from 'lucide-react'
import { getStatus, postPairingCode, postReset, getApiUrl, isConfigured, type BotStatus } from '../api'

function StepCard({ num, title, desc, active, done }: { num: number; title: string; desc: string; active?: boolean; done?: boolean }) {
  const color = done ? '#10B981' : active ? '#3B82F6' : 'var(--text3)'
  return (
    <div style={{
      display: 'flex', gap: 14, padding: '12px 0',
      borderBottom: '1px solid var(--border)',
      opacity: done || active ? 1 : .4, transition: 'opacity .2s',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: color + '15', border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, color,
        boxShadow: active ? `0 0 16px ${color}20` : 'none',
        transition: 'all .22s',
      }}>
        {done ? <CheckCircle size={14} /> : num}
      </div>
      <div style={{ paddingTop: 2 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: active || done ? 'var(--text)' : 'var(--text2)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  )
}

export default function Connect() {
  const [status,    setStatus]  = useState<BotStatus | null>(null)
  const [phone,     setPhone]   = useState('')
  const [code,      setCode]    = useState<string | null>(null)
  const [loading,   setLoad]    = useState(true)
  const [sending,   setSend]    = useState(false)
  const [resetting, setReset]   = useState(false)
  const [toast,     setToast]   = useState<{ msg: string; ok: boolean } | null>(null)
  const [copied,    setCopied]  = useState(false)
  const apiUrl = getApiUrl()

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 4000) }

  const fetchStatus = async () => {
    if (!isConfigured()) { setLoad(false); return }
    try { setStatus(await getStatus()) } catch {}
    setLoad(false)
  }
  useEffect(() => { fetchStatus(); const id = setInterval(fetchStatus, 8000); return () => clearInterval(id) }, [])

  const requestCode = async () => {
    if (!phone.trim()) return
    setSend(true); setCode(null)
    try {
      const res = await postPairingCode(phone.trim())
      setCode((res as { code?: string }).code ?? JSON.stringify(res))
      showToast('Código generado — ingrésalo en tu WhatsApp')
    } catch (e) { showToast(e instanceof Error ? e.message : 'Error al solicitar código', false) }
    setSend(false)
  }

  const resetBot = async () => {
    if (!confirm('¿Confirmas reiniciar la sesión? El bot se desconectará.')) return
    setReset(true)
    try { await postReset(); setStatus(null); setCode(null); showToast('Sesión reiniciada') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', false) }
    setReset(false)
  }

  const copyCode = () => {
    if (code) { navigator.clipboard.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }

  if (!isConfigured()) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
      <div className="card animate-scale-in" style={{ padding: 32, textAlign: 'center', maxWidth: 400 }}>
        <AlertTriangle size={28} color="#F59E0B" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>VITE_API_URL no configurada</p>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 16 }}>
          Define <code style={{ color: '#3B82F6', fontFamily: 'monospace', background: 'rgba(59,130,246,.10)', padding: '1px 6px', borderRadius: 4 }}>VITE_API_URL</code> en Vercel → Settings → Environment Variables.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(59,130,246,.05)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'left' }}>
          <Server size={13} color="var(--text3)" />
          <code style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>VITE_API_URL = https://tu-bot.railway.app</code>
        </div>
      </div>
    </div>
  )

  const connected = status?.connected ?? false

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }} className="animate-fade-up">

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }} className="animate-fade-up">
          <div className={`alert ${toast.ok ? 'alert-ok' : 'alert-err'}`} style={{ boxShadow: '0 8px 32px rgba(0,0,0,.5)', minWidth: 220 }}>
            {toast.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}{toast.msg}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title"><Wifi size={18} color="#10B981" />Conexión</div>
          <div className="page-subtitle">Vinculación de WhatsApp · Sesión del bot</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            borderRadius: 20, border: `1px solid ${loading ? 'var(--border)' : connected ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.25)'}`,
            background: loading ? 'var(--card)' : connected ? 'rgba(16,185,129,.08)' : 'rgba(239,68,68,.07)',
          }}>
            {!loading && <div style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#10B981' : '#EF4444', animation: connected ? 'livePulse 1.8s ease-in-out infinite' : 'none' }} />}
            {loading && <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} color="var(--text3)" />}
            <span style={{ fontSize: 12, fontWeight: 600, color: loading ? 'var(--text3)' : connected ? '#10B981' : '#F87171' }}>
              {loading ? 'Verificando…' : connected ? 'Sesión activa' : 'Sin sesión'}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      <div className="grid-halves">

        {/* Steps */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <ArrowRight size={14} color="var(--text3)" />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Protocolo de conexión</span>
          </div>
          <div style={{ padding: '8px 18px 18px' }}>
            <StepCard num={1} title="Bot en Railway / Render" desc="El bot debe estar desplegado y corriendo en el servidor." done active={!connected} />
            <StepCard num={2} title="Solicitar código" desc="Ingresa tu número y solicita el código de vinculación desde este panel." active={!connected} done={connected} />
            <StepCard num={3} title="Ingresar en WhatsApp" desc="WhatsApp → ⋮ → Dispositivos vinculados → Vincular dispositivo → Código." active={!!code && !connected} done={connected} />
            <StepCard num={4} title="Sesión activa" desc="El bot comenzará a responder comandos en todos los grupos configurados." active={connected} done={connected} />
          </div>
        </div>

        {/* Action panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Connected state */}
          {connected && (
            <div className="card animate-scale-in" style={{ padding: '24px 20px', textAlign: 'center', borderColor: 'rgba(16,185,129,.3)', background: 'rgba(16,185,129,.03)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 0 24px rgba(16,185,129,.15)' }}>
                <Wifi size={22} color="#10B981" />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#10B981', marginBottom: 6 }}>Bot conectado</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sesión activa y procesando mensajes</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'livePulse 1.8s ease-in-out infinite' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'livePulse 1.8s ease-in-out infinite .6s' }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'livePulse 1.8s ease-in-out infinite 1.2s' }} />
              </div>
            </div>
          )}

          {/* Pairing code form */}
          {!connected && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
                <Key size={14} color="#3B82F6" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Código de vinculación</span>
              </div>
              <div style={{ padding: 18 }}>
                <label className="label">Número de WhatsApp</label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <input className="input" placeholder="521234567890" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    style={{ fontFamily: 'ui-monospace,monospace' }}
                    onKeyDown={e => e.key === 'Enter' && requestCode()} />
                  <button className="btn btn-primary" onClick={requestCode} disabled={sending || !phone.trim()}>
                    {sending ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={12} />}
                    {sending ? '…' : 'Pedir'}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.6 }}>
                  Sin + ni espacios. Ej: <code style={{ fontFamily: 'monospace', color: '#3B82F6' }}>521234567890</code> (MX) · <code style={{ fontFamily: 'monospace', color: '#3B82F6' }}>541234567890</code> (AR)
                </p>

                {code && (
                  <div className="animate-scale-in" style={{ marginTop: 16, padding: 20, background: 'rgba(59,130,246,.05)', border: '1px solid rgba(59,130,246,.20)', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 12 }}>Código de acceso</div>
                    <div style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 800, fontSize: 32, letterSpacing: '.08em', color: '#3B82F6', textShadow: '0 0 28px rgba(59,130,246,.55)', marginBottom: 12 }}>
                      {code}
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={copyCode} style={{ color: copied ? '#10B981' : 'var(--text2)' }}>
                      <Copy size={11} />{copied ? 'Copiado ✓' : 'Copiar código'}
                    </button>
                    <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 12, lineHeight: 1.7 }}>
                      WhatsApp → ⋮ → <strong style={{ color: 'var(--text2)' }}>Dispositivos vinculados</strong> → Vincular dispositivo → Código
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* API endpoint */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <ExternalLink size={13} color="var(--text3)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>API Endpoint</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <Server size={12} color="var(--text3)" />
                <code style={{ fontFamily: 'ui-monospace,monospace', fontSize: 11, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {apiUrl || 'Sin configurar'}
                </code>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card" style={{ padding: 0, borderColor: 'rgba(239,68,68,.18)', background: 'rgba(239,68,68,.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(239,68,68,.12)' }}>
              <RotateCcw size={13} color="#F87171" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#F87171' }}>Zona peligrosa</span>
            </div>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 12 }}>
                Reiniciar la sesión desconecta el bot de WhatsApp. Deberás vincular el dispositivo nuevamente.
              </p>
              <button className="btn btn-red btn-sm" onClick={resetBot} disabled={resetting} style={{ width: '100%', justifyContent: 'center' }}>
                {resetting ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={12} />}
                {resetting ? 'Reiniciando…' : 'Reiniciar sesión'}
              </button>
            </div>
          </div>

        </div>
      </div>

      <div style={{ height: 8 }} />
    </div>
  )
}
