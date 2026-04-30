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
const {
  saveMessage,
  getMessage,
  cachedGroupMetadata,
  setGroupMetadata,
  invalidateGroup,
} = require("./utils/messageStore");

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
    generateHighQualityLinkPreview: false,
    getMessage,
    cachedGroupMetadata,
    keepAliveIntervalMs: 30000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  const _origSend = sock.sendMessage.bind(sock);
  sock.sendMessage = (jid, content, options) => {
    const promise = _origSend(jid, content, options);
    Promise.resolve(promise).then(
      (r) => {
        const kind = content?.image ? "imagen" : content?.video ? "video" : "texto";
        logger.info(`📤 ${kind} → ${jid?.split("@")[0]} ${r?.key?.id ? "OK" : "(sin id)"}`);
      },
      (e) => {
        logger.error(`❌ Falló envío a ${jid}: ${e?.message || e}`);
      },
    );
    return promise;
  };

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    scheduleBackup(AUTH_DIR);
  });

  sock.ev.on("groups.update", (updates) => {
    for (const u of updates) {
      if (u.id) invalidateGroup(u.id);
    }
  });

  sock.ev.on("group-participants.update", ({ id }) => {
    invalidateGroup(id);
  });

  sock.ev.on("groups.upsert", (groups) => {
    for (const g of groups) {
      if (g.id) setGroupMetadata(g.id, g);
    }
  });

  handleConnection(sock, startBot, {
    pairingNumber: PAIRING_NUMBER,
    usePairingCode: USE_PAIRING_CODE,
  });
  handleGroupEvents(sock);

  sock.ev.on("messages.upsert", (m) => {
    for (const msg of m.messages || []) {
      try {
        saveMessage(msg);
      } catch (_) {
        // ignore
      }
    }
    handleMessages(sock, m).catch((err) =>
      logger.error(`handleMessages error: ${err.message}`),
    );
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
