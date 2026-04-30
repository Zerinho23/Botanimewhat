const express = require("express");
const QRCode = require("qrcode");
const logger = require("./logger");

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
</style>
</head>
<body>
<div class="card">
  <h1>🌸 AnimeBot</h1>
  ${connected ? renderConnected() : renderUnconnected({ hasQR, hasCode, ready })}
  <div class="footer">Última actualización: ${new Date(state.lastUpdate).toLocaleTimeString("es-CL")}</div>
</div>
<script>
  // Polling de estado para auto-actualizar sin perder lo que el usuario escribe
  let lastSig = ${JSON.stringify(stateSignature())};
  async function poll() {
    try {
      const r = await fetch("/status");
      const j = await r.json();
      if (j.signature !== lastSig) {
        lastSig = j.signature;
        // Solo recargamos si no hay focus en un input (no perder lo que escribe)
        if (!document.activeElement || document.activeElement.tagName !== "INPUT") {
          location.reload();
        }
      }
    } catch (_) {}
  }
  setInterval(poll, 3500);

  // Tabs
  function showTab(id) {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === id));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + id));
  }
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));

  // Generar código de vinculación
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

  // Reset session
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
      ${hasQR ? renderQR() : `<p style="opacity:.7;padding:30px 0"><span class="spinner"></span> Generando QR...</p>`}
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

function renderQR() {
  // Empty placeholder; image is injected in renderPage with QRCode.toDataURL
  return `<div class="qr-wrap" id="qr-slot"></div>`;
}

function renderPairingCode() {
  const phone = state.pairingPhone ? `+${state.pairingPhone}` : "tu número";
  return `
    <p style="margin:6px 0;opacity:.85">Código generado para <strong>${phone}</strong>:</p>
    <div class="code">${state.pairingCode}</div>
    <p style="font-size:.8em;opacity:.6;margin:0">El código expira en pocos minutos. Si no funciona, genera otro.</p>
    <form id="code-form" style="margin-top:14px">
      <input type="hidden" id="phone-hidden" value="${state.pairingPhone || ""}">
      <button type="button" class="btn ghost" onclick="document.getElementById('panel-code').innerHTML = ''; location.reload();" style="font-size:.85em;padding:8px 14px">Generar otro código</button>
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

function stateSignature() {
  return [
    state.connected ? "C" : "U",
    state.qr ? "Q" : "-",
    state.pairingCode ? "P" : "-",
    state.sock ? "R" : "-",
  ].join("");
}

function startWebServer(port) {
  const app = express();
  app.use(express.json());

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

  app.post("/pairing-code", async (req, res) => {
    if (state.connected) {
      return res
        .status(400)
        .json({ error: "El bot ya está conectado. Si quieres re-vincular, presiona 'Cerrar sesión' primero." });
    }
    if (!state.sock) {
      return res
        .status(503)
        .json({ error: "El bot aún no está listo. Espera 5 segundos y vuelve a intentar." });
    }
    if (state.sock.authState?.creds?.registered) {
      return res
        .status(400)
        .json({ error: "La sesión ya está registrada. Resetea primero si quieres re-vincular." });
    }

    const phone = String(req.body?.phone || "").replace(/[^0-9]/g, "");
    if (phone.length < 8 || phone.length > 16) {
      return res
        .status(400)
        .json({ error: "Número inválido. Incluye el código de país (ej: 56912345678 para Chile)." });
    }

    try {
      const code = await state.sock.requestPairingCode(phone);
      const formatted = code.match(/.{1,4}/g).join("-");
      setPairingCode(formatted, phone);
      logger.info(`🔢 Código de vinculación generado para +${phone}: ${formatted}`);
      res.json({ code: formatted, phone });
    } catch (err) {
      logger.error(`No pude generar el código de vinculación: ${err.message}`);
      res
        .status(500)
        .json({ error: `WhatsApp rechazó la solicitud: ${err.message}. Verifica el número e intenta de nuevo.` });
    }
  });

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
      logger.success("✅ Sesión borrada. Reiniciando proceso para regenerar QR/código...");
      res.json({ ok: true });
      setTimeout(() => process.exit(0), 1500);
    } catch (err) {
      state.resetInProgress = false;
      logger.error(`Reset falló: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok", connected: state.connected, uptime: process.uptime() });
  });

  app.listen(port, "0.0.0.0", () => {
    logger.success(`🌐 Servidor web activo en puerto ${port}`);
    logger.info(`   Abre la URL pública del bot para vincular o resetear sin tocar variables.`);
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
