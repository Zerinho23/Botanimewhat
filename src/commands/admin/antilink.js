const config = require("../../config/config");
const db = require("../../database/db");
const { isAdmin } = require("../../handlers/antiSpamHandler");

module.exports = {
  name: "antilink",
  description: "Activa o desactiva el filtro de enlaces (admins)",
  aliases: ["antilinks"],
  async execute({ sock, msg, sender, from, isGroup, args }) {
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
    const group = await db.getGroup(from);
    const arg = args[0]?.toLowerCase();
    const enable = arg === "on" ? true : arg === "off" ? false : !group.antiLink;
    await db.updateGroup(from, { antiLink: enable });
    await sock.sendMessage(from, {
      text: `${enable ? config.emojis.success : config.emojis.warning} Antilink *${enable ? "ACTIVADO" : "DESACTIVADO"}*.`,
    }, { quoted: msg });
  },
};
