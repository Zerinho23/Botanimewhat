import { useEffect, useState } from 'react'
  import { Settings, Save, RefreshCw, AlertCircle, Check, Zap, Shield, DollarSign, Bell, Wrench } from 'lucide-react'
  import { getConfig, postConfig, getMaintenance, postMaintenance, isConfigured, type BotConfig } from '../api'

  interface MaintenanceState { enabled: boolean; message: string }

  export default function Config() {
    const [cfg,      setCfg]    = useState<BotConfig | null>(null)
    const [form,     setForm]   = useState<Partial<BotConfig>>({})
    const [maint,    setMaint]  = useState<MaintenanceState>({ enabled:false, message:'' })
    const [loading,  setLoad]   = useState(true)
    const [saving,   setSave]   = useState(false)
    const [maintSave,setMS]     = useState(false)
    const [msg,      setMsg]    = useState<{type:'ok'|'err', text:string}|null>(null)
    const [maintMsg, setMMsg]   = useState<{type:'ok'|'err', text:string}|null>(null)

    useEffect(() => {
      if (!isConfigured()) { setLoad(false); return }
      Promise.allSettled([getConfig(), getMaintenance()]).then(([cfgRes, maintRes]) => {
        if (cfgRes.status === 'fulfilled') { setCfg(cfgRes.value); setForm(cfgRes.value) }
        if (maintRes.status === 'fulfilled') setMaint(maintRes.value as MaintenanceState)
        setLoad(false)
      })
    }, [])

    if (!isConfigured()) return (
      <div className="empty-state" style={{ height:320 }}>
        <div className="empty-state-title" style={{ color:'var(--gold)' }}>VITE_API_URL no configurada en Vercel</div>
      </div>
    )

    const save = async () => {
      setSave(true); setMsg(null)
      try {
        await postConfig(form)
        setMsg({ type:'ok', text:'Configuración guardada correctamente' })
        setTimeout(() => setMsg(null), 4000)
      } catch (e: unknown) {
        setMsg({ type:'err', text: e instanceof Error ? e.message : 'Error al guardar' })
      }
      setSave(false)
    }

    const saveMaint = async () => {
      setMS(true); setMMsg(null)
      try {
        await postMaintenance(maint)
        setMMsg({ type:'ok', text: maint.enabled ? 'Mantenimiento activado' : 'Mantenimiento desactivado' })
        setTimeout(() => setMMsg(null), 4000)
      } catch (e: unknown) {
        setMMsg({ type:'err', text: e instanceof Error ? e.message : 'Error al guardar' })
      }
      setMS(false)
    }

    if (loading) return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, gap:10, color:'var(--tx3)' }}>
        <RefreshCw size={16} style={{ animation:'spin 1s linear infinite' }} /><span>Cargando configuración…</span>
      </div>
    )

    const FIELDS = [
      { key:'botName',         label:'Nombre del bot',       ph:'🌸 AnimeBot 🌸', full:true },
      { key:'prefix',          label:'Prefijo de comandos',  ph:'!' },
      { key:'ownerNumber',     label:'Número del owner',     ph:'521234567890' },
      { key:'commandCooldown', label:'Cooldown (segundos)',   ph:'10' },
    ]

    const SectionHeader = ({ icon: Icon, color, title, sub }: { icon: React.ElementType; color: string; title: string; sub?: string }) => (
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
        <div className="icon-badge" style={{ background:color+'18' }}><Icon size={15} color={color} /></div>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>{sub}</div>}
        </div>
      </div>
    )

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:760 }} className="animate-fade-up">
        <div>
          <h1 style={{ fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:'1.6rem' }}>Configuración</h1>
          <p style={{ fontSize:12, color:'var(--tx3)', marginTop:3 }}>Ajusta el comportamiento del bot en tiempo real</p>
        </div>

        {/* ── General config ── */}
        <div className="card" style={{ padding:24 }}>
          <SectionHeader icon={Settings} color="var(--blue)" title="Parámetros generales" sub="Nombre, prefijo y configuración básica del bot" />

          {msg && (
            <div className={`alert ${msg.type==='ok'?'alert-ok':'alert-err'}`} style={{ marginBottom:18 }}>
              {msg.type==='ok' ? <Check size={14} /> : <AlertCircle size={14} />}
              {msg.text}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {FIELDS.map(f => (
              <div key={f.key} style={{ gridColumn: f.full ? 'span 2' : undefined }}>
                <label className="label">{f.label}</label>
                <input className="input" placeholder={f.ph}
                  value={(form[f.key as keyof BotConfig] as string) || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>

          {/* Cooldown slider visual */}
          <div style={{ marginTop:18, padding:'14px 16px', background:'var(--card2)', borderRadius:9, border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:12 }}>
              <span style={{ color:'var(--tx2)', fontWeight:600 }}>Cooldown de comandos</span>
              <span style={{ fontWeight:700, color:'var(--blue)' }}>{form.commandCooldown || 10}s</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width:`${Math.min(100, ((Number(form.commandCooldown)||10)/60)*100)}%`, background:'var(--blue)' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:9, color:'var(--tx3)' }}>
              <span>0s (sin cooldown)</span><span>60s</span>
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? <RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Save size={14} />}
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* ── Maintenance mode ── */}
        <div className="card" style={{ padding:24, borderColor:maint.enabled?'rgba(245,158,11,.3)':undefined }}>
          <SectionHeader icon={Wrench} color="var(--gold)" title="Modo mantenimiento" sub="Activa para pausar el bot y mostrar un mensaje a los usuarios" />

          {maintMsg && (
            <div className={`alert ${maintMsg.type==='ok'?'alert-warn':'alert-err'}`} style={{ marginBottom:18 }}>
              {maintMsg.type==='ok' ? <Check size={14} /> : <AlertCircle size={14} />}
              {maintMsg.text}
            </div>
          )}

          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
            <div
              className={`toggle ${maint.enabled?'on':''}`}
              onClick={() => setMaint(p => ({ ...p, enabled:!p.enabled }))} />
            <div>
              <div style={{ fontWeight:600, fontSize:13 }}>{maint.enabled ? '🔧 Mantenimiento ACTIVO' : 'Mantenimiento desactivado'}</div>
              <div style={{ fontSize:11, color:'var(--tx3)', marginTop:1 }}>
                {maint.enabled ? 'El bot ignorará comandos de usuarios normales' : 'El bot funciona con normalidad'}
              </div>
            </div>
          </div>

          <div>
            <label className="label">MENSAJE DE MANTENIMIENTO</label>
            <textarea className="textarea" placeholder="🔧 El bot está en mantenimiento. Vuelve en unos minutos."
              value={maint.message}
              onChange={e => setMaint(p => ({ ...p, message: e.target.value }))} />
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
            <button className={`btn ${maint.enabled?'btn-gold':'btn-ghost'} btn-sm`} onClick={saveMaint} disabled={maintSave}>
              {maintSave ? <RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Save size={13} />}
              {maintSave ? 'Guardando…' : 'Guardar modo mantenimiento'}
            </button>
          </div>
        </div>

        {/* ── Advanced modules read-only ── */}
        {cfg && (
          <div className="card" style={{ padding:24 }}>
            <SectionHeader icon={Zap} color="var(--purple)" title="Módulos avanzados" sub="Configuración generada — edita directamente en el archivo config.js del bot" />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              {[
                { label:'Sistema de Niveles', icon:Zap,       color:'var(--purple)', data:cfg.level },
                { label:'Economía',           icon:DollarSign, color:'var(--gold)',   data:cfg.economy },
                { label:'Anti-Spam',          icon:Shield,     color:'var(--red)',    data:cfg.antiSpam },
              ].map(mod => (
                <div key={mod.label} style={{ background:'var(--card2)', borderRadius:9, padding:14, border:'1px solid var(--border)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
                    <div className="icon-badge" style={{ background:mod.color+'18', width:28, height:28, borderRadius:7 }}>
                      <mod.icon size={13} color={mod.color} />
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--tx2)' }}>{mod.label}</span>
                  </div>
                  {mod.data && typeof mod.data === 'object' && Object.entries(mod.data as Record<string,unknown>).map(([k,v])=>(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:10, padding:'3px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                      <span style={{ color:'var(--tx3)', fontFamily:"'JetBrains Mono',monospace" }}>{k}</span>
                      <span style={{ color:'var(--tx2)', fontWeight:600 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Danger zone ── */}
        <div className="card" style={{ padding:24, borderColor:'rgba(229,57,53,.15)' }}>
          <SectionHeader icon={Bell} color="var(--red)" title="Zona de peligro" sub="Acciones irreversibles — úsalas con precaución" />
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200, padding:'12px 16px', background:'rgba(229,57,53,.06)',
              border:'1px solid rgba(229,57,53,.15)', borderRadius:9 }}>
              <div style={{ fontWeight:600, fontSize:12, color:'var(--tx)', marginBottom:4 }}>Reiniciar configuración</div>
              <div style={{ fontSize:11, color:'var(--tx3)', marginBottom:10 }}>Restaura todos los valores a los predeterminados</div>
              <button className="btn btn-red btn-xs" onClick={()=>alert('Ve a Conexión para reiniciar la sesión del bot')}>
                <AlertCircle size={11} /> Ver en Conexión
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  