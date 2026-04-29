const db = require("../../database/db");
const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "comprarwaifu",
  description: "Compra una waifu premium con monedas",
  aliases: ["buywaifu", "shop"],
  async execute({ sock, msg, sender, from }) {
    if (!config.economy.enabled) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Economía desactivada.`,
      }, { quoted: msg });
    }

    const user = db.getUser(sender);
    if (user.coins < config.economy.waifuCost) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Necesitas *${config.economy.waifuCost}* monedas. Tienes *${user.coins}*.`,
      }, { quoted: msg });
    }

    try {
      const character = await api.getRandomCharacter();
      const image = character.images?.jpg?.image_url || (await api.getRandomWaifu());
      user.coins -= config.economy.waifuCost;
      db.updateUser(sender, user);
      db.assignWaifu(sender, {
        name: character.name,
        url: character.url,
        image,
        premium: true,
        assignedAt: Date.now(),
      });

      const caption = format.box("WAIFU PREMIUM ADQUIRIDA", [
        `${config.emojis.crown} *${character.name}*`,
        `${config.emojis.coin} Costo: *${config.economy.waifuCost}* monedas`,
        `${config.emojis.coin} Saldo restante: *${user.coins}*`,
        "",
        `${config.emojis.heart} _Asignada a:_ @${sender.split("@")[0]}`,
      ]);

      await sock.sendMessage(from, {
        image: { url: image },
        caption,
        mentions: [sender],
      }, { quoted: msg });
    } catch {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} Error al comprar waifu.`,
      }, { quoted: msg });
    }
  },
};
