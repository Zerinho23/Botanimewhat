const express = require("express");
const QRCode = require("qrcode");
const logger = require("./logger");
const path = require("path");
const fs = require("fs");

// ─── Config overrides ─────────────────────────────────────────────────────────
const CONFIG_OVERRIDES_FILE = path.join(__dirname, "..", "config", "overrides.json");
function loadOverrides() { try { return fs.existsSync(CONFIG_OVERRIDES_FILE) ? JSON.parse(fs.readFileSync(CONFIG_OVERRIDES_FILE,"utf-8")) : {}; } catch { return {}; } }
function saveOverrides(d) { try { fs.writeFileSync(CONFIG_OVERRIDES_FILE, JSON.stringify(d,null,2)); } catch(e) { logger.error(`Error overrides: ${e.message}`); } }
function getMergedConfig() {
  const base = require("../config/config"), ov = loadOverrides();
  return { prefix: ov.prefix??base.prefix, botName: ov.botName??base.botName, ownerNumber: ov.ownerNumber??base.ownerNumber, commandCooldown: ov.commandCooldown??base.commandCooldown, level:{...base.level,...(ov.level||{})}, economy:{...base.economy,...(ov.economy||{})}, antiSpam:{...base.antiSpam,...(ov.antiSpam||{})} };
}
function applyOverrides(updates) {
  const m={...loadOverrides()};
  for(const k of["prefix","botName","ownerNumber","commandCooldown"]) if(updates[k]!==undefined) m[k]=updates[k];
  for(const k of["level","economy","antiSpam"]) if(updates[k]!==undefined) m[k]={...(m[k]||{}),...updates[k]};
  saveOverrides(m);
  try{ const l=require("../config/config"); for(const k of["prefix","botName","ownerNumber","commandCooldown"]) if(updates[k]!==undefined) l[k]=updates[k]; for(const k of["level","economy","antiSpam"]) if(updates[k]!==undefined) Object.assign(l[k],updates[k]); }catch{}
}

// ─── State ────────────────────────────────────────────────────────────────────
const state = { qr:null, pairingCode:null, pairingPhone:null, connected:false, lastUpdate:Date.now(), sock:null, resetInProgress:false, startedAt:Date.now() };
let onResetRequest = null;
function setQR(qr){state.qr=qr;state.connected=false;state.lastUpdate=Date.now();}
function setPairingCode(code,phone=null){state.pairingCode=code;if(phone)state.pairingPhone=phone;state.lastUpdate=Date.now();}
function setConnected(v){state.connected=v;if(v){state.qr=null;state.pairingCode=null;state.pairingPhone=null;state.resetInProgress=false;}state.lastUpdate=Date.now();}
function setSocket(sock){state.sock=sock;}
function setResetHandler(h){onResetRequest=h;}
function stateSignature(){return[state.connected?"C":"U",state.qr?"Q":"-",state.pairingCode?"P":"-",state.sock?"R":"-"].join("");}

// ─── Rank helper ──────────────────────────────────────────────────────────────
function getHunterRank(level) {
  if(level>=20) return{label:"S",color:"#ffd700",glow:"rgba(255,215,0,0.4)",bg:"rgba(255,215,0,0.1)"};
  if(level>=15) return{label:"A",color:"#b44fff",glow:"rgba(180,79,255,0.4)",bg:"rgba(180,79,255,0.1)"};
  if(level>=10) return{label:"B",color:"#00c8ff",glow:"rgba(0,200,255,0.4)",bg:"rgba(0,200,255,0.1)"};
  if(level>=5)  return{label:"C",color:"#00ff88",glow:"rgba(0,255,136,0.35)",bg:"rgba(0,255,136,0.08)"};
  if(level>=2)  return{label:"D",color:"#aaaaaa",glow:"rgba(170,170,170,0.2)",bg:"rgba(170,170,170,0.07)"};
  return{label:"E",color:"#555577",glow:"rgba(85,85,119,0.2)",bg:"rgba(85,85,119,0.07)"};
}

// ─── Dashboard HTML ───────────────────────────────────────────────────────────
function renderDashboard() {
  const uptime = Math.floor((Date.now()-state.startedAt)/1000);
  const hh=Math.floor(uptime/3600), mm=Math.floor((uptime%3600)/60);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>SYSTEM — AnimeBot Panel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#030008;
  --bg2:#07000f;
  --bg3:#0a0018;
  --surface:rgba(0,180,255,0.04);
  --surface2:rgba(0,180,255,0.07);
  --border:rgba(0,180,255,0.15);
  --border2:rgba(0,180,255,0.3);
  --blue:#00c8ff;
  --blue2:#0090cc;
  --purple:#9d4eff;
  --green:#00ff88;
  --red:#ff3355;
  --gold:#ffd700;
  --amber:#ffaa00;
  --text:#c8e8ff;
  --text2:rgba(200,232,255,0.5);
  --text3:rgba(200,232,255,0.25);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
html,body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,180,255,0.012) 3px,rgba(0,180,255,0.012) 4px);pointer-events:none;z-index:0}
body::after{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 50% -10%,rgba(0,100,200,0.12),transparent);pointer-events:none;z-index:0}
::-webkit-scrollbar{width:3px;height:3px}
::-webkit-scrollbar-thumb{background:rgba(0,180,255,0.25);border-radius:2px}

/* ── Layout ── */
.wrap{display:flex;min-height:100vh;position:relative;z-index:1}
.sidebar{width:230px;min-width:230px;background:rgba(0,10,30,0.95);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:0;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:50;transition:transform .25s cubic-bezier(.4,0,.2,1);backdrop-filter:blur(20px)}
.main{margin-left:230px;flex:1;padding:24px 28px;min-height:100vh;max-width:calc(100vw - 230px)}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:40;backdrop-filter:blur(6px)}
@media(max-width:768px){
  .sidebar{transform:translateX(-100%)}
  .sidebar.open{transform:translateX(0)}
  .main{margin-left:0;padding:16px;max-width:100vw}
  .overlay.show{display:block}
  .hbtn{display:flex!important}
  .form2{grid-template-columns:1fr!important}
  .stats4{grid-template-columns:1fr 1fr!important}
  .hide-mobile{display:none!important}
}
@media(min-width:769px){.hbtn{display:none!important}.ttitle{display:none!important}}

/* ── Sidebar ── */
.sb-header{padding:20px 16px 14px;border-bottom:1px solid var(--border)}
.sb-logo{font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;color:var(--blue);text-shadow:0 0 20px rgba(0,200,255,0.6);letter-spacing:.05em}
.sb-sub{font-size:10px;color:var(--text3);letter-spacing:.15em;text-transform:uppercase;margin-top:3px;font-family:'Share Tech Mono',monospace}
.sb-status{margin:10px 16px 0;padding:6px 12px;border:1px solid;border-radius:2px;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-family:'Rajdhani',sans-serif;display:flex;align-items:center;gap:7px}
.sb-status.on{border-color:rgba(0,255,136,0.35);color:var(--green);background:rgba(0,255,136,0.06);text-shadow:0 0 8px rgba(0,255,136,0.4)}
.sb-status.off{border-color:rgba(255,51,85,0.35);color:var(--red);background:rgba(255,51,85,0.06);text-shadow:0 0 8px rgba(255,51,85,0.3)}
.sdot{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor;animation:sdotpulse 2s infinite}
@keyframes sdotpulse{0%,100%{opacity:1}50%{opacity:.3}}
.nav-sec{font-size:9px;font-weight:700;color:var(--text3);letter-spacing:.18em;text-transform:uppercase;padding:18px 18px 6px;font-family:'Share Tech Mono',monospace}
.ni{display:flex;align-items:center;gap:10px;padding:9px 16px;cursor:pointer;border:none;background:none;width:100%;text-align:left;color:var(--text2);font-size:13px;font-weight:500;transition:all .15s;border-left:2px solid transparent;text-decoration:none;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:600;letter-spacing:.03em}
.ni:hover{background:rgba(0,180,255,0.06);color:var(--text);border-left-color:rgba(0,180,255,0.3)}
.ni.active{background:rgba(0,180,255,0.1);color:var(--blue);border-left-color:var(--blue);text-shadow:0 0 10px rgba(0,200,255,0.4)}
.ni-icon{width:20px;text-align:center;font-size:15px;flex-shrink:0}
.sb-foot{padding:14px 16px;border-top:1px solid var(--border);margin-top:auto;font-size:10px;color:var(--text3);font-family:'Share Tech Mono',monospace}

