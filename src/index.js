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
const db = require("./database/db");
const { loadCommands, getCommand } = require("./handlers/commandHandler");
const { handleMessages } = require("./handlers/messageHandler");
const { handleConnection } = require("./events/connection");
const { handleGroupEvents } = require("./events/groupEvents");
const {
  startWebServer,
  setPairingCode,
  setSocket,
  setResetHandler,
} = require("./utils/webServer");
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
const PORT = parseInt(process.env.PORT) || 3000;

if (process.env.RESET_SESSION === "true") {
  logger.warn("");
  logger.warn("⚠️  RESET_SESSION=true detectado pero IGNORADO.");
  logger.warn("    Ya no es necesario tocar esta variable.");
  logger.warn("    Para resetear la sesión usa el botón 'Cerrar sesión y re-vincular' en la página web del bot.");
  logger.warn("    Puedes borrar RESET_SESSION de las variables de Railway.");
  logger.warn("");
}

setResetHandler(async () => {
  logger.warn("Reset: borrando sesión local y backup remoto...");
  if (fs.existsSync(AUTH_DIR)) {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    logger.info("✓ Sesión local borrada");
  }
  try {
    await deleteBackup();
    logger.info("✓ Backup remoto borrado");
  } catch (e) {
    logger.warn(`Borrar backup remoto falló (puede que no exista todavía): ${e.message}`);
  }
});

startWebServer(PORT);

let restoredFromBackup = false;
const msgRetryCounterMap = {};

// ────────────────────────────────────────────────────────────────
// REVISOR DE FICHAS EXPIRADAS
// ────────────────────────────────────────────────────────────────
function startKickChecker(sock) {
  const INTERVAL_MS = 5 * 60 * 1000;

  async function checkAndKick() {
    const expired = await db.getExpiredPending();
    if (!expired.length) return;
    logger.info(`⏰ Revisión de fichas: ${expired.length} miembro(s) con plazo vencido`);
    for (const { groupJid, userJid } of expired) {
      try {
        await sock.groupParticipantsUpdate(groupJid, [userJid], "remove");
        logger.info(`🚫 Expulsado por no presentarse: ${userJid.split("@")[0]} de ${groupJid}`);
        await sock.sendMessage(groupJid, {
          text: `🚫 @${userJid.split("@")[0]} fue expulsado por no completar su ficha de presentación en 24 horas.`,
          mentions: [userJid],
        });
      } catch (err) {
        logger.warn(`No pude expulsar a ${userJid.split("@")[0]}: ${err.message}`);
      } finally {
        await db.removePending(groupJid, userJid);
      }
    }
  }

  setTimeout(() => {
    checkAndKick().catch((e) => logger.error(`kickChecker error: ${e.message}`));
    setInterval(() => {
      checkAndKick().catch((e) => logger.error(`kickChecker error: ${e.message}`));
    }, INTERVAL_MS);
  }, 2 * 60 * 1000);

  logger.info("⏰ Revisor de fichas activo — verifica cada 5 minutos");
}

