const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "anime",
  description: "Recomienda un anime aleatorio",
  aliases: ["random", "aleatorio"],
  async execute({ sock, msg, from }) {
    await sock.sendMessage(from, { text: `${config.emojis.sparkles} Buscando un anime para ti...` }, { quoted: msg });
    try {
      const anime = await api.getRandomAnime();
      const caption = format.formatAnime(anime);
      const image = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
      if (image) {
        await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg });
      }
    } catch (err) {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} No pude obtener un anime. Intenta de nuevo.`,
      }, { quoted: msg });
    }
  },
};