/* ── Topbar ── */
.topbar{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.hbtn{align-items:center;justify-content:center;width:36px;height:36px;background:var(--surface);border:1px solid var(--border);border-radius:2px;cursor:pointer;flex-direction:column;gap:4px;padding:0;transition:.15s}
.hbtn span{display:block;width:14px;height:1.5px;background:var(--blue);border-radius:1px}
.pg-title{font-family:'Rajdhani',sans-serif;font-size:1.3rem;font-weight:700;letter-spacing:.06em;color:#fff;text-shadow:0 0 20px rgba(0,200,255,0.3)}
.pg-sub{font-size:11px;color:var(--text3);letter-spacing:.08em;text-transform:uppercase;font-family:'Share Tech Mono',monospace;margin-top:2px}
.conn-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border:1px solid;border-radius:2px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:'Rajdhani',sans-serif}
.conn-pill.on{border-color:rgba(0,255,136,0.35);color:var(--green);background:rgba(0,255,136,0.06)}
.conn-pill.off{border-color:rgba(255,51,85,0.3);color:var(--red);background:rgba(255,51,85,0.05)}

/* ── Pages ── */
.page{display:none}
.page.active{display:block;animation:fadein .18s ease}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* ── Section header ── */
.phead{margin-bottom:22px}
.ptitle{font-family:'Rajdhani',sans-serif;font-size:1.6rem;font-weight:700;letter-spacing:.05em;color:#fff;text-shadow:0 0 30px rgba(0,200,255,0.3)}
.psub{font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.1em;margin-top:4px;font-family:'Share Tech Mono',monospace}

/* ── Cards ── */
.card{background:var(--surface);border:1px solid var(--border);border-radius:2px;padding:20px;position:relative}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--blue),transparent);opacity:.4}
.stitle{font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.18em;margin-bottom:14px;font-family:'Share Tech Mono',monospace;display:flex;align-items:center;gap:8px}
.stitle::before{content:'//';color:var(--blue);opacity:.6}

/* ── Stat cards ── */
.stats4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.sc{background:var(--surface);border:1px solid var(--border);border-radius:2px;padding:16px 18px;position:relative;overflow:hidden}
.sc::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--blue),transparent);opacity:.25}
.sc-val{font-family:'Rajdhani',sans-serif;font-size:2.2rem;font-weight:700;line-height:1;color:var(--blue);text-shadow:0 0 20px rgba(0,200,255,0.5)}
.sc-label{font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:.14em;margin-top:6px;font-family:'Share Tech Mono',monospace}
.sc-corner{position:absolute;top:8px;right:10px;font-size:18px;opacity:.2}

/* ── Toggle ── */
.tog{position:relative;cursor:pointer;display:inline-flex;align-items:center;gap:10px}
.tog input{opacity:0;width:0;height:0;position:absolute}
.trk{width:42px;height:22px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:1px;transition:.2s;position:relative;flex-shrink:0}
.tthumb{position:absolute;width:16px;height:16px;background:rgba(200,232,255,0.4);top:2px;left:2px;transition:.2s;border-radius:1px}
.tog input:checked~.trk{background:rgba(0,200,255,0.15);border-color:rgba(0,200,255,0.5)}
.tog input:checked~.trk .tthumb{transform:translateX(20px);background:var(--blue);box-shadow:0 0 8px rgba(0,200,255,0.6)}
.tog-text{font-size:13px;color:var(--text);font-weight:500}
.tog-desc{font-size:11px;color:var(--text3);margin-top:1px;font-family:'Share Tech Mono',monospace}

/* ── Inputs ── */
.fl{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.12em;display:block;margin-bottom:6px;font-family:'Share Tech Mono',monospace}
.inp{background:rgba(0,10,30,0.8);border:1px solid var(--border);border-radius:2px;padding:9px 12px;color:var(--text);font-size:13px;width:100%;outline:none;transition:all .15s;font-family:'Share Tech Mono',monospace}
.inp:focus{border-color:var(--blue);box-shadow:0 0 0 2px rgba(0,200,255,0.08);background:rgba(0,15,40,0.9)}
.inp::placeholder{color:var(--text3)}
.sel{background:rgba(0,10,30,0.9);border:1px solid var(--border);border-radius:2px;padding:9px 12px;color:var(--text);font-size:13px;width:100%;outline:none;cursor:pointer;-webkit-appearance:none;font-family:'Share Tech Mono',monospace}
.sel option{background:#050018}
.sel:focus{border-color:var(--blue)}
.form2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 18px;border-radius:2px;font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;border:1px solid;text-decoration:none;letter-spacing:.06em;font-family:'Rajdhani',sans-serif;font-size:14px}
.btn-p{background:rgba(0,200,255,0.1);border-color:rgba(0,200,255,0.4);color:var(--blue);text-shadow:0 0 8px rgba(0,200,255,0.3)}
.btn-p:hover{background:rgba(0,200,255,0.18);border-color:var(--blue);box-shadow:0 0 16px rgba(0,200,255,0.2)}
.btn-g{background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.1);color:var(--text2)}
.btn-g:hover{background:rgba(255,255,255,0.08);color:var(--text)}
.btn-d{background:rgba(255,51,85,0.08);border-color:rgba(255,51,85,0.3);color:var(--red)}
.btn-d:hover{background:rgba(255,51,85,0.15)}
.btn-w{background:rgba(255,170,0,0.08);border-color:rgba(255,170,0,0.3);color:var(--amber)}
.btn-w:hover{background:rgba(255,170,0,0.15)}
.btn-sm{padding:5px 10px;font-size:12px}
.btn:disabled{opacity:.35;cursor:not-allowed}

/* ── Row ── */
.row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(0,180,255,0.06)}
.row:last-child{border-bottom:none}

/* ── Rank badge ── */
.rank{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:2px;border:1px solid;font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;flex-shrink:0}

