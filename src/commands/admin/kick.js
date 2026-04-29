const config = require("../../config/config");
const { isAdmin } = require("../../handlers/antiSpamHandler");
const logger = require("../../utils/logger");

module.exports = {
  name: "kick",
  description: "Expulsa a un usuario del grupo (solo admins)",
  aliases: ["sacar"],
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

    try {
      await sock.groupParticipantsUpdate(from, [target], "remove");
      await sock.sendMessage(from, {
        text: `${config.emojis.warning} @${target.split("@")[0]} fue expulsado.`,
        mentions: [target],
      });
      logger.info(`Kick: ${target} en ${from}`);
    } catch {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} No pude expulsar. ¿Soy admin?`,
      }, { quoted: msg });
    }
  },
};
