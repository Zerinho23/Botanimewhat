import { useEffect, useState } from 'react'
  import { Settings, Save, RefreshCw, AlertCircle, Check,
           Shield, DollarSign, Wrench, Power, PowerOff } from 'lucide-react'
  import { getConfig, postConfig, getMaintenance, postMaintenance,
           isConfigured, type BotConfig } from '../api'

  interface MaintenanceState { enabled: boolean; message: string }
  type Tab = 'bot' | 'economy' | 'antispam' | 'maintenance'

  const TABS: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'bot',         label: 'BOT',       icon: Wrench,     color: 'var(--blue)'    },
    { id: 'economy',     label: 'ECONOMÍA',  icon: DollarSign, color: 'var(--gold)'    },
    { id: 'antispam',    label: 'ANTI-SPAM', icon: Shield,     color: 'var(--red2)'    },
    { id: 'maintenance', label: 'SISTEMA',   icon: Power,      color: 'var(--purple2)' },
  ]

  function FormRow({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}) {
    return (
      <div style={{marginBottom:18}}>
        <label className="label">{label}</label>
        {children}
        {hint&&<p style={{marginTop:5,fontSize:10,color:'var(--tx3)',fontFamily:"'Rajdhani',sans-serif",letterSpacing:'.04em'}}>{hint}</p>}
      </div>
    )
  }

  export default function Config() {
    const [form,      setForm]   = useState<Partial<BotConfig>>({})
    const [maintForm, setMF]     = useState<MaintenanceState>({enabled:false,message:''})
    const [maint,     setMaint]  = useState<MaintenanceState>({enabled:false,message:''})
    const [loading,   setLoad]   = useState(true)
    const [saving,    setSave]   = useState(false)
    const [savingM,   setSaveM]  = useState(false)
    const [toast,     setToast]  = useState<{msg:string;ok:boolean}|null>(null)
    const [tab,       setTab]    = useState<Tab>('bot')

    const showToast = (msg:string,ok=true) => { setToast({msg,ok}); setTimeout(()=>setToast(null),3000) }

    const load = async () => {
      if (!isConfigured()) { setLoad(false); return }
      try { const c = await getConfig(); setForm(c) } catch {}
      try { const m = await getMaintenance(); setMaint(m); setMF(m) } catch {}
      setLoad(false)
    }
    useEffect(()=>{ load() },[])

    const saveConfig = async () => {
      setSave(true)
      try { await postConfig(form); showToast('CONFIG GUARDADA') }
      catch(e) { showToast(e instanceof Error?e.message:'Error',false) }
      setSave(false)
    }
    const saveMaint = async () => {
      setSaveM(true)
      try { await postMaintenance(maintForm); setMaint(maintForm); showToast('SISTEMA '+(maintForm.enabled?'EN MANTENIMIENTO':'OPERATIVO')) }
      catch(e) { showToast(e instanceof Error?e.message:'Error',false) }
      setSaveM(false)
    }

    if (!isConfigured()) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
        <div className="card animate-scale-in" style={{padding:32,textAlign:'center',maxWidth:360}}>
          <AlertCircle size={28} color="var(--gold)" style={{margin:'0 auto 14px'}}/>
          <p style={{fontSize:12,color:'var(--tx2)',lineHeight:1.7}}>
            Configura <span style={{color:'var(--blue)',fontFamily:"'JetBrains Mono',monospace"}}>VITE_API_URL</span> en
            Vercel → Settings → Environment Variables.
          </p>
        </div>
      </div>
    )

    if (loading) return (
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {[...Array(4)].map((_,i)=><div key={i} className="skeleton" style={{height:52}}/>)}
      </div>
    )

    return (
      <div style={{display:'flex',flexDirection:'column',gap:18}} className="animate-fade-up">
        {toast&&(
          <div style={{position:'fixed',bottom:24,right:24,zIndex:999}} className="animate-fade-up">
            <div className={`alert ${toast.ok?'alert-ok':'alert-err'}`} style={{boxShadow:'0 8px 32px rgba(0,0,0,.5)'}}>
              {toast.ok?<Check size={14}/>:<AlertCircle size={14}/>}{toast.msg}
            </div>
          </div>
        )}

        <div>
          <div className="page-title">
            <span className="page-title-bracket">◈</span>SYSTEM CONFIG<span className="page-title-bracket">◈</span>
          </div>
          <div className="page-subtitle">CONFIGURACIÓN GLOBAL DEL BOT · PANEL DE CONTROL</div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:6,borderBottom:'1px solid var(--border)',paddingBottom:10,flexWrap:'wrap'}}>
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} className={`btn btn-sm ${tab===t.id?'btn-primary':'btn-ghost'}`}
                style={tab!==t.id?{color:t.color,borderColor:t.color+'25'}:undefined}
                onClick={()=>setTab(t.id)}>
                <Icon size={12}/>{t.label}
              </button>
            )
          })}
        </div>

        {/* BOT */}
        {tab==='bot'&&(
          <div className="card" style={{padding:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18,paddingBottom:12,borderBottom:'1px solid var(--border)'}}>
              <div style={{width:28,height:28,borderRadius:'var(--radius)',background:'rgba(30,144,255,.1)',border:'1px solid rgba(30,144,255,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Wrench size={13} color="var(--blue)"/>
              </div>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:11,letterSpacing:'.14em',color:'var(--blue)'}}>CONFIGURACIÓN DEL BOT</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
              <FormRow label="NOMBRE DEL BOT" hint="Aparece en mensajes del sistema">
                <input className="input" value={form.botName??''} onChange={e=>setForm(f=>({...f,botName:e.target.value}))} placeholder="BotAnime"/>
              </FormRow>
              <FormRow label="PREFIJO DE COMANDOS" hint="Carácter que activa los comandos (!  /  .)">
                <input className="input" value={form.prefix??''} onChange={e=>setForm(f=>({...f,prefix:e.target.value}))} placeholder="!" maxLength={3}/>
              </FormRow>
              <FormRow label="NÚMERO OWNER" hint="Tu número sin + ni espacios">
                <input className="input" value={form.ownerNumber??''} onChange={e=>setForm(f=>({...f,ownerNumber:e.target.value}))} placeholder="521234567890"/>
              </FormRow>
              <FormRow label="COOLDOWN COMANDOS (seg)" hint="Pausa mínima entre comandos por usuario">
                <input className="input" type="number" min={0} max={60} value={form.commandCooldown??3} onChange={e=>setForm(f=>({...f,commandCooldown:+e.target.value}))}/>
              </FormRow>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:6}}>
              <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={12}/> RECARGAR</button>
              <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
                {saving?<><RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>GUARDANDO…</>:<><Save size={12}/>GUARDAR</>}
              </button>
            </div>
          </div>
        )}

        {/* ECONOMY */}
        {tab==='economy'&&(
          <div className="card" style={{padding:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18,paddingBottom:12,borderBottom:'1px solid var(--border)'}}>
              <div style={{width:28,height:28,borderRadius:'var(--radius)',background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <DollarSign size={13} color="var(--gold)"/>
              </div>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:11,letterSpacing:'.14em',color:'var(--gold)'}}>SISTEMA DE ECONOMÍA</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
              <FormRow label="COINS DIARIOS" hint="Monedas por !daily">
                <input className="input" type="number" min={0} value={(form.economy as Record<string,number>|undefined)?.dailyCoins??100} onChange={e=>setForm(f=>({...f,economy:{...(f.economy as object||{}),dailyCoins:+e.target.value}}))}/>
              </FormRow>
              <FormRow label="XP POR MENSAJE" hint="XP ganado por cada mensaje">
                <input className="input" type="number" min={0} max={100} value={(form.level as Record<string,number>|undefined)?.xpPerMessage??5} onChange={e=>setForm(f=>({...f,level:{...(f.level as object||{}),xpPerMessage:+e.target.value}}))}/>
              </FormRow>
              <FormRow label="XP BASE POR NIVEL" hint="XP requerida por nivel (nivel × base)">
                <input className="input" type="number" min={50} value={(form.level as Record<string,number>|undefined)?.xpPerLevel??100} onChange={e=>setForm(f=>({...f,level:{...(f.level as object||{}),xpPerLevel:+e.target.value}}))}/>
              </FormRow>
              <FormRow label="COOLDOWN DAILY (horas)" hint="Horas entre usos de !daily">
                <input className="input" type="number" min={1} max={48} value={(form.economy as Record<string,number>|undefined)?.dailyCooldownHours??24} onChange={e=>setForm(f=>({...f,economy:{...(f.economy as object||{}),dailyCooldownHours:+e.target.value}}))}/>
              </FormRow>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:6}}>
              <button className="btn btn-sm" style={{background:'rgba(251,191,36,.1)',borderColor:'rgba(251,191,36,.4)',color:'var(--gold)'}} onClick={saveConfig} disabled={saving}>
                {saving?<><RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>GUARDANDO…</>:<><Save size={12}/>GUARDAR ECONOMÍA</>}
              </button>
            </div>
          </div>
        )}

        {/* ANTI-SPAM */}
        {tab==='antispam'&&(
          <div className="card" style={{padding:24}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18,paddingBottom:12,borderBottom:'1px solid var(--border)'}}>
              <div style={{width:28,height:28,borderRadius:'var(--radius)',background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Shield size={13} color="var(--red2)"/>
              </div>
              <span style={{fontFamily:"'Orbitron',sans-serif",fontWeight:700,fontSize:11,letterSpacing:'.14em',color:'var(--red2)'}}>MÓDULO ANTI-SPAM</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 24px'}}>
              <FormRow label="MÁXIMO MENSAJES (5 seg)" hint="Mensajes permitidos por usuario en 5 segundos antes de activar">
                <input className="input" type="number" min={1} max={20} value={(form.antiSpam as Record<string,number>|undefined)?.maxMessages??5} onChange={e=>setForm(f=>({...f,antiSpam:{...(f.antiSpam as object||{}),maxMessages:+e.target.value}}))}/>
              </FormRow>
              <FormRow label="ADVERTENCIAS ANTES DE KICK" hint="Avisos antes de expulsar automáticamente">
                <input className="input" type="number" min={1} max={10} value={(form.antiSpam as Record<string,number>|undefined)?.warnBeforeBan??3} onChange={e=>setForm(f=>({...f,antiSpam:{...(f.antiSpam as object||{}),warnBeforeBan:+e.target.value}}))}/>
              </FormRow>
              <FormRow label="ACCIÓN AL DETECTAR SPAM">
                <select className="input" value={(form.antiSpam as Record<string,string>|undefined)?.action??'warn'} onChange={e=>setForm(f=>({...f,antiSpam:{...(f.antiSpam as object||{}),action:e.target.value}}))}>
                  <option value="warn">ADVERTIR SOLAMENTE</option>
                  <option value="delete">BORRAR MENSAJE</option>
                  <option value="mute">SILENCIAR USUARIO</option>
                  <option value="kick">EXPULSAR USUARIO</option>
                </select>
              </FormRow>
              <FormRow label="PENALIZACIÓN ANTI-LINK">
                <select className="input" value={(form.antiSpam as Record<string,string>|undefined)?.linkAction??'delete'} onChange={e=>setForm(f=>({...f,antiSpam:{...(f.antiSpam as object||{}),linkAction:e.target.value}}))}>
                  <option value="delete">SOLO BORRAR</option>
                  <option value="warn">ADVERTIR</option>
                  <option value="kick">EXPULSAR</option>
                </select>
              </FormRow>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:6}}>
              <button className="btn btn-sm btn-red" style={{background:'rgba(239,68,68,.12)'}} onClick={saveConfig} disabled={saving}>
                {saving?<><RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>GUARDANDO…</>:<><Save size={12}/>GUARDAR ANTI-SPAM</>}
              </button>
            </div>
          </div>
        )}

        {/* MAINTENANCE */}
        {tab==='maintenance'&&(
          <div className="card" style={{padding:0}}>
            <div className="sys-header">
              <Power size={12} color={maint.enabled?'var(--red2)':'var(--green2)'}/>
              <span className="sys-header-title" style={{color:maint.enabled?'var(--red2)':'var(--green2)'}}>
                MODO MANTENIMIENTO — {maint.enabled?'ACTIVO':'INACTIVO'}
              </span>
            </div>
            <div style={{padding:20}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18,padding:'12px 14px',background:maintForm.enabled?'rgba(239,68,68,.05)':'rgba(16,185,129,.05)',border:'1px solid '+(maintForm.enabled?'rgba(239,68,68,.2)':'rgba(16,185,129,.2)'),borderRadius:'var(--radius)'}}>
                <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:maintForm.enabled?'var(--red2)':'var(--green2)',boxShadow:'0 0 6px '+(maintForm.enabled?'var(--red2)':'var(--green2)'),animation:'livePulse 1.6s ease-in-out infinite'}}/>
                <span style={{fontFamily:"'Rajdhani',sans-serif",fontWeight:700,letterSpacing:'.07em',color:maintForm.enabled?'var(--red2)':'var(--green2)',flex:1}}>
                  {maintForm.enabled?'BOT EN MANTENIMIENTO — ignorando todos los mensajes':'BOT OPERATIVO — respondiendo normalmente'}
                </span>
                <button className={`btn btn-sm ${maintForm.enabled?'btn-green':'btn-red'}`} onClick={()=>setMF(m=>({...m,enabled:!m.enabled}))}>
                  {maintForm.enabled?<><PowerOff size={12}/>DESACTIVAR</>:<><Power size={12}/>ACTIVAR</>}
                </button>
              </div>
              <FormRow label="MENSAJE DURANTE MANTENIMIENTO" hint="Mensaje que reciben los usuarios cuando intentan usar el bot">
                <textarea className="textarea" value={maintForm.message} onChange={e=>setMF(m=>({...m,message:e.target.value}))} placeholder="⚙️ Bot en mantenimiento. Vuelve en unos minutos." style={{minHeight:80}}/>
              </FormRow>
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button className="btn btn-primary" onClick={saveMaint} disabled={savingM}>
                  {savingM?<><RefreshCw size={12} style={{animation:'spin 1s linear infinite'}}/>APLICANDO…</>:<><Save size={12}/>APLICAR CAMBIOS</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
  