/* ── Table ── */
.tbl{width:100%;border-collapse:collapse}
.tbl th{font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.14em;padding:8px 10px;text-align:left;border-bottom:1px solid var(--border);font-family:'Share Tech Mono',monospace}
.tbl td{padding:10px 10px;border-bottom:1px solid rgba(0,180,255,0.05);font-size:13px;vertical-align:middle}
.tbl tr:last-child td{border-bottom:none}
.tbl tr:hover td{background:rgba(0,180,255,0.03)}
@media(max-width:600px){
  .tbl thead{display:none}
  .tbl tr{display:block;border:1px solid var(--border);margin-bottom:8px;padding:10px}
  .tbl td{display:flex;justify-content:space-between;align-items:center;border:none;padding:5px 4px}
  .tbl td::before{content:attr(data-l);font-size:9px;color:var(--text3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em}
}

/* ── Action row ── */
.arow{display:flex;gap:5px;flex-wrap:wrap}

/* ── Group card ── */
.gcard{background:var(--surface);border:1px solid var(--border);border-radius:2px;padding:16px;margin-bottom:8px;position:relative}
.gcard::before{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:var(--blue);opacity:.5}

/* ── Toast ── */
.toast{position:fixed;bottom:20px;right:20px;left:20px;max-width:340px;margin-left:auto;background:rgba(2,0,15,0.97);border:1px solid rgba(0,200,255,0.3);color:var(--text);padding:12px 16px;border-radius:2px;font-size:13px;font-weight:600;backdrop-filter:blur(20px);transform:translateY(100px);opacity:0;transition:all .25s cubic-bezier(.4,0,.2,1);z-index:9999;box-shadow:0 0 30px rgba(0,0,0,.7),0 0 20px rgba(0,200,255,0.1);letter-spacing:.03em;font-family:'Rajdhani',sans-serif}
.toast.show{transform:translateY(0);opacity:1}

/* ── Spinner ── */
.spin{display:inline-block;width:14px;height:14px;border:1.5px solid rgba(0,200,255,0.2);border-top-color:var(--blue);border-radius:50%;animation:rsp .6s linear infinite}
@keyframes rsp{to{transform:rotate(360deg)}}
.empty{text-align:center;padding:48px 20px;color:var(--text3);font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.empty-icon{font-size:32px;margin-bottom:12px;opacity:.4}

/* ── XP bar ── */
.xpbar{height:3px;background:rgba(0,180,255,0.1);border-radius:0;overflow:hidden;margin-top:4px}
.xpfill{height:100%;background:linear-gradient(90deg,var(--blue2),var(--blue));box-shadow:0 0 6px rgba(0,200,255,0.4);transition:width .3s}

/* ── Decorative corner ── */
.corner-tl::after,.corner-tl::before{content:'';position:absolute;width:8px;height:8px}
.corner-tl::before{top:-1px;left:-1px;border-top:1px solid var(--blue);border-left:1px solid var(--blue)}
.corner-tl::after{bottom:-1px;right:-1px;border-bottom:1px solid var(--blue);border-right:1px solid var(--blue)}

/* ── Gap helpers ── */
.gap12{display:flex;flex-direction:column;gap:12px}
.gap16{display:flex;flex-direction:column;gap:16px}
.mb14{margin-bottom:14px}.mb18{margin-bottom:18px}
</style>
</head>
<body>
<div class="toast" id="toast"></div>
<div class="overlay" id="overlay" onclick="closeSb()"></div>

<div class="wrap">

<!-- ═══ SIDEBAR ═══ -->
<aside class="sidebar" id="sb">
  <div class="sb-header">
    <div class="sb-logo">⚔ ANIMEBOT</div>
    <div class="sb-sub">// SYSTEM PANEL v2.0</div>
  </div>
  <div id="sb-conn" class="sb-status ${state.connected?"on":"off"}">
    <span class="sdot"></span>${state.connected?"ONLINE":"OFFLINE"}
  </div>

  <div class="nav-sec">// GENERAL</div>
  <button class="ni active" onclick="nav('overview',this)"><span class="ni-icon">◈</span> RESUMEN</button>
  <button class="ni" onclick="nav('config',this)"><span class="ni-icon">⚙</span> CONFIGURACIÓN</button>

  <div class="nav-sec">// COMUNIDAD</div>
  <button class="ni" onclick="nav('groups',this)"><span class="ni-icon">◆</span> GRUPOS</button>
  <button class="ni" onclick="nav('users',this)"><span class="ni-icon">◉</span> HUNTERS</button>
  <button class="ni" onclick="nav('mod',this)"><span class="ni-icon">⚡</span> MODERACIÓN</button>

  <div class="nav-sec">// SISTEMA</div>
  <button class="ni" onclick="nav('connection',this)"><span class="ni-icon">⬡</span> GATE STATUS</button>

  <div class="sb-foot">UPTIME: ${hh}H ${mm}M &nbsp;|&nbsp; SYS OK</div>
</aside>

<!-- ═══ MAIN ═══ -->
<main class="main">
  <div class="topbar">
    <button class="hbtn btn" onclick="openSb()" style="border:1px solid var(--border)">
      <span></span><span></span><span></span>
    </button>
    <div>
      <div class="pg-title ttitle" id="ttl">RESUMEN</div>
    </div>
    <div style="margin-left:auto">
      <div id="top-conn" class="conn-pill ${state.connected?"on":"off"}">
        <span class="sdot"></span>${state.connected?"ONLINE":"OFFLINE"}
      </div>
    </div>
  </div>

  <!-- ─── OVERVIEW ─── -->
  <div class="page active" id="page-overview">
    <div class="phead">
      <div class="ptitle">RESUMEN DEL SISTEMA</div>
      <div class="psub">// status overview — datos en tiempo real</div>
    </div>

    <div class="stats4">
      <div class="sc"><div class="sc-corner">◉</div><div class="sc-val" id="s-users">—</div><div class="sc-label">HUNTERS REG.</div></div>
      <div class="sc" style="--blue:#9d4eff"><div class="sc-corner">◆</div><div class="sc-val" id="s-groups" style="color:#9d4eff;text-shadow:0 0 20px rgba(157,78,255,.5)">—</div><div class="sc-label">GRUPOS</div></div>
      <div class="sc" style="--blue:#00ff88"><div class="sc-corner">⬡</div><div class="sc-val" id="s-status" style="color:${state.connected?"#00ff88":"#ff3355"};text-shadow:0 0 20px ${state.connected?"rgba(0,255,136,.5)":"rgba(255,51,85,.4)"}">${state.connected?"⬡ ON":"⬡ OFF"}</div><div class="sc-label">WHATSAPP</div></div>
      <div class="sc" style="--blue:#ffaa00"><div class="sc-corner">⏱</div><div class="sc-val" style="color:#ffaa00;text-shadow:0 0 20px rgba(255,170,0,.4);font-size:1.4rem">${hh}H ${mm}M</div><div class="sc-label">UPTIME</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="form2 mb18">
      <div class="card corner-tl">
        <div class="stitle">CONTROL RÁPIDO</div>
        <div class="gap16">
          <label class="tog">
            <input type="checkbox" id="q-as" onchange="quickSet('antiSpam',{enabled:this.checked})">
            <div class="trk"><div class="tthumb"></div></div>
            <div><div class="tog-text">Anti-Spam Global</div><div class="tog-desc">limite de mensajes/seg</div></div>
          </label>
          <label class="tog">
            <input type="checkbox" id="q-ec" onchange="quickSet('economy',{enabled:this.checked})">
            <div class="trk"><div class="tthumb"></div></div>
            <div><div class="tog-text">Sistema Economía</div><div class="tog-desc">monedas y waifus</div></div>
          </label>
          <label class="tog">
            <input type="checkbox" id="q-lk" onchange="quickSet('antiSpam',{deleteLinks:this.checked})">
            <div class="trk"><div class="tthumb"></div></div>
            <div><div class="tog-text">Borrar Links</div><div class="tog-desc">eliminar URLs en grupos</div></div>
          </label>
        </div>
      </div>
      <div class="card corner-tl">
        <div class="stitle">CONFIG ACTIVA</div>
        <div class="gap12">
          <div class="row"><span style="font-size:11px;color:var(--text3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">NOMBRE</span><span id="inf-name" style="font-weight:700;font-family:'Rajdhani',sans-serif;font-size:15px">—</span></div>
          <div class="row"><span style="font-size:11px;color:var(--text3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">PREFIJO</span><span id="inf-prefix" style="color:var(--blue);font-family:'Share Tech Mono',monospace;font-size:15px;text-shadow:0 0 8px rgba(0,200,255,.4)">—</span></div>
          <div class="row"><span style="font-size:11px;color:var(--text3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">COOLDOWN</span><span id="inf-cool" style="font-weight:700;font-family:'Share Tech Mono',monospace">—</span></div>
          <div class="row"><span style="font-size:11px;color:var(--text3);font-family:'Share Tech Mono',monospace;text-transform:uppercase;letter-spacing:.1em">SPAM MÁX/S</span><span id="inf-spam" style="font-weight:700;font-family:'Share Tech Mono',monospace">—</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── CONFIG ─── -->
  <div class="page" id="page-config">
    <div class="phead"><div class="ptitle">CONFIGURACIÓN</div><div class="psub">// ajustes aplicados en tiempo real</div></div>

    <div class="card mb14">
      <div class="stitle">GENERAL</div>
      <div class="form2 mb14">
        <div><label class="fl">NOMBRE DEL BOT</label><input class="inp" id="c-name" placeholder="AnimeBot"></div>
        <div><label class="fl">PREFIJO</label><input class="inp" id="c-pre" placeholder="!" style="max-width:90px"></div>
        <div><label class="fl">NÚMERO DUEÑO</label><input class="inp" id="c-own" placeholder="5215512345678" type="tel"></div>
        <div><label class="fl">COOLDOWN (SEG)</label><input class="inp" id="c-cool" type="number" min="0" placeholder="10"></div>
      </div>
      <button class="btn btn-p" onclick="saveSec('general')">► GUARDAR</button>
    </div>

    <div class="card mb14">
      <div class="stitle">ANTI-SPAM</div>
      <div class="gap16 mb14">
        <label class="tog"><input type="checkbox" id="c-as-en"><div class="trk"><div class="tthumb"></div></div><div class="tog-text">Activar Anti-Spam</div></label>
        <label class="tog"><input type="checkbox" id="c-as-dl"><div class="trk"><div class="tthumb"></div></div><div class="tog-text">Eliminar Links Automáticamente</div></label>
        <div style="max-width:180px"><label class="fl">MÁX. MSG/SEG</label><input class="inp" id="c-as-max" type="number" min="1" placeholder="5"></div>
      </div>
      <button class="btn btn-p" onclick="saveSec('antispam')">► GUARDAR</button>
    </div>

    <div class="card mb14">
      <div class="stitle">ECONOMÍA</div>
      <label class="tog mb14" style="display:inline-flex;margin-bottom:14px"><input type="checkbox" id="c-ec-en"><div class="trk"><div class="tthumb"></div></div><div class="tog-text">Activar Sistema de Economía</div></label>
      <div class="form2 mb14">
        <div><label class="fl">MONEDAS/MENSAJE</label><input class="inp" id="c-ec-msg" type="number" min="0" placeholder="2"></div>
        <div><label class="fl">MONEDAS/COMANDO</label><input class="inp" id="c-ec-cmd" type="number" min="0" placeholder="5"></div>
        <div><label class="fl">RECOMPENSA DIARIA</label><input class="inp" id="c-ec-day" type="number" min="0" placeholder="100"></div>
        <div><label class="fl">COSTO WAIFU</label><input class="inp" id="c-ec-wai" type="number" min="0" placeholder="50"></div>
      </div>
      <button class="btn btn-p" onclick="saveSec('economy')">► GUARDAR</button>
    </div>

    <div class="card">
      <div class="stitle">XP Y NIVELES</div>
      <div class="form2 mb14">
        <div><label class="fl">XP/MENSAJE</label><input class="inp" id="c-lv-msg" type="number" min="0" placeholder="5"></div>
        <div><label class="fl">XP/COMANDO</label><input class="inp" id="c-lv-cmd" type="number" min="0" placeholder="15"></div>
        <div><label class="fl">MULTIPLICADOR</label><input class="inp" id="c-lv-mul" type="number" min="1" placeholder="250"></div>
        <div><label class="fl">COOLDOWN XP (SEG)</label><input class="inp" id="c-lv-cool" type="number" min="0" placeholder="30"></div>
      </div>
      <button class="btn btn-p" onclick="saveSec('level')">► GUARDAR</button>
    </div>
  </div>

  <!-- ─── GROUPS ─── -->
  <div class="page" id="page-groups">
    <div class="phead" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><div class="ptitle">GRUPOS</div><div class="psub">// configuración por dungeon</div></div>
      <button class="btn btn-g btn-sm" style="margin-left:auto" onclick="loadGroups()">↻ SYNC</button>
    </div>
    <div id="groups-list"><div class="empty"><div class="empty-icon">◆</div>CARGANDO DUNGEONS...</div></div>
  </div>

  <!-- ─── USERS / HUNTERS ─── -->
  <div class="page" id="page-users">
    <div class="phead" style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><div class="ptitle">REGISTRO DE HUNTERS</div><div class="psub">// clasificados por puntos de experiencia</div></div>
      <button class="btn btn-g btn-sm" style="margin-left:auto" onclick="loadUsers()">↻ SYNC</button>
    </div>
    <div id="users-list"><div class="empty"><div class="empty-icon">◉</div>CARGANDO HUNTERS...</div></div>
  </div>

  <!-- ─── MOD ─── -->
  <div class="page" id="page-mod">
    <div class="phead"><div class="ptitle">MODERACIÓN</div><div class="psub">// gestión de hunters por dungeon</div></div>
    <div class="card mb14">
      <div class="stitle">SELECCIONAR DUNGEON</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="sel" id="mod-sel" onchange="loadModMembers()" style="flex:1;min-width:0">
          <option value="">— SELECCIONA UN GRUPO —</option>
        </select>
        <button class="btn btn-g btn-sm" onclick="loadModGroups()">↻</button>
      </div>
    </div>
    <div id="mod-content"><div class="empty"><div class="empty-icon">⚡</div>SELECCIONA UN GRUPO PARA GESTIONAR</div></div>
  </div>

  <!-- ─── CONNECTION ─── -->
  <div class="page" id="page-connection">
    <div class="phead"><div class="ptitle">GATE STATUS</div><div class="psub">// estado de conexión con whatsapp</div></div>
    <div class="card" style="max-width:460px">
      <div id="conn-content"><div class="empty"><span class="spin"></span></div></div>
    </div>
  </div>

</main>
</div>

<script>
// ── Sidebar ──────────────────────────────────────────────────────────────────
function openSb(){document.getElementById('sb').classList.add('open');document.getElementById('overlay').classList.add('show')}
function closeSb(){document.getElementById('sb').classList.remove('open');document.getElementById('overlay').classList.remove('show')}

// ── Navigation ────────────────────────────────────────────────────────────────
const TITLES={overview:'RESUMEN',config:'CONFIGURACIÓN',groups:'GRUPOS',users:'HUNTERS',mod:'MODERACIÓN',connection:'GATE STATUS'};
function nav(name,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el) el.classList.add('active');
  const t=document.getElementById('ttl'); if(t) t.textContent=TITLES[name]||name;
  closeSb();
  if(name==='overview'||name==='config') loadConfig();
  if(name==='groups') loadGroups();
  if(name==='users') loadUsers();
  if(name==='mod') loadModGroups();
  if(name==='connection') loadConnection();
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let _tt;
function toast(msg,ok=true){
  const el=document.getElementById('toast');
  el.textContent=(ok?'[ OK ] ':' [ERR] ')+msg;
  el.style.borderColor=ok?'rgba(0,200,255,0.4)':'rgba(255,51,85,0.4)';
  el.style.color=ok?'var(--blue)':'var(--red)';
  el.classList.add('show');clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),3000);
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
    const s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};
    const sc=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=!!v};
    const sv=(id,v)=>{const e=document.getElementById(id);if(e&&v!==undefined)e.value=v};
    s('inf-name',c.botName);s('inf-prefix',c.prefix);s('inf-cool',(c.commandCooldown??0)+'S');s('inf-spam',c.antiSpam?.maxMessagesPerSecond);
    sc('q-as',c.antiSpam?.enabled);sc('q-ec',c.economy?.enabled);sc('q-lk',c.antiSpam?.deleteLinks);
    sv('c-name',c.botName);sv('c-pre',c.prefix);sv('c-own',c.ownerNumber);sv('c-cool',c.commandCooldown);
    sc('c-as-en',c.antiSpam?.enabled);sc('c-as-dl',c.antiSpam?.deleteLinks);sv('c-as-max',c.antiSpam?.maxMessagesPerSecond);
    sc('c-ec-en',c.economy?.enabled);sv('c-ec-msg',c.economy?.coinsPerMessage);sv('c-ec-cmd',c.economy?.coinsPerCommand);sv('c-ec-day',c.economy?.dailyReward);sv('c-ec-wai',c.economy?.waifuCost);
    sv('c-lv-msg',c.level?.xpPerMessage);sv('c-lv-cmd',c.level?.xpPerCommand);sv('c-lv-mul',c.level?.levelMultiplier);sv('c-lv-cool',c.level?.xpCooldownSeconds);
  }catch(e){console.error(e)}
}

