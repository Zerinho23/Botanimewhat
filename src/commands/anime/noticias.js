const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");
const { translate } = require("../../utils/translator");

const FALLBACK_IMAGE =
  "https://cdn.myanimelist.net/s/common/uploaded_files/1641457734-26ef41a7e6b3a1cd8b11366aae93edec.jpeg";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  name: "noticias",
  description: "Muestra las últimas noticias del mundo del anime",
  aliases: ["news", "noticia"],
  async execute({ sock, msg, from }) {
    await sock.sendMessage(
      from,
      { text: `${config.emojis.sparkles} Buscando las últimas noticias del mundo otaku...` },
      { quoted: msg },
    );
    try {
      const news = await api.getAnimeNews(5);
      if (!news.length) {
        return sock.sendMessage(
          from,
          { text: `${config.emojis.error} No pude obtener noticias. Intenta más tarde.` },
          { quoted: msg },
        );
      }

      for (let i = 0; i < news.length; i++) {
        const n = news[i];
        try {
          n.title = await translate(n.title);
          if (n.description) n.description = await translate(n.description);
        } catch (_) {
          // si falla, usar original
        }
        const caption = format.formatNewsCard(n, i + 1, news.length);
        const imageUrl = n.image || FALLBACK_IMAGE;
        try {
          await sock.sendMessage(
            from,
            { image: { url: imageUrl }, caption },
            { quoted: i === 0 ? msg : undefined },
          );
        } catch (_) {
          await sock.sendMessage(
            from,
            { text: caption },
            { quoted: i === 0 ? msg : undefined },
          );
        }
        if (i < news.length - 1) await sleep(800);
      }
    } catch (err) {
      await sock.sendMessage(
        from,
        { text: `${config.emojis.error} Error al cargar las noticias. Intenta de nuevo.` },
        { quoted: msg },
      );
    }
  },
};
