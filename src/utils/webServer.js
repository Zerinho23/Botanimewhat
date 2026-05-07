const express = require("express");
const QRCode = require("qrcode");
const logger = require("./logger");
const path = require("path");
const fs = require("fs");

// ─── Config overrides ─────────────────────────────────────────────────────────
const CONFIG_OVERRIDES_FILE = path.join(__dirname, "..", "config", "overrides.json");
function loadOverrides() { try { return fs.existsSync(CONFIG_OVERRIDES_FILE) ? JSON.parse(fs.readFileSync(CONFIG_OVERRIDES_FILE,"utf-8")) : {}; } catch { return {}; } }
function saveOverrides(d) { try { fs.writeFileSync(CONFIG_OVERRIDES_FILE, JSON.stringify(d,null,2)); } catch(e) { logger.error(e.message); } }
function getMergedConfig() {
  const base = require("../config/config"), ov = loadOverrides();
  return { prefix:ov.prefix??base.prefix, botName:ov.botName??base.botName, ownerNumber:ov.ownerNumber??base.ownerNumber, commandCooldown:ov.commandCooldown??base.commandCooldown, level:{...base.level,...(ov.level||{})}, economy:{...base.economy,...(ov.economy||{})}, antiSpam:{...base.antiSpam,...(ov.antiSpam||{})} };
}
function applyOverrides(updates) {
  const m={...loadOverrides()};
  for(const k of["prefix","botName","ownerNumber","commandCooldown"]) if(updates[k]!==undefined) m[k]=updates[k];
  for(const k of["level","economy","antiSpam"]) if(updates[k]!==undefined) m[k]={...(m[k]||{}),...updates[k]};
  saveOverrides(m);
  try{ const l=require("../config/config"); for(const k of["prefix","botName","ownerNumber","commandCooldown"]) if(updates[k]!==undefined) l[k]=updates[k]; for(const k of["level","economy","antiSpam"]) if(updates[k]!==undefined) Object.assign(l[k],updates[k]); }catch{}
}

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  qr:null, pairingCode:null, pairingPhone:null, connected:false,
  lastUpdate:Date.now(), sock:null, resetInProgress:false, startedAt:Date.now(),
  maintenance:false, maintenanceMessage:"⚠️ El bot está en mantenimiento. Vuelve en unos minutos.",
};
let onResetRequest = null;
function setQR(qr){state.qr=qr;state.connected=false;state.lastUpdate=Date.now();}
function setPairingCode(code,phone=null){state.pairingCode=code;if(phone)state.pairingPhone=phone;state.lastUpdate=Date.now();}
function setConnected(v){state.connected=v;if(v){state.qr=null;state.pairingCode=null;state.pairingPhone=null;state.resetInProgress=false;}state.lastUpdate=Date.now();}
function setSocket(sock){state.sock=sock;}
function setResetHandler(h){onResetRequest=h;}
function stateSignature(){return[state.connected?"C":"U",state.qr?"Q":"-",state.pairingCode?"P":"-",state.sock?"R":"-"].join("");}
function isMaintenanceMode(){return state.maintenance;}
function getMaintenanceMessage(){return state.maintenanceMessage;}

// ─── Event system ─────────────────────────────────────────────────────────────
const eventLog = [];
const sseClients = new Set();
function emitEvent(type, data) {
  const ev = { id: Date.now() + Math.random(), type, data, ts: Date.now() };
  eventLog.push(ev);
  if (eventLog.length > 500) eventLog.shift();
  const payload = `data: ${JSON.stringify(ev)}\n\n`;
  for (const res of sseClients) { try { res.write(payload); } catch { sseClients.delete(res); } }
}

// ─── Mod history ──────────────────────────────────────────────────────────────
const modHistory = [];
function logMod(action, groupJid, userJid) {
  modHistory.unshift({ action, groupJid, userJid, ts: Date.now() });
  if (modHistory.length > 300) modHistory.pop();
  emitEvent("mod", { action, group: groupJid.split("@")[0], user: userJid.split("@")[0] });
}

// ─── Rank helper ──────────────────────────────────────────────────────────────
function rankOf(lv) {
  if(lv>=20) return{l:"S",c:"#ffd700",g:"rgba(255,215,0,.45)",b:"rgba(255,215,0,.1)"};
  if(lv>=15) return{l:"A",c:"#b44fff",g:"rgba(180,79,255,.4)",b:"rgba(180,79,255,.1)"};
  if(lv>=10) return{l:"B",c:"#00c8ff",g:"rgba(0,200,255,.4)",b:"rgba(0,200,255,.1)"};
  if(lv>=5)  return{l:"C",c:"#00ff88",g:"rgba(0,255,136,.35)",b:"rgba(0,255,136,.07)"};
  if(lv>=2)  return{l:"D",c:"#aaaaaa",g:"rgba(170,170,170,.2)",b:"rgba(170,170,170,.06)"};
  return{l:"E",c:"#555577",g:"rgba(85,85,119,.15)",b:"rgba(85,85,119,.06)"};
}

// ─── CSS (shared) ─────────────────────────────────────────────────────────────
const CSS = `
:root{--bg:#030008;--bg2:#07000f;--s:rgba(0,180,255,.04);--s2:rgba(0,180,255,.07);--b:rgba(0,180,255,.15);--b2:rgba(0,180,255,.3);--blue:#00c8ff;--blue2:#0090cc;--pu:#9d4eff;--gr:#00ff88;--rd:#ff3355;--gd:#ffd700;--am:#ffaa00;--tx:#c8e8ff;--tx2:rgba(200,232,255,.5);--tx3:rgba(200,232,255,.25)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
html,body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--tx);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,180,255,.012) 3px,rgba(0,180,255,.012) 4px);pointer-events:none;z-index:0}
body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,100,200,.12),transparent);pointer-events:none;z-index:0}
::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:rgba(0,180,255,.25);border-radius:2px}
.wrap{display:flex;min-height:100vh;position:relative;z-index:1}
.sidebar{width:230px;min-width:230px;background:rgba(0,10,30,.96);border-right:1px solid var(--b);display:flex;flex-direction:column;padding:0;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:50;transition:transform .25s cubic-bezier(.4,0,.2,1);backdrop-filter:blur(20px)}
.main{margin-left:230px;flex:1;padding:24px 28px;min-height:100vh;max-width:calc(100vw - 230px)}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:40;backdrop-filter:blur(6px)}
@media(max-width:768px){.sidebar{transform:translateX(-100%)}.sidebar.open{transform:translateX(0)}.main{margin-left:0;padding:16px;max-width:100vw}.overlay.show{display:block}.hbtn{display:flex!important}.f2{grid-template-columns:1fr!important}.s4{grid-template-columns:1fr 1fr!important}.hide-m{display:none!important}}
@media(min-width:769px){.hbtn{display:none!important}.ttl{display:none!important}}
.sb-hd{padding:20px 16px 14px;border-bottom:1px solid var(--b)}
.sb-logo{font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;color:var(--blue);text-shadow:0 0 20px rgba(0,200,255,.6);letter-spacing:.05em}
.sb-sub{font-size:10px;color:var(--tx3);letter-spacing:.15em;text-transform:uppercase;margin-top:3px;font-family:'Share Tech Mono',monospace}
.sb-st{margin:10px 16px 0;padding:6px 12px;border:1px solid;border-radius:2px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:'Rajdhani',sans-serif;display:flex;align-items:center;gap:7px}
.sb-st.on{border-color:rgba(0,255,136,.35);color:var(--gr);background:rgba(0,255,136,.06);text-shadow:0 0 8px rgba(0,255,136,.4)}
.sb-st.off{border-color:rgba(255,51,85,.35);color:var(--rd);background:rgba(255,51,85,.06)}
.sb-st.maint{border-color:rgba(255,170,0,.45);color:var(--am);background:rgba(255,170,0,.08);text-shadow:0 0 8px rgba(255,170,0,.4)}
.sdot{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor;animation:dp 2s infinite}
@keyframes dp{0%,100%{opacity:1}50%{opacity:.3}}
.ns{font-size:9px;font-weight:700;color:var(--tx3);letter-spacing:.18em;text-transform:uppercase;padding:18px 18px 6px;font-family:'Share Tech Mono',monospace}
.ni{display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;border:none;background:none;width:100%;text-align:left;color:var(--tx2);transition:all .15s;border-left:2px solid transparent;text-decoration:none;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:600;letter-spacing:.03em}
.ni:hover{background:rgba(0,180,255,.06);color:var(--tx);border-left-color:rgba(0,180,255,.3)}
.ni.active{background:rgba(0,180,255,.1);color:var(--blue);border-left-color:var(--blue);text-shadow:0 0 10px rgba(0,200,255,.4)}
.ni-i{width:20px;text-align:center;font-size:15px;flex-shrink:0}
.sb-ft{padding:14px 16px;border-top:1px solid var(--b);margin-top:auto;font-size:10px;color:var(--tx3);font-family:'Share Tech Mono',monospace}
.topbar{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.hbtn{align-items:center;justify-content:center;width:36px;height:36px;background:var(--s);border:1px solid var(--b);border-radius:2px;cursor:pointer;flex-direction:column;gap:4px;padding:0;transition:.15s}
.hbtn span{display:block;width:14px;height:1.5px;background:var(--blue);border-radius:1px}
.pt{font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;letter-spacing:.06em;color:#fff;text-shadow:0 0 20px rgba(0,200,255,.3)}
.ps{font-size:11px;color:var(--tx3);letter-spacing:.08em;text-transform:uppercase;font-family:'Share Tech Mono',monospace;margin-top:2px}
.cpill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid;border-radius:2px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:'Rajdhani',sans-serif}
.cpill.on{border-color:rgba(0,255,136,.35);color:var(--gr);background:rgba(0,255,136,.06)}
.cpill.off{border-color:rgba(255,51,85,.3);color:var(--rd);background:rgba(255,51,85,.05)}
.cpill.maint{border-color:rgba(255,170,0,.4);color:var(--am);background:rgba(255,170,0,.07)}
.page{display:none}.page.active{display:block;animation:fi .18s ease}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.phead{margin-bottom:22px}
.ptitle{font-family:'Rajdhani',sans-serif;font-size:1.6rem;font-weight:700;letter-spacing:.05em;color:#fff;text-shadow:0 0 30px rgba(0,200,255,.3)}
.psub{font-size:11px;color:var(--tx3);text-transform:uppercase;letter-spacing:.1em;margin-top:4px;font-family:'Share Tech Mono',monospace}
.card{background:var(--s);border:1px solid var(--b);border-radius:2px;padding:20px;position:relative}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--blue),transparent);opacity:.4}
.stit{font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px;font-family:'Share Tech Mono',monospace;display:flex;align-items:center;gap:8px}
.stit::before{content:'//';color:var(--blue);opacity:.6}
.s4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.sc{background:var(--s);border:1px solid var(--b);border-radius:2px;padding:16px 18px;position:relative;overflow:hidden}
.sc::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--blue),transparent);opacity:.25}
.scv{font-family:'Rajdhani',sans-serif;font-size:2.2rem;font-weight:700;line-height:1;color:var(--blue);text-shadow:0 0 20px rgba(0,200,255,.5)}
.scl{font-size:9px;color:var(--tx3);text-transform:uppercase;letter-spacing:.14em;margin-top:6px;font-family:'Share Tech Mono',monospace}
.tog{position:relative;cursor:pointer;display:inline-flex;align-items:center;gap:10px}
.tog input{opacity:0;width:0;height:0;position:absolute}
.trk{width:42px;height:22px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);border-radius:1px;transition:.2s;position:relative;flex-shrink:0}
.tth{position:absolute;width:16px;height:16px;background:rgba(200,232,255,.4);top:2px;left:2px;transition:.2s;border-radius:1px}
.tog input:checked~.trk{background:rgba(0,200,255,.15);border-color:rgba(0,200,255,.5)}
.tog input:checked~.trk .tth{transform:translateX(20px);background:var(--blue);box-shadow:0 0 8px rgba(0,200,255,.6)}
.fl{font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.12em;display:block;margin-bottom:6px;font-family:'Share Tech Mono',monospace}
.inp{background:rgba(0,10,30,.8);border:1px solid var(--b);border-radius:2px;padding:9px 12px;color:var(--tx);font-size:13px;width:100%;outline:none;transition:all .15s;font-family:'Share Tech Mono',monospace}
.inp:focus{border-color:var(--blue);box-shadow:0 0 0 2px rgba(0,200,255,.08)}
.inp::placeholder{color:var(--tx3)}
.ta{background:rgba(0,10,30,.8);border:1px solid var(--b);border-radius:2px;padding:10px 12px;color:var(--tx);font-size:13px;width:100%;outline:none;transition:all .15s;font-family:'Share Tech Mono',monospace;resize:vertical;min-height:90px}
.ta:focus{border-color:var(--blue);box-shadow:0 0 0 2px rgba(0,200,255,.08)}
.sel{background:rgba(0,10,30,.9);border:1px solid var(--b);border-radius:2px;padding:9px 12px;color:var(--tx);font-size:13px;width:100%;outline:none;cursor:pointer;-webkit-appearance:none;font-family:'Share Tech Mono',monospace}
.sel option{background:#050018}.sel:focus{border-color:var(--blue)}
.f2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 18px;border-radius:2px;font-size:14px;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid;text-decoration:none;letter-spacing:.06em;font-family:'Rajdhani',sans-serif}
.bp{background:rgba(0,200,255,.1);border-color:rgba(0,200,255,.4);color:var(--blue);text-shadow:0 0 8px rgba(0,200,255,.3)}
.bp:hover{background:rgba(0,200,255,.18);border-color:var(--blue);box-shadow:0 0 16px rgba(0,200,255,.2)}
.bg{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);color:var(--tx2)}
.bg:hover{background:rgba(255,255,255,.08);color:var(--tx)}
.bd{background:rgba(255,51,85,.08);border-color:rgba(255,51,85,.3);color:var(--rd)}
.bd:hover{background:rgba(255,51,85,.15)}
.bw{background:rgba(255,170,0,.08);border-color:rgba(255,170,0,.3);color:var(--am)}
.bw:hover{background:rgba(255,170,0,.15)}
.bsm{padding:5px 10px;font-size:12px}
.btn:disabled{opacity:.35;cursor:not-allowed}
.row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid rgba(0,180,255,.06)}
.row:last-child{border-bottom:none}
.rnk{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:2px;border:1px solid;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;flex-shrink:0}
.tbl{width:100%;border-collapse:collapse}
.tbl th{font-size:9px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.14em;padding:8px 10px;text-align:left;border-bottom:1px solid var(--b);font-family:'Share Tech Mono',monospace}
.tbl td{padding:9px 10px;border-bottom:1px solid rgba(0,180,255,.05);font-size:13px;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(0,180,255,.03)}
.tbl tbody tr{cursor:pointer}
@media(max-width:600px){.tbl thead{display:none}.tbl tr{display:block;border:1px solid var(--b);margin-bottom:8px;padding:10px}.tbl td{display:flex;justify-content:space-between;align-items:center;border:none;padding:5px 4px}.tbl td::before{content:attr(data-l);font-size:9px;color:var(--tx3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em}}
.ar{display:flex;gap:5px;flex-wrap:wrap}
.gcard{background:var(--s);border:1px solid var(--b);border-radius:2px;padding:16px;margin-bottom:8px;position:relative}
.gcard::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--blue);opacity:.5}
.toast{position:fixed;bottom:20px;right:20px;left:20px;max-width:340px;margin-left:auto;background:rgba(2,0,15,.97);border:1px solid rgba(0,200,255,.3);color:var(--tx);padding:12px 16px;border-radius:2px;font-size:13px;font-weight:600;backdrop-filter:blur(20px);transform:translateY(100px);opacity:0;transition:all .25s;z-index:9999;box-shadow:0 0 30px rgba(0,0,0,.7),0 0 20px rgba(0,200,255,.1);letter-spacing:.03em;font-family:'Rajdhani',sans-serif}
.toast.show{transform:translateY(0);opacity:1}
.spin{display:inline-block;width:14px;height:14px;border:1.5px solid rgba(0,200,255,.2);border-top-color:var(--blue);border-radius:50%;animation:rsp .6s linear infinite}
@keyframes rsp{to{transform:rotate(360deg)}}
.empty{text-align:center;padding:48px 20px;color:var(--tx3);font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.empty-i{font-size:32px;margin-bottom:12px;opacity:.4}
.xpb{height:3px;background:rgba(0,180,255,.1);overflow:hidden;margin-top:4px}
.xpf{height:100%;background:linear-gradient(90deg,var(--blue2),var(--blue));box-shadow:0 0 6px rgba(0,200,255,.4);transition:width .3s}
.mb14{margin-bottom:14px}.mb18{margin-bottom:18px}.g12{display:flex;flex-direction:column;gap:12px}.g16{display:flex;flex-direction:column;gap:16px}
/* Modal */
.modal-wrap{display:none;position:fixed;inset:0;z-index:200;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);padding:16px}
.modal-wrap.open{display:flex}
.modal{background:#050015;border:1px solid var(--b2);border-radius:2px;padding:24px;max-width:500px;width:100%;max-height:90vh;overflow-y:auto;position:relative}
.modal::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--blue),transparent)}
.modal-close{position:absolute;top:14px;right:16px;background:none;border:none;color:var(--tx3);font-size:20px;cursor:pointer;line-height:1;transition:color .15s}
.modal-close:hover{color:var(--tx)}
/* Log */
.log-entry{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,180,255,.05);font-family:'Share Tech Mono',monospace;font-size:11px}
.log-entry:last-child{border-bottom:none}
.log-type{padding:1px 6px;border-radius:1px;font-weight:700;font-size:10px;white-space:nowrap;flex-shrink:0}
.lt-msg{background:rgba(0,200,255,.1);color:var(--blue);border:1px solid rgba(0,200,255,.25)}
.lt-cmd{background:rgba(157,78,255,.12);color:var(--pu);border:1px solid rgba(157,78,255,.3)}
.lt-mod{background:rgba(255,170,0,.1);color:var(--am);border:1px solid rgba(255,170,0,.25)}
.lt-conn{background:rgba(0,255,136,.1);color:var(--gr);border:1px solid rgba(0,255,136,.25)}
.lt-err{background:rgba(255,51,85,.08);color:var(--rd);border:1px solid rgba(255,51,85,.25)}
.log-ts{color:var(--tx3);font-size:10px;white-space:nowrap;flex-shrink:0}
/* Tab nav */
.tabs{display:flex;gap:0;border-bottom:1px solid var(--b);margin-bottom:18px}
.tab{padding:9px 16px;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:600;letter-spacing:.05em;color:var(--tx3);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .15s}
.tab:hover{color:var(--tx2)}
.tab.active{color:var(--blue);border-bottom-color:var(--blue);text-shadow:0 0 8px rgba(0,200,255,.3)}
.tp{display:none}.tp.active{display:block}
/* Search */
.search-wrap{position:relative;margin-bottom:14px}
.search-wrap input{padding-left:32px}
.search-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--tx3);font-size:13px;pointer-events:none}
/* Maint banner */
.maint-banner{background:rgba(255,170,0,.07);border:1px solid rgba(255,170,0,.35);border-radius:2px;padding:12px 16px;margin-bottom:18px;display:none;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:600;color:var(--am);letter-spacing:.04em}
.maint-banner.show{display:flex;align-items:center;gap:10px}
`;

