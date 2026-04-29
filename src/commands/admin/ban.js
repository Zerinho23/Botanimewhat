const config = require("../../config/config");
const { isAdmin } = require("../../handlers/antiSpamHandler");
const logger = require("../../utils/logger");

module.exports = {
  name: "ban",
  description: "Expulsa permanentemente a un usuario (solo admins)",
  aliases: ["expulsar"],
  async execute({ sock, msg, sender, from, isGroup }) {
    if (!isGroup) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Este comando solo funciona en grupos.`,
      }, { quoted: msg });
    }
    if (!(await isAdmin(sock, from, sender))) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Solo los admins pueden usar este comando.`,
      }, { quoted: msg });
    }

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const target = mentioned || msg.message?.extendedTextMessage?.contextInfo?.participant;

    if (!target) {
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Debes mencionar o citar al usuario que quieres banear.`,
      }, { quoted: msg });
    }

    try {
      await sock.groupParticipantsUpdate(from, [target], "remove");
      await sock.sendMessage(from, {
        text: `${config.emojis.katana} @${target.split("@")[0]} ha sido baneado del grupo.`,
        mentions: [target],
      });
      logger.info(`Ban: ${target} en ${from} por ${sender}`);
    } catch (err) {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} No pude banear al usuario. ¿Soy admin?`,
      }, { quoted: msg });
    }
  },
};
