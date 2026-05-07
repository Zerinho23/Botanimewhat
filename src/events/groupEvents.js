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

  // ── Mensajes de bienvenida ────────────────────────────────────────────────────
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

  // ── Registrar ingreso en recentJoins (historial de 30 días) ──────────────────
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  async function recordJoin(groupJid, participantJid) {
    const group = await db.getGroup(groupJid);
    const recentJoins = group.recentJoins || {};
    recentJoins[participantJid] = Date.now();

    // Purgar entradas con más de 30 días
    const cutoff = Date.now() - THIRTY_DAYS;
    for (const jid of Object.keys(recentJoins)) {
      if (recentJoins[jid] < cutoff) delete recentJoins[jid];
    }

    await db.updateGroup(groupJid, { recentJoins });
  }

  function handleGroupEvents(sock) {
    sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
      try {
        const group = await db.getGroup(id);

        if (action === "add") {
          const botWasAdded = participants.some((p) => isBotJid(sock, p));
          if (botWasAdded) {
            await db.updateGroup(id, { botJoinedAt: Date.now() });
            logger.info(`🤖 Bot agregado al grupo ${id}. Empieza a observar desde ahora.`);
          }

          for (const participant of participants) {
            if (isBotJid(sock, participant)) continue;

            // Registrar fecha de ingreso (para comando !nuevos)
            await recordJoin(id, participant);

            // Registrar como pendiente — tiene 24h para mandar su ficha
            await db.addPending(id, participant);
            logger.info(`📋 Pendiente de ficha: ${participant.split("@")[0]} — 24h para presentarse`);

            if (!group.welcome) continue;

            // Mensaje 1: bienvenida con tag y aviso de 24h
            await sock.sendMessage(id, {
              text: buildWelcomeMessage(participant),
              mentions: [participant],
            });

            // Mensaje 2: ficha limpia para copiar
            await sock.sendMessage(id, {
              text: buildFichaTemplate(),
            });
          }

        } else if (action === "remove") {
          for (const participant of participants) {
            if (await db.isPending(id, participant)) {
              await db.removePending(id, participant);
            }
            if (isBotJid(sock, participant)) continue;
            if (!group.welcome) continue;

            await sock.sendMessage(id, {
              text:
                `╔══════════════════════════╗\n` +
                `║   💔 HASTA LUEGO, OTAKU   ║\n` +
                `╚══════════════════════════╝\n\n` +
                `@${participant.split("@")[0]} abandonó el grupo 😢\n\n` +
                `Fue un honor compartir el mundo del anime contigo 🌸\n` +
                `Que tu camino esté lleno de buenos animes 🎌\n\n` +
                `_Sayonara... またね_ 👋`,
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
  