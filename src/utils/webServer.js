const express = require("express");
const QRCode = require("qrcode");
const logger = require("./logger");
const path = require("path");
const fs = require("fs");

// ─── Config overrides ─────────────────────────────────────────────────────────
const CONFIG_OVERRIDES_FILE = path.join(__dirname, "..", "config", "overrides.json");

function loadOverrides() {
  try {
    if (!fs.existsSync(CONFIG_OVERRIDES_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_OVERRIDES_FILE, "utf-8"));
  } catch { return {}; }
}

function saveOverrides(data) {
  try { fs.writeFileSync(CONFIG_OVERRIDES_FILE, JSON.stringify(data, null, 2)); }
  catch (e) { logger.error(`Error guardando overrides: ${e.message}`); }
}

function getMergedConfig() {
  const base = require("../config/config");
  const ov = loadOverrides();
  return {
    prefix: ov.prefix ?? base.prefix,
    botName: ov.botName ?? base.botName,
    ownerNumber: ov.ownerNumber ?? base.ownerNumber,
    commandCooldown: ov.commandCooldown ?? base.commandCooldown,
    level: { ...base.level, ...(ov.level || {}) },
    economy: { ...base.economy, ...(ov.economy || {}) },
    antiSpam: { ...base.antiSpam, ...(ov.antiSpam || {}) },
  };
}

function applyOverrides(updates) {
  const merged = { ...loadOverrides() };
  for (const k of ["prefix", "botName", "ownerNumber", "commandCooldown"]) {
    if (updates[k] !== undefined) merged[k] = updates[k];
  }
  for (const k of ["level", "economy", "antiSpam"]) {
    if (updates[k] !== undefined) merged[k] = { ...(merged[k] || {}), ...updates[k] };
  }
  saveOverrides(merged);
  try {
    const live = require("../config/config");
    for (const k of ["prefix", "botName", "ownerNumber", "commandCooldown"]) {
      if (updates[k] !== undefined) live[k] = updates[k];
    }
    for (const k of ["level", "economy", "antiSpam"]) {
      if (updates[k] !== undefined) Object.assign(live[k], updates[k]);
    }
  } catch {}
}

// ─── Web state ────────────────────────────────────────────────────────────────
const state = {
  qr: null, pairingCode: null, pairingPhone: null,
  connected: false, lastUpdate: Date.now(),
  sock: null, resetInProgress: false, startedAt: Date.now(),
};
let onResetRequest = null;

function setQR(qr) { state.qr = qr; state.connected = false; state.lastUpdate = Date.now(); }
function setPairingCode(code, phone = null) { state.pairingCode = code; if (phone) state.pairingPhone = phone; state.lastUpdate = Date.now(); }
function setConnected(v) { state.connected = v; if (v) { state.qr = null; state.pairingCode = null; state.pairingPhone = null; state.resetInProgress = false; } state.lastUpdate = Date.now(); }
function setSocket(sock) { state.sock = sock; }
function setResetHandler(h) { onResetRequest = h; }
function stateSignature() { return [state.connected?"C":"U", state.qr?"Q":"-", state.pairingCode?"P":"-", state.sock?"R":"-"].join(""); }

// ─── Dashboard HTML ───────────────────────────────────────────────────────────
function renderDashboard() {
  const uptime = Math.floor((Date.now() - state.startedAt) / 1000);
  const hh = Math.floor(uptime / 3600), mm = Math.floor((uptime % 3600) / 60);
  const uptimeStr = `${hh}h ${mm}m`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>AnimeBot — Dashboard</title>
<script src="https://cdn.tailwindcss.com?plugins=forms"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #080010;
  --surface: rgba(255,255,255,0.035);
  --surface-2: rgba(255,255,255,0.06);
  --border: rgba(255,255,255,0.07);
  --border-2: rgba(255,255,255,0.12);
  --pink: #e879f9;
  --violet: #a78bfa;
  --indigo: #818cf8;
  --green: #34d399;
  --red: #f87171;
  --yellow: #fbbf24;
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;padding:0;font-family:'Inter',sans-serif;background:var(--bg);color:#fff;min-height:100vh;overflow-x:hidden}
/* scrollbar */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:10px}

/* Layout */
.layout{display:flex;min-height:100vh}
.sidebar{width:240px;min-width:240px;background:rgba(255,255,255,0.025);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:20px 12px;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:50;transition:transform .3s cubic-bezier(.4,0,.2,1)}
.main-content{margin-left:240px;flex:1;padding:28px;min-height:100vh;max-width:calc(100vw - 240px)}
.overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:40;backdrop-filter:blur(4px)}

/* Mobile */
@media(max-width:768px){
  .sidebar{transform:translateX(-100%)}
  .sidebar.open{transform:translateX(0)}
  .main-content{margin-left:0;padding:20px 16px;max-width:100vw}
  .overlay.show{display:block}
  .hamburger{display:flex}
  .form-2col{grid-template-columns:1fr !important}
  .stats-grid{grid-template-columns:1fr 1fr !important}
}
@media(min-width:769px){.hamburger{display:none}.topbar-title{display:none}}

