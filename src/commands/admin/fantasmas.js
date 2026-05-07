const config = require("../../config/config");
const db = require("../../database/db");
const { isAdmin } = require("../../handlers/antiSpamHandler");

function divider() {
  return "━━━━━━━━━━━━━━━━━━━━";
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoy";
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months}mes`;
  return `hace ${Math.floor(months / 12)}año`;
}

module.exports = {
  name: "fantasmas",
  description: "Muestra los miembros del grupo que nunca han hablado (solo admins)",
  aliases: ["ghosts", "inactivos", "nohablan", "silenciosos"],
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

    let metadata;
    try {
      metadata = await sock.groupMetadata(from);
    } catch (err) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} No pude obtener los miembros del grupo.`,
      }, { quoted: msg });
    }

    const participants = metadata.participants || [];
    const total = participants.length;

    const group = await db.getGroup(from);
    const messageLog = group.lastMessageAt || {};

    const ghosts = [];
    const lurkers = [];

    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const p of participants) {
      const lastMsg = messageLog[p.id];
      if (!lastMsg) {
        ghosts.push(p.id);
      } else if (now - lastMsg > SEVEN_DAYS) {
        lurkers.push({ id: p.id, lastMsg });
      }
    }

    ghosts.sort();
    lurkers.sort((a, b) => a.lastMsg - b.lastMsg);

    const lines = [
      `👻 *MIEMBROS FANTASMAS* 👻`,
      divider(),
      `${config.emojis.sparkles} *Grupo:* ${metadata.subject}`,
      `${config.emojis.fire} *Total miembros:* ${total}`,
      `👻 *Nunca han hablado:* ${ghosts.length}`,
      `💤 *Inactivos +7 días:* ${lurkers.length}`,
      divider(),
      "",
    ];

    if (ghosts.length === 0 && lurkers.length === 0) {
      lines.push(`${config.emojis.success} ¡Todos están activos! No hay fantasmas.`);
    }

    if (ghosts.length > 0) {
      lines.push(`👻 *NUNCA HAN HABLADO* (${ghosts.length})`);
      lines.push(`_Desde que el bot está en el grupo:_`);
      lines.push("");
      const showGhosts = ghosts.slice(0, 30);
      for (const id of showGhosts) {
        lines.push(`• @${id.split("@")[0]}`);
      }
      if (ghosts.length > 30) {
        lines.push(`_...y ${ghosts.length - 30} más._`);
      }
      lines.push("");
    }

    if (lurkers.length > 0) {
      lines.push(`💤 *INACTIVOS +7 DÍAS* (${lurkers.length})`);
      lines.push("");
      const showLurkers = lurkers.slice(0, 15);
      for (const l of showLurkers) {
        lines.push(`• @${l.id.split("@")[0]} _(${timeAgo(l.lastMsg)})_`);
      }
      if (lurkers.length > 15) {
        lines.push(`_...y ${lurkers.length - 15} más._`);
      }
      lines.push("");
    }

    lines.push(divider());
    lines.push(`${config.emojis.sparkles} _Solo cuenta desde que el bot está activo en el grupo._`);
    lines.push(`✨ _AnimeBot by zerinho23_`);

    const allMentioned = [
      ...ghosts.slice(0, 30),
      ...lurkers.slice(0, 15).map((l) => l.id),
    ];

    await sock.sendMessage(from, {
      text: lines.join("\n"),
      mentions: allMentioned,
    });
  },
};
