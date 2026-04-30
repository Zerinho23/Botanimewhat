const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");

function _userPart(jid) {
  return (jid || "").split("@")[0].split(":")[0];
}

// ¿La JID corresponde al bot? Soporta formatos @s.whatsapp.net y @lid.
function isBotJid(sock, jid) {
  if (!jid) return false;
  const botRaw = sock.user?.id || "";
  const botPart = _userPart(botRaw);
  return _userPart(jid) === botPart;
}

function handleGroupEvents(sock) {
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    try {
      const group = db.getGroup(id);

      if (action === "add") {
        // Si el bot mismo fue agregado al grupo, registrar la fecha de entrada.
        // Esto es lo que !purga y !fantasmas usan para esperar 30 días antes de actuar.
        const botWasAdded = participants.some((p) => isBotJid(sock, p));
        if (botWasAdded) {
          db.updateGroup(id, { botJoinedAt: Date.now() });
          logger.info(`🤖 Bot agregado al grupo ${id}. Empieza a observar desde ahora.`);
        }

        if (!group.welcome) return;

        for (const participant of participants) {
          if (isBotJid(sock, participant)) continue; // no dar la bienvenida al bot mismo
          await sock.sendMessage(id, {
            text:
              `${config.emojis.cherry}${config.emojis.sparkles} *¡Bienvenido otaku!* ${config.emojis.sparkles}${config.emojis.cherry}\n\n` +
              `@${participant.split("@")[0]}, te uniste al mejor grupo de anime ${config.emojis.heart}\n\n` +
              `Usa *${config.prefix}help* para ver los comandos disponibles.`,
            mentions: [participant],
          });
        }
      } else if (action === "remove") {
        if (!group.welcome) return;
        for (const participant of participants) {
          if (isBotJid(sock, participant)) continue;
          await sock.sendMessage(id, {
            text: `${config.emojis.warning} @${participant.split("@")[0]} salió del grupo. Sayonara ${config.emojis.cherry}`,
            mentions: [participant],
          });
        }
      }
    } catch (err) {
      logger.error(`Error en evento de grupo: ${err.message}`);
    }
  });
}

module.exports = { handleGroupEvents };
