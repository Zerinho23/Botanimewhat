const { DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const logger = require("../utils/logger");
const { setQR, setConnected } = require("../utils/webServer");

let isReconnecting = false;
let reconnectAttempts = 0;

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

      if (!shouldReconnect) {
        logger.error("Sesión cerrada por WhatsApp. Saliendo para regenerar...");
        setTimeout(() => process.exit(1), 1000);
        return;
      }

      if (isReconnecting) {
        logger.warn("Ya hay una reconexión en curso, ignorando.");
        return;
      }

      isReconnecting = true;
      reconnectAttempts++;
      const delay = Math.min(5000 * reconnectAttempts, 30000);

      try {
        sock.ev.removeAllListeners();
        sock.end?.(undefined);
      } catch (_) {
        // ignore
      }

      setTimeout(() => {
        isReconnecting = false;
        startBot().catch((err) => {
          logger.error(`Falló reinicio: ${err.message}`);
          process.exit(1);
        });
      }, delay);
    } else if (connection === "open") {
      setConnected(true);
      isReconnecting = false;
      reconnectAttempts = 0;
      logger.success("✅ Bot conectado a WhatsApp correctamente");
    }
  });
}

module.exports = { handleConnection };
