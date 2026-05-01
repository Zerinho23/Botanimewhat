const express = require("express");
const QRCode = require("qrcode");
const logger = require("./logger");
const path = require("path");
const fs = require("fs");

// ─── Config overrides ────────────────────────────────────────────────────────
const CONFIG_OVERRIDES_FILE = path.join(__dirname, "..", "config", "overrides.json");

function loadOverrides() {
  try {
    if (!fs.existsSync(CONFIG_OVERRIDES_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_OVERRIDES_FILE, "utf-8"));
  } catch { return {}; }
}

function saveOverrides(data) {
  try {
    fs.writeFileSync(CONFIG_OVERRIDES_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    logger.error(`Error guardando overrides: ${e.message}`);
  }
}

function getMergedConfig() {
  const base = require("../config/config");
  const overrides = loadOverrides();
  return {
    prefix: overrides.prefix ?? base.prefix,
    botName: overrides.botName ?? base.botName,
    ownerNumber: overrides.ownerNumber ?? base.ownerNumber,
    commandCooldown: overrides.commandCooldown ?? base.commandCooldown,
    level: { ...base.level, ...(overrides.level || {}) },
    economy: { ...base.economy, ...(overrides.economy || {}) },
    antiSpam: { ...base.antiSpam, ...(overrides.antiSpam || {}) },
  };
}

function applyOverrides(updates) {
  const current = loadOverrides();
  const merged = { ...current };
  // Top-level primitives
  for (const key of ["prefix", "botName", "ownerNumber", "commandCooldown"]) {
    if (updates[key] !== undefined) merged[key] = updates[key];
  }
  // Nested objects
  for (const key of ["level", "economy", "antiSpam"]) {
    if (updates[key] !== undefined) {
      merged[key] = { ...(merged[key] || {}), ...updates[key] };
    }
  }
  saveOverrides(merged);

  // Apply to live config object
  try {
    const liveConfig = require("../config/config");
    for (const key of ["prefix", "botName", "ownerNumber", "commandCooldown"]) {
      if (updates[key] !== undefined) liveConfig[key] = updates[key];
    }
    for (const key of ["level", "economy", "antiSpam"]) {
      if (updates[key] !== undefined) Object.assign(liveConfig[key], updates[key]);
    }
  } catch {}
}

// ─── Web state ───────────────────────────────────────────────────────────────
const state = {
  qr: null,
  pairingCode: null,
  pairingPhone: null,
  connected: false,
  lastUpdate: Date.now(),
  sock: null,
  resetInProgress: false,
  startedAt: Date.now(),
};

let onResetRequest = null;

function setQR(qr) {
  state.qr = qr;
  state.connected = false;
  state.lastUpdate = Date.now();
}

function setPairingCode(code, phone = null) {
  state.pairingCode = code;
  if (phone) state.pairingPhone = phone;
  state.lastUpdate = Date.now();
}

function setConnected(value) {
  state.connected = value;
  if (value) {
    state.qr = null;
    state.pairingCode = null;
    state.pairingPhone = null;
    state.resetInProgress = false;
  }
  state.lastUpdate = Date.now();
}

function setSocket(sock) {
  state.sock = sock;
}

function setResetHandler(handler) {
  onResetRequest = handler;
}

function stateSignature() {
  return [
    state.connected ? "C" : "U",
    state.qr ? "Q" : "-",
    state.pairingCode ? "P" : "-",
    state.sock ? "R" : "-",
  ].join("");
}

// ─── Dashboard HTML ───────────────────────────────────────────────────────────
function renderDashboard() {
  const uptime = Math.floor((Date.now() - state.startedAt) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const uptimeStr = `${hours}h ${minutes}m`;

  return `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🌸 AnimeBot Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pink: { 950: '#1a0022' },
      }
    }
  }
}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { font-family: 'Inter', sans-serif; }
  body { background: #0d0014; }
  .gradient-text { background: linear-gradient(135deg, #f472b6, #a855f7, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
  .btn-primary { background: linear-gradient(135deg, #ec4899, #a855f7); color: white; border: none; border-radius: 10px; padding: 10px 20px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(236,72,153,0.3); }
  .btn-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 20px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-ghost:hover { background: rgba(255,255,255,0.1); }
  .toggle { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider { width: 48px; height: 26px; background: rgba(255,255,255,0.15); border-radius: 13px; transition: 0.3s; position: relative; }
  .toggle-slider::after { content: ''; position: absolute; width: 20px; height: 20px; border-radius: 50%; background: white; top: 3px; left: 3px; transition: 0.3s; }
  .toggle input:checked + .toggle-slider { background: linear-gradient(135deg, #ec4899, #a855f7); }
  .toggle input:checked + .toggle-slider::after { transform: translateX(22px); }
  .input-field { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 10px 14px; color: white; font-size: 14px; width: 100%; outline: none; transition: border-color 0.2s; }
  .input-field:focus { border-color: #ec4899; background: rgba(255,255,255,0.08); }
  .input-field::placeholder { color: rgba(255,255,255,0.3); }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; color: rgba(255,255,255,0.55); font-weight: 500; font-size: 14px; cursor: pointer; transition: all 0.2s; text-decoration: none; }
  .nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
  .nav-item.active { background: rgba(236,72,153,0.15); color: #f472b6; }
  .page { display: none; }
  .page.active { display: block; }
  .stat-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 20px; }
  .badge-online { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; }
  .badge-offline { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; }
  .section-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
  .toast { position: fixed; bottom: 24px; right: 24px; background: rgba(30,10,50,0.95); border: 1px solid rgba(236,72,153,0.4); color: white; padding: 14px 20px; border-radius: 12px; font-size: 14px; font-weight: 500; backdrop-filter: blur(12px); transform: translateY(80px); opacity: 0; transition: all 0.3s; z-index: 999; }
  .toast.show { transform: translateY(0); opacity: 1; }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.2); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .group-row { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; }
  .scrollbar::-webkit-scrollbar { width: 5px; }
  .scrollbar::-webkit-scrollbar-track { background: transparent; }
  .scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
</style>
</head>
<body class="text-white min-h-screen">

<div id="toast" class="toast"></div>

<div class="flex min-h-screen">

  <!-- Sidebar -->
  <aside style="width:240px; min-width:240px; background: rgba(255,255,255,0.02); border-right: 1px solid rgba(255,255,255,0.07);" class="flex flex-col p-4">
    <!-- Logo -->
    <div class="mb-8 px-2 pt-2">
      <div class="text-xl font-bold gradient-text">🌸 AnimeBot</div>
      <div class="text-xs mt-1" style="color:rgba(255,255,255,0.35)">Panel de Control</div>
    </div>

    <!-- Status badge -->
    <div class="mb-6 px-2">
      <div id="sidebar-status" class="${state.connected ? 'badge-online' : 'badge-offline'} inline-block">
        ${state.connected ? '● Conectado' : '● Desconectado'}
      </div>
    </div>

    <!-- Nav -->
    <nav class="flex flex-col gap-1 flex-1">
      <div class="section-title px-2">General</div>
      <a class="nav-item active" data-page="overview" onclick="showPage('overview', this)">
        <span>📊</span> Resumen
      </a>
      <a class="nav-item" data-page="config" onclick="showPage('config', this)">
        <span>⚙️</span> Configuración
      </a>
      <a class="nav-item" data-page="groups" onclick="showPage('groups', this)">
        <span>👥</span> Grupos
      </a>

      <div class="section-title px-2 mt-6">Bot</div>
      <a class="nav-item" data-page="connection" onclick="showPage('connection', this)">
        <span>📲</span> Vinculación
      </a>
    </nav>

    <!-- Bottom info -->
    <div class="px-2 pb-2" style="font-size:11px; color:rgba(255,255,255,0.25)">
      Uptime: ${uptimeStr}
    </div>
  </aside>

  <!-- Main -->
  <main class="flex-1 p-6 overflow-auto scrollbar" style="max-height:100vh">

    <!-- ─── PAGE: OVERVIEW ─── -->
    <div id="page-overview" class="page active">
      <div class="mb-8">
        <h1 class="text-2xl font-bold">Resumen</h1>
        <p style="color:rgba(255,255,255,0.45); font-size:14px; margin-top:4px">Estado general del bot</p>
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-2 gap-4 mb-6" style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))">
        <div class="stat-card">
          <div style="font-size:28px; font-weight:700; color:#f472b6" id="stat-users">—</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.45); margin-top:4px">Usuarios</div>
        </div>
        <div class="stat-card">
          <div style="font-size:28px; font-weight:700; color:#a78bfa" id="stat-groups">—</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.45); margin-top:4px">Grupos</div>
        </div>
        <div class="stat-card">
          <div style="font-size:28px; font-weight:700; color:#34d399" id="stat-status">${state.connected ? '✓' : '✗'}</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.45); margin-top:4px">WhatsApp</div>
        </div>
        <div class="stat-card">
          <div style="font-size:28px; font-weight:700; color:#60a5fa" id="stat-uptime">${uptimeStr}</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.45); margin-top:4px">Uptime</div>
        </div>
      </div>

      <!-- Quick toggles -->
      <div class="card p-6 mb-4">
        <div class="section-title">Controles rápidos</div>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <div style="font-weight:500">Anti-Spam global</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.4)">Límite de mensajes por segundo</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="quick-antispam" onchange="quickToggle('antiSpam.enabled', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div style="font-weight:500">Economía</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.4)">Sistema de monedas y waifus</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="quick-economy" onchange="quickToggle('economy.enabled', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div style="font-weight:500">Eliminar links</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.4)">Borrar mensajes con enlaces</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="quick-deletelinks" onchange="quickToggle('antiSpam.deleteLinks', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Bot info -->
      <div class="card p-6">
        <div class="section-title">Información del bot</div>
        <div class="flex flex-col gap-3">
          <div class="flex justify-between" style="font-size:14px">
            <span style="color:rgba(255,255,255,0.45)">Nombre</span>
            <span id="info-name" style="font-weight:500">—</span>
          </div>
          <div class="flex justify-between" style="font-size:14px">
            <span style="color:rgba(255,255,255,0.45)">Prefijo</span>
            <span id="info-prefix" style="font-family:monospace; background:rgba(255,255,255,0.08); padding:2px 10px; border-radius:6px">—</span>
          </div>
          <div class="flex justify-between" style="font-size:14px">
            <span style="color:rgba(255,255,255,0.45)">Cooldown comandos</span>
            <span id="info-cooldown" style="font-weight:500">— seg</span>
          </div>
          <div class="flex justify-between" style="font-size:14px">
            <span style="color:rgba(255,255,255,0.45)">Max mensajes/seg</span>
            <span id="info-maxmsg" style="font-weight:500">—</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── PAGE: CONFIG ─── -->
    <div id="page-config" class="page">
      <div class="mb-8">
        <h1 class="text-2xl font-bold">Configuración</h1>
        <p style="color:rgba(255,255,255,0.45); font-size:14px; margin-top:4px">Ajustes globales del bot</p>
      </div>

      <!-- General -->
      <div class="card p-6 mb-4">
        <div class="section-title">General</div>
        <div class="flex flex-col gap-4">
          <div class="form-row">
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Nombre del bot</label>
              <input class="input-field" id="cfg-botName" placeholder="🌸 AnimeBot">
            </div>
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Prefijo de comandos</label>
              <input class="input-field" id="cfg-prefix" placeholder="!" style="max-width:80px">
            </div>
          </div>
          <div class="form-row">
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Número del dueño</label>
              <input class="input-field" id="cfg-ownerNumber" placeholder="5215512345678">
            </div>
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Cooldown entre comandos (seg)</label>
              <input class="input-field" id="cfg-commandCooldown" type="number" min="0" placeholder="10">
            </div>
          </div>
          <button class="btn-primary" style="align-self:flex-start" onclick="saveConfig('general')">Guardar cambios</button>
        </div>
      </div>

      <!-- Anti-Spam -->
      <div class="card p-6 mb-4">
        <div class="section-title">Anti-Spam</div>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <div style="font-weight:500">Activar Anti-Spam</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.4)">Limitar velocidad de mensajes</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="cfg-antispam-enabled">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <div style="font-weight:500">Eliminar links</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.4)">Borrar mensajes con URLs</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="cfg-antispam-deletelinks">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div>
            <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Máx. mensajes por segundo</label>
            <input class="input-field" id="cfg-antispam-maxmsg" type="number" min="1" placeholder="5" style="max-width:120px">
          </div>
          <button class="btn-primary" style="align-self:flex-start" onclick="saveConfig('antispam')">Guardar Anti-Spam</button>
        </div>
      </div>

      <!-- Economy -->
      <div class="card p-6 mb-4">
        <div class="section-title">Economía</div>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <div style="font-weight:500">Activar economía</div>
              <div style="font-size:13px; color:rgba(255,255,255,0.4)">Sistema de monedas y waifus</div>
            </div>
            <label class="toggle">
              <input type="checkbox" id="cfg-economy-enabled">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="form-row">
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Monedas por mensaje</label>
              <input class="input-field" id="cfg-economy-coins-msg" type="number" min="0" placeholder="2">
            </div>
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Monedas por comando</label>
              <input class="input-field" id="cfg-economy-coins-cmd" type="number" min="0" placeholder="5">
            </div>
          </div>
          <div class="form-row">
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Recompensa diaria</label>
              <input class="input-field" id="cfg-economy-daily" type="number" min="0" placeholder="100">
            </div>
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Costo de waifu</label>
              <input class="input-field" id="cfg-economy-waifu" type="number" min="0" placeholder="50">
            </div>
          </div>
          <button class="btn-primary" style="align-self:flex-start" onclick="saveConfig('economy')">Guardar Economía</button>
        </div>
      </div>

      <!-- XP/Levels -->
      <div class="card p-6">
        <div class="section-title">XP y Niveles</div>
        <div class="flex flex-col gap-4">
          <div class="form-row">
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">XP por mensaje</label>
              <input class="input-field" id="cfg-level-xp-msg" type="number" min="0" placeholder="5">
            </div>
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">XP por comando</label>
              <input class="input-field" id="cfg-level-xp-cmd" type="number" min="0" placeholder="15">
            </div>
          </div>
          <div class="form-row">
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Multiplicador de nivel</label>
              <input class="input-field" id="cfg-level-mult" type="number" min="1" placeholder="250">
            </div>
            <div>
              <label style="font-size:13px; color:rgba(255,255,255,0.5); display:block; margin-bottom:6px">Cooldown XP (seg)</label>
              <input class="input-field" id="cfg-level-cooldown" type="number" min="0" placeholder="30">
            </div>
          </div>
          <button class="btn-primary" style="align-self:flex-start" onclick="saveConfig('level')">Guardar XP/Niveles</button>
        </div>
      </div>
    </div>

    <!-- ─── PAGE: GROUPS ─── -->
    <div id="page-groups" class="page">
      <div class="mb-8 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">Grupos</h1>
          <p style="color:rgba(255,255,255,0.45); font-size:14px; margin-top:4px">Configuración individual por grupo</p>
        </div>
        <button class="btn-ghost" style="font-size:13px; padding:8px 14px" onclick="loadGroups()">↻ Actualizar</button>
      </div>
      <div id="groups-list">
        <div style="text-align:center; padding:60px; color:rgba(255,255,255,0.3)">
          <span class="spinner"></span> Cargando grupos...
        </div>
      </div>
    </div>

    <!-- ─── PAGE: CONNECTION ─── -->
    <div id="page-connection" class="page">
      <div class="mb-8">
        <h1 class="text-2xl font-bold">Vinculación</h1>
        <p style="color:rgba(255,255,255,0.45); font-size:14px; margin-top:4px">Conectar WhatsApp al bot</p>
      </div>
      <div class="card p-6" style="max-width:520px">
        <div id="connection-content">
          <div style="text-align:center; padding:40px; color:rgba(255,255,255,0.3)">
            <span class="spinner"></span> Cargando...
          </div>
        </div>
      </div>
    </div>

  </main>
</div>

<script>
// ─── Navigation ───────────────────────────────────────────────────────────────
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  if (el) el.classList.add('active');

  if (name === 'config' || name === 'overview') loadConfig();
  if (name === 'groups') loadGroups();
  if (name === 'connection') loadConnection();
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg, ok = true) {
  const t = document.getElementById('toast');
  t.textContent = (ok ? '✅ ' : '❌ ') + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Load config ─────────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const r = await fetch('/api/config');
    const cfg = await r.json();

    // Overview
    const infoName = document.getElementById('info-name');
    if (infoName) infoName.textContent = cfg.botName || '—';
    const infoPrefix = document.getElementById('info-prefix');
    if (infoPrefix) infoPrefix.textContent = cfg.prefix || '—';
    const infoCooldown = document.getElementById('info-cooldown');
    if (infoCooldown) infoCooldown.textContent = (cfg.commandCooldown || 0) + ' seg';
    const infoMaxmsg = document.getElementById('info-maxmsg');
    if (infoMaxmsg) infoMaxmsg.textContent = cfg.antiSpam?.maxMessagesPerSecond || '—';

    // Quick toggles
    const qs = document.getElementById('quick-antispam');
    if (qs) qs.checked = cfg.antiSpam?.enabled ?? true;
    const qe = document.getElementById('quick-economy');
    if (qe) qe.checked = cfg.economy?.enabled ?? true;
    const qdl = document.getElementById('quick-deletelinks');
    if (qdl) qdl.checked = cfg.antiSpam?.deleteLinks ?? true;

    // Config page fields
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    set('cfg-botName', cfg.botName);
    set('cfg-prefix', cfg.prefix);
    set('cfg-ownerNumber', cfg.ownerNumber);
    set('cfg-commandCooldown', cfg.commandCooldown);

    setChk('cfg-antispam-enabled', cfg.antiSpam?.enabled);
    setChk('cfg-antispam-deletelinks', cfg.antiSpam?.deleteLinks);
    set('cfg-antispam-maxmsg', cfg.antiSpam?.maxMessagesPerSecond);

    setChk('cfg-economy-enabled', cfg.economy?.enabled);
    set('cfg-economy-coins-msg', cfg.economy?.coinsPerMessage);
    set('cfg-economy-coins-cmd', cfg.economy?.coinsPerCommand);
    set('cfg-economy-daily', cfg.economy?.dailyReward);
    set('cfg-economy-waifu', cfg.economy?.waifuCost);

    set('cfg-level-xp-msg', cfg.level?.xpPerMessage);
    set('cfg-level-xp-cmd', cfg.level?.xpPerCommand);
    set('cfg-level-mult', cfg.level?.levelMultiplier);
    set('cfg-level-cooldown', cfg.level?.xpCooldownSeconds);

  } catch(e) {
    console.error('loadConfig error:', e);
  }
}

// ─── Save config ──────────────────────────────────────────────────────────────
async function saveConfig(section) {
  let updates = {};
  const getVal = id => { const el = document.getElementById(id); return el ? el.value : null; };
  const getNum = id => { const v = getVal(id); return v !== null && v !== '' ? Number(v) : undefined; };
  const getChk = id => { const el = document.getElementById(id); return el ? el.checked : undefined; };

  if (section === 'general') {
    const v = getVal('cfg-botName'); if (v) updates.botName = v;
    const p = getVal('cfg-prefix'); if (p) updates.prefix = p;
    const o = getVal('cfg-ownerNumber'); if (o) updates.ownerNumber = o;
    const c = getNum('cfg-commandCooldown'); if (c !== undefined) updates.commandCooldown = c;
  }
  if (section === 'antispam') {
    updates.antiSpam = {
      enabled: getChk('cfg-antispam-enabled'),
      deleteLinks: getChk('cfg-antispam-deletelinks'),
      maxMessagesPerSecond: getNum('cfg-antispam-maxmsg'),
    };
  }
  if (section === 'economy') {
    updates.economy = {
      enabled: getChk('cfg-economy-enabled'),
      coinsPerMessage: getNum('cfg-economy-coins-msg'),
      coinsPerCommand: getNum('cfg-economy-coins-cmd'),
      dailyReward: getNum('cfg-economy-daily'),
      waifuCost: getNum('cfg-economy-waifu'),
    };
  }
  if (section === 'level') {
    updates.level = {
      xpPerMessage: getNum('cfg-level-xp-msg'),
      xpPerCommand: getNum('cfg-level-xp-cmd'),
      levelMultiplier: getNum('cfg-level-mult'),
      xpCooldownSeconds: getNum('cfg-level-cooldown'),
    };
  }

  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    showToast('Configuración guardada');
    await loadConfig();
  } catch (e) {
    showToast(e.message, false);
  }
}

// ─── Quick toggle ─────────────────────────────────────────────────────────────
async function quickToggle(path, value) {
  const [section, key] = path.split('.');
  const body = { [section]: { [key]: value } };
  try {
    const r = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error((await r.json()).error || 'Error');
    showToast(value ? 'Activado' : 'Desactivado');
  } catch (e) {
    showToast(e.message, false);
  }
}

// ─── Load stats ───────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const r = await fetch('/api/stats');
    const s = await r.json();
    const setEl = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setEl('stat-users', s.users ?? '—');
    setEl('stat-groups', s.groups ?? '—');
    setEl('stat-status', s.connected ? '✓' : '✗');
  } catch {}
}

// ─── Load groups ──────────────────────────────────────────────────────────────
async function loadGroups() {
  const list = document.getElementById('groups-list');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:40px;color:rgba(255,255,255,0.3)"><span class="spinner"></span> Cargando...</div>';
  try {
    const r = await fetch('/api/groups');
    const groups = await r.json();
    if (!groups.length) {
      list.innerHTML = '<div style="text-align:center;padding:60px;color:rgba(255,255,255,0.3)">Sin grupos registrados</div>';
      return;
    }
    list.innerHTML = groups.map(g => {
      const jidShort = g.jid.split('@')[0];
      const name = g.name || jidShort;
      return \`<div class="group-row" id="gr-\${jidShort}">
        <div class="flex items-start justify-between mb-3">
          <div>
            <div style="font-weight:600">\${name}</div>
            <div style="font-size:12px; color:rgba(255,255,255,0.35); font-family:monospace">\${jidShort}</div>
          </div>
        </div>
        <div class="flex flex-wrap gap-6">
          <label class="toggle" title="Anti-Link">
            <input type="checkbox" \${g.antiLink ? 'checked' : ''} onchange="updateGroup('\${g.jid}', 'antiLink', this.checked)">
            <span class="toggle-slider"></span>
            <span style="margin-left:8px; font-size:13px; color:rgba(255,255,255,0.6)">Anti-Link</span>
          </label>
          <label class="toggle" title="Anti-Spam">
            <input type="checkbox" \${g.antiSpam !== false ? 'checked' : ''} onchange="updateGroup('\${g.jid}', 'antiSpam', this.checked)">
            <span class="toggle-slider"></span>
            <span style="margin-left:8px; font-size:13px; color:rgba(255,255,255,0.6)">Anti-Spam</span>
          </label>
          <label class="toggle" title="Bienvenida">
            <input type="checkbox" \${g.welcome !== false ? 'checked' : ''} onchange="updateGroup('\${g.jid}', 'welcome', this.checked)">
            <span class="toggle-slider"></span>
            <span style="margin-left:8px; font-size:13px; color:rgba(255,255,255,0.6)">Bienvenida</span>
          </label>
        </div>
      </div>\`;
    }).join('');
  } catch(e) {
    list.innerHTML = '<div style="text-align:center;padding:60px;color:#f87171">Error al cargar grupos</div>';
  }
}

// ─── Update group setting ─────────────────────────────────────────────────────
async function updateGroup(jid, key, value) {
  try {
    const r = await fetch('/api/groups/' + encodeURIComponent(jid), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    if (!r.ok) throw new Error('Error');
    showToast(value ? key + ' activado' : key + ' desactivado');
  } catch(e) {
    showToast(e.message, false);
  }
}

// ─── Connection page ──────────────────────────────────────────────────────────
async function loadConnection() {
  try {
    const r = await fetch('/status');
    const s = await r.json();
    const el = document.getElementById('connection-content');
    if (!el) return;

    if (s.connected) {
      el.innerHTML = \`<div style="text-align:center; padding:20px">
        <div style="font-size:48px; margin-bottom:16px">✅</div>
        <div style="font-size:18px; font-weight:600; color:#4ade80; margin-bottom:8px">Conectado a WhatsApp</div>
        <p style="color:rgba(255,255,255,0.45); font-size:14px; margin-bottom:24px">El bot está funcionando correctamente.</p>
        <button class="btn-ghost" onclick="resetSession()">🔄 Cerrar sesión y re-vincular</button>
        <div id="reset-msg" style="margin-top:12px; font-size:13px"></div>
      </div>\`;
    } else if (!s.ready) {
      el.innerHTML = \`<div style="text-align:center; padding:40px; color:rgba(255,255,255,0.4)">
        <span class="spinner"></span> Iniciando bot...
      </div>\`;
    } else {
      el.innerHTML = \`<div style="text-align:center; padding:10px">
        <div style="color:rgba(255,255,255,0.5); font-size:14px; margin-bottom:20px">Vincula tu WhatsApp</div>
        <a href="/" target="_blank" class="btn-primary" style="display:inline-block; text-decoration:none; margin-bottom:16px">Abrir página de vinculación →</a>
        <p style="font-size:13px; color:rgba(255,255,255,0.35)">La página de vinculación con QR y código de 8 dígitos está disponible en la raíz del bot.</p>
      </div>\`;
    }
  } catch(e) {
    const el = document.getElementById('connection-content');
    if (el) el.innerHTML = '<div style="color:#f87171; text-align:center; padding:40px">Error al cargar estado de conexión</div>';
  }
}

async function resetSession() {
  if (!confirm('¿Cerrar la sesión actual? Tendrás que volver a vincular WhatsApp.')) return;
  try {
    const r = await fetch('/reset', { method: 'POST' });
    if (!r.ok) throw new Error('Reset falló');
    document.getElementById('reset-msg').textContent = '✅ Sesión cerrada. Recarga en 15 segundos.';
    setTimeout(() => location.reload(), 12000);
  } catch(e) {
    document.getElementById('reset-msg').textContent = '❌ ' + e.message;
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
loadConfig();
loadStats();
setInterval(loadStats, 30000);
</script>
</body>
</html>`;
}

// ─── Pairing page (existing) ─────────────────────────────────────────────────
function renderPage() {
  const connected = state.connected;
  const hasQR = !!state.qr;
  const hasCode = !!state.pairingCode;
  const ready = !!state.sock;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>🌸 AnimeBot — Vinculación</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:linear-gradient(135deg,#1a0033,#4a0080,#ff1493);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
  .card{background:rgba(0,0,0,.55);backdrop-filter:blur(12px);border-radius:20px;padding:28px;max-width:520px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1)}
  h1{margin:0 0 6px;font-size:1.7em}
  .sub{opacity:.75;font-size:.9em;margin-bottom:14px}
  .status{display:inline-block;padding:6px 14px;border-radius:20px;font-size:.85em;margin:6px 0;font-weight:600}
  .ok{background:#10b981}.wait{background:#f59e0b;color:#1a0033}.err{background:#ef4444}
  .tabs{display:flex;gap:6px;margin:18px 0 0;background:rgba(0,0,0,.35);padding:5px;border-radius:12px}
  .tab{flex:1;padding:10px;border-radius:9px;cursor:pointer;font-size:.95em;font-weight:600;border:none;background:transparent;color:#fff;opacity:.65;transition:all .2s}
  .tab:hover{opacity:.9}
  .tab.active{background:linear-gradient(135deg,#ff1493,#ff8ec7);opacity:1;box-shadow:0 4px 12px rgba(255,20,147,.4)}
  .panel{display:none;padding:20px 0 6px;animation:fade .3s ease}
  .panel.active{display:block}
  @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .qr-wrap{background:#fff;padding:14px;border-radius:14px;display:inline-block}
  .qr-wrap img{display:block;width:260px;height:260px}
  .form{display:flex;flex-direction:column;gap:10px;margin:8px auto;max-width:320px}
  .form label{font-size:.85em;opacity:.85;text-align:left}
  .form input{padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:1em;outline:none}
  .form input:focus{border-color:#ff8ec7;background:rgba(255,255,255,.14)}
  .form input::placeholder{opacity:.45}
  .btn{padding:12px 18px;border-radius:10px;border:none;background:linear-gradient(135deg,#ff1493,#ff8ec7);color:#fff;font-weight:700;font-size:1em;cursor:pointer;transition:transform .15s}
  .btn:hover{transform:translateY(-1px)}
  .btn:active{transform:translateY(0)}
  .btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .btn.danger{background:linear-gradient(135deg,#ef4444,#fb923c)}
  .btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.25)}
  .code{font-family:'SF Mono',Menlo,monospace;font-size:1.9em;letter-spacing:5px;background:rgba(255,255,255,.12);padding:16px;border-radius:12px;margin:12px 0;font-weight:bold;color:#ffe9f4}
  .help{font-size:.85em;line-height:1.55;opacity:.85;margin-top:16px;text-align:left;background:rgba(0,0,0,.3);padding:14px 16px;border-radius:10px}
  .help ol{padding-left:20px;margin:6px 0}
  .help strong{color:#ffd1e6}
  .footer{margin-top:18px;font-size:.72em;opacity:.55}
  .danger-zone{margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}
  .msg{padding:10px 14px;border-radius:10px;margin:10px 0;font-size:.9em;display:none}
  .msg.show{display:block;animation:fade .3s ease}
  .msg.error{background:rgba(239,68,68,.2);border:1px solid #ef4444}
  .msg.success{background:rgba(16,185,129,.2);border:1px solid #10b981}
  .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px}
  @keyframes spin{to{transform:rotate(360deg)}}
  .dashboard-link{display:inline-block;margin-top:16px;padding:8px 18px;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;text-decoration:none;font-size:.85em;font-weight:600;transition:background .2s}
  .dashboard-link:hover{background:rgba(255,255,255,.2)}
</style>
</head>
<body>
<div class="card">
  <h1>🌸 AnimeBot</h1>
  ${connected ? renderConnected() : renderUnconnected({ hasQR, hasCode, ready })}
  <div class="footer">Última actualización: ${new Date(state.lastUpdate).toLocaleTimeString("es-CL")}</div>
  <br>
  <a href="/dashboard" class="dashboard-link">📊 Ir al Dashboard →</a>
</div>
<script>
  let lastSig = ${JSON.stringify(stateSignature())};
  async function poll() {
    try {
      const r = await fetch("/status");
      const j = await r.json();
      if (j.signature !== lastSig) {
        lastSig = j.signature;
        if (!document.activeElement || document.activeElement.tagName !== "INPUT") {
          location.reload();
        }
      }
    } catch (_) {}
  }
  setInterval(poll, 3500);

  function showTab(id) {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === id));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + id));
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));

  const codeForm = document.getElementById("code-form");
  if (codeForm) {
    codeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const phone = document.getElementById("phone").value.trim();
      const btn = document.getElementById("code-btn");
      const msg = document.getElementById("code-msg");
      msg.className = "msg";
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>Generando...';
      try {
        const r = await fetch("/pairing-code", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ phone }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Error generando código");
        msg.className = "msg show success";
        msg.textContent = "✅ Código generado. Recargando...";
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        msg.className = "msg show error";
        msg.textContent = "❌ " + err.message;
        btn.disabled = false;
        btn.textContent = "Generar código";
      }
    });
  }

  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", async () => {
      const confirmed = confirm("¿Seguro que quieres cerrar la sesión actual?\\n\\nEl bot se desconectará y tendrás que volver a vincular WhatsApp.\\n\\nLos datos de los usuarios (XP, monedas, waifus) NO se borran.");
      if (!confirmed) return;
      const msg = document.getElementById("reset-msg");
      resetBtn.disabled = true;
      resetBtn.innerHTML = '<span class="spinner"></span>Reseteando...';
      try {
        const r = await fetch("/reset", { method: "POST" });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Reset falló");
        msg.className = "msg show success";
        msg.textContent = "✅ Sesión cerrada. El bot se está reiniciando. Refresca la página en 15 segundos para ver el QR nuevo.";
        setTimeout(() => location.reload(), 12000);
      } catch (err) {
        msg.className = "msg show error";
        msg.textContent = "❌ " + err.message;
        resetBtn.disabled = false;
        resetBtn.textContent = "🔄 Cerrar sesión y re-vincular";
      }
    });
  }
</script>
</body>
</html>`;
}

function renderConnected() {
  return `
    <div class="status ok">✅ Conectado a WhatsApp</div>
    <p style="opacity:.85">El bot ya está funcionando. Pruébalo enviando un mensaje con tu prefijo configurado.</p>
    <div class="danger-zone">
      <p style="font-size:.85em;opacity:.7;margin:0 0 10px">¿Necesitas vincular otro teléfono o WhatsApp se desconectó?</p>
      <button id="reset-btn" class="btn ghost">🔄 Cerrar sesión y re-vincular</button>
      <div id="reset-msg" class="msg"></div>
    </div>
  `;
}

function renderUnconnected({ hasQR, hasCode, ready }) {
  if (!ready) {
    return `
      <div class="status err"><span class="spinner"></span>Iniciando bot...</div>
      <p style="opacity:.85">Espera unos segundos y refresca la página.</p>
    `;
  }

  const initialTab = hasCode ? "code" : "qr";

  return `
    <div class="status wait">⏳ Esperando vinculación</div>
    <p class="sub">Elige tu método favorito. Los dos llevan al mismo lado.</p>

    <div class="tabs">
      <button class="tab ${initialTab === "qr" ? "active" : ""}" data-tab="qr">📷 Código QR</button>
      <button class="tab ${initialTab === "code" ? "active" : ""}" data-tab="code">🔢 Código de 8 dígitos</button>
    </div>

    <div id="panel-qr" class="panel ${initialTab === "qr" ? "active" : ""}">
      ${hasQR ? '<div class="qr-wrap" id="qr-slot"></div>' : `<p style="opacity:.7;padding:30px 0"><span class="spinner"></span> Generando QR...</p>`}
      <div class="help">
        <strong>Cómo escanear:</strong>
        <ol>
          <li>Abre WhatsApp en tu celular</li>
          <li>Ajustes → <strong>Dispositivos vinculados</strong></li>
          <li>Toca <strong>"Vincular un dispositivo"</strong></li>
          <li>Apunta la cámara a este QR</li>
        </ol>
      </div>
    </div>

    <div id="panel-code" class="panel ${initialTab === "code" ? "active" : ""}">
      ${hasCode ? renderPairingCode() : renderPairingForm()}
      <div class="help">
        <strong>Cómo usar el código:</strong>
        <ol>
          <li>Abre WhatsApp en tu celular</li>
          <li>Ajustes → <strong>Dispositivos vinculados</strong></li>
          <li>Toca <strong>"Vincular un dispositivo"</strong></li>
          <li>Toca <strong>"Vincular con número de teléfono"</strong></li>
          <li>Ingresa el código de 8 dígitos</li>
        </ol>
      </div>
    </div>
  `;
}

function renderPairingCode() {
  const phone = state.pairingPhone ? `+${state.pairingPhone}` : "tu número";
  return `
    <p style="margin:6px 0;opacity:.85">Código generado para <strong>${phone}</strong>:</p>
    <div class="code">${state.pairingCode}</div>
    <p style="font-size:.8em;opacity:.6;margin:0">El código expira en pocos minutos. Si no funciona, genera otro.</p>
    <form id="code-form" style="margin-top:14px">
      <button type="button" class="btn ghost" onclick="location.reload();" style="font-size:.85em;padding:8px 14px">Generar otro código</button>
    </form>
  `;
}

function renderPairingForm() {
  return `
    <form id="code-form" class="form">
      <label for="phone">Tu número de WhatsApp con código de país (sin +, espacios ni guiones):</label>
      <input id="phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]{8,16}" placeholder="56912345678" required autocomplete="off">
      <button id="code-btn" type="submit" class="btn">Generar código</button>
      <div id="code-msg" class="msg"></div>
    </form>
  `;
}

// ─── HTTP Server ─────────────────────────────────────────────────────────────
function startWebServer(port) {
  const app = express();
  app.use(express.json());

  // Vinculación QR / pairing
  app.get("/", async (req, res) => {
    let html = renderPage();
    if (state.qr) {
      try {
        const dataUrl = await QRCode.toDataURL(state.qr, { width: 280, margin: 2 });
        html = html.replace(
          '<div class="qr-wrap" id="qr-slot"></div>',
          `<div class="qr-wrap"><img src="${dataUrl}" alt="QR"></div>`,
        );
      } catch (_) {}
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(html);
  });

  // Dashboard
  app.get("/dashboard", (req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(renderDashboard());
  });

  // ── API: Status ──
  app.get("/status", (req, res) => {
    res.json({
      signature: stateSignature(),
      connected: state.connected,
      hasQR: !!state.qr,
      hasPairingCode: !!state.pairingCode,
      ready: !!state.sock,
      lastUpdate: state.lastUpdate,
    });
  });

  // ── API: Config (GET) ──
  app.get("/api/config", (req, res) => {
    try {
      res.json(getMergedConfig());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── API: Config (POST) ──
  app.post("/api/config", (req, res) => {
    try {
      const updates = req.body || {};
      applyOverrides(updates);
      res.json({ ok: true, config: getMergedConfig() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── API: Stats ──
  app.get("/api/stats", (req, res) => {
    try {
      const db = require("../database/db");
      const users = db.getAllUsers();
      // Count groups via require directly
      const fs = require("fs");
      const path = require("path");
      let groupCount = 0;
      try {
        const groupsFile = path.join(__dirname, "..", "database", "data", "groups.json");
        if (fs.existsSync(groupsFile)) {
          const groups = JSON.parse(fs.readFileSync(groupsFile, "utf-8"));
          groupCount = Object.keys(groups).length;
        }
      } catch {}
      res.json({
        users: users.length,
        groups: groupCount,
        connected: state.connected,
        uptime: Math.floor((Date.now() - state.startedAt) / 1000),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── API: Groups (GET) ──
  app.get("/api/groups", (req, res) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const groupsFile = path.join(__dirname, "..", "database", "data", "groups.json");
      let groups = {};
      if (fs.existsSync(groupsFile)) {
        groups = JSON.parse(fs.readFileSync(groupsFile, "utf-8"));
      }
      const list = Object.values(groups).map(g => ({
        jid: g.jid,
        name: g.name || "",
        antiLink: g.antiLink ?? false,
        antiSpam: g.antiSpam ?? true,
        welcome: g.welcome ?? true,
        createdAt: g.createdAt,
      }));
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── API: Groups (POST) - update single group ──
  app.post("/api/groups/:jid", (req, res) => {
    try {
      const db = require("../database/db");
      const jid = decodeURIComponent(req.params.jid);
      const updates = req.body || {};
      // Only allow safe boolean fields
      const allowed = ["antiLink", "antiSpam", "welcome"];
      const safe = {};
      for (const k of allowed) {
        if (updates[k] !== undefined) safe[k] = !!updates[k];
      }
      db.updateGroup(jid, safe);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Pairing code ──
  app.post("/pairing-code", async (req, res) => {
    if (state.connected) {
      return res.status(400).json({ error: "El bot ya está conectado. Si quieres re-vincular, presiona 'Cerrar sesión' primero." });
    }
    if (!state.sock) {
      return res.status(503).json({ error: "El bot aún no está listo. Espera 5 segundos y vuelve a intentar." });
    }
    if (state.sock.authState?.creds?.registered) {
      return res.status(400).json({ error: "La sesión ya está registrada. Resetea primero si quieres re-vincular." });
    }
    const phone = String(req.body?.phone || "").replace(/[^0-9]/g, "");
    if (phone.length < 8 || phone.length > 16) {
      return res.status(400).json({ error: "Número inválido. Incluye el código de país (ej: 56912345678 para Chile)." });
    }
    try {
      const code = await state.sock.requestPairingCode(phone);
      const formatted = code.match(/.{1,4}/g).join("-");
      setPairingCode(formatted, phone);
      logger.info(`🔢 Código de vinculación generado para +${phone}: ${formatted}`);
      res.json({ code: formatted, phone });
    } catch (err) {
      logger.error(`No pude generar el código de vinculación: ${err.message}`);
      res.status(500).json({ error: `WhatsApp rechazó la solicitud: ${err.message}. Verifica el número e intenta de nuevo.` });
    }
  });

  // ── Reset ──
  app.post("/reset", async (req, res) => {
    if (state.resetInProgress) {
      return res.status(409).json({ error: "Ya hay un reset en curso." });
    }
    state.resetInProgress = true;
    logger.warn("⚠️  Reset solicitado vía web. Borrando sesión local + backup remoto...");
    try {
      if (typeof onResetRequest === "function") {
        await onResetRequest();
      }
      res.json({ ok: true });
      setTimeout(() => process.exit(1), 1500);
    } catch (err) {
      state.resetInProgress = false;
      logger.error(`Reset falló: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // ── Health ──
  app.get("/health", (req, res) => {
    res.json({ status: "ok", connected: state.connected, uptime: process.uptime() });
  });

  app.listen(port, "0.0.0.0", () => {
    logger.success(`🌐 Servidor web activo en puerto ${port}`);
    logger.info(`   / → Vinculación WhatsApp`);
    logger.info(`   /dashboard → Panel de control`);
  });
}

module.exports = {
  startWebServer,
  setQR,
  setPairingCode,
  setConnected,
  setSocket,
  setResetHandler,
};