// ─── Dashboard HTML ───────────────────────────────────────────────────────────
function renderDashboard() {
  const uptime = Math.floor((Date.now()-state.startedAt)/1000);
  const hh=Math.floor(uptime/3600), mm=Math.floor((uptime%3600)/60);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>SYSTEM — AnimeBot</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>${CSS}</style>
</head>
<body>
<div class="toast" id="toast"></div>
<div class="overlay" id="overlay" onclick="closeSb()"></div>

<!-- ── MODAL ── -->
<div class="modal-wrap" id="modal" onclick="if(event.target===this)closeModal()">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">✕</button>
    <div id="modal-body"></div>
  </div>
</div>

<div class="wrap">
<aside class="sidebar" id="sb">
  <div class="sb-hd">
    <div class="sb-logo">⚔ ANIMEBOT</div>
    <div class="sb-sub">// SYSTEM PANEL v3.0</div>
  </div>
  <div id="sbconn" class="sb-st ${state.connected?"on":"off"}">
    <span class="sdot"></span>${state.connected?"ONLINE":"OFFLINE"}
  </div>
  <div class="ns">// GENERAL</div>
  <button class="ni active" onclick="nav('overview',this)"><span class="ni-i">◈</span> RESUMEN</button>
  <button class="ni" onclick="nav('config',this)"><span class="ni-i">⚙</span> CONFIGURACIÓN</button>
  <div class="ns">// COMUNIDAD</div>
  <button class="ni" onclick="nav('groups',this)"><span class="ni-i">◆</span> GRUPOS</button>
  <button class="ni" onclick="nav('users',this)"><span class="ni-i">◉</span> HUNTERS</button>
  <button class="ni" onclick="nav('mod',this)"><span class="ni-i">⚡</span> MODERACIÓN</button>
  <div class="ns">// OPERACIONES</div>
  <button class="ni" onclick="nav('broadcast',this)"><span class="ni-i">📡</span> BROADCAST</button>
  <button class="ni" onclick="nav('log',this)"><span class="ni-i">⬡</span> LOG EN VIVO</button>
  <button class="ni" onclick="nav('stats',this)"><span class="ni-i">◬</span> ESTADÍSTICAS</button>
  <div class="ns">// SISTEMA</div>
  <button class="ni" onclick="nav('connection',this)"><span class="ni-i">⬡</span> GATE STATUS</button>
  <div style="flex:1"></div>
  <div class="sb-ft">UPTIME: ${hh}H ${mm}M &nbsp;|&nbsp; SYS OK</div>
</aside>

<main class="main">
<div class="topbar">
  <button class="hbtn btn" onclick="openSb()" style="border:1px solid var(--b)"><span></span><span></span><span></span></button>
  <div><div class="pt ttl" id="ttl">RESUMEN</div></div>
  <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
    <div id="maintpill" class="cpill maint" style="display:none"><span class="sdot"></span>MANT.</div>
    <div id="tconn" class="cpill ${state.connected?"on":"off"}"><span class="sdot"></span>${state.connected?"ONLINE":"OFFLINE"}</div>
  </div>
</div>

<!-- banner de mantenimiento -->
<div class="maint-banner" id="maint-banner">⚠ MODO MANTENIMIENTO ACTIVO — El bot no procesa mensajes</div>

<!-- ═══ OVERVIEW ═══ -->
<div class="page active" id="page-overview">
  <div class="phead"><div class="ptitle">RESUMEN DEL SISTEMA</div><div class="psub">// status overview</div></div>
  <div class="s4">
    <div class="sc"><div class="scv" id="su">—</div><div class="scl">HUNTERS</div></div>
    <div class="sc"><div class="scv" id="sg" style="color:var(--pu);text-shadow:0 0 20px rgba(157,78,255,.5)">—</div><div class="scl">GRUPOS</div></div>
    <div class="sc"><div class="scv" id="ss" style="color:${state.connected?"var(--gr)":"var(--rd)"}">${state.connected?"⬡ ON":"⬡ OFF"}</div><div class="scl">WHATSAPP</div></div>
    <div class="sc"><div class="scv" style="color:var(--am);font-size:1.4rem">${hh}H ${mm}M</div><div class="scl">UPTIME</div></div>
  </div>
  <div class="f2 mb18" style="display:grid;gap:14px">
    <div class="card">
      <div class="stit">CONTROL RÁPIDO</div>
      <div class="g16">
        <label class="tog"><input type="checkbox" id="q-as" onchange="quickSet('antiSpam',{enabled:this.checked})"><div class="trk"><div class="tth"></div></div><div><div style="font-size:13px;color:var(--tx);font-weight:500">Anti-Spam Global</div><div style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;margin-top:1px">límite de mensajes/seg</div></div></label>
        <label class="tog"><input type="checkbox" id="q-ec" onchange="quickSet('economy',{enabled:this.checked})"><div class="trk"><div class="tth"></div></div><div><div style="font-size:13px;color:var(--tx);font-weight:500">Sistema Economía</div><div style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;margin-top:1px">monedas y waifus</div></div></label>
        <label class="tog"><input type="checkbox" id="q-lk" onchange="quickSet('antiSpam',{deleteLinks:this.checked})"><div class="trk"><div class="tth"></div></div><div><div style="font-size:13px;color:var(--tx);font-weight:500">Borrar Links</div><div style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;margin-top:1px">eliminar URLs en grupos</div></div></label>
        <div style="border-top:1px solid rgba(0,180,255,.08);padding-top:14px">
          <div style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;margin-bottom:10px;text-transform:uppercase;letter-spacing:.1em">// MODO MANTENIMIENTO</div>
          <label class="tog"><input type="checkbox" id="q-maint" onchange="toggleMaintenance(this.checked)"><div class="trk"><div class="tth"></div></div><div><div style="font-size:13px;color:var(--am);font-weight:500">Activar Mantenimiento</div><div style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;margin-top:1px">bot ignora todos los mensajes</div></div></label>
          <div style="margin-top:10px">
            <label class="fl">MENSAJE DE MANTENIMIENTO</label>
            <textarea class="ta" id="maint-msg" rows="2" placeholder="⚠️ El bot está en mantenimiento..."></textarea>
            <button class="btn bp bsm" style="margin-top:8px" onclick="saveMaintMsg()">► ACTUALIZAR MENSAJE</button>
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="stit">CONFIG ACTIVA</div>
      <div class="g12">
        <div class="row"><span style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">NOMBRE</span><span id="inf-n" style="font-weight:700;font-family:'Rajdhani',sans-serif;font-size:15px">—</span></div>
        <div class="row"><span style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">PREFIJO</span><span id="inf-p" style="color:var(--blue);font-family:'Share Tech Mono',monospace;font-size:15px;text-shadow:0 0 8px rgba(0,200,255,.4)">—</span></div>
        <div class="row"><span style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">COOLDOWN</span><span id="inf-c" style="font-weight:700;font-family:'Share Tech Mono',monospace">—</span></div>
        <div class="row"><span style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">SPAM MÁX/S</span><span id="inf-s" style="font-weight:700;font-family:'Share Tech Mono',monospace">—</span></div>
      </div>
    </div>
  </div>
</div>

<!-- ═══ CONFIG ═══ -->
<div class="page" id="page-config">
  <div class="phead"><div class="ptitle">CONFIGURACIÓN</div><div class="psub">// cambios aplicados en tiempo real</div></div>
  <div class="card mb14">
    <div class="stit">GENERAL</div>
    <div class="f2 mb14">
      <div><label class="fl">NOMBRE</label><input class="inp" id="c-name" placeholder="AnimeBot"></div>
      <div><label class="fl">PREFIJO</label><input class="inp" id="c-pre" placeholder="!" style="max-width:90px"></div>
      <div><label class="fl">NÚMERO DUEÑO</label><input class="inp" id="c-own" placeholder="5215512345678" type="tel"></div>
      <div><label class="fl">COOLDOWN (SEG)</label><input class="inp" id="c-cool" type="number" min="0" placeholder="10"></div>
    </div>
    <button class="btn bp" onclick="saveSec('general')">► GUARDAR</button>
  </div>
  <div class="card mb14">
    <div class="stit">ANTI-SPAM</div>
    <div class="g16 mb14">
      <label class="tog"><input type="checkbox" id="c-as-en"><div class="trk"><div class="tth"></div></div><div style="font-size:13px;color:var(--tx);font-weight:500">Activar Anti-Spam</div></label>
      <label class="tog"><input type="checkbox" id="c-as-dl"><div class="trk"><div class="tth"></div></div><div style="font-size:13px;color:var(--tx);font-weight:500">Eliminar Links Automáticamente</div></label>
      <div style="max-width:180px"><label class="fl">MÁX. MSG/SEG</label><input class="inp" id="c-as-max" type="number" min="1" placeholder="5"></div>
    </div>
    <button class="btn bp" onclick="saveSec('antispam')">► GUARDAR</button>
  </div>
  <div class="card mb14">
    <div class="stit">ECONOMÍA</div>
    <label class="tog" style="margin-bottom:14px;display:inline-flex"><input type="checkbox" id="c-ec-en"><div class="trk"><div class="tth"></div></div><div style="font-size:13px;color:var(--tx);font-weight:500">Sistema de Economía Activo</div></label>
    <div class="f2 mb14">
      <div><label class="fl">MONEDAS/MSG</label><input class="inp" id="c-ec-msg" type="number" min="0" placeholder="2"></div>
      <div><label class="fl">MONEDAS/CMD</label><input class="inp" id="c-ec-cmd" type="number" min="0" placeholder="5"></div>
      <div><label class="fl">RECOMPENSA DIARIA</label><input class="inp" id="c-ec-day" type="number" min="0" placeholder="100"></div>
      <div><label class="fl">COSTO WAIFU</label><input class="inp" id="c-ec-wai" type="number" min="0" placeholder="50"></div>
    </div>
    <button class="btn bp" onclick="saveSec('economy')">► GUARDAR</button>
  </div>
  <div class="card">
    <div class="stit">XP Y NIVELES</div>
    <div class="f2 mb14">
      <div><label class="fl">XP/MSG</label><input class="inp" id="c-lv-msg" type="number" min="0" placeholder="5"></div>
      <div><label class="fl">XP/CMD</label><input class="inp" id="c-lv-cmd" type="number" min="0" placeholder="15"></div>
      <div><label class="fl">MULTIPLICADOR</label><input class="inp" id="c-lv-mul" type="number" min="1" placeholder="250"></div>
      <div><label class="fl">COOLDOWN XP (SEG)</label><input class="inp" id="c-lv-cool" type="number" min="0" placeholder="30"></div>
    </div>
    <button class="btn bp" onclick="saveSec('level')">► GUARDAR</button>
  </div>
</div>

<!-- ═══ GROUPS ═══ -->
<div class="page" id="page-groups">
  <div class="phead" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
    <div><div class="ptitle">GRUPOS</div><div class="psub">// config por dungeon</div></div>
    <button class="btn bg bsm" style="margin-left:auto" onclick="loadGroups()">↻ SYNC</button>
  </div>
  <div id="groups-list"><div class="empty"><div class="empty-i">◆</div>CARGANDO...</div></div>
</div>

<!-- ═══ HUNTERS ═══ -->
<div class="page" id="page-users">
  <div class="phead" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
    <div><div class="ptitle">REGISTRO DE HUNTERS</div><div class="psub">// clasificados por EXP</div></div>
    <button class="btn bg bsm" style="margin-left:auto" onclick="loadUsers()">↻ SYNC</button>
  </div>
  <div class="tabs">
    <button class="tab active" onclick="switchTab('hunters',this)">◉ HUNTERS</button>
    <button class="tab" onclick="switchTab('waifus',this)">♡ WAIFUS</button>
  </div>
  <div id="tp-hunters" class="tp active">
    <div class="search-wrap"><span class="search-icon">⌕</span><input class="inp" id="hunter-search" placeholder="Buscar por nombre o número..." oninput="filterHunters()" style="padding-left:32px"></div>
    <div id="hunters-list"><div class="empty"><div class="empty-i">◉</div>CARGANDO...</div></div>
  </div>
  <div id="tp-waifus" class="tp">
    <div id="waifus-list"><div class="empty"><div class="empty-i">♡</div>CARGANDO...</div></div>
  </div>
</div>

<!-- ═══ MOD ═══ -->
<div class="page" id="page-mod">
  <div class="phead"><div class="ptitle">MODERACIÓN</div><div class="psub">// gestión por dungeon</div></div>
  <div class="tabs">
    <button class="tab active" onclick="switchModTab('actions',this)">⚡ ACCIONES</button>
    <button class="tab" onclick="switchModTab('history',this)">📋 HISTORIAL</button>
  </div>
  <div id="mtp-actions" class="tp active">
    <div class="card mb14">
      <div class="stit">SELECCIONAR DUNGEON</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="sel" id="mod-sel" onchange="loadModMembers()" style="flex:1;min-width:0">
          <option value="">— SELECCIONA UN GRUPO —</option>
        </select>
        <button class="btn bg bsm" onclick="loadModGroups()">↻</button>
      </div>
    </div>
    <div id="mod-content"><div class="empty"><div class="empty-i">⚡</div>SELECCIONA UN GRUPO</div></div>
  </div>
  <div id="mtp-history" class="tp">
    <div class="card"><div id="mod-history-list"><div class="empty"><div class="empty-i">📋</div>SIN ACCIONES AÚN</div></div></div>
  </div>
</div>

<!-- ═══ BROADCAST ═══ -->
<div class="page" id="page-broadcast">
  <div class="phead"><div class="ptitle">BROADCAST</div><div class="psub">// envío masivo a grupos</div></div>
  <div class="card mb14">
    <div class="stit">MENSAJE</div>
    <div class="mb14"><label class="fl">TEXTO A ENVIAR</label><textarea class="ta" id="bc-msg" rows="4" placeholder="Escribe el mensaje para todos los grupos..."></textarea></div>
    <div class="mb14">
      <label class="fl">GRUPOS DESTINO</label>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
        <label class="tog"><input type="checkbox" id="bc-all" onchange="toggleBcAll(this.checked)" checked><div class="trk"><div class="tth"></div></div><div style="font-size:13px;color:var(--tx);font-weight:500">Todos los grupos</div></label>
        <span id="bc-count" style="font-size:11px;color:var(--tx3);font-family:'Share Tech Mono',monospace">cargando...</span>
      </div>
      <select class="sel" id="bc-group" style="display:none" multiple>
        <option value="">Cargando...</option>
      </select>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <button class="btn bp" onclick="sendBroadcast()" id="bc-btn">📡 ENVIAR BROADCAST</button>
      <div id="bc-result" style="font-family:'Share Tech Mono',monospace;font-size:12px;color:var(--tx3)"></div>
    </div>
  </div>
  <div class="card">
    <div class="stit">HISTORIAL DE BROADCAST</div>
    <div id="bc-history"><div class="empty" style="padding:20px"><div class="empty-i">📡</div>SIN BROADCASTS ENVIADOS</div></div>
  </div>
</div>

<!-- ═══ LOG EN VIVO ═══ -->
<div class="page" id="page-log">
  <div class="phead" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
    <div><div class="ptitle">LOG EN VIVO</div><div class="psub">// eventos en tiempo real via SSE</div></div>
    <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
      <div id="sse-dot" style="width:8px;height:8px;border-radius:50%;background:var(--tx3)"></div>
      <span style="font-size:10px;font-family:'Share Tech Mono',monospace;color:var(--tx3)" id="sse-status">DESCONECTADO</span>
      <button class="btn bg bsm" onclick="clearLog()">CLR</button>
    </div>
  </div>
  <div class="card" style="max-height:60vh;overflow-y:auto" id="log-scroll">
    <div id="log-entries"><div class="empty"><div class="empty-i">⬡</div>ESPERANDO EVENTOS...</div></div>
  </div>
</div>

<!-- ═══ ESTADÍSTICAS ═══ -->
<div class="page" id="page-stats">
  <div class="phead"><div class="ptitle">ESTADÍSTICAS</div><div class="psub">// actividad de las últimas 12 horas</div></div>
  <div class="card mb14">
    <div class="stit">ACTIVIDAD POR HORA</div>
    <canvas id="actChart" height="120"></canvas>
  </div>
  <div class="f2" style="gap:14px">
    <div class="card">
      <div class="stit">TOP COMANDOS</div>
      <div id="top-cmds"><div class="empty" style="padding:20px"><span class="spin"></span></div></div>
    </div>
    <div class="card">
      <div class="stit">TOP GRUPOS ACTIVOS</div>
      <div id="top-groups"><div class="empty" style="padding:20px"><span class="spin"></span></div></div>
    </div>
  </div>
</div>

<!-- ═══ CONNECTION ═══ -->
<div class="page" id="page-connection">
  <div class="phead"><div class="ptitle">GATE STATUS</div><div class="psub">// estado de conexión whatsapp</div></div>
  <div class="card" style="max-width:460px"><div id="conn-content"><div class="empty"><span class="spin"></span></div></div></div>
</div>

</main>
</div>

<script>
// ── Globals ──────────────────────────────────────────────────────────────────
let _allUsers = [], _evtSource = null, _logEntries = [], _bcHistory = [], _chart = null;

// ── Sidebar ──────────────────────────────────────────────────────────────────
function openSb(){document.getElementById('sb').classList.add('open');document.getElementById('overlay').classList.add('show')}
function closeSb(){document.getElementById('sb').classList.remove('open');document.getElementById('overlay').classList.remove('show')}

// ── Navigation ────────────────────────────────────────────────────────────────
const TITLES={overview:'RESUMEN',config:'CONFIGURACIÓN',groups:'GRUPOS',users:'HUNTERS',mod:'MODERACIÓN',broadcast:'BROADCAST',log:'LOG EN VIVO',stats:'ESTADÍSTICAS',connection:'GATE STATUS'};
function nav(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el) el.classList.add('active');
  const t=document.getElementById('ttl');if(t)t.textContent=TITLES[name]||name;
  closeSb();
  if(name==='overview'||name==='config') loadConfig();
  if(name==='groups') loadGroups();
  if(name==='users') loadUsers();
  if(name==='mod'){loadModGroups();loadModHistory();}
  if(name==='broadcast') loadBcGroups();
  if(name==='log') initSSE();
  if(name==='stats') loadStats();
  if(name==='connection') loadConnection();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _tt;
function toast(msg,ok=true){
  const el=document.getElementById('toast');
  el.textContent=(ok?'[ OK ] ':' [ERR] ')+msg;
  el.style.borderColor=ok?'rgba(0,200,255,.4)':'rgba(255,51,85,.4)';
  el.style.color=ok?'var(--blue)':'var(--rd)';
  el.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),3200);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(html){document.getElementById('modal-body').innerHTML=html;document.getElementById('modal').classList.add('open');}
