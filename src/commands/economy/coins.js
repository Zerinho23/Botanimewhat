const db = require("../../database/db");
const config = require("../../config/config");

module.exports = {
  name: "coins",
  description: "Muestra tu saldo de monedas",
  aliases: ["monedas", "balance", "bal"],
  async execute({ sock, msg, sender, from }) {
    const user = db.getUser(sender);
    await sock.sendMessage(from, {
      text: `${config.emojis.coin} Tienes *${user.coins}* monedas, otaku.`,
    }, { quoted: msg });
  },
};