async function saveSec(sec){
  const gv=id=>{const e=document.getElementById(id);return e?e.value:null};
  const gn=id=>{const v=gv(id);return v!==null&&v!==''?Number(v):undefined};
  const gc=id=>{const e=document.getElementById(id);return e?e.checked:undefined};
  let body={};
  if(sec==='general'){const n=gv('c-name'),p=gv('c-pre'),o=gv('c-own'),c=gn('c-cool');if(n)body.botName=n;if(p)body.prefix=p;if(o)body.ownerNumber=o;if(c!==undefined)body.commandCooldown=c;}
  else if(sec==='antispam') body.antiSpam={enabled:gc('c-as-en'),deleteLinks:gc('c-as-dl'),maxMessagesPerSecond:gn('c-as-max')};
  else if(sec==='economy') body.economy={enabled:gc('c-ec-en'),coinsPerMessage:gn('c-ec-msg'),coinsPerCommand:gn('c-ec-cmd'),dailyReward:gn('c-ec-day'),waifuCost:gn('c-ec-wai')};
  else if(sec==='level') body.level={xpPerMessage:gn('c-lv-msg'),xpPerCommand:gn('c-lv-cmd'),levelMultiplier:gn('c-lv-mul'),xpCooldownSeconds:gn('c-lv-cool')};
  try{await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});toast('CONFIGURACIÓN GUARDADA');loadConfig();}
  catch(e){toast(e.message,false);}
}