function closeModal(){document.getElementById('modal').classList.remove('open');}

// ── Tab helpers ───────────────────────────────────────────────────────────────
function switchTab(name,el){
  document.querySelectorAll('#page-users .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#page-users .tp').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('tp-'+name).classList.add('active');
  if(name==='waifus') loadWaifus();
}
function switchModTab(name,el){
  document.querySelectorAll('#page-mod .tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#page-mod .tp').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('mtp-'+name).classList.add('active');
  if(name==='history') loadModHistory();
}

// ── API ───────────────────────────────────────────────────────────────────────
async function api(url,opts){
  const r=await fetch(url,opts);
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||'Error '+r.status);
  return j;
}

// ── Config ────────────────────────────────────────────────────────────────────
async function loadConfig(){
  try{
    const c=await api('/api/config');
    const S=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};
    const SC=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=!!v};
    const SV=(id,v)=>{const e=document.getElementById(id);if(e&&v!==undefined)e.value=v};
    S('inf-n',c.botName);S('inf-p',c.prefix);S('inf-c',(c.commandCooldown??0)+'S');S('inf-s',c.antiSpam?.maxMessagesPerSecond);
    SC('q-as',c.antiSpam?.enabled);SC('q-ec',c.economy?.enabled);SC('q-lk',c.antiSpam?.deleteLinks);
    SV('c-name',c.botName);SV('c-pre',c.prefix);SV('c-own',c.ownerNumber);SV('c-cool',c.commandCooldown);
    SC('c-as-en',c.antiSpam?.enabled);SC('c-as-dl',c.antiSpam?.deleteLinks);SV('c-as-max',c.antiSpam?.maxMessagesPerSecond);
    SC('c-ec-en',c.economy?.enabled);SV('c-ec-msg',c.economy?.coinsPerMessage);SV('c-ec-cmd',c.economy?.coinsPerCommand);SV('c-ec-day',c.economy?.dailyReward);SV('c-ec-wai',c.economy?.waifuCost);
    SV('c-lv-msg',c.level?.xpPerMessage);SV('c-lv-cmd',c.level?.xpPerCommand);SV('c-lv-mul',c.level?.levelMultiplier);SV('c-lv-cool',c.level?.xpCooldownSeconds);
  }catch(e){console.error(e);}
}
async function saveSec(sec){
  const GV=id=>{const e=document.getElementById(id);return e?e.value:null};
  const GN=id=>{const v=GV(id);return v!==null&&v!==''?Number(v):undefined};
  const GC=id=>{const e=document.getElementById(id);return e?e.checked:undefined};
  let body={};
  if(sec==='general'){const n=GV('c-name'),p=GV('c-pre'),o=GV('c-own'),c=GN('c-cool');if(n)body.botName=n;if(p)body.prefix=p;if(o)body.ownerNumber=o;if(c!==undefined)body.commandCooldown=c;}
  else if(sec==='antispam') body.antiSpam={enabled:GC('c-as-en'),deleteLinks:GC('c-as-dl'),maxMessagesPerSecond:GN('c-as-max')};
  else if(sec==='economy') body.economy={enabled:GC('c-ec-en'),coinsPerMessage:GN('c-ec-msg'),coinsPerCommand:GN('c-ec-cmd'),dailyReward:GN('c-ec-day'),waifuCost:GN('c-ec-wai')};
  else if(sec==='level') body.level={xpPerMessage:GN('c-lv-msg'),xpPerCommand:GN('c-lv-cmd'),levelMultiplier:GN('c-lv-mul'),xpCooldownSeconds:GN('c-lv-cool')};
  try{await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});toast('CONFIGURACIÓN GUARDADA');loadConfig();}catch(e){toast(e.message,false);}
}
async function quickSet(sec,data){
  try{await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[sec]:data})});toast(Object.keys(data)[0].toUpperCase()+' ACTUALIZADO');}catch(e){toast(e.message,false);}
}

