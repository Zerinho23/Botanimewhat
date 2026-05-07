const db = require("../../database/db");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "monedas",
  description: "Ver tu saldo de monedas",
  aliases: ["coins", "wallet", "saldo", "billetera"],
  async execute({ sock, msg, sender, from }) {
    const user = await db.getUser(sender);
    const name = msg.pushName || sender.split("@")[0];
    const lines = [
      `${config.emojis.crown} *${name}*`,
      "",
      `${config.emojis.coin} *Monedas:* ${user.coins}`,
      `${config.emojis.heart} *Waifus:* ${user.waifus?.length || 0}`,
      `${config.emojis.star} *Nivel:* ${user.level}`,
      "",
      `_Gana monedas mandando mensajes y usando comandos._`,
      `_Úsalas con *${config.prefix}waifu* o *${config.prefix}transferir*._`,
    ];
    await sock.sendMessage(from, { text: format.box("TU CARTERA", lines) }, { quoted: msg });
  },
};
