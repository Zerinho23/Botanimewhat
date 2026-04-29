const { DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const logger = require("../utils/logger");

function handleConnection(sock, startBot, options = {}) {
  const { pairingNumber, usePairingCode } = options;
  let pairingRequested = false;

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !usePairingCode) {
      logger.info("");
      logger.info("┌─────────────────────────────────────────────────┐");
      logger.info("│ Escanea este QR con WhatsApp:                   │");
      logger.info("│ Ajustes → Dispositivos vinculados → Vincular    │");
      logger.info("└─────────────────────────────────────────────────┘");
      qrcode.generate(qr, { small: true });
      logger.info("");
      logger.info("⚠️  Si el QR no se ve bien o WhatsApp no lo lee,");
      logger.info("   reinicia el bot con un número para usar código de 8 dígitos:");
      logger.info("   PAIRING_NUMBER=521XXXXXXXXXX npm start");
      logger.info("");
    }

    if (
      usePairingCode &&
      !sock.authState.creds.registered &&
      !pairingRequested &&
      pairingNumber
    ) {
      pairingRequested = true;
      try {
        await new Promise((r) => setTimeout(r, 3000));
        const code = await sock.requestPairingCode(pairingNumber);
        const formatted = code.match(/.{1,4}/g).join("-");
        logger.info("");
        logger.info("╔═══════════════════════════════════════════╗");
        logger.info("║   CÓDIGO DE VINCULACIÓN DE WHATSAPP       ║");
        logger.info("╠═══════════════════════════════════════════╣");
        logger.info(`║          👉  ${formatted}  👈              ║`);
        logger.info("╚═══════════════════════════════════════════╝");
        logger.info("");
        logger.info("📱 En tu teléfono:");
        logger.info("   1. Abre WhatsApp");
        logger.info("   2. Ajustes → Dispositivos vinculados");
        logger.info("   3. Toca 'Vincular un dispositivo'");
        logger.info("   4. Toca 'Vincular con número de teléfono' (abajo)");
        logger.info("   5. Ingresa el código de arriba");
        logger.info("");
        logger.info("⏰ El código expira en 60 segundos.");
      } catch (err) {
        logger.error(`Error generando código: ${err.message}`);
      }
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn(`Conexión cerrada (code: ${code}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) startBot();
      else logger.error("Sesión cerrada. Borra la carpeta /auth y vuelve a vincular.");
    } else if (connection === "open") {
      logger.success("✅ Bot conectado a WhatsApp correctamente");
    }
  });
}

module.exports = { handleConnection };
