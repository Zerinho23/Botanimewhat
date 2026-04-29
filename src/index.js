const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");

const config = require("./config/config");
const logger = require("./utils/logger");
const { loadCommands } = require("./handlers/commandHandler");
const { handleMessages } = require("./handlers/messageHandler");
const { handleConnection } = require("./events/connection");
const { handleGroupEvents } = require("./events/groupEvents");
const { startWebServer, setPairingCode } = require("./utils/webServer");
const { restoreAuth, scheduleBackup } = require("./utils/authBackup");

const AUTH_DIR = path.join(__dirname, "..", "auth");

const PAIRING_NUMBER = (process.env.PAIRING_NUMBER || "").replace(/[^0-9]/g, "");
const USE_PAIRING_CODE = PAIRING_NUMBER.length > 0;
const RESET_SESSION = process.env.RESET_SESSION === "true";
const PORT = parseInt(process.env.PORT) || 3000;

if (RESET_SESSION && fs.existsSync(AUTH_DIR)) {
  logger.warn("⚠️  RESET_SESSION=true → borrando carpeta auth/ ...");
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  logger.success("Sesión vieja eliminada. Generando nueva vinculación...");
}

startWebServer(PORT);

let restoredFromBackup = false;

async function startBot() {
  logger.info(`Iniciando ${config.botName}...`);

  const localExists = fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0;
  if (!localExists && !restoredFromBackup && !RESET_SESSION) {
    restoredFromBackup = await restoreAuth(AUTH_DIR);
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Baileys v${version.join(".")} (latest: ${isLatest})`);

  if (USE_PAIRING_CODE) {
    logger.info(`🔢 Modo código de vinculación para +${PAIRING_NUMBER}`);
  } else {
    logger.info(`📱 Modo QR. Abre la URL pública del servidor para escanear.`);
  }

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    scheduleBackup(AUTH_DIR);
  });

  handleConnection(sock, startBot, {
    pairingNumber: PAIRING_NUMBER,
    usePairingCode: USE_PAIRING_CODE,
  });
  handleGroupEvents(sock);

  sock.ev.on("messages.upsert", async (m) => {
    await handleMessages(sock, m);
  });

  if (USE_PAIRING_CODE && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(PAIRING_NUMBER);
        const formatted = code.match(/.{1,4}/g).join("-");
        setPairingCode(formatted);
        logger.info("");
        logger.info("╔═══════════════════════════════════════════╗");
        logger.info("║   CÓDIGO DE VINCULACIÓN DE WHATSAPP       ║");
        logger.info(`║          👉  ${formatted}  👈              ║`);
        logger.info("╚═══════════════════════════════════════════╝");
        logger.info("");
        logger.info(`📱 También puedes ver el código en la página web del bot.`);
        logger.info("");
      } catch (err) {
        logger.error(`No pude generar el código: ${err.message}`);
      }
    }, 4000);
  }
}

(async () => {
  loadCommands();
  try {
    await startBot();
  } catch (err) {
    logger.error(`Error fatal: ${err.message}`);
    process.exit(1);
  }
})();

process.on("uncaughtException", (err) => logger.error(`Uncaught: ${err.message}`));
process.on("unhandledRejection", (err) => logger.error(`Unhandled: ${err}`));
