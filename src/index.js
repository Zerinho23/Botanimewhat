const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");

const config = require("./config/config");
const logger = require("./utils/logger");
const { loadCommands } = require("./handlers/commandHandler");
const { handleMessages } = require("./handlers/messageHandler");
const { handleConnection } = require("./events/connection");
const { handleGroupEvents } = require("./events/groupEvents");

const AUTH_DIR = path.join(__dirname, "..", "auth");

async function startBot() {
  logger.info(`Iniciando ${config.botName}...`);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Baileys v${version.join(".")} (latest: ${isLatest})`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.macOS("Desktop"),
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });

  sock.ev.on("creds.update", saveCreds);

  handleConnection(sock, startBot);
  handleGroupEvents(sock);

  sock.ev.on("messages.upsert", async (m) => {
    await handleMessages(sock, m);
  });
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
