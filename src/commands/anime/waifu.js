const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");
const db = require("../../database/db");

module.exports = {
  name: "waifu",
  description: "Asigna una waifu aleatoria al usuario",
  aliases: ["mywaifu", "miwaifu"],
  async execute({ sock, msg, sender, from }) {
    await sock.sendMessage(from, { text: `${config.emojis.heart} Buscando tu waifu del destino...` }, { quoted: msg });
    try {
      const character = await api.getRandomCharacter();
      const image = character.images?.jpg?.image_url || (await api.getRandomWaifu());
      const caption = format.formatWaifu(character, sender);
      db.assignWaifu(sender, {
        name: character.name,
        url: character.url,
        image,
        assignedAt: Date.now(),
      });
      await sock.sendMessage(from, {
        image: { url: image },
        caption,
        mentions: [sender],
      }, { quoted: msg });
    } catch {
      try {
        const url = await api.getRandomWaifu();
        await sock.sendMessage(from, {
          image: { url },
          caption: `${config.emojis.heart} Tu waifu de hoy ${config.emojis.cherry}`,
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(from, {
          text: `${config.emojis.error} No encontré waifus disponibles.`,
        }, { quoted: msg });
      }
    }
  },
};