async function quickSet(sec,data){
  try{await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[sec]:data})});toast(Object.keys(data)[0].toUpperCase()+' ACTUALIZADO');}
  catch(e){toast(e.message,false);}
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats(){
  try{
    const s=await api('/api/stats');
    const se=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};
    se('s-users',s.users);se('s-groups',s.groups);
    const el=document.getElementById('s-status');
    if(el){el.textContent=s.connected?'⬡ ON':'⬡ OFF';el.style.color=s.connected?'var(--green)':'var(--red)';}
  }catch{}
}

// ── Groups ────────────────────────────────────────────────────────────────────
async function loadGroups(){
  const el=document.getElementById('groups-list');
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try{
    const groups=await api('/api/groups');
    if(!groups.length){el.innerHTML='<div class="empty"><div class="empty-icon">◆</div>SIN DUNGEONS REGISTRADOS</div>';return;}
    el.innerHTML=groups.map(g=>{
      const name=g.name||g.jid.split('@')[0];
      const num=g.jid.split('@')[0];
      const label=g.name?g.name:num;
      return \`<div class="gcard">
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;flex-wrap:wrap">
          <div style="flex:1;min-width:0">
            <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:16px;letter-spacing:.03em;color:#fff">\${label}</div>
            \${g.name?'<div style="font-size:11px;color:var(--text3);font-family:Share Tech Mono,monospace;margin-top:2px">'+num+'</div>':''}
          </div>
          <div style="font-size:10px;color:var(--text3);font-family:Share Tech Mono,monospace;text-align:right;white-space:nowrap">◆ DUNGEON</div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:18px">
          <label class="tog">
            <input type="checkbox" \${g.antiLink?'checked':''} onchange="updateGroup('\${g.jid}','antiLink',this.checked)">
            <div class="trk"><div class="tthumb"></div></div><div class="tog-text" style="font-size:12px">ANTI-LINK</div>
          </label>
          <label class="tog">
            <input type="checkbox" \${g.antiSpam!==false?'checked':''} onchange="updateGroup('\${g.jid}','antiSpam',this.checked)">
            <div class="trk"><div class="tthumb"></div></div><div class="tog-text" style="font-size:12px">ANTI-SPAM</div>
          </label>
          <label class="tog">
            <input type="checkbox" \${g.welcome!==false?'checked':''} onchange="updateGroup('\${g.jid}','welcome',this.checked)">
            <div class="trk"><div class="tthumb"></div></div><div class="tog-text" style="font-size:12px">BIENVENIDA</div>
          </label>
        </div>
      </div>\`;
    }).join('');
  }catch(e){el.innerHTML=\`<div class="empty"><div class="empty-icon">⚠</div>\${e.message}</div>\`;}
}

async function updateGroup(jid,key,val){
  try{await api('/api/groups/'+encodeURIComponent(jid),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:val})});toast(key+(val?' ACTIVADO':' DESACTIVADO'));}
  catch(e){toast(e.message,false);}
}

// ── Users / Hunters ───────────────────────────────────────────────────────────
function rankOf(lvl){
  if(lvl>=20)return{label:'S',color:'#ffd700',glow:'rgba(255,215,0,0.5)',bg:'rgba(255,215,0,0.1)'};
  if(lvl>=15)return{label:'A',color:'#b44fff',glow:'rgba(180,79,255,0.4)',bg:'rgba(180,79,255,0.1)'};
  if(lvl>=10)return{label:'B',color:'#00c8ff',glow:'rgba(0,200,255,0.4)',bg:'rgba(0,200,255,0.1)'};
  if(lvl>=5) return{label:'C',color:'#00ff88',glow:'rgba(0,255,136,0.35)',bg:'rgba(0,255,136,0.07)'};
  if(lvl>=2) return{label:'D',color:'#aaaaaa',glow:'rgba(170,170,170,0.2)',bg:'rgba(170,170,170,0.06)'};
  return{label:'E',color:'#555577',glow:'rgba(85,85,119,0.15)',bg:'rgba(85,85,119,0.06)'};
}

async function loadUsers(){
  const el=document.getElementById('users-list');
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try{
    const users=await api('/api/users');
    if(!users.length){el.innerHTML='<div class="empty"><div class="empty-icon">◉</div>SIN HUNTERS REGISTRADOS</div>';return;}
    el.innerHTML=\`<div class="card" style="overflow-x:auto">
      <table class="tbl">
        <thead><tr>
          <th>RNK</th><th>HUNTER</th><th>NIVEL</th><th>EXP</th><th>MONEDAS</th><th>MENSAJES</th>
        </tr></thead>
        <tbody>
        \${users.slice(0,60).map((u,i)=>{
          const r=rankOf(u.level||1);
          const displayName=u.name||(u.jid.split('@')[0].split(':')[0]);
          const num=u.jid.split('@')[0].split(':')[0];
          const needNum=u.name&&u.name!==num;
          const xpNeeded=(u.level||1)*250;
          const pct=Math.min(100,Math.round(((u.xp||0)/xpNeeded)*100));
          return \`<tr>
            <td data-l="#">
              <div style="font-family:'Share Tech Mono',monospace;color:var(--text3);font-size:12px">#\${i+1}</div>
            </td>
            <td data-l="HUNTER">
              <div style="display:flex;align-items:center;gap:10px">
                <div class="rank" style="color:\${r.color};border-color:\${r.color};background:\${r.bg};box-shadow:0 0 10px \${r.glow}">\${r.label}</div>
                <div>
                  <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:15px;letter-spacing:.03em">\${displayName}</div>
                  \${needNum?'<div style="font-size:10px;color:var(--text3);font-family:Share Tech Mono,monospace">+'+num+'</div>':''}
                </div>
              </div>
            </td>
            <td data-l="NIVEL">
              <div style="font-family:'Rajdhani',sans-serif;font-weight:700;color:\${r.color};text-shadow:0 0 8px \${r.glow}">LV.\${u.level||1}</div>
              <div class="xpbar"><div class="xpfill" style="width:\${pct}%;background:linear-gradient(90deg,\${r.color}88,\${r.color});box-shadow:0 0 6px \${r.glow}"></div></div>
            </td>
            <td data-l="EXP"><span style="font-family:'Share Tech Mono',monospace;color:var(--blue)">\${(u.xp||0).toLocaleString()}</span></td>
            <td data-l="MONEDAS"><span style="font-family:'Share Tech Mono',monospace">🪙 \${(u.coins||0).toLocaleString()}</span></td>
            <td data-l="MENSAJES"><span style="font-family:'Share Tech Mono',monospace;color:var(--text2)">\${(u.messages||0).toLocaleString()}</span></td>
          </tr>\`;
        }).join('')}
        </tbody>
      </table>
      \${users.length>60?'<div style="text-align:center;padding:10px;font-size:10px;color:var(--text3);font-family:Share Tech Mono,monospace">MOSTRANDO PRIMEROS 60 DE '+users.length+' HUNTERS</div>':''}
    </div>\`;
  }catch(e){el.innerHTML=\`<div class="empty"><div class="empty-icon">⚠</div>\${e.message}</div>\`;}
}

// ── Moderación ────────────────────────────────────────────────────────────────
async function loadModGroups(){
  try{
    const groups=await api('/api/groups');
    const sel=document.getElementById('mod-sel');
    const prev=sel.value;
    sel.innerHTML='<option value="">— SELECCIONA UN GRUPO —</option>';
    groups.forEach(g=>{
      const opt=document.createElement('option');
      opt.value=g.jid;
      opt.textContent=g.name||g.jid.split('@')[0];
      sel.appendChild(opt);
    });
    if(prev&&groups.find(g=>g.jid===prev)){sel.value=prev;loadModMembers();}
  }catch(e){toast(e.message,false);}
}

async function loadModMembers(){
  const jid=document.getElementById('mod-sel').value;
  const el=document.getElementById('mod-content');
  if(!jid){el.innerHTML='<div class="empty"><div class="empty-icon">⚡</div>SELECCIONA UN GRUPO</div>';return;}
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try{
    const d=await api('/api/mod/group/'+encodeURIComponent(jid));
    if(!d.members||!d.members.length){el.innerHTML='<div class="empty"><div class="empty-icon">◉</div>SIN MIEMBROS PARA MODERAR</div>';return;}
    const mutedSet=new Set(d.muted||[]);
    const warns=d.warnings||{};
    el.innerHTML=\`<div class="card" style="overflow-x:auto">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px">
        <div>
          <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:16px">\${d.groupName||jid.split('@')[0]}</div>
          <div style="font-size:10px;color:var(--text3);font-family:Share Tech Mono,monospace;margin-top:2px">\${d.members.length} HUNTERS EN DUNGEON</div>
        </div>
      </div>
      <table class="tbl">
        <thead><tr><th>HUNTER</th><th>ESTADO</th><th>WARNS</th><th>ACCIONES</th></tr></thead>
        <tbody>
        \${d.members.map(m=>{
          const num=m.jid.split('@')[0].split(':')[0];
          const isMuted=mutedSet.has(m.jid);
          const w=warns[m.jid]||0;
          const r=rankOf(1);
          return \`<tr>
            <td data-l="HUNTER">
              <div style="display:flex;align-items:center;gap:8px">
                \${m.isAdmin?'<div style="font-size:9px;font-family:Share Tech Mono,monospace;color:var(--gold);border:1px solid rgba(255,215,0,.4);padding:1px 6px;border-radius:2px">ADMIN</div>':''}
                <div>
                  <div style="font-family:'Rajdhani',sans-serif;font-weight:700;font-size:14px">\${m.name||num}</div>
                  \${m.name?'<div style="font-size:10px;color:var(--text3);font-family:Share Tech Mono,monospace">+\${num}</div>':''}
                </div>
              </div>
            </td>
            <td data-l="ESTADO">
              \${isMuted
                ?'<span style="font-size:10px;font-family:Share Tech Mono,monospace;color:var(--red);border:1px solid rgba(255,51,85,.3);padding:2px 7px;letter-spacing:.1em">MUTEADO</span>'
                :'<span style="font-size:10px;font-family:Share Tech Mono,monospace;color:var(--green);border:1px solid rgba(0,255,136,.25);padding:2px 7px;letter-spacing:.1em">ACTIVO</span>'
              }
            </td>
            <td data-l="WARNS">
              <span style="font-family:'Share Tech Mono',monospace;color:\${w>0?'var(--amber)':'var(--text3)'};\${w>0?'text-shadow:0 0 8px rgba(255,170,0,.4)':''}">\${w} ⚠</span>
            </td>
            <td data-l="ACCIONES">
              <div class="arow">
                <button class="btn btn-w btn-sm" onclick="modAct('\${jid}','\${m.jid}','\${isMuted?'unmute':'mute'}')" \${m.isAdmin?'disabled':''}>
                  \${isMuted?'DESMUTEAR':'MUTEAR'}
                </button>
                <button class="btn btn-w btn-sm" onclick="modAct('\${jid}','\${m.jid}','warn')" \${m.isAdmin?'disabled':''}>+WARN</button>
                <button class="btn btn-g btn-sm" onclick="modAct('\${jid}','\${m.jid}','clearwarns')" \${w===0?'disabled':''}>CLR WARNS</button>
                <button class="btn btn-d btn-sm" onclick="confirmKick('\${jid}','\${m.jid}')" \${m.isAdmin?'disabled':''}>EXPULSAR</button>
              </div>
            </td>
          </tr>\`;
        }).join('')}
        </tbody>
      </table>
    </div>\`;
  }catch(e){el.innerHTML=\`<div class="empty"><div class="empty-icon">⚠</div>\${e.message}</div>\`;}
}

async function modAct(gJid,uJid,action){
  try{
    await api('/api/mod/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupJid:gJid,userJid:uJid,action})});
    const L={mute:'MUTEADO',unmute:'DESMUTEADO',warn:'ADVERTENCIA AÑADIDA',clearwarns:'WARNS BORRADOS',kick:'EXPULSADO'};
    toast(L[action]||action.toUpperCase()+' OK');
    loadModMembers();
  }catch(e){toast(e.message,false);}
}

function confirmKick(gJid,uJid){
  const num=uJid.split('@')[0];
  if(!confirm('EXPULSAR: '+num+'\\n\\nEsta acción no se puede deshacer.')) return;
  modAct(gJid,uJid,'kick');
}

// ── Connection ────────────────────────────────────────────────────────────────
async function loadConnection(){
  const el=document.getElementById('conn-content');
  try{
    const s=await api('/status');
    if(s.connected){
      el.innerHTML=\`<div style="text-align:center;padding:28px">
        <div style="font-size:48px;margin-bottom:12px;filter:drop-shadow(0 0 20px rgba(0,255,136,0.6))">⬡</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;font-weight:700;color:var(--green);text-shadow:0 0 12px rgba(0,255,136,.5);letter-spacing:.08em;margin-bottom:6px">GATE ABIERTO</div>
        <div style="font-size:11px;color:var(--text3);font-family:Share Tech Mono,monospace;margin-bottom:24px">conexión whatsapp activa — sistema operativo</div>
        <button class="btn btn-d" onclick="resetSession()">⬡ CERRAR GATE Y RE-VINCULAR</button>
        <div id="reset-msg" style="margin-top:10px;font-size:12px;font-family:Share Tech Mono,monospace;color:var(--text3)"></div>
      </div>\`;
    }else{
      el.innerHTML=\`<div style="text-align:center;padding:28px">
        <div style="font-size:48px;margin-bottom:12px;opacity:.4;filter:drop-shadow(0 0 10px rgba(255,51,85,0.4))">⬡</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:1.2rem;font-weight:700;color:var(--amber);text-shadow:0 0 12px rgba(255,170,0,.5);letter-spacing:.08em;margin-bottom:6px">GATE SIN ABRIR</div>
        <div style="font-size:11px;color:var(--text3);font-family:Share Tech Mono,monospace;margin-bottom:24px">esperando vinculación con whatsapp</div>
        <a href="/" target="_blank" class="btn btn-p" style="text-decoration:none">► ABRIR PÁGINA DE VINCULACIÓN</a>
      </div>\`;
    }
  }catch(e){el.innerHTML='<div class="empty"><div class="empty-icon">⚠</div>'+e.message+'</div>';}
}

async function resetSession(){
  if(!confirm('¿CERRAR GATE?\\nTendrás que re-vincular WhatsApp.\\nLos datos de hunters NO se borran.')) return;
  const msg=document.getElementById('reset-msg');
  try{
    await api('/reset',{method:'POST'});
    if(msg) msg.textContent='// GATE CERRADO. RECARGANDO EN 15S...';
    setTimeout(()=>location.reload(),12000);
  }catch(e){if(msg) msg.textContent='// ERROR: '+e.message;}
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadConfig();
loadStats();
setInterval(loadStats,30000);
setInterval(loadConfig,60000);
</script>
</body>
</html>`;
}

// ─── Pairing page ─────────────────────────────────────────────────────────────
function renderPage() {
  const connected=state.connected,hasQR=!!state.qr,hasCode=!!state.pairingCode,ready=!!state.sock;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AnimeBot — Vinculación</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:linear-gradient(135deg,#1a0033,#4a0080,#ff1493);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.card{background:rgba(0,0,0,.55);backdrop-filter:blur(12px);border-radius:20px;padding:28px;max-width:520px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1)}
h1{margin:0 0 6px;font-size:1.7em}.sub{opacity:.75;font-size:.9em;margin-bottom:14px}
.status{display:inline-block;padding:6px 14px;border-radius:20px;font-size:.85em;margin:6px 0;font-weight:600}
.ok{background:#10b981}.wait{background:#f59e0b;color:#1a0033}.err{background:#ef4444}
.tabs{display:flex;gap:6px;margin:18px 0 0;background:rgba(0,0,0,.35);padding:5px;border-radius:12px}
.tab{flex:1;padding:10px;border-radius:9px;cursor:pointer;font-size:.95em;font-weight:600;border:none;background:transparent;color:#fff;opacity:.65;transition:all .2s}
.tab.active{background:linear-gradient(135deg,#ff1493,#ff8ec7);opacity:1}
.panel{display:none;padding:20px 0 6px}.panel.active{display:block}
.qr-wrap{background:#fff;padding:14px;border-radius:14px;display:inline-block}.qr-wrap img{display:block;width:240px;height:240px}
.form{display:flex;flex-direction:column;gap:10px;margin:8px auto;max-width:300px}
.form input{padding:11px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:1em;outline:none}
.btn{padding:11px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#ff1493,#ff8ec7);color:#fff;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.25)}
.code{font-family:monospace;font-size:1.9em;letter-spacing:5px;background:rgba(255,255,255,.12);padding:16px;border-radius:12px;margin:12px 0;font-weight:bold}
.help{font-size:.83em;line-height:1.55;opacity:.8;margin-top:14px;text-align:left;background:rgba(0,0,0,.3);padding:12px 14px;border-radius:10px}
.help ol{padding-left:18px;margin:6px 0}.help strong{color:#ffd1e6}
.footer{margin-top:16px;font-size:.7em;opacity:.45}
.danger-zone{margin-top:20px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}
.msg{padding:10px 14px;border-radius:10px;margin:10px 0;font-size:.88em;display:none}
.msg.show{display:block}.msg.error{background:rgba(239,68,68,.2);border:1px solid #ef4444}.msg.success{background:rgba(16,185,129,.2);border:1px solid #10b981}
.spin{display:inline-block;width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite;vertical-align:middle;margin-right:5px}
@keyframes sp{to{transform:rotate(360deg)}}
.db-link{display:inline-block;margin-top:14px;padding:8px 18px;border-radius:8px;background:rgba(255,255,255,.1);color:#fff;text-decoration:none;font-size:.85em;font-weight:600}
.db-link:hover{background:rgba(255,255,255,.18)}
</style>
</head>
<body>
<div class="card">
  <h1>🌸 AnimeBot</h1>
  ${connected?`<div class="status ok">✅ Conectado a WhatsApp</div><p style="opacity:.85">El bot está funcionando.</p><div class="danger-zone"><p style="font-size:.84em;opacity:.65;margin:0 0 10px">¿Re-vincular?</p><button id="reset-btn" class="btn ghost">🔄 Cerrar sesión y re-vincular</button><div id="reset-msg" class="msg"></div></div>`:
  !ready?`<div class="status err"><span class="spin"></span>Iniciando bot...</div>`:
  `<div class="status wait">⏳ Esperando vinculación</div><p class="sub">Elige tu método</p>
  <div class="tabs"><button class="tab ${!hasCode?"active":""}" data-tab="qr">📷 QR</button><button class="tab ${hasCode?"active":""}" data-tab="code">🔢 Código</button></div>
  <div id="panel-qr" class="panel ${!hasCode?"active":""}">
    ${hasQR?'<div class="qr-wrap" id="qr-slot"></div>':`<p style="opacity:.6;padding:24px 0"><span class="spin"></span> Generando QR...</p>`}
    <div class="help"><strong>Cómo escanear:</strong><ol><li>Abre WhatsApp</li><li>Ajustes → Dispositivos vinculados</li><li>Vincular dispositivo → escanear QR</li></ol></div>
  </div>
  <div id="panel-code" class="panel ${hasCode?"active":""}">
    ${hasCode?`<p style="margin:6px 0;opacity:.85">Código para <strong>+${state.pairingPhone||"tu número"}</strong>:</p><div class="code">${state.pairingCode}</div><form id="code-form" style="margin-top:10px"><button type="button" class="btn ghost" style="font-size:.84em;padding:7px 13px" onclick="location.reload()">Generar otro</button></form>`:
    `<form id="code-form" class="form"><label style="font-size:.84em;opacity:.8;text-align:left">Número con código de país (sin +):</label><input id="phone" type="tel" inputmode="numeric" pattern="[0-9]{8,16}" placeholder="56912345678" required><button id="code-btn" type="submit" class="btn">Generar código</button><div id="code-msg" class="msg"></div></form>`}
    <div class="help"><strong>Usar código:</strong><ol><li>WhatsApp → Dispositivos vinculados</li><li>Vincular con número de teléfono</li><li>Ingresa el código</li></ol></div>
  </div>`}
  <div class="footer">Última act: ${new Date(state.lastUpdate).toLocaleTimeString("es-CL")}</div>
  <a href="/dashboard" class="db-link">⚔ Ir al System Panel →</a>
</div>
<script>
let lastSig=${JSON.stringify(stateSignature())};
async function poll(){try{const r=await fetch('/status');const j=await r.json();if(j.signature!==lastSig){lastSig=j.signature;if(!document.activeElement||document.activeElement.tagName!=='INPUT')location.reload();}}catch(_){}}
setInterval(poll,3500);
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t.dataset.tab));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+t.dataset.tab));}));
const cf=document.getElementById('code-form');
if(cf){cf.addEventListener('submit',async e=>{e.preventDefault();const phone=document.getElementById('phone').value.trim();const btn=document.getElementById('code-btn');const msg=document.getElementById('code-msg');msg.className='msg';btn.disabled=true;btn.innerHTML='<span class="spin"></span>Generando...';try{const r=await fetch('/pairing-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Error');msg.className='msg show success';msg.textContent='✅ Generado. Recargando...';setTimeout(()=>location.reload(),800);}catch(err){msg.className='msg show error';msg.textContent='❌ '+err.message;btn.disabled=false;btn.textContent='Generar código';}});}
const rb=document.getElementById('reset-btn');
if(rb){rb.addEventListener('click',async()=>{if(!confirm('¿Cerrar la sesión? Los datos de usuarios NO se borran.'))return;const msg=document.getElementById('reset-msg');rb.disabled=true;rb.innerHTML='<span class="spin"></span>Reseteando...';try{const r=await fetch('/reset',{method:'POST'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Error');msg.className='msg show success';msg.textContent='✅ Sesión cerrada. Recarga en 15s.';setTimeout(()=>location.reload(),12000);}catch(err){msg.className='msg show error';msg.textContent='❌ '+err.message;rb.disabled=false;rb.textContent='🔄 Re-vincular';}});}
</script>
</body>
</html>`;
}

// ─── Server ───────────────────────────────────────────────────────────────────
function startWebServer(port) {
  const app = express();
  app.use(express.json());

  app.get("/", async (req,res) => {
    let html = renderPage();
    if (state.qr) { try { const d=await QRCode.toDataURL(state.qr,{width:260,margin:2}); html=html.replace('<div class="qr-wrap" id="qr-slot"></div>',`<div class="qr-wrap"><img src="${d}" alt="QR"></div>`); }catch(_){} }
    res.setHeader("Content-Type","text/html; charset=utf-8").setHeader("Cache-Control","no-store").send(html);
  });

  app.get("/dashboard",(req,res)=>{res.setHeader("Content-Type","text/html; charset=utf-8").setHeader("Cache-Control","no-store").send(renderDashboard());});

  app.get("/status",(req,res)=>res.json({signature:stateSignature(),connected:state.connected,hasQR:!!state.qr,hasPairingCode:!!state.pairingCode,ready:!!state.sock,lastUpdate:state.lastUpdate}));

  app.get("/api/config",(req,res)=>{try{res.json(getMergedConfig());}catch(e){res.status(500).json({error:e.message});}});
  app.post("/api/config",(req,res)=>{try{applyOverrides(req.body||{});res.json({ok:true,config:getMergedConfig()});}catch(e){res.status(500).json({error:e.message});}});

  app.get("/api/stats",(req,res)=>{
    try{
      const db=require("../database/db");
      const users=db.getAllUsers();
      let gc=0;try{const gf=path.join(__dirname,"..","database","data","groups.json");if(fs.existsSync(gf))gc=Object.keys(JSON.parse(fs.readFileSync(gf,"utf-8"))).length;}catch{}
      res.json({users:users.length,groups:gc,connected:state.connected,uptime:Math.floor((Date.now()-state.startedAt)/1000)});
    }catch(e){res.status(500).json({error:e.message});}
  });

  app.get("/api/users",(req,res)=>{
    try{const db=require("../database/db");res.json(db.getAllUsers().sort((a,b)=>(b.xp||0)-(a.xp||0)));}
    catch(e){res.status(500).json({error:e.message});}
  });

  app.get("/api/groups",(req,res)=>{
    try{
      const gf=path.join(__dirname,"..","database","data","groups.json");
      const groups=fs.existsSync(gf)?JSON.parse(fs.readFileSync(gf,"utf-8")):{};
      res.json(Object.values(groups).map(g=>({jid:g.jid,name:g.name||"",antiLink:g.antiLink??false,antiSpam:g.antiSpam??true,welcome:g.welcome??true})));
    }catch(e){res.status(500).json({error:e.message});}
  });

  app.post("/api/groups/:jid",(req,res)=>{
    try{
      const db=require("../database/db");
      const jid=decodeURIComponent(req.params.jid);
      const safe={};
      for(const k of["antiLink","antiSpam","welcome"]) if(req.body[k]!==undefined) safe[k]=!!req.body[k];
      db.updateGroup(jid,safe);res.json({ok:true});
    }catch(e){res.status(500).json({error:e.message});}
  });

  app.get("/api/mod/group/:jid", async(req,res)=>{
    try{
      const db=require("../database/db");
      const jid=decodeURIComponent(req.params.jid);
      const group=db.getGroup(jid);
      let members=[],groupName=group.name||jid.split("@")[0];
      if(state.sock&&state.connected){
        try{
          const meta=await Promise.race([state.sock.groupMetadata(jid),new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),6000))]);
          groupName=meta.subject||groupName;
          const adminSet=new Set(meta.participants.filter(p=>p.admin).map(p=>p.id));
          members=meta.participants.map(p=>({jid:p.id,isAdmin:adminSet.has(p.id),name:""}));
        }catch{}
      }
      if(!members.length){
        const log=group.lastMessageAt||{};
        members=Object.keys(log).map(j=>({jid:j,isAdmin:false,name:""}));
      }
      const botId=state.sock?.user?.id?state.sock.user.id.split(":")[0]+"@s.whatsapp.net":null;
      if(botId) members=members.filter(m=>m.jid!==botId);
      // Enrich with stored names
      members=members.map(m=>{
        try{const u=db.getUser(m.jid);if(u.name)m.name=u.name;}catch{}
        return m;
      });
      res.json({groupName,members,muted:group.mutedUsers||[],warnings:group.warnings||{}});
    }catch(e){res.status(500).json({error:e.message});}
  });

  app.post("/api/mod/action",async(req,res)=>{
    try{
      const db=require("../database/db");
      const {groupJid,userJid,action}=req.body||{};
      if(!groupJid||!userJid||!action) return res.status(400).json({error:"Faltan parámetros"});
      const group=db.getGroup(groupJid);
      if(action==="mute"){const m=new Set(group.mutedUsers||[]);m.add(userJid);db.updateGroup(groupJid,{mutedUsers:[...m]});}
      else if(action==="unmute"){const m=new Set(group.mutedUsers||[]);m.delete(userJid);db.updateGroup(groupJid,{mutedUsers:[...m]});}
      else if(action==="warn"){
        const w={...(group.warnings||{})};w[userJid]=(w[userJid]||0)+1;db.updateGroup(groupJid,{warnings:w});
        if(state.sock&&state.connected){const num=userJid.split("@")[0];await state.sock.sendMessage(groupJid,{text:`⚠️ @${num} recibió una advertencia desde el panel de control.\nTotal: ${w[userJid]}`,mentions:[userJid]}).catch(()=>{});}
      }
      else if(action==="clearwarns"){const w={...(group.warnings||{})};delete w[userJid];db.updateGroup(groupJid,{warnings:w});}
      else if(action==="kick"){if(!state.sock||!state.connected)return res.status(503).json({error:"Bot no conectado"});await state.sock.groupParticipantsUpdate(groupJid,[userJid],"remove");}
      else return res.status(400).json({error:"Acción desconocida: "+action});
      res.json({ok:true});
    }catch(e){res.status(500).json({error:e.message});}
  });

  app.post("/pairing-code",async(req,res)=>{
    if(state.connected)return res.status(400).json({error:"El bot ya está conectado."});
    if(!state.sock)return res.status(503).json({error:"El bot aún no está listo."});
    if(state.sock.authState?.creds?.registered)return res.status(400).json({error:"Sesión ya registrada. Resetea primero."});
    const phone=String(req.body?.phone||"").replace(/[^0-9]/g,"");
    if(phone.length<8||phone.length>16)return res.status(400).json({error:"Número inválido."});
    try{const code=await state.sock.requestPairingCode(phone);const formatted=code.match(/.{1,4}/g).join("-");setPairingCode(formatted,phone);logger.info(`🔢 Código para +${phone}: ${formatted}`);res.json({code:formatted,phone});}
    catch(err){res.status(500).json({error:`WhatsApp rechazó: ${err.message}`});}
  });

  app.post("/reset",async(req,res)=>{
    if(state.resetInProgress)return res.status(409).json({error:"Reset en curso."});
    state.resetInProgress=true;logger.warn("⚠️ Reset solicitado vía web.");
    try{if(typeof onResetRequest==="function")await onResetRequest();res.json({ok:true});setTimeout(()=>process.exit(1),1500);}
    catch(err){state.resetInProgress=false;res.status(500).json({error:err.message});}
  });

  app.get("/health",(req,res)=>res.json({status:"ok",connected:state.connected,uptime:process.uptime()}));

  app.listen(port,"0.0.0.0",()=>{
    logger.success(`🌐 Web activo en puerto ${port}`);
    logger.info("   / → Vinculación  |  /dashboard → System Panel");
  });
}

module.exports={startWebServer,setQR,setPairingCode,setConnected,setSocket,setResetHandler};
