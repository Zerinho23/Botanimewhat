const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");
const { translate } = require("../../utils/translator");

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
          { text: `${config.emojis.error} No pude obtener noticias en este momento. Intenta más tarde.` },
          { quoted: msg },
        );
      }
      for (const n of news) {
        try {
          n.title = await translate(n.title);
          if (n.description) n.description = await translate(n.description);
        } catch (_) {
          // si falla la traducción, deja el original
        }
      }
      const text = format.formatNews(news);
      await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(
        from,
        { text: `${config.emojis.error} Error al cargar las noticias. Intenta de nuevo.` },
        { quoted: msg },
      );
    }
  },
};
