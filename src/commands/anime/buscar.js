const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "buscar",
  description: "Busca un anime por nombre. Uso: !buscar [nombre]",
  aliases: ["search", "find"],
  async execute({ sock, msg, args, from }) {
    if (!args.length) {
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Indica el nombre. Ej: *${config.prefix}buscar Naruto*`,
      }, { quoted: msg });
    }
    const query = args.join(" ");
    try {
      const results = await api.searchAnime(query);
      if (!results.length) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} Sin resultados para *${query}*.`,
        }, { quoted: msg });
      }
      const lines = results.map((a, i) =>
        `${i + 1}. *${a.title}* — ⭐ ${a.score || "N/A"} (${a.episodes || "?"} eps)`
      );
      const caption = format.box(`BÚSQUEDA: ${query}`, lines);
      const image = results[0]?.images?.jpg?.large_image_url;
      if (image) {
        await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg });
      }
    } catch {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} Error al buscar.`,
      }, { quoted: msg });
    }
  },
};
