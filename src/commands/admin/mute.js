const config = require("../../config/config");
const db = require("../../database/db");
const { isAdmin } = require("../../handlers/antiSpamHandler");
const logger = require("../../utils/logger");

module.exports = {
  name: "mute",
  description: "Silencia a un usuario en el grupo (sus mensajes serán borrados)",
  aliases: ["silenciar"],
  async execute({ sock, msg, sender, from, isGroup }) {
    if (!isGroup) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Solo en grupos.`,
      }, { quoted: msg });
    }
    if (!(await isAdmin(sock, from, sender))) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Solo admins.`,
      }, { quoted: msg });
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const target = mentioned || msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (!target) {
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Menciona o cita al usuario.`,
      }, { quoted: msg });
    }

    const group = db.getGroup(from);
    if (!group.mutedUsers) group.mutedUsers = [];
    if (group.mutedUsers.includes(target)) {
      group.mutedUsers = group.mutedUsers.filter((u) => u !== target);
      db.updateGroup(from, { mutedUsers: group.mutedUsers });
      await sock.sendMessage(from, {
        text: `${config.emojis.success} @${target.split("@")[0]} ya puede hablar.`,
        mentions: [target],
      });
      logger.info(`Unmute: ${target} en ${from}`);
    } else {
      group.mutedUsers.push(target);
      db.updateGroup(from, { mutedUsers: group.mutedUsers });
      await sock.sendMessage(from, {
        text: `${config.emojis.warning} @${target.split("@")[0]} ha sido silenciado. Usa *${config.prefix}mute* otra vez para liberarlo.`,
        mentions: [target],
      });
      logger.info(`Mute: ${target} en ${from}`);
    }
  },
};
