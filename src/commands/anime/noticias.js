const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");
const { translate, stripHtml } = require("../../utils/translator");

const FALLBACK_IMAGE =
  "https://cdn.myanimelist.net/s/common/uploaded_files/1641457734-26ef41a7e6b3a1cd8b11366aae93edec.jpeg";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  name: "noticias",
  description: "Muestra la última noticia del mundo del anime (usa !noticias 3 para más)",
  aliases: ["news", "noticia"],
  async execute({ sock, msg, from, args }) {
    let count = parseInt(args?.[0]) || 1;
    if (count < 1) count = 1;
    if (count > 5) count = 5;

    await sock.sendMessage(
      from,
      { text: `${config.emojis.sparkles} Buscando ${count === 1 ? "la última noticia" : `las últimas ${count} noticias`} del mundo otaku...` },
      { quoted: msg },
    );

    try {
      const news = await api.getAnimeNews(count);
      if (!news.length) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} No pude obtener noticias. Intenta más tarde.`,
        });
      }

      for (let i = 0; i < news.length; i++) {
        const n = news[i];
        n.title = stripHtml(n.title);
        n.description = stripHtml(n.description);
        try {
          n.title = await translate(n.title);
          if (n.description) n.description = await translate(n.description);
        } catch (_) {
          // si falla, usar original
        }
        n.title = stripHtml(n.title);
        n.description = stripHtml(n.description);

        const caption = format.formatNewsCard(n, i + 1, news.length);
        const imageUrl = n.image || FALLBACK_IMAGE;
        try {
          await sock.sendMessage(from, { image: { url: imageUrl }, caption });
        } catch (_) {
          await sock.sendMessage(from, { text: caption });
        }
        if (i < news.length - 1) await sleep(800);
      }
    } catch (err) {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} Error al cargar las noticias. Intenta de nuevo.`,
      });
    }
  },
};
