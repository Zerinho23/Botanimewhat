import { useEffect, useState } from 'react'
  import { Link2, QrCode, Smartphone, RefreshCcw, LogOut, AlertTriangle } from 'lucide-react'
  import { getStatus, postPairingCode, postReset, getApiUrl, type BotStatus } from '../api'

  export default function Connect() {
    const [status, setStatus] = useState<BotStatus | null>(null)
    const [phone, setPhone] = useState('')
    const [pairingCode, setPairingCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [confirmReset, setConfirmReset] = useState(false)

    useEffect(() => {
      const fetch = () => getStatus().then(setStatus).catch(() => {})
      fetch()
      const id = setInterval(fetch, 6000)
      return () => clearInterval(id)
    }, [])

    const handlePairing = async () => {
      if (!phone.trim()) return
      setLoading(true); setError(null); setPairingCode(null)
      try {
        const res = await postPairingCode(phone.trim())
        if (res.code) setPairingCode(res.code)
        else setError(res.error ?? 'No se pudo generar el código')
      } catch (e) {
        setError('Error de conexión con el bot')
      } finally {
        setLoading(false)
      }
    }

    const handleReset = async () => {
      setResetLoading(true)
      try {
        await postReset()
        setConfirmReset(false)
      } catch {
        setError('Error al resetear la sesión')
      } finally {
        setResetLoading(false)
      }
    }

    const apiUrl = getApiUrl()

    return (
      <div className="space-y-5 max-w-2xl">
        {/* Status */}
        <div className={`card flex items-center gap-4 ${status?.connected ? 'border-green/20' : 'border-red/20'}`}>
          <div className={`w-3 h-3 rounded-full ${status?.connected ? 'bg-green shadow-[0_0_12px_#00ff88]' : 'bg-red shadow-[0_0_12px_#ff3355]'} animate-pulse-slow`} />
          <div>
            <p className={`font-display font-bold ${status?.connected ? 'text-green' : 'text-red'}`}>
              {status?.connected ? 'WhatsApp Conectado' : 'Sin conexión activa'}
            </p>
            <p className="font-mono text-[10px] text-tx3 mt-0.5">
              {status?.connected ? 'El bot está operativo' : 'Vincula tu número para activar el bot'}
            </p>
          </div>
        </div>

        {/* QR scan option */}
        <div className="card">
          <p className="section-title">Escanear código QR</p>
          <p className="font-mono text-xs text-tx2 mb-4">
            Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escanea el QR
          </p>
          {apiUrl ? (
            <a
              href={`${apiUrl}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex"
            >
              <QrCode size={14} />
              Abrir página con QR del bot
            </a>
          ) : (
            <div className="flex items-center gap-2 text-amber font-mono text-xs">
              <AlertTriangle size={13} />
              Configura VITE_API_URL en tu .env para acceder al QR
            </div>
          )}
        </div>

        {/* Pairing code */}
        <div className="card">
          <p className="section-title">Código de emparejamiento</p>
          <p className="font-mono text-xs text-tx2 mb-4">
            Ingresa tu número (con código de país) para generar un código de 8 dígitos
          </p>
          <div className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="549XXXXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handlePairing()}
            />
            <button className="btn-primary flex-shrink-0" onClick={handlePairing} disabled={loading || !phone.trim()}>
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
              ) : <Smartphone size={14} />}
              Generar
            </button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red font-mono text-xs">
              <AlertTriangle size={12} />
              {error}
            </div>
          )}

          {pairingCode && (
            <div className="mt-4 p-5 rounded-lg bg-blue/5 border border-blue/20 text-center">
              <p className="label text-center mb-2">Código de emparejamiento</p>
              <p className="font-display font-bold text-4xl text-blue tracking-[0.3em] glow-blue">
                {pairingCode}
              </p>
              <p className="font-mono text-[10px] text-tx3 mt-2">
                WhatsApp → Dispositivos vinculados → Vincular con número de teléfono
              </p>
            </div>
          )}
        </div>

        {/* Reset session */}
        <div className="card border-red/10">
          <p className="section-title">Zona de peligro</p>
          <p className="font-mono text-xs text-tx2 mb-4">
            Esto borrará la sesión actual y el backup remoto. Tendrás que volver a vincular.
          </p>
          {!confirmReset ? (
            <button className="btn-danger" onClick={() => setConfirmReset(true)}>
              <LogOut size={14} />
              Cerrar sesión y re-vincular
            </button>
          ) : (
            <div className="p-4 rounded-lg bg-red/5 border border-red/20 space-y-3">
              <div className="flex items-center gap-2 text-red font-display font-semibold">
                <AlertTriangle size={14} />
                Esta acción no se puede deshacer
              </div>
              <div className="flex gap-3">
                <button className="btn-danger" onClick={handleReset} disabled={resetLoading}>
                  {resetLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-red/20 border-t-red animate-spin" />
                  ) : <RefreshCcw size={14} />}
                  Confirmar reset
                </button>
                <button className="btn-ghost" onClick={() => setConfirmReset(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }
  