const db = require("../../database/db");
const format = require("../../utils/format");

module.exports = {
  name: "perfil",
  description: "Muestra tu perfil otaku con nivel, XP y monedas",
  aliases: ["profile", "me"],
  async execute({ sock, msg, sender, from }) {
    const user = await db.getUser(sender);
    const name = msg.pushName;
    const text = format.formatProfile(user, name);
    await sock.sendMessage(from, { text }, { quoted: msg });
  },
};
