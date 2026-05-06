import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Save, RefreshCw, AlertCircle, Check, Shield, DollarSign, Wrench, Power, PowerOff } from 'lucide-react'
import { getConfig, postConfig, getMaintenance, postMaintenance, isConfigured, type BotConfig } from '../api'

interface MaintenanceState { enabled: boolean; message: string }
type Tab = 'bot' | 'economy' | 'antispam' | 'maintenance'

const TABS: { id: Tab; label: string; icon: React.ElementType; color: string; desc: string }[] = [
  { id: 'bot',         label: 'BOT',       icon: Wrench,     color: '#3B82F6', desc: 'Configuración base' },
  { id: 'economy',     label: 'ECONOMÍA',  icon: DollarSign, color: '#FBBF24', desc: 'Coins & XP'        },
  { id: 'antispam',    label: 'ANTI-SPAM', icon: Shield,     color: '#EF4444', desc: 'Protección'         },
  { id: 'maintenance', label: 'SISTEMA',   icon: Power,      color: '#A855F7', desc: 'Mantenimiento'      },
]

function FormRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label className="label">{label}</label>
      {children}
      {hint && <p style={{ marginTop: 6, fontSize: 10, color: 'var(--text3)', fontFamily: "'Inter', sans-serif", letterSpacing: '.04em', lineHeight: 1.6 }}>{hint}</p>}
    </div>
  )
}

function SectionHeader({ icon: Icon, title, color }: { icon: React.ElementType; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 32, height: 32, borderRadius: 6, background: `${color}14`, border: `1px solid ${color}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${color}20` }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '.02em', color }}>{title}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'var(--text3)', letterSpacing: '.02em', marginTop: 2 }}>MÓDULO DE CONFIGURACIÓN</div>
      </div>
    </div>
  )
}

