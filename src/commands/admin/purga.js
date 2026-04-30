const config = require("../../config/config");
const db = require("../../database/db");
const { isAdmin } = require("../../handlers/antiSpamHandler");

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const MIN_DAYS_IN_GROUP = 30;
const MIN_MS_IN_GROUP = MIN_DAYS_IN_GROUP * 24 * 60 * 60 * 1000;

function divider() {
  return "━━━━━━━━━━━━━━━━━━━━";
}

function timeLeft(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return `${d}d ${rh}h`;
  }
  return `${h}h ${m}m`;
}

module.exports = {
  name: "purga",
  description: "Expulsa a los miembros que nunca han hablado (solo admins, requiere 30 días de observación)",
  aliases: ["limpiar", "depurar"],
  async execute({ sock, msg, from, sender, isGroup }) {
    if (!isGroup) {
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Este comando solo funciona en grupos.`,
      }, { quoted: msg });
    }

    if (!(await isAdmin(sock, from, sender))) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Solo los admins pueden usar este comando.`,
      }, { quoted: msg });
    }

    const group = db.getGroup(from);
    const now = Date.now();

    // 1) Verificar que el bot lleve al menos 30 días observando el grupo,
    //    de lo contrario el messageLog está vacío y todos parecerían fantasmas.
    const joinedAt = group.botJoinedAt || group.createdAt || 0;
    const daysObserving = Math.floor((now - joinedAt) / (24 * 60 * 60 * 1000));
    if (now - joinedAt < MIN_MS_IN_GROUP) {
      const remaining = MIN_MS_IN_GROUP - (now - joinedAt);
      return sock.sendMessage(from, {
        text: [
          `${config.emojis.warning} *Purga no disponible aún.*`,
          divider(),
          `🤖 El bot lleva *${daysObserving} día${daysObserving === 1 ? "" : "s"}* observando este grupo.`,
          `📊 Necesita al menos *${MIN_DAYS_IN_GROUP} días* para distinguir bien quiénes son fantasmas reales y quiénes simplemente no han escrito todavía.`,
          `⏳ Disponible en: *${timeLeft(remaining)}*.`,
          divider(),
          `${config.emojis.info} Mientras tanto puedes usar *${config.prefix}fantasmas* para ver una vista previa.`,
        ].join("\n"),
      }, { quoted: msg });
    }

    // 2) Verificar el cooldown semanal entre purgas
    if (group.lastPurga && now - group.lastPurga < SEVEN_DAYS) {
      const remaining = SEVEN_DAYS - (now - group.lastPurga);
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Ya se realizó una purga esta semana.\n⏳ Próxima purga disponible en: *${timeLeft(remaining)}*.`,
      }, { quoted: msg });
    }

    let metadata;
    try {
      metadata = await sock.groupMetadata(from);
    } catch {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} No pude obtener los miembros del grupo.`,
      }, { quoted: msg });
    }

    const participants = metadata.participants || [];
    const admins = new Set(
      participants.filter((p) => p.admin === "admin" || p.admin === "superadmin").map((p) => p.id)
    );
    const botId = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";

    const messageLog = group.lastMessageAt || {};

    const toKick = participants
      .map((p) => p.id)
      .filter((id) => {
        if (id === botId) return false;
        if (admins.has(id)) return false;
        return !messageLog[id];
      });

    if (toKick.length === 0) {
      return sock.sendMessage(from, {
        text: `${config.emojis.success} No hay miembros fantasmas que purgar. ¡El grupo está activo!`,
      }, { quoted: msg });
    }

    await sock.sendMessage(from, {
      text: [
        `🗡️ *INICIANDO PURGA* 🗡️`,
        divider(),
        `${config.emojis.fire} *Grupo:* ${metadata.subject}`,
        `📊 *Días observando:* ${daysObserving}`,
        `👻 *Fantasmas a expulsar:* ${toKick.length}`,
        divider(),
        `⏳ _Ejecutando purga, un momento..._`,
      ].join("\n"),
    }, { quoted: msg });

    let kicked = 0;
    let failed = 0;

    for (const id of toKick) {
      try {
        await sock.groupParticipantsUpdate(from, [id], "remove");
        kicked++;
        await new Promise((r) => setTimeout(r, 500));
      } catch {
        failed++;
      }
    }

    db.updateGroup(from, { lastPurga: now });

    const lines = [
      `🗡️ *PURGA COMPLETADA* 🗡️`,
      divider(),
      `${config.emojis.success} *Expulsados:* ${kicked}`,
    ];
    if (failed > 0) lines.push(`${config.emojis.warning} *No se pudo expulsar:* ${failed}`);
    lines.push(`${config.emojis.info} *Próxima purga:* en 7 días`);
    lines.push(divider());
    lines.push(`✨ _AnimeBot by zerinho23_`);

    await sock.sendMessage(from, { text: lines.join("\n") });
  },
};
