const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "top",
  description: "Muestra los animes más populares",
  aliases: ["topanime", "ranking"],
  async execute({ sock, msg, args, from }) {
    const limit = Math.min(parseInt(args[0]) || 10, 25);
    await sock.sendMessage(from, { text: `${config.emojis.fire} Cargando top ${limit} animes...` }, { quoted: msg });
    try {
      const animes = await api.getTopAnimes(limit);
      const caption = format.formatTop(animes);
      const image = animes[0]?.images?.jpg?.large_image_url;
      if (image) {
        await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg });
      }
    } catch {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} Error al obtener el top.`,
      }, { quoted: msg });
    }
  },
};