export default function Config() {
  const [form,      setForm]  = useState<Partial<BotConfig>>({})
  const [maintForm, setMF]    = useState<MaintenanceState>({ enabled: false, message: '' })

  const [loading,   setLoad]  = useState(true)
  const [saving,    setSave]  = useState(false)
  const [savingM,   setSaveM] = useState(false)
  const [toast,     setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [tab,       setTab]   = useState<Tab>('bot')

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200) }

  const load = async () => {
    if (!isConfigured()) { setLoad(false); return }
    try { const c = await getConfig(); setForm(c) } catch {}
    try { const m = await getMaintenance(); setMF(m) } catch {}
    setLoad(false)
  }
  useEffect(() => { load() }, [])

  const saveConfig = async () => {
    setSave(true)
    try { await postConfig(form); showToast('Configuración guardada') }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', false) }
    setSave(false)
  }
  const saveMaint = async () => {
    setSaveM(true)
    try { await postMaintenance(maintForm); showToast('Sistema ' + (maintForm.enabled ? 'en mantenimiento' : 'operativo')) }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', false) }
    setSaveM(false)
  }

  if (!isConfigured()) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340 }}>
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ padding: 32, textAlign: 'center', maxWidth: 380 }}>
        <AlertCircle size={28} color="#FBBF24" style={{ margin: '0 auto 14px' }} />
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
          Configura <span style={{ color: '#3B82F6', fontFamily: 'monospace' }}>VITE_API_URL</span> en Vercel → Settings → Environment Variables.
        </p>
      </motion.div>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="skeleton" style={{ height: 54, borderRadius: 4 }} />
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999 }}>
            <div className={`alert ${toast.ok ? 'alert-ok' : 'alert-err'}`} style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
              {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}{toast.msg}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="page-title"><Wrench size={18} color="var(--blue)" />Configuración</div>
        <div className="page-subtitle">Configuración global del bot</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <motion.button key={t.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 4, border: '1px solid',
                borderColor: isActive ? `${t.color}55` : 'var(--border)',
                background: isActive ? `${t.color}12` : 'rgba(220,38,38,0.03)',
                color: isActive ? t.color : 'var(--text2)',
                fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '.08em',
                boxShadow: isActive ? `0 0 20px ${t.color}18, inset 0 1px 0 rgba(255,255,255,0.04)` : 'none',
                cursor: 'pointer', transition: 'all .18s',
              }}>
              <Icon size={13} />{t.label}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.24 }} className="card" style={{ padding: 28 }}>

          {tab === 'bot' && (
            <>
              <SectionHeader icon={Wrench} title="CONFIGURACIÓN DEL BOT" color="#3B82F6" />
              <div className="grid-form">
                <FormRow label="NOMBRE DEL BOT" hint="Aparece en mensajes del sistema">
                  <input className="input" value={form.botName ?? ''} onChange={e => setForm(f => ({ ...f, botName: e.target.value }))} placeholder="BotAnime" />
                </FormRow>
                <FormRow label="PREFIJO DE COMANDOS" hint="Carácter que activa los comandos (!  /  .)">
                  <input className="input" value={form.prefix ?? ''} onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))} placeholder="!" maxLength={3} />
                </FormRow>
                <FormRow label="NÚMERO OWNER" hint="Tu número sin + ni espacios (ej: 521234567890)">
                  <input className="input" value={form.ownerNumber ?? ''} onChange={e => setForm(f => ({ ...f, ownerNumber: e.target.value }))} placeholder="521234567890" />
                </FormRow>
                <FormRow label="COOLDOWN COMANDOS (seg)" hint="Pausa mínima entre comandos por usuario">
                  <input className="input" type="number" min={0} max={60} value={form.commandCooldown ?? 3} onChange={e => setForm(f => ({ ...f, commandCooldown: +e.target.value }))} />
                </FormRow>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={12} /> Recargar</button>
                <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
                  {saving ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Guardando…</> : <><Save size={12} />Guardar Config</>}
                </button>
              </div>
            </>
          )}

          {tab === 'economy' && (
            <>
              <SectionHeader icon={DollarSign} title="SISTEMA DE ECONOMÍA" color="#FBBF24" />
              <div className="grid-form">
                <FormRow label="COINS DIARIOS" hint="Monedas que recibe el usuario con !daily">
                  <input className="input" type="number" min={0} value={(form.economy as Record<string,number>|undefined)?.dailyCoins ?? 100} onChange={e => setForm(f => ({ ...f, economy: { ...(f.economy as object || {}), dailyCoins: +e.target.value } }))} />
                </FormRow>
                <FormRow label="COOLDOWN DAILY (horas)" hint="Horas entre usos de !daily">
                  <input className="input" type="number" min={1} max={48} value={(form.economy as Record<string,number>|undefined)?.dailyCooldownHours ?? 24} onChange={e => setForm(f => ({ ...f, economy: { ...(f.economy as object || {}), dailyCooldownHours: +e.target.value } }))} />
                </FormRow>
                <FormRow label="XP POR MENSAJE" hint="XP ganada por cada mensaje enviado">
                  <input className="input" type="number" min={0} max={100} value={(form.level as Record<string,number>|undefined)?.xpPerMessage ?? 5} onChange={e => setForm(f => ({ ...f, level: { ...(f.level as object || {}), xpPerMessage: +e.target.value } }))} />
                </FormRow>
                <FormRow label="XP BASE POR NIVEL" hint="XP requerida por nivel (nivel × base)">
                  <input className="input" type="number" min={50} value={(form.level as Record<string,number>|undefined)?.xpPerLevel ?? 100} onChange={e => setForm(f => ({ ...f, level: { ...(f.level as object || {}), xpPerLevel: +e.target.value } }))} />
                </FormRow>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="btn"
                  style={{ background: 'rgba(251,191,36,0.12)', borderColor: 'rgba(251,191,36,0.42)', color: '#FBBF24', padding: '8px 18px', fontSize: 12, letterSpacing: '.08em', boxShadow: '0 0 16px rgba(251,191,36,0.12)' }}
                  onClick={saveConfig} disabled={saving}>
                  {saving ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Guardando…</> : <><Save size={12} />Guardar Economía</>}
                </motion.button>
              </div>
            </>
          )}

          {tab === 'antispam' && (
            <>
              <SectionHeader icon={Shield} title="MÓDULO ANTI-SPAM" color="#EF4444" />
              <div className="grid-form">
                <FormRow label="MÁX. MENSAJES (5 seg)" hint="Mensajes permitidos en 5 segundos antes de activar">
                  <input className="input" type="number" min={1} max={20} value={(form.antiSpam as Record<string,number>|undefined)?.maxMessages ?? 5} onChange={e => setForm(f => ({ ...f, antiSpam: { ...(f.antiSpam as object || {}), maxMessages: +e.target.value } }))} />
                </FormRow>
                <FormRow label="ADVERTENCIAS ANTES DE KICK" hint="Avisos antes de expulsar automáticamente">
                  <input className="input" type="number" min={1} max={10} value={(form.antiSpam as Record<string,number>|undefined)?.warnBeforeBan ?? 3} onChange={e => setForm(f => ({ ...f, antiSpam: { ...(f.antiSpam as object || {}), warnBeforeBan: +e.target.value } }))} />
                </FormRow>
                <FormRow label="ACCIÓN AL DETECTAR SPAM">
                  <select className="input" value={(form.antiSpam as Record<string,string>|undefined)?.action ?? 'warn'} onChange={e => setForm(f => ({ ...f, antiSpam: { ...(f.antiSpam as object || {}), action: e.target.value } }))}>
                    <option value="warn">Advertir solamente</option>
                    <option value="delete">Borrar mensaje</option>
                    <option value="mute">Silenciar usuario</option>
                    <option value="kick">Expulsar usuario</option>
                  </select>
                </FormRow>
                <FormRow label="PENALIZACIÓN ANTI-LINK">
                  <select className="input" value={(form.antiSpam as Record<string,string>|undefined)?.linkAction ?? 'delete'} onChange={e => setForm(f => ({ ...f, antiSpam: { ...(f.antiSpam as object || {}), linkAction: e.target.value } }))}>
                    <option value="delete">Solo borrar</option>
                    <option value="warn">Advertir</option>
                    <option value="kick">Expulsar</option>
                  </select>
                </FormRow>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button className="btn btn-red" onClick={saveConfig} disabled={saving}>
                  {saving ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Guardando…</> : <><Save size={12} />Guardar Anti-Spam</>}
                </button>
              </div>
            </>
          )}

          {tab === 'maintenance' && (
            <>
              <SectionHeader icon={Power} title="MODO MANTENIMIENTO" color="#A855F7" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22, padding: '14px 16px',
                background: maintForm.enabled ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)',
                border: `1px solid ${maintForm.enabled ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
                borderRadius: 4, boxShadow: maintForm.enabled ? '0 0 20px rgba(239,68,68,0.06)' : '0 0 20px rgba(16,185,129,0.06)' }}>
                <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.6, repeat: Infinity }}
                  style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: maintForm.enabled ? '#EF4444' : '#10B981',
                    boxShadow: `0 0 8px ${maintForm.enabled ? '#EF4444' : '#10B981'}` }} />
                <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, letterSpacing: '.07em', color: maintForm.enabled ? '#EF4444' : '#10B981', flex: 1, fontSize: 13 }}>
                  {maintForm.enabled ? 'Bot en mantenimiento — ignorando mensajes' : 'Bot operativo — respondiendo normalmente'}
                </span>
                <button className={`btn btn-sm ${maintForm.enabled ? 'btn-green' : 'btn-red'}`} onClick={() => setMF(m => ({ ...m, enabled: !m.enabled }))}>
                  {maintForm.enabled ? <><PowerOff size={12} />Desactivar</> : <><Power size={12} />Activar</>}
                </button>
              </div>
              <FormRow label="MENSAJE DURANTE MANTENIMIENTO" hint="Mensaje que reciben los usuarios cuando el bot está en mantenimiento">
                <textarea className="textarea" value={maintForm.message} onChange={e => setMF(m => ({ ...m, message: e.target.value }))} placeholder="⚙️ Bot en mantenimiento. Vuelve en unos minutos." style={{ minHeight: 90 }} />
              </FormRow>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="btn"
                  style={{ background: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.42)', color: '#C084FC', padding: '8px 18px', fontSize: 12, letterSpacing: '.08em', boxShadow: '0 0 16px rgba(168,85,247,0.12)' }}
                  onClick={saveMaint} disabled={savingM}>
                  {savingM ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Aplicando…</> : <><Save size={12} />Aplicar Cambios</>}
                </motion.button>
              </div>
            </>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
