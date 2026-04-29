const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "opening",
  description: "Recomienda un opening de anime",
  aliases: ["op", "intro"],
  async execute({ sock, msg, from }) {
    await sock.sendMessage(from, { text: `${config.emojis.fire} Buscando un opening épico...` }, { quoted: msg });
    try {
      const anime = await api.getAnimeOpenings();
      const opening = anime.theme.openings[0];
      const lines = [
        `${config.emojis.star} *Anime:* ${anime.title}`,
        `${config.emojis.fire} *Opening:* ${opening}`,
        `${config.emojis.heart} *Score:* ${anime.score || "N/A"}`,
        "",
        `🔍 Búscalo en YouTube como:`,
        `_"${anime.title} opening"_`,
        "",
        `🔗 ${anime.url}`,
      ];
      const caption = format.box("OPENING RECOMENDADO", lines);
      const image = anime.images?.jpg?.large_image_url;
      if (image) {
        await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg });
      }
    } catch {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} No pude obtener un opening ahora mismo.`,
      }, { quoted: msg });
    }
  },
};
