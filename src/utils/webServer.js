const express = require("express");
const QRCode = require("qrcode");
const logger = require("./logger");

const state = {
  qr: null,
  pairingCode: null,
  connected: false,
  lastUpdate: Date.now(),
};

function setQR(qr) {
  state.qr = qr;
  state.connected = false;
  state.lastUpdate = Date.now();
}

function setPairingCode(code) {
  state.pairingCode = code;
  state.lastUpdate = Date.now();
}

function setConnected(value) {
  state.connected = value;
  if (value) {
    state.qr = null;
    state.pairingCode = null;
  }
  state.lastUpdate = Date.now();
}

function startWebServer(port) {
  const app = express();

  app.get("/", async (req, res) => {
    let qrImage = null;
    if (state.qr) {
      try {
        qrImage = await QRCode.toDataURL(state.qr, { width: 320, margin: 2 });
      } catch {}
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="5">
<title>🌸 AnimeBot — Vinculación</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#1a0033,#4a0080,#ff1493);color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:rgba(0,0,0,.5);backdrop-filter:blur(10px);border-radius:20px;padding:30px;max-width:480px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1)}
  h1{margin:0 0 10px;font-size:1.8em}
  .status{display:inline-block;padding:6px 14px;border-radius:20px;font-size:.85em;margin:10px 0;font-weight:600}
  .ok{background:#10b981}
  .wait{background:#f59e0b}
  .err{background:#ef4444}
  .qr{background:#fff;padding:15px;border-radius:15px;margin:20px auto;display:inline-block}
  .qr img{display:block;width:280px;height:280px}
  .code{font-family:monospace;font-size:2em;letter-spacing:6px;background:rgba(255,255,255,.1);padding:15px 20px;border-radius:12px;margin:15px 0;font-weight:bold}
  .info{font-size:.9em;line-height:1.6;opacity:.9;margin-top:20px;text-align:left;background:rgba(0,0,0,.3);padding:15px;border-radius:10px}
  .info ol{padding-left:20px;margin:8px 0}
  .footer{margin-top:20px;font-size:.75em;opacity:.6}
  a{color:#ff8ec7}
</style>
</head>
<body>
<div class="card">
  <h1>🌸 AnimeBot</h1>
  ${state.connected
    ? `<div class="status ok">✅ Conectado a WhatsApp</div>
       <p>El bot ya está funcionando. Pruébalo enviando un mensaje con el prefijo configurado.</p>`
    : qrImage
      ? `<div class="status wait">⏳ Esperando vinculación</div>
         <div class="qr"><img src="${qrImage}" alt="QR"></div>
         <div class="info">
           <strong>Cómo escanear:</strong>
           <ol>
             <li>Abre WhatsApp en tu celular</li>
             <li>Ajustes → Dispositivos vinculados</li>
             <li>Toca "Vincular un dispositivo"</li>
             <li>Apunta la cámara a este QR</li>
           </ol>
         </div>`
      : state.pairingCode
        ? `<div class="status wait">⏳ Código de vinculación activo</div>
           <div class="code">${state.pairingCode}</div>
           <div class="info">
             <strong>Cómo usar este código:</strong>
             <ol>
               <li>Abre WhatsApp en tu celular</li>
               <li>Ajustes → Dispositivos vinculados</li>
               <li>Toca "Vincular un dispositivo"</li>
               <li>Toca "Vincular con número de teléfono"</li>
               <li>Ingresa el código de arriba</li>
             </ol>
           </div>`
        : `<div class="status err">⏳ Iniciando bot...</div>
           <p>Espera unos segundos y refresca la página.</p>`
  }
  <div class="footer">Página se actualiza cada 5 segundos<br>Última actualización: ${new Date(state.lastUpdate).toLocaleTimeString("es-CL")}</div>
</div>
</body>
</html>`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok", connected: state.connected, uptime: process.uptime() });
  });

  app.listen(port, "0.0.0.0", () => {
    logger.success(`🌐 Servidor web activo en puerto ${port}`);
    logger.info(`   Abre la URL pública para ver el QR / código`);
  });
}

module.exports = { startWebServer, setQR, setPairingCode, setConnected };