// ────────────────────────────────────────────────────────────────
// AUTO-DINÁMICAS
// Cada X horas lanza una dinámica aleatoria en grupos activos.
// Solo actúa si autoIntervalHours > 0 en config.
// ────────────────────────────────────────────────────────────────
function startAutoDinamica(sock) {
  const intervalHours = config.dinamica?.autoIntervalHours ?? 0;
  if (!intervalHours || intervalHours <= 0) return;

  const INTERVAL_MS = intervalHours * 60 * 60 * 1000;
  const MIN_MESSAGES = config.dinamica?.autoMinMessages ?? 5;
  const RECENT_WINDOW_MS = intervalHours * 60 * 60 * 1000; // misma ventana que el intervalo

  async function runAutoDinamica() {
    // Cargar dinámicas
    let dinamicaCmd;
    try {
      dinamicaCmd = getCommand("dinamica");
    } catch (_) {}
    if (!dinamicaCmd) return;

    const { startTrivia, startAdivina, startAdivinaPersonaje } = dinamicaCmd;
    if (!startTrivia || !startAdivina || !startAdivinaPersonaje) return;

    const allUsers = await db.getAllUsers();
    // Obtener grupos activos buscando en lastMessageAt de la DB
    const activeGroups = new Set();
    const now = Date.now();

    // Revisar todos los grupos registrados
    const groups = await db.getAllGroups();
    for (const group of groups) {
      if (!group.jid || !group.jid.endsWith("@g.us")) continue;
      if (group.botEnabled === false) continue;
      const lastMsg = group.lastMessageAt || {};
      const recentSenders = Object.values(lastMsg).filter((t) => now - t < RECENT_WINDOW_MS);
      if (recentSenders.length >= MIN_MESSAGES) {
        activeGroups.add(group.jid);
      }
    }

    if (!activeGroups.size) {
      logger.info("🎮 Auto-dinámica: ningún grupo activo encontrado.");
      return;
    }

    logger.info(`🎮 Auto-dinámica: lanzando en ${activeGroups.size} grupo(s) activo(s)`);

    const gameTypes = ["trivia", "adivina", "personaje"];
    for (const groupJid of activeGroups) {
      try {
        const chosen = gameTypes[Math.floor(Math.random() * gameTypes.length)];
        if (chosen === "trivia") await startTrivia(sock, groupJid, true);
        else if (chosen === "adivina") await startAdivina(sock, groupJid, true);
        else await startAdivinaPersonaje(sock, groupJid, true);
        logger.info(`🎮 Auto-dinámica (${chosen}) iniciada en ${groupJid}`);
        // Pequeña pausa entre grupos para no saturar
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        logger.warn(`Auto-dinámica falló en ${groupJid}: ${err.message}`);
      }
    }
  }

  // Primera ejecución tras el intervalo completo (no al arrancar)
  setInterval(() => {
    runAutoDinamica().catch((e) => logger.error(`Auto-dinámica error: ${e.message}`));
  }, INTERVAL_MS);

  logger.info(`🎮 Auto-dinámicas activas — cada ${intervalHours} hora(s) en grupos activos`);
}

async function startBot() {
  logger.info(`Iniciando ${config.botName}...`);

  await db.initDB();

  const localExists = fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0;
  if (!localExists && !restoredFromBackup) {
    restoredFromBackup = await restoreAuth(AUTH_DIR);
  } else if (localExists) {
    logger.info("Sesión local presente, no se restaura del backup.");
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version, isLatest } = await fetchLatestBaileysVersion();
  logger.info(`Baileys v${version.join(".")} (latest: ${isLatest})`);

  const isRegistered = !!state.creds?.registered;
  if (isRegistered) {
    logger.info("✓ Sesión ya registrada, conectando...");
  } else {
    logger.info("");
    logger.info("📲 Sesión NO registrada. Vincula tu WhatsApp:");
    logger.info("   👉 Abre la URL pública del bot en cualquier navegador");
    logger.info("   👉 Elige escanear el QR o generar un código de 8 dígitos");
    if (USE_PAIRING_CODE) {
      logger.info(`   👉 También se generará automáticamente un código para +${PAIRING_NUMBER}`);
    }
    logger.info("");
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

  setSocket(sock);

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

  startKickChecker(sock);
  startAutoDinamica(sock);

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
      } catch (_) {}
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
        setPairingCode(formatted, PAIRING_NUMBER);
        logger.info("");
        logger.info("╔═══════════════════════════════════════════╗");
        logger.info("║   CÓDIGO DE VINCULACIÓN DE WHATSAPP       ║");
        logger.info(`║          👉  ${formatted}  👈              ║`);
        logger.info("╚═══════════════════════════════════════════╝");
        logger.info("");
        logger.info(`📱 También puedes ver el código (y generar otro) en la página web del bot.`);
        logger.info("");
      } catch (err) {
        logger.error(`No pude generar el código automático: ${err.message}`);
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