// ── Maintenance ───────────────────────────────────────────────────────────────
async function toggleMaintenance(v){
  try{
    await api('/api/maintenance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:v})});
    document.getElementById('maint-banner').classList.toggle('show',v);
    const pp=document.getElementById('maintpill');if(pp) pp.style.display=v?'flex':'none';
    const sbconn=document.getElementById('sbconn');
    if(v){sbconn.className='sb-st maint';sbconn.innerHTML='<span class="sdot"></span>MANTENIMIENTO';}
    else{sbconn.className='sb-st '+(state_connected?'on':'off');sbconn.innerHTML='<span class="sdot"></span>'+(state_connected?'ONLINE':'OFFLINE');}
    toast(v?'MANTENIMIENTO ACTIVADO':'MANTENIMIENTO DESACTIVADO');
  }catch(e){toast(e.message,false);}
}
let state_connected = ${state.connected};
async function loadMaintState(){
  try{
    const m=await api('/api/maintenance');
    const el=document.getElementById('q-maint');if(el)el.checked=m.enabled;
    const mt=document.getElementById('maint-msg');if(mt)mt.value=m.message||'';
    document.getElementById('maint-banner').classList.toggle('show',m.enabled);
    const pp=document.getElementById('maintpill');if(pp)pp.style.display=m.enabled?'flex':'none';
  }catch{}
}
async function saveMaintMsg(){
  const msg=document.getElementById('maint-msg')?.value||'';
  try{await api('/api/maintenance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg})});toast('MENSAJE ACTUALIZADO');}catch(e){toast(e.message,false);}
}

// ── Stats overview ────────────────────────────────────────────────────────────
async function loadStatsBadges(){
  try{
    const s=await api('/api/stats');
    const SE=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};
    SE('su',s.users);SE('sg',s.groups);
    const el=document.getElementById('ss');if(el){el.textContent=s.connected?'⬡ ON':'⬡ OFF';el.style.color=s.connected?'var(--gr)':'var(--rd)';}
    state_connected=s.connected;
    const tc=document.getElementById('tconn');
    if(tc){tc.className='cpill '+(s.connected?'on':'off');tc.innerHTML='<span class="sdot"></span>'+(s.connected?'ONLINE':'OFFLINE');}
  }catch{}
}

// ── Groups ────────────────────────────────────────────────────────────────────
async function loadGroups(){
  const el=document.getElementById('groups-list');el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try{
    const groups=await api('/api/groups');
    if(!groups.length){el.innerHTML='<div class="empty"><div class="empty-i">◆</div>SIN GRUPOS REGISTRADOS<div style="font-size:11px;margin-top:6px;color:var(--tx3)">Los grupos aparecen cuando el bot recibe un mensaje.</div></div>';return;}
    el.innerHTML=groups.map(g=>{
      const name=g.name||g.jid.split('@')[0];const num=g.jid.split('@')[0];
      const botOn=g.botEnabled!==false;
      const members=g.memberCount?\` · \${g.memberCount} miembros\`:'';
      return \`<div class="gcard" style="border-left:3px solid \${botOn?'var(--gr)':'var(--rd)'};transition:border-color .3s" id="gc-\${num}">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;flex-wrap:wrap">
          <div style="flex:1;min-width:0">
            <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:16px;letter-spacing:.03em;color:#fff">\${name}</div>
            <div style="font-size:11px;color:var(--tx3);font-family:Share Tech Mono,monospace;margin-top:2px">+\${num}\${members}</div>
          </div>
          <span id="gc-pill-\${num}" style="font-size:9px;font-family:Share Tech Mono,monospace;padding:3px 8px;border-radius:4px;background:\${botOn?'rgba(0,255,136,.15)':'rgba(255,60,60,.15)'};color:\${botOn?'var(--gr)':'var(--rd)'};">\${botOn?'⬡ BOT ON':'⬡ BOT OFF'}</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:18px">
          <label class="tog"><input type="checkbox" \${botOn?'checked':''} onchange="updateGroup('\${g.jid}','botEnabled',this.checked,'\${num}')"><div class="trk"><div class="tth"></div></div><div style="font-size:12px;font-weight:700;color:\${botOn?'var(--gr)':'var(--rd)'}">BOT ACTIVO</div></label>
          <label class="tog"><input type="checkbox" \${g.antiLink?'checked':''} onchange="updateGroup('\${g.jid}','antiLink',this.checked)"><div class="trk"><div class="tth"></div></div><div style="font-size:12px;color:var(--tx);font-weight:500">ANTI-LINK</div></label>
          <label class="tog"><input type="checkbox" \${g.antiSpam!==false?'checked':''} onchange="updateGroup('\${g.jid}','antiSpam',this.checked)"><div class="trk"><div class="tth"></div></div><div style="font-size:12px;color:var(--tx);font-weight:500">ANTI-SPAM</div></label>
          <label class="tog"><input type="checkbox" \${g.welcome!==false?'checked':''} onchange="updateGroup('\${g.jid}','welcome',this.checked)"><div class="trk"><div class="tth"></div></div><div style="font-size:12px;color:var(--tx);font-weight:500">BIENVENIDA</div></label>
        </div>
      </div>\`;
    }).join('');
  }catch(e){el.innerHTML=\`<div class="empty"><div class="empty-i">⚠</div>\${e.message}</div>\`;}
}
async function updateGroup(jid,key,val,numId){
  try{
    await api('/api/groups/'+encodeURIComponent(jid),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:val})});
    const label=key==='botEnabled'?(val?'BOT ACTIVADO':'BOT DESACTIVADO'):key+(val?' ACTIVADO':' DESACTIVADO');
    toast(label,val!==false);
    if(key==='botEnabled'&&numId){
      const card=document.getElementById('gc-'+numId);
      const pill=document.getElementById('gc-pill-'+numId);
      if(card)card.style.borderLeftColor=val?'var(--gr)':'var(--rd)';
      if(pill){pill.style.background=val?'rgba(0,255,136,.15)':'rgba(255,60,60,.15)';pill.style.color=val?'var(--gr)':'var(--rd)';pill.textContent=val?'⬡ BOT ON':'⬡ BOT OFF';}
    }
  }catch(e){toast(e.message,false);}
}

// ── Hunters ───────────────────────────────────────────────────────────────────
function rankOf(lv){
  if(lv>=20)return{l:'S',c:'#ffd700',g:'rgba(255,215,0,.45)',b:'rgba(255,215,0,.1)'};
  if(lv>=15)return{l:'A',c:'#b44fff',g:'rgba(180,79,255,.4)',b:'rgba(180,79,255,.1)'};
  if(lv>=10)return{l:'B',c:'#00c8ff',g:'rgba(0,200,255,.4)',b:'rgba(0,200,255,.1)'};
  if(lv>=5) return{l:'C',c:'#00ff88',g:'rgba(0,255,136,.35)',b:'rgba(0,255,136,.07)'};
  if(lv>=2) return{l:'D',c:'#aaaaaa',g:'rgba(170,170,170,.2)',b:'rgba(170,170,170,.06)'};
  return{l:'E',c:'#555577',g:'rgba(85,85,119,.15)',b:'rgba(85,85,119,.06)'};
}

async function loadUsers(){
  const el=document.getElementById('hunters-list');
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try{
    const users=await api('/api/users');
    _allUsers=users;
    renderHunters(users);
  }catch(e){el.innerHTML=\`<div class="empty"><div class="empty-i">⚠</div>\${e.message}</div>\`;}
}

function renderHunters(users){
  const el=document.getElementById('hunters-list');
  if(!users.length){el.innerHTML='<div class="empty"><div class="empty-i">◉</div>SIN HUNTERS</div>';return;}
  el.innerHTML=\`<div class="card" style="overflow-x:auto">
    <table class="tbl" id="hunters-tbl">
      <thead><tr><th>#</th><th>HUNTER</th><th>NIVEL</th><th>EXP</th><th>MONEDAS</th><th>MENSAJES</th></tr></thead>
      <tbody>\${users.slice(0,80).map((u,i)=>{
        const r=rankOf(u.level||1);
        const dn=u.name||(u.jid.split('@')[0].split(':')[0]);
        const num=u.jid.split('@')[0].split(':')[0];
        const xpN=(u.level||1)*250;
        const pct=Math.min(100,Math.round(((u.xp||0)/xpN)*100));
        return \`<tr onclick="showUserProfile('\${u.jid}')" title="Ver perfil completo">
          <td data-l="#"><span style="font-family:'Share Tech Mono',monospace;color:var(--tx3);font-size:11px">#\${i+1}</span></td>
          <td data-l="HUNTER"><div style="display:flex;align-items:center;gap:10px">
            <div class="rnk" style="color:\${r.c};border-color:\${r.c};background:\${r.b};box-shadow:0 0 10px \${r.g}">\${r.l}</div>
            <div><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;letter-spacing:.03em">\${dn}</div>\${u.name&&u.name!==num?'<div style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace">+\${num}</div>':''}</div>
          </div></td>
          <td data-l="NIVEL"><div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:\${r.c};text-shadow:0 0 8px \${r.g}">LV.\${u.level||1}</div><div class="xpb"><div class="xpf" style="width:\${pct}%;background:linear-gradient(90deg,\${r.c}88,\${r.c});box-shadow:0 0 6px \${r.g}"></div></div></td>
          <td data-l="EXP"><span style="font-family:'Share Tech Mono',monospace;color:var(--blue)">\${(u.xp||0).toLocaleString()}</span></td>
          <td data-l="MONEDAS"><span style="font-family:'Share Tech Mono',monospace">🪙 \${(u.coins||0).toLocaleString()}</span></td>
          <td data-l="MENSAJES"><span style="font-family:'Share Tech Mono',monospace;color:var(--tx2)">\${(u.messages||0).toLocaleString()}</span></td>
        </tr>\`;
      }).join('')}</tbody>
    </table>
    \${users.length>80?'<div style="text-align:center;padding:10px;font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace">MOSTRANDO 80 / '+users.length+' HUNTERS</div>':''}
  </div>\`;
}

function filterHunters(){
  const q=document.getElementById('hunter-search')?.value.toLowerCase().trim()||'';
  if(!q){renderHunters(_allUsers);return;}
  renderHunters(_allUsers.filter(u=>{
    const name=(u.name||'').toLowerCase();
    const num=u.jid.split('@')[0].split(':')[0];
    return name.includes(q)||num.includes(q);
  }));
}

function showUserProfile(jid){
  const u=_allUsers.find(x=>x.jid===jid);if(!u) return;
  const r=rankOf(u.level||1);
  const dn=u.name||(jid.split('@')[0].split(':')[0]);
  const num=jid.split('@')[0].split(':')[0];
  const xpN=(u.level||1)*250;const pct=Math.min(100,Math.round(((u.xp||0)/xpN)*100));
  openModal(\`
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="rnk" style="width:48px;height:48px;font-size:22px;color:\${r.c};border-color:\${r.c};background:\${r.b};box-shadow:0 0 20px \${r.g}">\${r.l}</div>
      <div>
        <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.3rem;letter-spacing:.04em;color:#fff">\${dn}</div>
        <div style="font-size:11px;color:var(--tx3);font-family:Share Tech Mono,monospace">+\${num}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
      \${[['NIVEL','LV.'+( u.level||1),'var(--blue)'],['EXP',(u.xp||0).toLocaleString(),'var(--blue)'],['MONEDAS','🪙 '+(u.coins||0).toLocaleString(),'var(--am)'],['MENSAJES',(u.messages||0).toLocaleString(),'var(--tx)'],['COMANDOS',(u.commands||0).toLocaleString(),'var(--tx)'],['WAIFUS',(u.waifus?.length||0)+' 🌸','var(--pu)']].map(([k,v,c])=>\`
        <div style="background:rgba(0,180,255,.04);border:1px solid rgba(0,180,255,.1);border-radius:2px;padding:12px">
          <div style="font-size:9px;color:var(--tx3);font-family:Share Tech Mono,monospace;text-transform:uppercase;letter-spacing:.12em;margin-bottom:4px">\${k}</div>
          <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:1.1rem;color:\${c}">\${v}</div>
        </div>
      \`).join('')}
    </div>
    <div style="margin-bottom:14px">
      <div style="font-size:9px;color:var(--tx3);font-family:Share Tech Mono,monospace;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">PROGRESO NIVEL</div>
      <div style="background:rgba(0,180,255,.08);height:6px;border-radius:0">
        <div style="height:100%;width:\${pct}%;background:linear-gradient(90deg,\${r.c}88,\${r.c});box-shadow:0 0 8px \${r.g};transition:width .3s"></div>
      </div>
      <div style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace;margin-top:4px">\${(u.xp||0).toLocaleString()} / \${xpN.toLocaleString()} XP (\${pct}%)</div>
    </div>
    \${u.waifus?.length?'<div><div style="font-size:9px;color:var(--tx3);font-family:Share Tech Mono,monospace;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px">WAIFUS ('+u.waifus.length+')</div><div style="display:flex;flex-wrap:wrap;gap:6px">'+u.waifus.map(w=>'<span style="background:rgba(157,78,255,.12);border:1px solid rgba(157,78,255,.3);color:#c4b5fd;padding:3px 9px;border-radius:2px;font-size:12px;font-family:Rajdhani,sans-serif;font-weight:600">♡ '+(w.name||w)+'</span>').join('')+'</div></div>':''}
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(0,180,255,.08)">
      <div style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace;margin-bottom:4px">REGISTRADO</div>
      <div style="font-size:12px;font-family:Share Tech Mono,monospace">\${u.createdAt?new Date(u.createdAt).toLocaleDateString('es-CL',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</div>
    </div>
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(0,180,255,.08)">
      <div style="font-size:9px;color:var(--tx3);font-family:Share Tech Mono,monospace;text-transform:uppercase;letter-spacing:.15em;margin-bottom:12px">// EDITAR</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:9px;color:var(--am);font-family:Share Tech Mono,monospace;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">🪙 MONEDAS (actual: \${(u.coins||0).toLocaleString()})</div>
          <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
            <input id="adj-coins-\${num}" type="number" min="1" value="100" style="width:72px;background:rgba(0,10,30,.8);border:1px solid rgba(0,180,255,.2);border-radius:2px;padding:5px 7px;color:var(--tx);font-size:12px;font-family:Share Tech Mono,monospace;outline:none">
            <button class="btn bp bsm" onclick="adjustUser('\${jid}','coins',1,'adj-coins-\${num}')">+DAR</button>
            <button class="btn bd bsm" onclick="adjustUser('\${jid}','coins',-1,'adj-coins-\${num}')">−QUITAR</button>
          </div>
        </div>
        <div>
          <div style="font-size:9px;color:var(--blue);font-family:Share Tech Mono,monospace;text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px">⬡ NIVEL (actual: LV.\${u.level||1})</div>
          <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
            <input id="adj-level-\${num}" type="number" min="1" value="1" style="width:55px;background:rgba(0,10,30,.8);border:1px solid rgba(0,180,255,.2);border-radius:2px;padding:5px 7px;color:var(--tx);font-size:12px;font-family:Share Tech Mono,monospace;outline:none">
            <button class="btn bp bsm" onclick="adjustUser('\${jid}','level',1,'adj-level-\${num}')">+SUBIR</button>
            <button class="btn bd bsm" onclick="adjustUser('\${jid}','level',-1,'adj-level-\${num}')">−BAJAR</button>
          </div>
        </div>
      </div>
    </div>
  \`);
}

async function adjustUser(jid,field,dir,inputId){
  const inputEl=document.getElementById(inputId);
  const amount=Math.abs(parseInt(inputEl?.value)||1);
  if(amount<=0){toast('Ingresa un valor mayor a 0',false);return;}
  const body={};body[field]=dir*amount;
  try{
    const r=await api('/api/users/'+encodeURIComponent(jid)+'/adjust',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const label=field==='coins'?(dir>0?'+MONEDAS':'−MONEDAS'):(dir>0?'+NIVEL':'−NIVEL');
    toast(label+': '+amount);
    const idx=_allUsers.findIndex(u=>u.jid===jid);
    if(idx>=0&&r.user)_allUsers[idx]=r.user;
    showUserProfile(jid);
  }catch(e){toast(e.message,false);}
}

// ── Waifus ────────────────────────────────────────────────────────────────────
async function loadWaifus(){
  const el=document.getElementById('waifus-list');el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try{
    const users=_allUsers.length?_allUsers:await api('/api/users');
    const withWaifus=users.filter(u=>u.waifus?.length>0);
    if(!withWaifus.length){el.innerHTML='<div class="empty"><div class="empty-i">♡</div>NINGÚN HUNTER TIENE WAIFUS</div>';return;}
    el.innerHTML=withWaifus.map(u=>{
      const dn=u.name||(u.jid.split('@')[0].split(':')[0]);
      const num=u.jid.split('@')[0].split(':')[0];
      return \`<div class="gcard" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px">\${dn}</div>
          \${u.name&&u.name!==num?'<span style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace">+\${num}</span>':''}
          <span style="margin-left:auto;font-size:11px;color:var(--pu);font-family:Rajdhani,sans-serif;font-weight:700">\${u.waifus.length} ♡</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          \${u.waifus.map((w,i)=>\`
            <div style="display:flex;align-items:center;gap:6px;background:rgba(157,78,255,.08);border:1px solid rgba(157,78,255,.2);padding:4px 10px;border-radius:2px">
              <span style="font-size:12px;color:#c4b5fd;font-family:Rajdhani,sans-serif;font-weight:600">♡ \${w.name||w||'Waifu #'+i}</span>
              <button class="btn bd bsm" style="padding:2px 8px;font-size:10px" onclick="deleteWaifu('\${u.jid}',\${i})">✕</button>
            </div>
          \`).join('')}
        </div>
      </div>\`;
    }).join('');
  }catch(e){el.innerHTML=\`<div class="empty"><div class="empty-i">⚠</div>\${e.message}</div>\`;}
}

async function deleteWaifu(jid,idx){
  if(!confirm('¿Eliminar esta waifu?')) return;
  try{await api('/api/waifus/'+encodeURIComponent(jid)+'/'+idx,{method:'DELETE'});toast('WAIFU ELIMINADA');await api('/api/users').then(u=>{_allUsers=u;});loadWaifus();}catch(e){toast(e.message,false);}
}

// ── Moderación ────────────────────────────────────────────────────────────────
async function loadModGroups(){
  try{
    const groups=await api('/api/groups');
    const sel=document.getElementById('mod-sel');const prev=sel.value;
    sel.innerHTML='<option value="">— SELECCIONA UN GRUPO —</option>';
    groups.forEach(g=>{const opt=document.createElement('option');opt.value=g.jid;opt.textContent=g.name||g.jid.split('@')[0];sel.appendChild(opt);});
    if(prev&&groups.find(g=>g.jid===prev)){sel.value=prev;loadModMembers();}
  }catch(e){toast(e.message,false);}
}

async function loadModMembers(){
  const jid=document.getElementById('mod-sel').value;
  const el=document.getElementById('mod-content');
  if(!jid){el.innerHTML='<div class="empty"><div class="empty-i">⚡</div>SELECCIONA UN GRUPO</div>';return;}
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try{
    const d=await api('/api/mod/group/'+encodeURIComponent(jid));
    if(!d.members?.length){el.innerHTML='<div class="empty"><div class="empty-i">◉</div>SIN MIEMBROS</div>';return;}
    const mutedSet=new Set(d.muted||[]);const warns=d.warnings||{};
    el.innerHTML=\`<div class="card" style="overflow-x:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <div><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:16px">\${d.groupName||jid.split('@')[0]}</div><div style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace;margin-top:2px">\${d.members.length} HUNTERS</div></div>
      </div>
      <table class="tbl">
        <thead><tr><th>HUNTER</th><th>ESTADO</th><th>WARNS</th><th>ACCIONES</th></tr></thead>
        <tbody>\${d.members.map(m=>{
          const num=m.jid.split('@')[0].split(':')[0];
          const dn=m.name||num;
          const isMuted=mutedSet.has(m.jid);const w=warns[m.jid]||0;
          return \`<tr>
            <td data-l="HUNTER"><div style="display:flex;align-items:center;gap:8px">
              \${m.isAdmin?'<div style="font-size:9px;font-family:Share Tech Mono,monospace;color:var(--gd);border:1px solid rgba(255,215,0,.4);padding:1px 6px;border-radius:2px">ADMIN</div>':''}
              <div><div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px">\${dn}</div>\${m.name?'<div style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace">+\${num}</div>':''}</div>
            </div></td>
            <td data-l="ESTADO">\${isMuted?'<span style="font-size:10px;font-family:Share Tech Mono,monospace;color:var(--rd);border:1px solid rgba(255,51,85,.3);padding:2px 7px;letter-spacing:.1em">MUTEADO</span>':'<span style="font-size:10px;font-family:Share Tech Mono,monospace;color:var(--gr);border:1px solid rgba(0,255,136,.25);padding:2px 7px;letter-spacing:.1em">ACTIVO</span>'}</td>
            <td data-l="WARNS"><span style="font-family:'Share Tech Mono',monospace;color:\${w>0?'var(--am)':'var(--tx3)'};\${w>0?'text-shadow:0 0 8px rgba(255,170,0,.4)':''}">\${w} ⚠</span></td>
            <td data-l="ACCIONES"><div class="ar">
              <button class="btn bw bsm" onclick="modAct('\${jid}','\${m.jid}','\${isMuted?'unmute':'mute'}')" \${m.isAdmin?'disabled':''}>\${isMuted?'DESMUTEAR':'MUTEAR'}</button>
              <button class="btn bw bsm" onclick="modAct('\${jid}','\${m.jid}','warn')" \${m.isAdmin?'disabled':''}>+WARN</button>
              <button class="btn bg bsm" onclick="modAct('\${jid}','\${m.jid}','clearwarns')" \${w===0?'disabled':''}>CLR</button>
              <button class="btn bd bsm" onclick="confirmKick('\${jid}','\${m.jid}')" \${m.isAdmin?'disabled':''}>EXPULSAR</button>
            </div></td>
          </tr>\`;
        }).join('')}</tbody>
      </table></div>\`;
  }catch(e){el.innerHTML=\`<div class="empty"><div class="empty-i">⚠</div>\${e.message}</div>\`;}
}

async function modAct(gJid,uJid,action){
  try{
    await api('/api/mod/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupJid:gJid,userJid:uJid,action})});
    const L={mute:'MUTEADO',unmute:'DESMUTEADO',warn:'ADVERTENCIA AÑADIDA',clearwarns:'WARNS BORRADOS',kick:'EXPULSADO'};
    toast(L[action]||action.toUpperCase());loadModMembers();loadModHistory();
  }catch(e){toast(e.message,false);}
}
function confirmKick(gJid,uJid){
  const num=uJid.split('@')[0];
  if(!confirm('EXPULSAR: '+num+'\\n\\nNo se puede deshacer.')) return;
  modAct(gJid,uJid,'kick');
}

async function loadModHistory(){
  const el=document.getElementById('mod-history-list');
  try{
    const h=await api('/api/mod/history');
    if(!h.length){el.innerHTML='<div class="empty" style="padding:20px"><div class="empty-i">📋</div>SIN ACCIONES</div>';return;}
    const ICONS={mute:'🔇',unmute:'🔊',warn:'⚠️',clearwarns:'🗑',kick:'🚫'};
    const LABELS={mute:'MUTEADO',unmute:'DESMUTEADO',warn:'ADVERTENCIA',clearwarns:'WARNS BORRADOS',kick:'EXPULSADO'};
    el.innerHTML=h.map(e=>\`<div class="log-entry">
      <span class="log-type lt-mod">\${ICONS[e.action]||'⚡'} \${LABELS[e.action]||e.action}</span>
      <span style="color:var(--tx);font-weight:600">\${e.userName||e.userJid?.split('@')[0]||'?'}</span>
      <span style="color:var(--tx3)">en \${e.groupName||e.groupJid?.split('@')[0]||'?'}</span>
      <span class="log-ts" style="margin-left:auto">\${new Date(e.ts).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</span>
    </div>\`).join('');
  }catch{el.innerHTML='<div class="empty" style="padding:20px">Error cargando historial</div>';}
}

// ── Broadcast ─────────────────────────────────────────────────────────────────
let _bcGroups=[];
async function loadBcGroups(){
  try{
    const groups=await api('/api/groups');
    _bcGroups=groups.filter(g=>g.botEnabled!==false);
    const sel=document.getElementById('bc-group');
    sel.innerHTML=_bcGroups.map(g=>\`<option value="\${g.jid}">\${g.name||'+'+g.jid.split('@')[0]}</option>\`).join('');
    const cnt=document.getElementById('bc-count');
    if(cnt)cnt.textContent=\`\${_bcGroups.length} grupo\${_bcGroups.length!==1?'s':''} con bot activo\`;
  }catch(e){const cnt=document.getElementById('bc-count');if(cnt)cnt.textContent='Error cargando grupos';}
}

function toggleBcAll(all){
  document.getElementById('bc-group').style.display=all?'none':'block';
}

async function sendBroadcast(){
  const msg=document.getElementById('bc-msg')?.value?.trim();
  if(!msg){toast('Escribe un mensaje primero',false);return;}
  const allGroups=document.getElementById('bc-all')?.checked;
  const groupSel=document.getElementById('bc-group');
  const targets=allGroups?[]:Array.from(groupSel.selectedOptions).map(o=>o.value);
  if(!allGroups&&!targets.length){toast('Selecciona al menos un grupo',false);return;}
  if(allGroups&&!_bcGroups.length){toast('No hay grupos con el bot activo',false);return;}
  const btn=document.getElementById('bc-btn');const result=document.getElementById('bc-result');
  btn.disabled=true;btn.textContent='⏳ ENVIANDO...';result.textContent='Conectando con Railway...';
  try{
    const r=await api('/api/broadcast',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,groups:allGroups?null:targets})});
    if(r.sent===0){
      toast('Sin grupos destino — verifica que el bot esté activo en algún grupo',false);
      result.textContent=\`// 0 enviados\${r.failed?' · '+r.failed+' fallidos':''}\`;
    }else{
      toast(\`✓ ENVIADO A \${r.sent} GRUPOS\`);
      result.textContent=\`// \${r.sent} enviados\${r.failed?' · '+r.failed+' fallidos':''}\`;
      _bcHistory.unshift({msg:msg.slice(0,60)+(msg.length>60?'...':''),sent:r.sent,failed:r.failed,ts:Date.now()});
      renderBcHistory();
      document.getElementById('bc-msg').value='';
    }
  }catch(e){toast(e.message||'Error de conexión con el bot',false);result.textContent='// ERROR: '+(e.message||'bot desconectado');}
  btn.disabled=false;btn.textContent='📡 ENVIAR BROADCAST';
}

function renderBcHistory(){
  const el=document.getElementById('bc-history');
  if(!_bcHistory.length){el.innerHTML='<div class="empty" style="padding:20px"><div class="empty-i">📡</div>SIN BROADCASTS</div>';return;}
  el.innerHTML=_bcHistory.map(b=>\`<div class="log-entry">
    <span class="log-type lt-conn">📡 BC</span>
    <span style="color:var(--tx);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${b.msg}</span>
    <span style="color:var(--gr);margin-left:8px">\${b.sent}✓</span>
    \${b.failed?'<span style="color:var(--rd);margin-left:4px">'+b.failed+'✗</span>':''}
    <span class="log-ts" style="margin-left:8px">\${new Date(b.ts).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}</span>
  </div>\`).join('');
}

// ── Log en vivo (SSE) ─────────────────────────────────────────────────────────
function initSSE(){
  if(_evtSource) return;
  const dot=document.getElementById('sse-dot');const st=document.getElementById('sse-status');
  _evtSource=new EventSource('/api/events');
  _evtSource.onopen=()=>{if(dot)dot.style.background='var(--gr)';if(st)st.textContent='CONECTADO';};
  _evtSource.onerror=()=>{if(dot)dot.style.background='var(--rd)';if(st)st.textContent='ERROR';};
  _evtSource.onmessage=e=>{
    try{const ev=JSON.parse(e.data);appendLogEntry(ev);}catch{}
  };
}

const TYPE_MAP={msg:{cls:'lt-msg',label:'MSG'},cmd:{cls:'lt-cmd',label:'CMD'},mod:{cls:'lt-mod',label:'MOD'},conn:{cls:'lt-conn',label:'CONN'},err:{cls:'lt-err',label:'ERR'}};

function appendLogEntry(ev){
  _logEntries.unshift(ev);
  if(_logEntries.length>200)_logEntries.pop();
  const el=document.getElementById('log-entries');
  if(!el) return;
  const tm=TYPE_MAP[ev.type]||{cls:'lt-msg',label:ev.type?.toUpperCase()||'?'};
  const ts=new Date(ev.ts).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  let desc='';
  if(ev.type==='msg') desc=\`MSG de <strong>\${ev.data.sender||'?'}</strong>\${ev.data.group?' en '+ev.data.group:''}\`;
  else if(ev.type==='cmd') desc=\`CMD <strong>\${ev.data.cmd||'?'}</strong> por \${ev.data.sender||'?'}\${ev.data.group?' en '+ev.data.group:''}\`;
  else if(ev.type==='mod') desc=\`\${ev.data.action?.toUpperCase()||'?'} → \${ev.data.user||'?'} en \${ev.data.group||'?'}\`;
  else desc=JSON.stringify(ev.data).slice(0,80);
  const entry=document.createElement('div');entry.className='log-entry';
  entry.innerHTML=\`<span class="log-type \${tm.cls}">\${tm.label}</span><span style="flex:1;color:var(--tx2)">\${desc}</span><span class="log-ts">\${ts}</span>\`;
  if(el.querySelector('.empty')) el.innerHTML='';
  el.prepend(entry);
  if(el.children.length>200) el.lastChild.remove();
  // Scroll to top if user is at top
  const scroll=document.getElementById('log-scroll');
  if(scroll&&scroll.scrollTop<40) scroll.scrollTop=0;
}

function clearLog(){
  _logEntries=[];const el=document.getElementById('log-entries');
  if(el)el.innerHTML='<div class="empty"><div class="empty-i">⬡</div>LOG BORRADO</div>';
}

// Load historical events on first open
async function loadHistoricalEvents(){
  try{
    const events=await api('/api/events/history');
    const el=document.getElementById('log-entries');
    if(!events.length||(el&&!el.querySelector('.empty'))) return;
    if(el) el.innerHTML='';
    events.forEach(ev=>appendLogEntry(ev));
  }catch{}
}

// ── Statistics ────────────────────────────────────────────────────────────────
async function loadStats(){
  try{
    const s=await api('/api/activity');
    renderChart(s.hourly||[]);
    renderTopCmds(s.topCmds||[]);
    renderTopGroups(s.topGroups||[]);
  }catch(e){console.error(e);}
}

function renderChart(hourly){
  const ctx=document.getElementById('actChart');if(!ctx)return;
  if(_chart){_chart.destroy();_chart=null;}
  const labels=hourly.map(h=>h.label);
  const msgs=hourly.map(h=>h.msgs||0);
  const cmds=hourly.map(h=>h.cmds||0);
  _chart=new Chart(ctx,{
    type:'bar',
    data:{labels,datasets:[
      {label:'Mensajes',data:msgs,backgroundColor:'rgba(0,200,255,.25)',borderColor:'rgba(0,200,255,.6)',borderWidth:1},
      {label:'Comandos',data:cmds,backgroundColor:'rgba(157,78,255,.2)',borderColor:'rgba(157,78,255,.5)',borderWidth:1},
    ]},
    options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{color:'rgba(200,232,255,.5)',font:{family:'Share Tech Mono',size:10}}}},scales:{x:{ticks:{color:'rgba(200,232,255,.35)',font:{family:'Share Tech Mono',size:9}},grid:{color:'rgba(0,180,255,.05)'}},y:{ticks:{color:'rgba(200,232,255,.35)',font:{family:'Share Tech Mono',size:9}},grid:{color:'rgba(0,180,255,.05)'}}}}
  });
}

function renderTopCmds(cmds){
  const el=document.getElementById('top-cmds');if(!el)return;
  if(!cmds.length){el.innerHTML='<div class="empty" style="padding:20px">SIN DATOS</div>';return;}
  el.innerHTML=cmds.map((c,i)=>\`<div class="row" style="padding:8px 0">
    <span style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace;width:20px">#\${i+1}</span>
    <span style="font-family:'Rajdhani',sans-serif;font-weight:700;flex:1">\${c.cmd}</span>
    <span style="font-family:'Share Tech Mono',monospace;color:var(--blue);font-size:12px">\${c.count}x</span>
  </div>\`).join('');
}

function renderTopGroups(groups){
  const el=document.getElementById('top-groups');if(!el)return;
  if(!groups.length){el.innerHTML='<div class="empty" style="padding:20px">SIN DATOS</div>';return;}
  el.innerHTML=groups.map((g,i)=>\`<div class="row" style="padding:8px 0">
    <span style="font-size:10px;color:var(--tx3);font-family:Share Tech Mono,monospace;width:20px">#\${i+1}</span>
    <span style="font-family:'Rajdhani',sans-serif;font-weight:700;flex:1">\${g.name||g.group}</span>
    <span style="font-family:'Share Tech Mono',monospace;color:var(--pu);font-size:12px">\${g.count} ev.</span>
  </div>\`).join('');
}

// ── Connection ────────────────────────────────────────────────────────────────
async function loadConnection(){
  const el=document.getElementById('conn-content');
  try{
    const s=await api('/status');
    if(s.connected){
      el.innerHTML=\`<div style="text-align:center;padding:28px">
        <div style="font-size:48px;margin-bottom:12px;filter:drop-shadow(0 0 20px rgba(0,255,136,.6))">⬡</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;font-weight:700;color:var(--gr);text-shadow:0 0 12px rgba(0,255,136,.5);letter-spacing:.08em;margin-bottom:6px">GATE ABIERTO</div>
        <div style="font-size:11px;color:var(--tx3);font-family:Share Tech Mono,monospace;margin-bottom:24px">conexión whatsapp activa</div>
        <button class="btn bd" onclick="resetSession()">⬡ CERRAR GATE Y RE-VINCULAR</button>
        <div id="reset-msg" style="margin-top:10px;font-size:12px;font-family:Share Tech Mono,monospace;color:var(--tx3)"></div>
      </div>\`;
    }else{
      el.innerHTML=\`<div style="text-align:center;padding:28px">
        <div style="font-size:48px;margin-bottom:12px;opacity:.4">⬡</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;font-weight:700;color:var(--am);text-shadow:0 0 12px rgba(255,170,0,.5);letter-spacing:.08em;margin-bottom:6px">GATE SIN ABRIR</div>
        <div style="font-size:11px;color:var(--tx3);font-family:Share Tech Mono,monospace;margin-bottom:24px">esperando vinculación whatsapp</div>
        <a href="/" target="_blank" class="btn bp" style="text-decoration:none">► ABRIR VINCULACIÓN</a>
      </div>\`;
    }
  }catch(e){el.innerHTML='<div class="empty"><div class="empty-i">⚠</div>'+e.message+'</div>';}
}
async function resetSession(){
  if(!confirm('¿CERRAR GATE?\\nLos datos NO se borran.')) return;
  const msg=document.getElementById('reset-msg');
  try{await api('/reset',{method:'POST'});if(msg)msg.textContent='// GATE CERRADO. RECARGANDO EN 15S...';setTimeout(()=>location.reload(),12000);}
  catch(e){if(msg)msg.textContent='// ERROR: '+e.message;}
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadConfig();loadStatsBadges();loadMaintState();
setInterval(loadStatsBadges,30000);
setInterval(loadConfig,60000);
</script>
</body>
</html>`;
}

// ─── Pairing page (compact) ───────────────────────────────────────────────────
function renderPage() {
  const connected=state.connected,hasQR=!!state.qr,hasCode=!!state.pairingCode,ready=!!state.sock;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AnimeBot — Vinculación</title>
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(135deg,#1a0033,#4a0080,#ff1493);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}.card{background:rgba(0,0,0,.55);backdrop-filter:blur(12px);border-radius:20px;padding:28px;max-width:520px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1)}h1{margin:0 0 6px;font-size:1.7em}.sub{opacity:.75;font-size:.9em;margin-bottom:14px}.status{display:inline-block;padding:6px 14px;border-radius:20px;font-size:.85em;margin:6px 0;font-weight:600}.ok{background:#10b981}.wait{background:#f59e0b;color:#1a0033}.err{background:#ef4444}.tabs{display:flex;gap:6px;margin:18px 0 0;background:rgba(0,0,0,.35);padding:5px;border-radius:12px}.tab{flex:1;padding:10px;border-radius:9px;cursor:pointer;font-size:.95em;font-weight:600;border:none;background:transparent;color:#fff;opacity:.65;transition:all .2s}.tab.active{background:linear-gradient(135deg,#ff1493,#ff8ec7);opacity:1}.panel{display:none;padding:20px 0 6px}.panel.active{display:block}.qr-wrap{background:#fff;padding:14px;border-radius:14px;display:inline-block}.qr-wrap img{display:block;width:240px;height:240px}.form{display:flex;flex-direction:column;gap:10px;margin:8px auto;max-width:300px}.form input{padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:1em;outline:none}.btn{padding:11px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#ff1493,#ff8ec7);color:#fff;font-weight:700;cursor:pointer}.btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.25)}.code{font-family:monospace;font-size:1.9em;letter-spacing:5px;background:rgba(255,255,255,.12);padding:16px;border-radius:12px;margin:12px 0;font-weight:bold}.help{font-size:.83em;line-height:1.55;opacity:.8;margin-top:14px;text-align:left;background:rgba(0,0,0,.3);padding:12px 14px;border-radius:10px}.help ol{padding-left:18px;margin:6px 0}.help strong{color:#ffd1e6}.footer{margin-top:16px;font-size:.7em;opacity:.45}.danger-zone{margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}.msg{padding:10px 14px;border-radius:10px;margin:10px 0;font-size:.88em;display:none}.msg.show{display:block}.msg.error{background:rgba(239,68,68,.2);border:1px solid #ef4444}.msg.success{background:rgba(16,185,129,.2);border:1px solid #10b981}.spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite;vertical-align:middle;margin-right:5px}@keyframes sp{to{transform:rotate(360deg)}}.db-link{display:inline-block;margin-top:14px;padding:8px 18px;border-radius:8px;background:rgba(255,255,255,.1);color:#fff;text-decoration:none;font-size:.85em;font-weight:600}.db-link:hover{background:rgba(255,255,255,.18)}</style></head>
<body><div class="card"><h1>🌸 AnimeBot</h1>
${connected?`<div class="status ok">✅ Conectado a WhatsApp</div><p style="opacity:.85">El bot está funcionando.</p><div class="danger-zone"><p style="font-size:.84em;opacity:.65;margin:0 0 10px">¿Re-vincular?</p><button id="reset-btn" class="btn ghost">🔄 Cerrar sesión</button><div id="reset-msg" class="msg"></div></div>`:
!ready?`<div class="status err"><span class="spin"></span>Iniciando...</div>`:
`<div class="status wait">⏳ Esperando vinculación</div><p class="sub">Elige método</p>
<div class="tabs"><button class="tab ${!hasCode?"active":""}" data-tab="qr">📷 QR</button><button class="tab ${hasCode?"active":""}" data-tab="code">🔢 Código</button></div>
<div id="panel-qr" class="panel ${!hasCode?"active":""}">
${hasQR?'<div class="qr-wrap" id="qr-slot"></div>':`<p style="opacity:.6;padding:24px 0"><span class="spin"></span> Generando...</p>`}
<div class="help"><strong>Escanear:</strong><ol><li>WhatsApp → Dispositivos vinculados</li><li>Vincular dispositivo</li></ol></div></div>
<div id="panel-code" class="panel ${hasCode?"active":""}">
${hasCode?`<div class="code">${state.pairingCode}</div><form id="code-form"><button type="button" class="btn ghost" style="font-size:.84em;padding:7px 13px" onclick="location.reload()">Generar otro</button></form>`:
`<form id="code-form" class="form"><label style="font-size:.84em;opacity:.8;text-align:left">Número con código de país:</label><input id="phone" type="tel" inputmode="numeric" placeholder="56912345678" required><button id="code-btn" type="submit" class="btn">Generar código</button><div id="code-msg" class="msg"></div></form>`}
<div class="help"><strong>Usar código:</strong><ol><li>WhatsApp → Dispositivos vinculados</li><li>Vincular con número</li></ol></div></div>`}
<div class="footer">Act: ${new Date(state.lastUpdate).toLocaleTimeString("es-CL")}</div>
<a href="/dashboard" class="db-link">⚔ System Panel →</a></div>
<script>
let ls=${JSON.stringify(stateSignature())};
async function poll(){try{const r=await fetch('/status');const j=await r.json();if(j.signature!==ls){ls=j.signature;if(!document.activeElement||document.activeElement.tagName!=='INPUT')location.reload();}}catch(_){}}
setInterval(poll,3500);
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t.dataset.tab));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+t.dataset.tab));}));
const cf=document.getElementById('code-form');
if(cf){cf.addEventListener('submit',async e=>{e.preventDefault();const ph=document.getElementById('phone').value.trim();const btn=document.getElementById('code-btn');const msg=document.getElementById('code-msg');msg.className='msg';btn.disabled=true;btn.innerHTML='<span class="spin"></span>Generando...';try{const r=await fetch('/pairing-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:ph})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Error');msg.className='msg show success';msg.textContent='✅ Generado';setTimeout(()=>location.reload(),800);}catch(err){msg.className='msg show error';msg.textContent='❌ '+err.message;btn.disabled=false;btn.textContent='Generar código';}});}
const rb=document.getElementById('reset-btn');
if(rb){rb.addEventListener('click',async()=>{if(!confirm('¿Cerrar sesión? Los datos NO se borran.'))return;const msg=document.getElementById('reset-msg');rb.disabled=true;rb.innerHTML='<span class="spin"></span>...';try{const r=await fetch('/reset',{method:'POST'});if(!r.ok)throw new Error('Error');msg.className='msg show success';msg.textContent='✅ Cerrado. Recarga en 15s.';setTimeout(()=>location.reload(),12000);}catch(err){msg.className='msg show error';msg.textContent='❌ '+err.message;rb.disabled=false;rb.textContent='Cerrar sesión';}});}
</script></body></html>`;
}

// ─── Server ───────────────────────────────────────────────────────────────────
function startWebServer(port) {
  const app = express();
  app.use(express.json());
    // ─── CORS — permite peticiones desde la dashboard en Vercel ────────────────
    app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      if (req.method === "OPTIONS") return res.sendStatus(200);
      next();
    });

  app.get("/", async (req,res) => {
    let html=renderPage();
    if(state.qr){try{const d=await QRCode.toDataURL(state.qr,{width:260,margin:2});html=html.replace('<div class="qr-wrap" id="qr-slot"></div>',`<div class="qr-wrap"><img src="${d}" alt="QR"></div>`);}catch(_){}}
    res.setHeader("Content-Type","text/html; charset=utf-8").setHeader("Cache-Control","no-store").send(html);
  });

  app.get("/dashboard",(req,res)=>{
    res.setHeader("Content-Type","text/html; charset=utf-8").setHeader("Cache-Control","no-store").send(renderDashboard());
  });

  app.get("/status",(req,res)=>res.json({signature:stateSignature(),connected:state.connected,hasQR:!!state.qr,hasPairingCode:!!state.pairingCode,ready:!!state.sock,lastUpdate:state.lastUpdate}));

  // ── SSE ──
  app.get("/api/events",(req,res)=>{
    res.setHeader("Content-Type","text/event-stream");res.setHeader("Cache-Control","no-cache");res.setHeader("Connection","keep-alive");res.setHeader("X-Accel-Buffering","no");
    res.flushHeaders();
    const last50=eventLog.slice(-50);
    last50.forEach(ev=>{try{res.write(`data: ${JSON.stringify(ev)}\n\n`);}catch{}});
    sseClients.add(res);
    req.on("close",()=>{sseClients.delete(res);});
  });

  app.get("/api/events/history",(req,res)=>{res.json(eventLog.slice(-100).reverse());});

  // ── Config ──
  app.get("/api/config",(req,res)=>{try{res.json(getMergedConfig());}catch(e){res.status(500).json({error:e.message});}});
  app.post("/api/config",(req,res)=>{try{applyOverrides(req.body||{});res.json({ok:true,config:getMergedConfig()});}catch(e){res.status(500).json({error:e.message});}});

  // ── Maintenance ──
  app.get("/api/maintenance",(req,res)=>res.json({enabled:state.maintenance,message:state.maintenanceMessage}));
  app.post("/api/maintenance",(req,res)=>{
    const {enabled,message}=req.body||{};
    if(enabled!==undefined) state.maintenance=!!enabled;
    if(message!==undefined) state.maintenanceMessage=message||state.maintenanceMessage;
    emitEvent("conn",{action:state.maintenance?"maintenance_on":"maintenance_off"});
    res.json({ok:true,enabled:state.maintenance,message:state.maintenanceMessage});
  });

  // ── Stats ──
  app.get("/api/stats",async(req,res)=>{
    try{
      const db=require("../database/db");const users=await db.getAllUsers();
      let gc=0;try{const allGrps=await db.getAllGroups();gc=allGrps.length;}catch{}
      // Sum total messages and commands from all users in the database
      const totalMessages=users.reduce((s,u)=>s+(u.messages||0),0);
      const totalCommands=users.reduce((s,u)=>s+(u.commands||0),0);
      // Commands executed today (since midnight local time) from the in-memory event log
      const dayAgo=Date.now()-86400000;
      const commandsToday=eventLog.filter(e=>e.type==="cmd"&&e.ts>=dayAgo).length;
      const eventsToday=eventLog.filter(e=>e.ts>=dayAgo).length;
      res.json({
        users:users.length,groups:gc,connected:state.connected,
        uptime:Math.floor((Date.now()-state.startedAt)/1000),
        messages:totalMessages,commandsToday,eventsToday,
        totalCommands,
      });
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Activity stats ──
  app.get("/api/activity",(req,res)=>{
    try{
      const now=Date.now();const hourly=[];
      for(let i=11;i>=0;i--){
        const start=now-(i+1)*3600000,end=now-i*3600000;
        const d=new Date(start);const label=d.getHours().toString().padStart(2,"0")+":00";
        const evts=eventLog.filter(e=>e.ts>=start&&e.ts<end);
        hourly.push({label,msgs:evts.filter(e=>e.type==="msg").length,cmds:evts.filter(e=>e.type==="cmd").length});
      }
      // Top commands
      const cmdMap={};
      eventLog.filter(e=>e.type==="cmd").forEach(e=>{const c=e.data?.cmd||"?";cmdMap[c]=(cmdMap[c]||0)+1;});
      const topCmds=Object.entries(cmdMap).map(([cmd,count])=>({cmd,count})).sort((a,b)=>b.count-a.count).slice(0,5);
      // Top groups
      const grpMap={};
      eventLog.filter(e=>e.data?.group).forEach(e=>{const g=e.data.group;grpMap[g]=(grpMap[g]||0)+1;});
      const topGroups=Object.entries(grpMap).map(([group,count])=>({group,name:group,count})).sort((a,b)=>b.count-a.count).slice(0,5);
      res.json({hourly,topCmds,topGroups});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Users ──
  app.get("/api/users",async(req,res)=>{
    try{const db=require("../database/db");res.json((await db.getAllUsers()).sort((a,b)=>(b.xp||0)-(a.xp||0)));}
    catch(e){res.status(500).json({error:e.message});}
  });

  app.post("/api/users/:jid/adjust",async(req,res)=>{
    try{
      const db=require("../database/db");
      const jid=decodeURIComponent(req.params.jid);
      const {coins,level}=req.body||{};
      const user=await db.getUser(jid);
      const patch={};
      if(coins!==undefined){const n=(user.coins||0)+parseInt(coins);patch.coins=Math.max(0,n);}
      if(level!==undefined){const n=(user.level||1)+parseInt(level);patch.level=Math.max(1,n);}
      if(!Object.keys(patch).length)return res.status(400).json({error:"Sin campos para actualizar"});
      const updated=await db.updateUser(jid,patch);
      emitEvent("mod",{action:"adjust_"+Object.keys(patch).join("+"),user:jid.split("@")[0]});
      res.json({ok:true,user:updated});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Groups ──
  app.get("/api/groups",async(req,res)=>{
    try{
      const db=require("../database/db");
      const groups=await db.getAllGroups();
      res.json(groups.map(g=>({jid:g.jid,name:g.name||"",antiLink:g.antiLink??false,antiSpam:g.antiSpam??true,welcome:g.welcome??true,botEnabled:g.botEnabled??true,memberCount:g.memberCount??0,createdAt:g.createdAt??null})));
    }catch(e){res.status(500).json({error:e.message});}
  });

  app.post("/api/groups/:jid",async(req,res)=>{
    try{
      const db=require("../database/db");const jid=decodeURIComponent(req.params.jid);const safe={};
      for(const k of["antiLink","antiSpam","welcome"])if(req.body[k]!==undefined)safe[k]=!!req.body[k];
      if(req.body.botEnabled!==undefined)safe.botEnabled=!!req.body.botEnabled;
      await db.updateGroup(jid,safe);res.json({ok:true});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // Activar/desactivar bot en un grupo
  app.patch("/api/groups/:jid/enabled",async(req,res)=>{
    try{
      const db=require("../database/db");
      const jid=decodeURIComponent(req.params.jid);
      const enabled=req.body.enabled!==false;
      await db.updateGroup(jid,{botEnabled:enabled});
      res.json({ok:true,jid,botEnabled:enabled});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // Eliminar grupo del bot (queda como número normal)
  app.delete("/api/groups/:jid",async(req,res)=>{
    try{
      const db=require("../database/db");
      const jid=decodeURIComponent(req.params.jid);
      await db.deleteGroup(jid);
      res.json({ok:true,jid});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Broadcast ──
  app.post("/api/broadcast", async(req,res)=>{
    if(!state.sock||!state.connected) return res.status(503).json({error:"Bot no conectado a WhatsApp"});
    const {message,groups:targetGroups}=req.body||{};
    if(!message?.trim()) return res.status(400).json({error:"Mensaje vacío"});
    let groups=[];
    try{
      const db=require("../database/db");
      const allGrps=await db.getAllGroups();
      // Solo grupos con bot activo
      groups=allGrps.filter(g=>g.botEnabled!==false).map(g=>g.jid);
    }catch(dbErr){return res.status(500).json({error:"Error leyendo grupos: "+dbErr.message});}
    if(targetGroups?.length) groups=groups.filter(jid=>targetGroups.includes(jid));
    if(!groups.length) return res.json({ok:true,sent:0,failed:0,info:"Sin grupos destino"});
    let sent=0,failed=0;
    for(const jid of groups){
      try{await state.sock.sendMessage(jid,{text:message});sent++;await new Promise(r=>setTimeout(r,800));}
      catch{failed++;}
    }
    emitEvent("conn",{action:"broadcast",sent,failed});
    res.json({ok:true,sent,failed});
  });

  // ── Mod history ──
  app.get("/api/mod/history",async(req,res)=>{
    try{
      const db=require("../database/db");
      const entries=await Promise.all(modHistory.slice(0,100).map(async e=>{
        let userName="",groupName="";
        try{const u=await db.getUser(e.userJid);userName=u.name||"";}catch{}
        try{const g=await db.getGroup(e.groupJid);groupName=g.name||"";}catch{}
        return{...e,userName,groupName};
      }));
      res.json(entries);
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Mod group info ──
  app.get("/api/mod/group/:jid",async(req,res)=>{
    try{
      const db=require("../database/db");const jid=decodeURIComponent(req.params.jid);
      const group=await db.getGroup(jid);let members=[],groupName=group.name||jid.split("@")[0];
      if(state.sock&&state.connected){
        try{
          const meta=await Promise.race([state.sock.groupMetadata(jid),new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),6000))]);
          groupName=meta.subject||groupName;
          if(group.name!==meta.subject)try{await db.updateGroup(jid,{name:meta.subject});}catch{}
          const adminSet=new Set(meta.participants.filter(p=>p.admin).map(p=>p.id));
          members=meta.participants.map(p=>({jid:p.id,isAdmin:adminSet.has(p.id),name:""}));
        }catch{}
      }
      if(!members.length){const log=group.lastMessageAt||{};members=Object.keys(log).map(j=>({jid:j,isAdmin:false,name:""}));}
      const botId=state.sock?.user?.id?state.sock.user.id.split(":")[0]+"@s.whatsapp.net":null;
      if(botId)members=members.filter(m=>m.jid!==botId);
      members=await Promise.all(members.map(async m=>{try{const u=await db.getUser(m.jid);if(u.name)m.name=u.name;}catch{}return m;}));
      res.json({groupName,members,muted:group.mutedUsers||[],warnings:group.warnings||{}});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Mod action ──
  app.post("/api/mod/action",async(req,res)=>{
    try{
      const db=require("../database/db");const {groupJid,userJid,action}=req.body||{};
      if(!groupJid||!userJid||!action)return res.status(400).json({error:"Faltan parámetros"});
      const group=await db.getGroup(groupJid);
      if(action==="mute"){const m=new Set(group.mutedUsers||[]);m.add(userJid);await db.updateGroup(groupJid,{mutedUsers:[...m]});}
      else if(action==="unmute"){const m=new Set(group.mutedUsers||[]);m.delete(userJid);await db.updateGroup(groupJid,{mutedUsers:[...m]});}
      else if(action==="warn"){
        const w={...(group.warnings||{})};w[userJid]=(w[userJid]||0)+1;await db.updateGroup(groupJid,{warnings:w});
        if(state.sock&&state.connected){const num=userJid.split("@")[0];await state.sock.sendMessage(groupJid,{text:`⚠️ @${num} recibió una advertencia desde el panel de control.\nTotal: ${w[userJid]}`,mentions:[userJid]}).catch(()=>{});}
      }
      else if(action==="clearwarns"){const w={...(group.warnings||{})};delete w[userJid];await db.updateGroup(groupJid,{warnings:w});}
      else if(action==="kick"){if(!state.sock||!state.connected)return res.status(503).json({error:"Bot no conectado"});await state.sock.groupParticipantsUpdate(groupJid,[userJid],"remove");}
      else return res.status(400).json({error:"Acción desconocida"});
      logMod(action,groupJid,userJid);
      res.json({ok:true});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Waifus ──
  app.delete("/api/waifus/:jid/:idx",async(req,res)=>{
    try{
      const db=require("../database/db");const jid=decodeURIComponent(req.params.jid);const idx=parseInt(req.params.idx);
      const user=await db.getUser(jid);const waifus=user.waifus||[];
      if(idx<0||idx>=waifus.length)return res.status(400).json({error:"Índice inválido"});
      waifus.splice(idx,1);await db.updateUser(jid,{waifus});res.json({ok:true});
    }catch(e){res.status(500).json({error:e.message});}
  });

  // ── Pairing ──
  app.post("/pairing-code",async(req,res)=>{
    if(state.connected)return res.status(400).json({error:"El bot ya está conectado."});
    if(!state.sock)return res.status(503).json({error:"El bot no está listo."});
    if(state.sock.authState?.creds?.registered)return res.status(400).json({error:"Sesión ya registrada."});
    const phone=String(req.body?.phone||"").replace(/[^0-9]/g,"");
    if(phone.length<8||phone.length>16)return res.status(400).json({error:"Número inválido."});
    try{const code=await state.sock.requestPairingCode(phone);const fmt=code.match(/.{1,4}/g).join("-");setPairingCode(fmt,phone);logger.info(`🔢 Código para +${phone}: ${fmt}`);res.json({code:fmt,phone});}
    catch(err){res.status(500).json({error:`WhatsApp rechazó: ${err.message}`});}
  });

  // ── Reset ──
  app.post("/reset",async(req,res)=>{
    if(state.resetInProgress)return res.status(409).json({error:"Reset en curso."});
    state.resetInProgress=true;logger.warn("⚠️ Reset solicitado vía web.");
    try{if(typeof onResetRequest==="function")await onResetRequest();res.json({ok:true});setTimeout(()=>process.exit(1),1500);}
    catch(err){state.resetInProgress=false;res.status(500).json({error:err.message});}
  });

  app.get("/health",(req,res)=>res.json({status:"ok",connected:state.connected,uptime:process.uptime(),maintenance:state.maintenance}));

  app.listen(port,"0.0.0.0",()=>{
    logger.success(`🌐 Web activo en puerto ${port}`);
    logger.info("   / → Vinculación  |  /dashboard → System Panel");
  });
}

module.exports={startWebServer,setQR,setPairingCode,setConnected,setSocket,setResetHandler,emitEvent,isMaintenanceMode,getMaintenanceMessage};
