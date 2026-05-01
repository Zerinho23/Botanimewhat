const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");

function _userPart(jid) {
  return (jid || "").split("@")[0].split(":")[0];
}

function isBotJid(sock, jid) {
  if (!jid) return false;
  const botPart = _userPart(sock.user?.id || "");
  return _userPart(jid) === botPart;
}

// Mensaje 1: bienvenida con el tageo y las instrucciones
function buildWelcomeMessage(participant) {
  const num = participant.split("@")[0];
  return (
    `╔══════════════════════════╗\n` +
    `║ 🌸✨ ¡BIENVENID@ OTAKU! ✨🌸 ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Hola @${num} 👋 ¡Nos alegra que estés aquí! 💖\n\n` +
    `Para quedarte en el grupo debes completar tu *ficha de presentación* 📋\n\n` +
    `👇 Copia el siguiente mensaje, rellena cada campo con tus datos y mándalo aquí en el grupo.\n\n` +
    `⏰ Tienes *24 horas* para presentarte o serás expulsado automáticamente. 🚫`
  );
}

// Mensaje 2: solo la ficha limpia para que el usuario pueda copiarla fácilmente
function buildFichaTemplate() {
  return (
    `🧾 *FICHA DE PRESENTACIÓN ANIME*\n\n` +
    `🌸 Nombre o apodo:\n` +
    `Tipo de género ♀️⚧️♂️:\n` +
    `🍥 País:\n` +
    `💮 Edad:\n` +
    `🎬 Animes favoritos:\n` +
    `🧙‍♂️ Personaje que más te representa:\n` +
    `🎵 Opening/Ending que nunca te cansas de escuchar:\n` +
    `🌟 Un dato curioso sobre ti:\n` +
    `🥳 Fecha de cumpleaños:`
  );
}

function handleGroupEvents(sock) {
  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    try {
      const group = db.getGroup(id);

      if (action === "add") {
        const botWasAdded = participants.some((p) => isBotJid(sock, p));
        if (botWasAdded) {
          db.updateGroup(id, { botJoinedAt: Date.now() });
          logger.info(`🤖 Bot agregado al grupo ${id}. Empieza a observar desde ahora.`);
        }

        if (!group.welcome) return;

        for (const participant of participants) {
          if (isBotJid(sock, participant)) continue;

          // Registrar como pendiente — tiene 24h para mandar su ficha
          db.addPending(id, participant);
          logger.info(`📋 Pendiente de ficha: ${participant.split("@")[0]} — 24h para presentarse`);

          // Mensaje 1: bienvenida con tag y aviso de 24h
          await sock.sendMessage(id, {
            text: buildWelcomeMessage(participant),
            mentions: [participant],
          });

          // Mensaje 2: ficha limpia para copiar (sin tag para que no estorbe)
          await sock.sendMessage(id, {
            text: buildFichaTemplate(),
          });
        }

      } else if (action === "remove") {
        for (const participant of participants) {
          if (db.isPending(id, participant)) {
            db.removePending(id, participant);
          }
          if (isBotJid(sock, participant)) continue;
          if (!group.welcome) continue;
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
