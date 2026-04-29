const { DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const logger = require("../utils/logger");
const { setQR, setConnected } = require("../utils/webServer");

function handleConnection(sock, startBot, options = {}) {
  const { usePairingCode } = options;

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      setQR(qr);
      if (!usePairingCode) {
        logger.info("");
        logger.info("📱 QR generado. Opciones para escanear:");
        logger.info("   1. Abre la URL pública del bot en cualquier navegador");
        logger.info("   2. O escanea el QR ASCII de abajo:");
        qrcode.generate(qr, { small: true });
        logger.info("");
      }
    }

    if (connection === "close") {
      setConnected(false);
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn(`Conexión cerrada (code: ${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) setTimeout(() => startBot(), 3000);
      else logger.error("Sesión cerrada. Activa RESET_SESSION=true y reinicia.");
    } else if (connection === "open") {
      setConnected(true);
      logger.success("✅ Bot conectado a WhatsApp correctamente");
    }
  });
}

module.exports = { handleConnection };
