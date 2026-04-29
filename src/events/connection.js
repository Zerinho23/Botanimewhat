const { DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const logger = require("../utils/logger");

function handleConnection(sock, startBot, options = {}) {
  const { usePairingCode } = options;

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
      logger.info("");
      logger.info("┌─────────────────────────────────────────────────┐");
      logger.info("│ Escanea este QR con WhatsApp:                   │");
      logger.info("│ Ajustes → Dispositivos vinculados → Vincular    │");
      logger.info("└─────────────────────────────────────────────────┘");
      qrcode.generate(qr, { small: true });
      logger.info("");
      logger.info("⚠️  Si el QR no se ve bien, usa código de 8 dígitos:");
      logger.info("   Agrega PAIRING_NUMBER=569XXXXXXXX en variables");
      logger.info("");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn(`Conexión cerrada (code: ${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(() => startBot(), 3000);
      else logger.error("Sesión cerrada. Activa RESET_SESSION=true y reinicia.");
    } else if (connection === "open") {
      logger.success("✅ Bot conectado a WhatsApp correctamente");
      logger.success("Ya puedes usar comandos en cualquier chat con el prefijo configurado.");
    }
  });
}

module.exports = { handleConnection };
