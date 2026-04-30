const { DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");
const { setQR, setConnected } = require("../utils/webServer");
const { performBackup, deleteBackup } = require("../utils/authBackup");

const AUTH_DIR = path.join(__dirname, "..", "..", "auth");

let isReconnecting = false;
let reconnectAttempts = 0;
let cleanupInProgress = false;

async function cleanAndExit(reason) {
  if (cleanupInProgress) return;
  cleanupInProgress = true;
  logger.warn(`Limpieza automática iniciada (${reason})...`);
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      logger.info("✓ Sesión local borrada");
    }
  } catch (e) {
    logger.warn(`No pude borrar la sesión local: ${e.message}`);
  }
  try {
    await deleteBackup();
    logger.info("✓ Backup remoto borrado");
  } catch (e) {
    logger.warn(`No pude borrar el backup remoto: ${e.message}`);
  }
  logger.success("✅ Sesión limpiada. El proceso se reiniciará y verás un QR/código nuevo en la web.");
  setTimeout(() => process.exit(1), 1500);
}

function handleConnection(sock, startBot, options = {}) {
  const { usePairingCode } = options;

  sock.ev.on("connection.update", async (update) => {
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
        // WhatsApp nos cerró la sesión: auto-limpieza para que el próximo arranque
        // muestre un QR/código nuevo sin necesidad de tocar variables de entorno.
        logger.error("Sesión cerrada por WhatsApp (loggedOut). Auto-limpieza activada.");
        await cleanAndExit("loggedOut");
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
      setTimeout(() => {
        performBackup(AUTH_DIR).catch((err) =>
          logger.warn(`Backup post-conexión falló: ${err.message}`),
        );
      }, 5000);
    }
  });
}

module.exports = { handleConnection };