/* Logo */
.logo{padding:4px 8px 20px}
.logo-text{font-size:1.2rem;font-weight:800;background:linear-gradient(135deg,#f0abfc,#a78bfa,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.logo-sub{font-size:11px;color:rgba(255,255,255,0.3);margin-top:2px}

/* Status pill */
.pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:12px;font-weight:600}
.pill-green{background:rgba(52,211,153,.12);color:#34d399;border:1px solid rgba(52,211,153,.25)}
.pill-red{background:rgba(248,113,113,.12);color:#f87171;border:1px solid rgba(248,113,113,.25)}
.pill-dot{width:6px;height:6px;border-radius:50%;background:currentColor;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

/* Nav */
.nav-section{font-size:10px;font-weight:700;color:rgba(255,255,255,0.25);letter-spacing:.12em;text-transform:uppercase;padding:0 8px;margin:20px 0 8px}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;color:rgba(255,255,255,.5);font-size:13.5px;font-weight:500;cursor:pointer;transition:all .18s;text-decoration:none;border:none;background:none;width:100%;text-align:left}
.nav-item:hover{background:rgba(255,255,255,.06);color:rgba(255,255,255,.85)}
.nav-item.active{background:linear-gradient(135deg,rgba(232,121,249,.18),rgba(167,139,250,.12));color:#e879f9;border:1px solid rgba(232,121,249,.2)}
.nav-icon{width:20px;text-align:center;font-size:15px}

/* Top bar */
.topbar{display:flex;align-items:center;gap:12px;margin-bottom:28px}
.hamburger{align-items:center;justify-content:center;width:38px;height:38px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;cursor:pointer;gap:0;flex-direction:column;padding:0}
.hamburger span{display:block;width:16px;height:2px;background:rgba(255,255,255,.7);border-radius:2px;margin:2.5px 0;transition:.2s}
.page-title{font-size:1.35rem;font-weight:700;color:#fff}
.page-sub{font-size:13px;color:rgba(255,255,255,.4);margin-top:2px}

/* Cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px}
.card-sm{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px}

/* Stats */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:20px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent-gradient,linear-gradient(90deg,#e879f9,#a78bfa))}
.stat-val{font-size:2rem;font-weight:800;line-height:1}
.stat-label{font-size:12px;color:rgba(255,255,255,.4);margin-top:6px}

/* Section title */
.section-title{font-size:11px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px}

/* Toggle */
.toggle{position:relative;cursor:pointer;display:inline-flex;align-items:center;gap:10px}
.toggle input{opacity:0;width:0;height:0;position:absolute}
.track{width:44px;height:24px;background:rgba(255,255,255,.12);border-radius:12px;transition:.25s;position:relative;flex-shrink:0;border:1px solid rgba(255,255,255,.1)}
.thumb{position:absolute;width:18px;height:18px;background:#fff;border-radius:50%;top:2px;left:2px;transition:.25s;box-shadow:0 1px 4px rgba(0,0,0,.4)}
.toggle input:checked ~ .track{background:linear-gradient(135deg,#e879f9,#a78bfa);border-color:transparent}
.toggle input:checked ~ .track .thumb{transform:translateX(20px)}
.toggle-label{font-size:13.5px;color:rgba(255,255,255,.75);font-weight:500}
.toggle-desc{font-size:12px;color:rgba(255,255,255,.35);margin-top:2px}

/* Input */
.field-label{font-size:12px;font-weight:600;color:rgba(255,255,255,.45);margin-bottom:6px;display:block}
.input{background:rgba(255,255,255,.05);border:1px solid var(--border-2);border-radius:10px;padding:10px 13px;color:#fff;font-size:14px;width:100%;outline:none;transition:all .2s;font-family:'Inter',sans-serif}
.input:focus{border-color:rgba(232,121,249,.5);background:rgba(255,255,255,.07);box-shadow:0 0 0 3px rgba(232,121,249,.08)}
.input::placeholder{color:rgba(255,255,255,.22)}

/* Buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 18px;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer;transition:all .18s;border:none;text-decoration:none}
.btn-primary{background:linear-gradient(135deg,#e879f9,#a78bfa);color:#fff;box-shadow:0 4px 16px rgba(232,121,249,.2)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(232,121,249,.3)}
.btn-primary:active{transform:translateY(0)}
.btn-ghost{background:var(--surface-2);border:1px solid var(--border-2);color:rgba(255,255,255,.75)}
.btn-ghost:hover{background:rgba(255,255,255,.09);color:#fff}
.btn-danger{background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.25);color:#f87171}
.btn-danger:hover{background:rgba(248,113,113,.2)}
.btn-warn{background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.25);color:#fbbf24}
.btn-warn:hover{background:rgba(251,191,36,.18)}
.btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none !important}

/* Row item */
.row-item{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border)}
.row-item:last-child{border-bottom:none}

/* User/group cards */
.user-card{background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px}
.avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#e879f9,#a78bfa);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0}
.group-tag{background:rgba(167,139,250,.12);color:#c4b5fd;border:1px solid rgba(167,139,250,.25);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600}

/* Toast */
.toast{position:fixed;bottom:20px;right:20px;left:20px;max-width:360px;margin-left:auto;background:rgba(20,5,35,.95);border:1px solid rgba(232,121,249,.3);color:#fff;padding:13px 18px;border-radius:13px;font-size:13.5px;font-weight:500;backdrop-filter:blur(20px);transform:translateY(100px);opacity:0;transition:all .3s cubic-bezier(.4,0,.2,1);z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.toast.show{transform:translateY(0);opacity:1}

/* Pages */
.page{display:none;animation:fadeIn .2s ease}
.page.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* Select */
.select{background:rgba(255,255,255,.05);border:1px solid var(--border-2);border-radius:10px;padding:10px 13px;color:#fff;font-size:14px;width:100%;outline:none;cursor:pointer;-webkit-appearance:none}
.select option{background:#1a0a2e;color:#fff}

/* Badge */
.badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}
.badge-pink{background:rgba(232,121,249,.15);color:#f0abfc;border:1px solid rgba(232,121,249,.25)}
.badge-violet{background:rgba(167,139,250,.15);color:#c4b5fd;border:1px solid rgba(167,139,250,.25)}
.badge-green{background:rgba(52,211,153,.12);color:#6ee7b7;border:1px solid rgba(52,211,153,.2)}
.badge-red{background:rgba(248,113,113,.12);color:#fca5a5;border:1px solid rgba(248,113,113,.2)}

/* Spinner */
.spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.15);border-top-color:rgba(255,255,255,.8);border-radius:50%;animation:spinning .6s linear infinite}
@keyframes spinning{to{transform:rotate(360deg)}}

/* Empty */
.empty{text-align:center;padding:48px 20px;color:rgba(255,255,255,.25);font-size:14px}
.empty-icon{font-size:36px;margin-bottom:12px}

/* Form grid */
.form-2col{display:grid;grid-template-columns:1fr 1fr;gap:14px}

/* Mod table */
.mod-table{width:100%;border-collapse:collapse}
.mod-table th{font-size:11px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.08em;padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)}
.mod-table td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.04);font-size:13.5px;vertical-align:middle}
.mod-table tr:last-child td{border-bottom:none}
.mod-table tr:hover td{background:rgba(255,255,255,.02)}
@media(max-width:600px){.mod-table thead{display:none}.mod-table tr{display:block;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;padding:10px}.mod-table td{display:flex;justify-content:space-between;align-items:center;border:none;padding:6px 8px}.mod-table td[data-label]::before{content:attr(data-label);font-size:11px;color:rgba(255,255,255,.35);font-weight:600}}

/* Action row */
.action-row{display:flex;gap:6px;flex-wrap:wrap}
</style>
</head>
<body>

<!-- Overlay for mobile sidebar -->
<div class="overlay" id="overlay" onclick="closeSidebar()"></div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<div class="layout">

<!-- ═══ SIDEBAR ═══ -->
<aside class="sidebar" id="sidebar">
  <div class="logo">
    <div class="logo-text">🌸 AnimeBot</div>
    <div class="logo-sub">Panel de Control</div>
  </div>

  <div id="sb-status" class="pill ${state.connected ? 'pill-green' : 'pill-red'}" style="margin:0 4px 4px">
    <span class="pill-dot"></span>
    ${state.connected ? 'Conectado' : 'Desconectado'}
  </div>

  <div class="nav-section">General</div>
  <button class="nav-item active" onclick="nav('overview',this)"><span class="nav-icon">📊</span>Resumen</button>
  <button class="nav-item" onclick="nav('config',this)"><span class="nav-icon">⚙️</span>Configuración</button>

  <div class="nav-section">Comunidad</div>
  <button class="nav-item" onclick="nav('groups',this)"><span class="nav-icon">💬</span>Grupos</button>
  <button class="nav-item" onclick="nav('users',this)"><span class="nav-icon">👥</span>Usuarios</button>
  <button class="nav-item" onclick="nav('mod',this)"><span class="nav-icon">🛡️</span>Moderación</button>

  <div class="nav-section">Bot</div>
  <button class="nav-item" onclick="nav('connection',this)"><span class="nav-icon">📲</span>Vinculación</button>

  <div style="flex:1"></div>
  <div style="padding:8px;font-size:11px;color:rgba(255,255,255,.2)">Uptime: ${uptimeStr}</div>
</aside>

<!-- ═══ MAIN ═══ -->
<main class="main-content">

  <!-- Top bar (mobile) -->
  <div class="topbar">
    <button class="hamburger btn" onclick="openSidebar()" style="background:var(--surface-2);border:1px solid var(--border)">
      <span></span><span></span><span></span>
    </button>
    <div>
      <div class="page-title topbar-title" id="page-title-text">Resumen</div>
    </div>
    <div style="margin-left:auto">
      <div id="top-status" class="pill ${state.connected ? 'pill-green' : 'pill-red'}" style="font-size:11px;padding:4px 10px">
        <span class="pill-dot"></span>${state.connected ? 'Online' : 'Offline'}
      </div>
    </div>
  </div>

  <!-- ─────────── PAGE: OVERVIEW ─────────── -->
  <div class="page active" id="page-overview">
    <div style="margin-bottom:22px">
      <div class="page-title">Resumen</div>
      <div class="page-sub">Vista general del bot</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card" style="--accent-gradient:linear-gradient(90deg,#e879f9,#a78bfa)">
        <div class="stat-val" style="color:#f0abfc" id="s-users">—</div>
        <div class="stat-label">Usuarios registrados</div>
      </div>
      <div class="stat-card" style="--accent-gradient:linear-gradient(90deg,#818cf8,#6366f1)">
        <div class="stat-val" style="color:#a5b4fc" id="s-groups">—</div>
        <div class="stat-label">Grupos activos</div>
      </div>
      <div class="stat-card" style="--accent-gradient:linear-gradient(90deg,#34d399,#10b981)">
        <div class="stat-val" style="color:#6ee7b7" id="s-status">${state.connected ? '✓' : '✗'}</div>
        <div class="stat-label">Estado WhatsApp</div>
      </div>
      <div class="stat-card" style="--accent-gradient:linear-gradient(90deg,#fbbf24,#f59e0b)">
        <div class="stat-val" style="color:#fde68a;font-size:1.4rem">${uptimeStr}</div>
        <div class="stat-label">Tiempo activo</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px" class="form-2col">
      <div class="card">
        <div class="section-title">Controles rápidos</div>
        <div style="display:flex;flex-direction:column;gap:16px">
          <label class="toggle">
            <input type="checkbox" id="q-antispam" onchange="quickSet('antiSpam',{enabled:this.checked})">
            <div class="track"><div class="thumb"></div></div>
            <div><div class="toggle-label">Anti-Spam</div><div class="toggle-desc">Limitar velocidad de mensajes</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox" id="q-economy" onchange="quickSet('economy',{enabled:this.checked})">
            <div class="track"><div class="thumb"></div></div>
            <div><div class="toggle-label">Economía</div><div class="toggle-desc">Sistema de monedas y waifus</div></div>
          </label>
          <label class="toggle">
            <input type="checkbox" id="q-links" onchange="quickSet('antiSpam',{deleteLinks:this.checked})">
            <div class="track"><div class="thumb"></div></div>
            <div><div class="toggle-label">Borrar links</div><div class="toggle-desc">Eliminar mensajes con URLs</div></div>
          </label>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Configuración activa</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="row-item" style="padding:8px 0">
            <span style="font-size:13px;color:rgba(255,255,255,.45)">Nombre</span>
            <span id="inf-name" style="font-weight:600;font-size:13.5px">—</span>
          </div>
          <div class="row-item" style="padding:8px 0">
            <span style="font-size:13px;color:rgba(255,255,255,.45)">Prefijo</span>
            <span id="inf-prefix" class="badge badge-violet" style="font-size:14px;letter-spacing:.05em">—</span>
          </div>
          <div class="row-item" style="padding:8px 0">
            <span style="font-size:13px;color:rgba(255,255,255,.45)">Cooldown</span>
            <span id="inf-cool" style="font-weight:600;font-size:13.5px">—</span>
          </div>
          <div class="row-item" style="padding:8px 0">
            <span style="font-size:13px;color:rgba(255,255,255,.45)">Spam máx/s</span>
            <span id="inf-spam" style="font-weight:600;font-size:13.5px">—</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─────────── PAGE: CONFIG ─────────── -->
  <div class="page" id="page-config">
    <div style="margin-bottom:22px">
      <div class="page-title">Configuración</div>
      <div class="page-sub">Ajustes globales aplicados en tiempo real</div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="section-title">General</div>
      <div class="form-2col" style="margin-bottom:14px">
        <div><label class="field-label">Nombre del bot</label><input class="input" id="c-name" placeholder="🌸 AnimeBot"></div>
        <div><label class="field-label">Prefijo</label><input class="input" id="c-prefix" placeholder="!" style="max-width:100px"></div>
        <div><label class="field-label">Número del dueño</label><input class="input" id="c-owner" placeholder="5215512345678" type="tel"></div>
        <div><label class="field-label">Cooldown entre comandos (seg)</label><input class="input" id="c-cool" type="number" min="0" placeholder="10"></div>
      </div>
      <button class="btn btn-primary" onclick="saveSection('general')">Guardar cambios</button>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="section-title">Anti-Spam</div>
      <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:14px">
        <label class="toggle"><input type="checkbox" id="c-as-en"><div class="track"><div class="thumb"></div></div><div><div class="toggle-label">Activar Anti-Spam</div></div></label>
        <label class="toggle"><input type="checkbox" id="c-as-dl"><div class="track"><div class="thumb"></div></div><div><div class="toggle-label">Eliminar links automáticamente</div></div></label>
        <div style="max-width:200px"><label class="field-label">Máx. mensajes por segundo</label><input class="input" id="c-as-max" type="number" min="1" placeholder="5"></div>
      </div>
      <button class="btn btn-primary" onclick="saveSection('antispam')">Guardar Anti-Spam</button>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="section-title">Economía</div>
      <div style="margin-bottom:14px">
        <label class="toggle" style="margin-bottom:16px"><input type="checkbox" id="c-ec-en"><div class="track"><div class="thumb"></div></div><div><div class="toggle-label">Sistema de economía activo</div></div></label>
        <div class="form-2col" style="margin-top:14px">
          <div><label class="field-label">Monedas por mensaje</label><input class="input" id="c-ec-msg" type="number" min="0" placeholder="2"></div>
          <div><label class="field-label">Monedas por comando</label><input class="input" id="c-ec-cmd" type="number" min="0" placeholder="5"></div>
          <div><label class="field-label">Recompensa diaria</label><input class="input" id="c-ec-day" type="number" min="0" placeholder="100"></div>
          <div><label class="field-label">Costo de waifu</label><input class="input" id="c-ec-wai" type="number" min="0" placeholder="50"></div>
        </div>
      </div>
      <button class="btn btn-primary" onclick="saveSection('economy')">Guardar Economía</button>
    </div>

    <div class="card">
      <div class="section-title">XP y Niveles</div>
      <div class="form-2col" style="margin-bottom:14px">
        <div><label class="field-label">XP por mensaje</label><input class="input" id="c-lv-msg" type="number" min="0" placeholder="5"></div>
        <div><label class="field-label">XP por comando</label><input class="input" id="c-lv-cmd" type="number" min="0" placeholder="15"></div>
        <div><label class="field-label">Multiplicador de nivel</label><input class="input" id="c-lv-mul" type="number" min="1" placeholder="250"></div>
        <div><label class="field-label">Cooldown XP (seg)</label><input class="input" id="c-lv-cool" type="number" min="0" placeholder="30"></div>
      </div>
      <button class="btn btn-primary" onclick="saveSection('level')">Guardar XP/Niveles</button>
    </div>
  </div>

  <!-- ─────────── PAGE: GROUPS ─────────── -->
  <div class="page" id="page-groups">
    <div style="margin-bottom:22px;display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><div class="page-title">Grupos</div><div class="page-sub">Configuración individual por grupo</div></div>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="loadGroups()">↻ Actualizar</button>
    </div>
    <div id="groups-list"><div class="empty"><div class="empty-icon">💬</div>Cargando grupos...</div></div>
  </div>

  <!-- ─────────── PAGE: USERS ─────────── -->
  <div class="page" id="page-users">
    <div style="margin-bottom:22px;display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
      <div><div class="page-title">Usuarios</div><div class="page-sub">Usuarios registrados ordenados por XP</div></div>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="loadUsers()">↻ Actualizar</button>
    </div>
    <div id="users-list"><div class="empty"><div class="empty-icon">👥</div>Cargando usuarios...</div></div>
  </div>

  <!-- ─────────── PAGE: MODERACIÓN ─────────── -->
  <div class="page" id="page-mod">
    <div style="margin-bottom:22px">
      <div class="page-title">Moderación</div>
      <div class="page-sub">Gestiona miembros directamente desde el panel</div>
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="section-title">Seleccionar grupo</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <select class="select" id="mod-group-sel" onchange="loadModMembers()" style="flex:1;min-width:0">
          <option value="">— Selecciona un grupo —</option>
        </select>
        <button class="btn btn-ghost btn-sm" onclick="loadModGroups()">↻</button>
      </div>
    </div>

    <div id="mod-content">
      <div class="empty"><div class="empty-icon">🛡️</div>Selecciona un grupo para ver sus miembros</div>
    </div>
  </div>

  <!-- ─────────── PAGE: CONNECTION ─────────── -->
  <div class="page" id="page-connection">
    <div style="margin-bottom:22px">
      <div class="page-title">Vinculación</div>
      <div class="page-sub">Estado de conexión con WhatsApp</div>
    </div>
    <div class="card" style="max-width:480px">
      <div id="conn-content"><div class="empty"><span class="spin"></span></div></div>
    </div>
  </div>

</main>
</div>

<script>
// ─── Sidebar ──────────────────────────────────────────────────────────────────
function openSidebar(){document.getElementById('sidebar').classList.add('open');document.getElementById('overlay').classList.add('show')}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('overlay').classList.remove('show')}

// ─── Navigation ───────────────────────────────────────────────────────────────
const PAGE_TITLES = {overview:'Resumen',config:'Configuración',groups:'Grupos',users:'Usuarios',mod:'Moderación',connection:'Vinculación'};
function nav(name, el) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(el) el.classList.add('active');
  const t = document.getElementById('page-title-text');
  if(t) t.textContent = PAGE_TITLES[name]||name;
  closeSidebar();
  if(name==='overview'||name==='config') loadConfig();
  if(name==='groups') loadGroups();
  if(name==='users') loadUsers();
  if(name==='mod') loadModGroups();
  if(name==='connection') loadConnection();
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, ok=true) {
  const el = document.getElementById('toast');
  el.textContent = (ok?'✅ ':'❌ ')+msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 3200);
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function api(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||'Error '+r.status);
  return j;
}

// ─── Load config ─────────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const c = await api('/api/config');
    // Overview info
    const s=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};
    const sc=(id,v)=>{const e=document.getElementById(id);if(e)e.checked=!!v};
    s('inf-name', c.botName); s('inf-prefix', c.prefix);
    s('inf-cool', (c.commandCooldown??0)+' seg'); s('inf-spam', c.antiSpam?.maxMessagesPerSecond);
    // Quick toggles
    sc('q-antispam',c.antiSpam?.enabled); sc('q-economy',c.economy?.enabled); sc('q-links',c.antiSpam?.deleteLinks);
    // Config fields
    const sv=(id,v)=>{const e=document.getElementById(id);if(e&&v!==undefined)e.value=v};
    sv('c-name',c.botName); sv('c-prefix',c.prefix); sv('c-owner',c.ownerNumber); sv('c-cool',c.commandCooldown);
    sc('c-as-en',c.antiSpam?.enabled); sc('c-as-dl',c.antiSpam?.deleteLinks); sv('c-as-max',c.antiSpam?.maxMessagesPerSecond);
    sc('c-ec-en',c.economy?.enabled); sv('c-ec-msg',c.economy?.coinsPerMessage); sv('c-ec-cmd',c.economy?.coinsPerCommand);
    sv('c-ec-day',c.economy?.dailyReward); sv('c-ec-wai',c.economy?.waifuCost);
    sv('c-lv-msg',c.level?.xpPerMessage); sv('c-lv-cmd',c.level?.xpPerCommand);
    sv('c-lv-mul',c.level?.levelMultiplier); sv('c-lv-cool',c.level?.xpCooldownSeconds);
  } catch(e){ console.error(e); }
}

// ─── Save config ─────────────────────────────────────────────────────────────
async function saveSection(section) {
  const gv=id=>{const e=document.getElementById(id);return e?e.value:null};
  const gn=id=>{const v=gv(id);return v!==null&&v!==''?Number(v):undefined};
  const gc=id=>{const e=document.getElementById(id);return e?e.checked:undefined};
  let body={};
  if(section==='general'){
    const n=gv('c-name'),p=gv('c-prefix'),o=gv('c-owner'),c=gn('c-cool');
    if(n) body.botName=n; if(p) body.prefix=p; if(o) body.ownerNumber=o; if(c!==undefined) body.commandCooldown=c;
  } else if(section==='antispam'){
    body.antiSpam={enabled:gc('c-as-en'),deleteLinks:gc('c-as-dl'),maxMessagesPerSecond:gn('c-as-max')};
  } else if(section==='economy'){
    body.economy={enabled:gc('c-ec-en'),coinsPerMessage:gn('c-ec-msg'),coinsPerCommand:gn('c-ec-cmd'),dailyReward:gn('c-ec-day'),waifuCost:gn('c-ec-wai')};
  } else if(section==='level'){
    body.level={xpPerMessage:gn('c-lv-msg'),xpPerCommand:gn('c-lv-cmd'),levelMultiplier:gn('c-lv-mul'),xpCooldownSeconds:gn('c-lv-cool')};
  }
  try { await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); toast('Guardado correctamente'); loadConfig(); }
  catch(e){ toast(e.message,false); }
}

async function quickSet(section, data) {
  try { await api('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[section]:data})}); toast('Actualizado'); }
  catch(e){ toast(e.message,false); }
}

// ─── Load stats ───────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const s = await api('/api/stats');
    const se=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v??'—'};
    se('s-users',s.users); se('s-groups',s.groups); se('s-status',s.connected?'✓':'✗');
  } catch{}
}

// ─── Load groups ──────────────────────────────────────────────────────────────
async function loadGroups() {
  const el=document.getElementById('groups-list');
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try {
    const groups = await api('/api/groups');
    if(!groups.length){el.innerHTML='<div class="empty"><div class="empty-icon">💬</div>No hay grupos registrados todavía</div>';return}
    el.innerHTML = groups.map(g=>{
      const name = g.name || g.jid.split('@')[0];
      const jidShort = g.jid.split('@')[0];
      return \`<div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <div class="avatar" style="font-size:18px;background:linear-gradient(135deg,#818cf8,#6366f1)">💬</div>
          <div>
            <div style="font-weight:600">\${name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,.35);font-family:monospace">\${jidShort}</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:20px">
          <label class="toggle">
            <input type="checkbox" \${g.antiLink?'checked':''} onchange="updateGroup('\${g.jid}','antiLink',this.checked)">
            <div class="track"><div class="thumb"></div></div>
            <div class="toggle-label">Anti-Link</div>
          </label>
          <label class="toggle">
            <input type="checkbox" \${g.antiSpam!==false?'checked':''} onchange="updateGroup('\${g.jid}','antiSpam',this.checked)">
            <div class="track"><div class="thumb"></div></div>
            <div class="toggle-label">Anti-Spam</div>
          </label>
          <label class="toggle">
            <input type="checkbox" \${g.welcome!==false?'checked':''} onchange="updateGroup('\${g.jid}','welcome',this.checked)">
            <div class="track"><div class="thumb"></div></div>
            <div class="toggle-label">Bienvenida</div>
          </label>
        </div>
      </div>\`;
    }).join('');
  } catch(e){ el.innerHTML=\`<div class="empty"><div class="empty-icon">⚠️</div>\${e.message}</div>\`; }
}

async function updateGroup(jid, key, val) {
  try { await api('/api/groups/'+encodeURIComponent(jid),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({[key]:val})}); toast(key+' '+(val?'activado':'desactivado')); }
  catch(e){ toast(e.message,false); }
}

// ─── Load users ───────────────────────────────────────────────────────────────
async function loadUsers() {
  const el=document.getElementById('users-list');
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try {
    const users = await api('/api/users');
    if(!users.length){el.innerHTML='<div class="empty"><div class="empty-icon">👥</div>No hay usuarios registrados</div>';return}
    el.innerHTML=\`<div class="card" style="overflow-x:auto">
      <table class="mod-table">
        <thead><tr>
          <th>#</th><th>Número</th><th>Nivel</th><th>XP</th><th>Monedas</th><th>Mensajes</th>
        </tr></thead>
        <tbody>\${users.slice(0,50).map((u,i)=>{
          const num=u.jid.split('@')[0].split(':')[0];
          const lvlColor=u.level>=10?'badge-pink':u.level>=5?'badge-violet':'badge-green';
          return \`<tr>
            <td data-label="#">\${i+1}</td>
            <td data-label="Número"><span style="font-family:monospace;font-size:13px">\${num}</span></td>
            <td data-label="Nivel"><span class="badge \${lvlColor}">Lv.\${u.level||1}</span></td>
            <td data-label="XP">\${(u.xp||0).toLocaleString()}</td>
            <td data-label="Monedas">🪙 \${(u.coins||0).toLocaleString()}</td>
            <td data-label="Mensajes">\${(u.messages||0).toLocaleString()}</td>
          </tr>\`;
        }).join('')}</tbody>
      </table>
      \${users.length>50?'<div style="text-align:center;padding:12px;font-size:12px;color:rgba(255,255,255,.3)">Mostrando primeros 50 de '+users.length+'</div>':''}
    </div>\`;
  } catch(e){ el.innerHTML=\`<div class="empty"><div class="empty-icon">⚠️</div>\${e.message}</div>\`; }
}

// ─── Moderación ───────────────────────────────────────────────────────────────
async function loadModGroups() {
  try {
    const groups = await api('/api/groups');
    const sel = document.getElementById('mod-group-sel');
    const prev = sel.value;
    sel.innerHTML='<option value="">— Selecciona un grupo —</option>';
    groups.forEach(g=>{
      const name=g.name||g.jid.split('@')[0];
      const opt=document.createElement('option');
      opt.value=g.jid; opt.textContent=name;
      sel.appendChild(opt);
    });
    if(prev && groups.find(g=>g.jid===prev)){ sel.value=prev; loadModMembers(); }
  } catch(e){ toast(e.message,false); }
}

async function loadModMembers() {
  const jid = document.getElementById('mod-group-sel').value;
  const el = document.getElementById('mod-content');
  if(!jid){el.innerHTML='<div class="empty"><div class="empty-icon">🛡️</div>Selecciona un grupo</div>';return}
  el.innerHTML='<div class="empty"><span class="spin"></span></div>';
  try {
    const data = await api('/api/mod/group/'+encodeURIComponent(jid));
    if(!data.members||!data.members.length){el.innerHTML='<div class="empty"><div class="empty-icon">👥</div>Sin miembros registrados para moderar</div>';return}

    const mutedSet = new Set(data.muted||[]);
    const warnings = data.warnings||{};

    el.innerHTML=\`<div class="card" style="overflow-x:auto">
      <div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div style="font-weight:600">\${data.groupName||jid.split('@')[0]}</div>
        <span class="badge badge-violet">\${data.members.length} miembros</span>
      </div>
      <table class="mod-table">
        <thead><tr>
          <th>Miembro</th><th>Estado</th><th>Warns</th><th>Acciones</th>
        </tr></thead>
        <tbody id="mod-tbody">
          \${data.members.map(m=>{
            const num=m.jid.split('@')[0].split(':')[0];
            const isMuted=mutedSet.has(m.jid);
            const isAdmin=m.isAdmin;
            const warns=warnings[m.jid]||0;
            return \`<tr id="mrow-\${num}">
              <td data-label="Miembro">
                <div style="font-family:monospace;font-size:13px">\${num}</div>
                \${isAdmin?'<span class="badge badge-pink" style="margin-top:3px">Admin</span>':''}
              </td>
              <td data-label="Estado">
                \${isMuted?'<span class="badge badge-red">Muteado</span>':'<span class="badge badge-green">Activo</span>'}
              </td>
              <td data-label="Warns">
                <span class="badge \${warns>0?'badge-red':'badge-violet'}">\${warns} ⚠️</span>
              </td>
              <td data-label="Acciones">
                <div class="action-row">
                  <button class="btn btn-warn btn-sm" onclick="modAction('\${jid}','\${m.jid}','\${isMuted?'unmute':'mute'}')" \${isAdmin?'disabled':''}>
                    \${isMuted?'Desmutear':'Mutear'}
                  </button>
                  <button class="btn btn-warn btn-sm" onclick="modAction('\${jid}','\${m.jid}','warn')" \${isAdmin?'disabled':''}>+Warn</button>
                  <button class="btn btn-ghost btn-sm" onclick="modAction('\${jid}','\${m.jid}','clearwarns')" \${warns===0?'disabled':''}>Borrar warns</button>
                  <button class="btn btn-danger btn-sm" onclick="confirmKick('\${jid}','\${m.jid}')" \${isAdmin?'disabled':''}>Expulsar</button>
                </div>
              </td>
            </tr>\`;
          }).join('')}
        </tbody>
      </table>
    </div>\`;
  } catch(e){ el.innerHTML=\`<div class="empty"><div class="empty-icon">⚠️</div>\${e.message}</div>\`; }
}

async function modAction(groupJid, userJid, action) {
  try {
    await api('/api/mod/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({groupJid,userJid,action})});
    const labels={'mute':'Muteado','unmute':'Desmuteado','warn':'Advertencia añadida','clearwarns':'Warns borrados','kick':'Expulsado'};
    toast(labels[action]||action+' realizado');
    loadModMembers();
  } catch(e){ toast(e.message,false); }
}

function confirmKick(groupJid, userJid) {
  const num=userJid.split('@')[0];
  if(!confirm('¿Expulsar a '+num+' del grupo? Esta acción no se puede deshacer.')) return;
  modAction(groupJid, userJid, 'kick');
}

// ─── Connection ───────────────────────────────────────────────────────────────
async function loadConnection() {
  const el=document.getElementById('conn-content');
  try {
    const s=await api('/status');
    if(s.connected){
      el.innerHTML=\`<div style="text-align:center;padding:24px">
        <div style="font-size:52px;margin-bottom:12px">✅</div>
        <div style="font-size:1.1rem;font-weight:700;color:#34d399;margin-bottom:6px">Conectado a WhatsApp</div>
        <p style="color:rgba(255,255,255,.4);font-size:13.5px;margin-bottom:24px">El bot está funcionando correctamente.</p>
        <button class="btn btn-danger" onclick="resetSession()">🔄 Cerrar sesión y re-vincular</button>
        <div id="reset-msg" style="margin-top:12px;font-size:13px;color:rgba(255,255,255,.5)"></div>
      </div>\`;
    } else {
      el.innerHTML=\`<div style="text-align:center;padding:24px">
        <div style="font-size:52px;margin-bottom:12px">📲</div>
        <div style="font-size:1.1rem;font-weight:700;color:#fbbf24;margin-bottom:6px">Sin vincular</div>
        <p style="color:rgba(255,255,255,.4);font-size:13.5px;margin-bottom:24px">El bot espera ser vinculado con WhatsApp.</p>
        <a href="/" target="_blank" class="btn btn-primary" style="text-decoration:none">Ir a la página de vinculación →</a>
      </div>\`;
    }
  } catch(e){ el.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div>'+e.message+'</div>'; }
}

async function resetSession() {
  if(!confirm('¿Cerrar la sesión actual? Tendrás que volver a vincular WhatsApp.')) return;
  const msg=document.getElementById('reset-msg');
  try {
    await api('/reset',{method:'POST'});
    if(msg) msg.textContent='✅ Sesión cerrada. Recarga en 15 segundos.';
    setTimeout(()=>location.reload(),12000);
  } catch(e){ if(msg) msg.textContent='❌ '+e.message; }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadConfig();
loadStats();
setInterval(loadStats, 30000);
setInterval(loadConfig, 60000);
</script>
</body>
</html>`;
}

// ─── Pairing page ─────────────────────────────────────────────────────────────
function renderPage() {
  const connected = state.connected, hasQR = !!state.qr, hasCode = !!state.pairingCode, ready = !!state.sock;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>🌸 AnimeBot — Vinculación</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#1a0033,#4a0080,#ff1493);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
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
.db-link{display:inline-block;margin-top:14px;padding:8px 18px;border-radius:8px;background:rgba(255,255,255,.1);color:#fff;text-decoration:none;font-size:.85em;font-weight:600;transition:.2s}
.db-link:hover{background:rgba(255,255,255,.18)}
</style>
</head>
<body>
<div class="card">
  <h1>🌸 AnimeBot</h1>
  ${connected ? `<div class="status ok">✅ Conectado a WhatsApp</div>
    <p style="opacity:.85">El bot está funcionando.</p>
    <div class="danger-zone">
      <p style="font-size:.84em;opacity:.65;margin:0 0 10px">¿Quieres re-vincular?</p>
      <button id="reset-btn" class="btn ghost">🔄 Cerrar sesión y re-vincular</button>
      <div id="reset-msg" class="msg"></div>
    </div>` :
    !ready ? `<div class="status err"><span class="spin"></span>Iniciando bot...</div>` :
    `<div class="status wait">⏳ Esperando vinculación</div>
    <p class="sub">Elige tu método de vinculación</p>
    <div class="tabs">
      <button class="tab ${!hasCode?'active':''}" data-tab="qr">📷 QR</button>
      <button class="tab ${hasCode?'active':''}" data-tab="code">🔢 Código</button>
    </div>
    <div id="panel-qr" class="panel ${!hasCode?'active':''}">
      ${hasQR ? '<div class="qr-wrap" id="qr-slot"></div>' : `<p style="opacity:.6;padding:24px 0"><span class="spin"></span> Generando QR...</p>`}
      <div class="help"><strong>Cómo escanear:</strong><ol><li>Abre WhatsApp en tu celular</li><li>Ajustes → Dispositivos vinculados</li><li>Toca "Vincular un dispositivo"</li><li>Apunta la cámara a este QR</li></ol></div>
    </div>
    <div id="panel-code" class="panel ${hasCode?'active':''}">
      ${hasCode ? `<p style="margin:6px 0;opacity:.85">Código para <strong>+${state.pairingPhone||'tu número'}</strong>:</p><div class="code">${state.pairingCode}</div><p style="font-size:.78em;opacity:.55">El código expira pronto.</p><form id="code-form" style="margin-top:12px"><button type="button" class="btn ghost" style="font-size:.84em;padding:7px 13px" onclick="location.reload()">Generar otro código</button></form>` :
      `<form id="code-form" class="form"><label style="font-size:.84em;opacity:.8;text-align:left">Número con código de país (sin +):</label><input id="phone" type="tel" inputmode="numeric" pattern="[0-9]{8,16}" placeholder="56912345678" required><button id="code-btn" type="submit" class="btn">Generar código</button><div id="code-msg" class="msg"></div></form>`}
      <div class="help"><strong>Cómo usar el código:</strong><ol><li>WhatsApp → Dispositivos vinculados</li><li>"Vincular con número de teléfono"</li><li>Ingresa el código de 8 dígitos</li></ol></div>
    </div>`
  }
  <div class="footer">Última actualización: ${new Date(state.lastUpdate).toLocaleTimeString("es-CL")}</div>
  <a href="/dashboard" class="db-link">📊 Ir al Dashboard →</a>
</div>
<script>
let lastSig=${JSON.stringify(stateSignature())};
async function poll(){try{const r=await fetch('/status');const j=await r.json();if(j.signature!==lastSig){lastSig=j.signature;if(!document.activeElement||document.activeElement.tagName!=='INPUT')location.reload();}}catch(_){}}
setInterval(poll,3500);
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{
  document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===t.dataset.tab));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+t.dataset.tab));
}));
const cf=document.getElementById('code-form');
if(cf){cf.addEventListener('submit',async e=>{e.preventDefault();const phone=document.getElementById('phone').value.trim();const btn=document.getElementById('code-btn');const msg=document.getElementById('code-msg');msg.className='msg';btn.disabled=true;btn.innerHTML='<span class="spin"></span>Generando...';try{const r=await fetch('/pairing-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Error');msg.className='msg show success';msg.textContent='✅ Generado. Recargando...';setTimeout(()=>location.reload(),800);}catch(err){msg.className='msg show error';msg.textContent='❌ '+err.message;btn.disabled=false;btn.textContent='Generar código';}});}
const rb=document.getElementById('reset-btn');
if(rb){rb.addEventListener('click',async()=>{if(!confirm('¿Cerrar la sesión actual?\\nLos datos de usuarios NO se borran.'))return;const msg=document.getElementById('reset-msg');rb.disabled=true;rb.innerHTML='<span class="spin"></span>Reseteando...';try{const r=await fetch('/reset',{method:'POST'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Reset falló');msg.className='msg show success';msg.textContent='✅ Sesión cerrada. Recarga en 15s.';setTimeout(()=>location.reload(),12000);}catch(err){msg.className='msg show error';msg.textContent='❌ '+err.message;rb.disabled=false;rb.textContent='🔄 Cerrar sesión y re-vincular';}});}
</script>
</body>
</html>`;
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────
function startWebServer(port) {
  const app = express();
  app.use(express.json());

  app.get("/", async (req, res) => {
    let html = renderPage();
    if (state.qr) {
      try {
        const dataUrl = await QRCode.toDataURL(state.qr, { width: 260, margin: 2 });
        html = html.replace('<div class="qr-wrap" id="qr-slot"></div>', `<div class="qr-wrap"><img src="${dataUrl}" alt="QR"></div>`);
      } catch (_) {}
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8").setHeader("Cache-Control", "no-store").send(html);
  });

  app.get("/dashboard", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8").setHeader("Cache-Control", "no-store").send(renderDashboard());
  });

  app.get("/status", (req, res) => res.json({ signature: stateSignature(), connected: state.connected, hasQR: !!state.qr, hasPairingCode: !!state.pairingCode, ready: !!state.sock, lastUpdate: state.lastUpdate }));

  app.get("/api/config", (req, res) => { try { res.json(getMergedConfig()); } catch (e) { res.status(500).json({ error: e.message }); } });

  app.post("/api/config", (req, res) => { try { applyOverrides(req.body || {}); res.json({ ok: true, config: getMergedConfig() }); } catch (e) { res.status(500).json({ error: e.message }); } });

  app.get("/api/stats", (req, res) => {
    try {
      const db = require("../database/db");
      const users = db.getAllUsers();
      let groupCount = 0;
      try { const gf = path.join(__dirname, "..", "database", "data", "groups.json"); if (fs.existsSync(gf)) groupCount = Object.keys(JSON.parse(fs.readFileSync(gf, "utf-8"))).length; } catch {}
      res.json({ users: users.length, groups: groupCount, connected: state.connected, uptime: Math.floor((Date.now() - state.startedAt) / 1000) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/users", (req, res) => {
    try {
      const db = require("../database/db");
      const users = db.getAllUsers().sort((a, b) => (b.xp || 0) - (a.xp || 0));
      res.json(users);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/groups", (req, res) => {
    try {
      const gf = path.join(__dirname, "..", "database", "data", "groups.json");
      const groups = fs.existsSync(gf) ? JSON.parse(fs.readFileSync(gf, "utf-8")) : {};
      res.json(Object.values(groups).map(g => ({ jid: g.jid, name: g.name || "", antiLink: g.antiLink ?? false, antiSpam: g.antiSpam ?? true, welcome: g.welcome ?? true, createdAt: g.createdAt })));
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/groups/:jid", (req, res) => {
    try {
      const db = require("../database/db");
      const jid = decodeURIComponent(req.params.jid);
      const safe = {};
      for (const k of ["antiLink", "antiSpam", "welcome"]) { if (req.body[k] !== undefined) safe[k] = !!req.body[k]; }
      db.updateGroup(jid, safe);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Moderación: info del grupo ──
  app.get("/api/mod/group/:jid", async (req, res) => {
    try {
      const db = require("../database/db");
      const jid = decodeURIComponent(req.params.jid);
      const group = db.getGroup(jid);
      let members = [];
      let groupName = group.name || jid.split("@")[0];

      if (state.sock && state.connected) {
        try {
          const meta = await Promise.race([state.sock.groupMetadata(jid), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 6000))]);
          groupName = meta.subject || groupName;
          const adminSet = new Set(meta.participants.filter(p => p.admin).map(p => p.id));
          members = meta.participants.map(p => ({ jid: p.id, isAdmin: adminSet.has(p.id) }));
        } catch {}
      }

      // Fallback: usar messageLog de la DB
      if (!members.length) {
        const log = group.lastMessageAt || {};
        members = Object.keys(log).map(jid => ({ jid, isAdmin: false }));
      }

      const botId = state.sock?.user?.id ? state.sock.user.id.split(":")[0] + "@s.whatsapp.net" : null;
      if (botId) members = members.filter(m => m.jid !== botId);

      res.json({ groupName, members, muted: group.mutedUsers || [], warnings: group.warnings || {} });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Moderación: acciones ──
  app.post("/api/mod/action", async (req, res) => {
    try {
      const db = require("../database/db");
      const { groupJid, userJid, action } = req.body || {};
      if (!groupJid || !userJid || !action) return res.status(400).json({ error: "Faltan parámetros" });

      const group = db.getGroup(groupJid);

      if (action === "mute") {
        const muted = new Set(group.mutedUsers || []);
        muted.add(userJid);
        db.updateGroup(groupJid, { mutedUsers: [...muted] });
      } else if (action === "unmute") {
        const muted = new Set(group.mutedUsers || []);
        muted.delete(userJid);
        db.updateGroup(groupJid, { mutedUsers: [...muted] });
      } else if (action === "warn") {
        const warns = { ...(group.warnings || {}) };
        warns[userJid] = (warns[userJid] || 0) + 1;
        db.updateGroup(groupJid, { warnings: warns });
        if (state.sock && state.connected) {
          const num = userJid.split("@")[0];
          await state.sock.sendMessage(groupJid, { text: `⚠️ @${num} ha recibido una advertencia desde el panel de control.\nTotal de warns: ${warns[userJid]}`, mentions: [userJid] }).catch(() => {});
        }
      } else if (action === "clearwarns") {
        const warns = { ...(group.warnings || {}) };
        delete warns[userJid];
        db.updateGroup(groupJid, { warnings: warns });
      } else if (action === "kick") {
        if (!state.sock || !state.connected) return res.status(503).json({ error: "Bot no conectado a WhatsApp" });
        await state.sock.groupParticipantsUpdate(groupJid, [userJid], "remove");
      } else {
        return res.status(400).json({ error: "Acción desconocida: " + action });
      }

      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/pairing-code", async (req, res) => {
    if (state.connected) return res.status(400).json({ error: "El bot ya está conectado." });
    if (!state.sock) return res.status(503).json({ error: "El bot aún no está listo." });
    if (state.sock.authState?.creds?.registered) return res.status(400).json({ error: "La sesión ya está registrada. Resetea primero." });
    const phone = String(req.body?.phone || "").replace(/[^0-9]/g, "");
    if (phone.length < 8 || phone.length > 16) return res.status(400).json({ error: "Número inválido." });
    try {
      const code = await state.sock.requestPairingCode(phone);
      const formatted = code.match(/.{1,4}/g).join("-");
      setPairingCode(formatted, phone);
      logger.info(`🔢 Código de vinculación para +${phone}: ${formatted}`);
      res.json({ code: formatted, phone });
    } catch (err) { res.status(500).json({ error: `WhatsApp rechazó: ${err.message}` }); }
  });

  app.post("/reset", async (req, res) => {
    if (state.resetInProgress) return res.status(409).json({ error: "Reset en curso." });
    state.resetInProgress = true;
    logger.warn("⚠️  Reset solicitado vía web.");
    try {
      if (typeof onResetRequest === "function") await onResetRequest();
      res.json({ ok: true });
      setTimeout(() => process.exit(1), 1500);
    } catch (err) { state.resetInProgress = false; res.status(500).json({ error: err.message }); }
  });

  app.get("/health", (req, res) => res.json({ status: "ok", connected: state.connected, uptime: process.uptime() }));

  app.listen(port, "0.0.0.0", () => {
    logger.success(`🌐 Servidor web activo en puerto ${port}`);
    logger.info("   / → Vinculación  |  /dashboard → Panel de control");
  });
}

module.exports = { startWebServer, setQR, setPairingCode, setConnected, setSocket, setResetHandler };
