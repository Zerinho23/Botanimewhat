const { DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const logger = require("../utils/logger");

function handleConnection(sock, startBot) {
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("Escanea el código QR con WhatsApp:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn(`Conexión cerrada (code: ${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) startBot();
      else logger.error("Sesión cerrada. Borra la carpeta /auth y vuelve a escanear el QR.");
    } else if (connection === "open") {
      logger.success("✅ Bot conectado a WhatsApp correctamente");
    }
  });
}

module.exports = { handleConnection };
