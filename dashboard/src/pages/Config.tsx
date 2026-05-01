import { useEffect, useState } from 'react'
  import { Save, RotateCcw, Settings } from 'lucide-react'
  import { getConfig, postConfig, type BotConfig } from '../api'

  function Toast({ msg, ok }: { msg: string; ok: boolean }) {
    return (
      <div className={`fixed bottom-5 right-5 flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-display font-semibold z-50 shadow-2xl backdrop-blur-xl ${ok ? 'bg-green/10 border-green/30 text-green' : 'bg-red/10 border-red/30 text-red'}`}>
        {msg}
      </div>
    )
  }

  export default function Config() {
    const [config, setConfig] = useState<BotConfig | null>(null)
    const [form, setForm] = useState<Partial<BotConfig>>({})
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
    const [loading, setLoading] = useState(true)

    const showToast = (msg: string, ok: boolean) => {
      setToast({ msg, ok })
      setTimeout(() => setToast(null), 3000)
    }

    useEffect(() => {
      getConfig()
        .then(c => { setConfig(c); setForm(c) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
      setSaving(true)
      try {
        await postConfig(form)
        setConfig(prev => prev ? { ...prev, ...form } : null)
        showToast('Configuración guardada correctamente', true)
      } catch {
        showToast('Error al guardar configuración', false)
      } finally {
        setSaving(false)
      }
    }

    const handleReset = () => {
      if (config) setForm(config)
    }

    const set = (k: keyof BotConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))

    if (loading) return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
      </div>
    )

    if (!config) return (
      <div className="text-center py-16 text-tx3 font-mono text-xs uppercase tracking-widest">
        <Settings size={32} className="mx-auto mb-4 opacity-30" />
        No se pudo cargar la configuración
      </div>
    )

    return (
      <div className="space-y-5 max-w-2xl">
        {toast && <Toast {...toast} />}

        <div className="card">
          <p className="section-title">Configuración general</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="label">Prefijo de comandos</label>
              <input className="input" value={form.prefix ?? ''} onChange={set('prefix')} placeholder="!" />
            </div>
            <div>
              <label className="label">Nombre del bot</label>
              <input className="input" value={form.botName ?? ''} onChange={set('botName')} placeholder="BotAnime" />
            </div>
            <div>
              <label className="label">Número del dueño</label>
              <input className="input" value={form.ownerNumber ?? ''} onChange={set('ownerNumber')} placeholder="549XXXXXXXXXX" />
            </div>
            <div>
              <label className="label">Cooldown de comandos (ms)</label>
              <input className="input" type="number" value={form.commandCooldown ?? ''} onChange={set('commandCooldown')} placeholder="3000" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn-primary flex-1 justify-center" onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="w-4 h-4 rounded-full border-2 border-blue/20 border-t-blue animate-spin" />
            ) : <Save size={14} />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button className="btn-ghost" onClick={handleReset}>
            <RotateCcw size={14} />
            Revertir
          </button>
        </div>

        {/* Read-only config preview */}
        <div className="card">
          <p className="section-title">Configuración actual</p>
          <pre className="font-mono text-xs text-tx2 bg-bg2 rounded-md p-4 overflow-x-auto border border-border leading-relaxed">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>
    )
  }
  