const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");

function handleGroupEvents(sock) {
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    try {
      const group = db.getGroup(id);
      if (!group.welcome) return;

      if (action === "add") {
        for (const participant of participants) {
          await sock.sendMessage(id, {
            text:
              `${config.emojis.cherry}${config.emojis.sparkles} *¡Bienvenido otaku!* ${config.emojis.sparkles}${config.emojis.cherry}\n\n` +
              `@${participant.split("@")[0]}, te uniste al mejor grupo de anime ${config.emojis.heart}\n\n` +
              `Usa *${config.prefix}help* para ver los comandos disponibles.`,
            mentions: [participant],
          });
        }
      } else if (action === "remove") {
        for (const participant of participants) {
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
