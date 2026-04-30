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
  const { restoreAuth, scheduleBackup, performBackup, deleteBackup } = require("./utils/authBackup");
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

  let resetExecuted = false;

  async function maybeResetSession() {
    if (!RESET_SESSION) return;
    const credsPath = path.join(AUTH_DIR, "creds.json");
    const hasValidLocalCreds = fs.existsSync(credsPath);
    if (hasValidLocalCreds) {
      logger.warn("⚠️  RESET_SESSION=true pero ya hay sesión válida local. Ignorando para no romperla.");
      logger.warn("    👉 Cambia RESET_SESSION a false en Railway para evitar este aviso.");
      return;
    }
    if (resetExecuted) return;
    resetExecuted = true;
    logger.warn("⚠️  RESET_SESSION=true → borrando sesión local y backup remoto...");
    if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    await deleteBackup();
    logger.success("Sesión vieja eliminada. Se generará un QR nuevo.");
    logger.warn("    👉 IMPORTANTE: cambia RESET_SESSION a false en Railway YA, o se borrará otra vez al próximo reinicio.");
  }

  startWebServer(PORT);

  let restoredFromBackup = false;

  // Persiste entre reconexiones para rastrear reintentos de mensajes
  const msgRetryCounterMap = {};

  async function startBot() {
    logger.info(`Iniciando ${config.botName}...`);

    await maybeResetSession();

    const localExists = fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0;
    if (!localExists && !restoredFromBackup && !RESET_SESSION) {
      restoredFromBackup = await restoreAuth(AUTH_DIR);
    } else if (localExists) {
      logger.info("Sesión local presente, no se restaura del backup.");
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
      msgRetryCounterMap,
      retryRequestDelayMs: 250,
      keepAliveIntervalMs: 30000,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
    });

    const _origSend = sock.sendMessage.bind(sock);
    async function safeSend(jid, content, options, attempt = 1) {
      try {
        const r = await Promise.race([
          _origSend(jid, content, options),
          new Promise((_, rej) => setTimeout(() => rej(new Error("send-timeout")), 25000)),
        ]);
        const kind = content?.image ? "imagen" : content?.video ? "video" : "texto";
        logger.info(`📤 ${kind} → ${jid?.split("@")[0]} OK`);
        return r;
      } catch (e) {
        const msg = e?.message || String(e);
        logger.error(`❌ Falló envío a ${jid} (intento ${attempt}): ${msg}`);
        if (attempt < 2) {
          try {
            if (jid?.endsWith("@g.us")) {
              const meta = await sock.groupMetadata(jid);
              const participants = meta.participants?.map((p) => p.id) || [];
              if (participants.length && typeof sock.assertSessions === "function") {
                await sock.assertSessions(participants, true);
                logger.info(`🔄 Sesiones de grupo refrescadas para ${participants.length} participantes`);
              }
            } else if (typeof sock.assertSessions === "function") {
              await sock.assertSessions([jid], true);
              logger.info(`🔄 Sesión privada refrescada para ${jid?.split("@")[0]}`);
            }
          } catch (refreshErr) {
            logger.warn(`No pude refrescar sesiones: ${refreshErr.message}`);
          }
          return safeSend(jid, content, options, attempt + 1);
        }
        throw e;
      }
    }
    sock.sendMessage = (jid, content, options) => safeSend(jid, content, options);

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

    async function ensureGroupMetadata(jid) {
      if (!jid?.endsWith("@g.us")) return;
      if (cachedGroupMetadata(jid)) return;
      try {
        const data = await Promise.race([
          sock.groupMetadata(jid),
          new Promise((_, rej) => setTimeout(() => rej(new Error("metadata-timeout")), 8000)),
        ]);
        setGroupMetadata(jid, data);
        logger.info(`📚 Metadatos del grupo cacheados: ${data.subject || jid}`);
      } catch (err) {
        logger.warn(`No pude obtener metadatos del grupo ${jid}: ${err.message}`);
      }
    }

    sock.ev.on("messages.upsert", async (m) => {
      for (const msg of m.messages || []) {
        try {
          saveMessage(msg);
        } catch (_) {
          // ignore
        }
        const from = msg.key?.remoteJid;
        if (from?.endsWith("@g.us")) {
          await ensureGroupMetadata(from);
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
  