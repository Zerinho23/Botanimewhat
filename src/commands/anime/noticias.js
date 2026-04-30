const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");
const { translate, stripHtml } = require("../../utils/translator");

const FALLBACK_IMAGE =
  "https://cdn.myanimelist.net/s/common/uploaded_files/1641457734-26ef41a7e6b3a1cd8b11366aae93edec.jpeg";

// WhatsApp acepta hasta ~4096 caracteres en el caption de una imagen.
// Dejamos un margen para evitar errores en clientes antiguos.
const MAX_CAPTION = 3800;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  name: "noticias",
  description: "Muestra noticias detalladas del mundo del anime (usa !noticias 3 para más)",
  aliases: ["news", "noticia"],
  async execute({ sock, msg, from, args }) {
    let count = parseInt(args?.[0]) || 1;
    if (count < 1) count = 1;
    if (count > 5) count = 5;

    await sock.sendMessage(
      from,
      {
        text: `${config.emojis.sparkles} Buscando ${count === 1 ? "la última noticia" : `las últimas ${count} noticias`} del mundo otaku y descargando los artículos completos...`,
      },
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
        n.description = stripHtml(n.description || "");

        // 1. Intentar enriquecer con el cuerpo completo del artículo
        let fullBody = null;
        try {
          fullBody = await api.fetchArticleBody(n.link);
        } catch (_) {
          // ignorar; nos quedamos con la descripción corta del RSS
        }
        if (fullBody && fullBody.length > (n.description?.length || 0)) {
          n.description = fullBody;
        }

        // 2. Traducir título y cuerpo (translate ya hace chunking interno hasta 4500 chars)
        try {
          n.title = await translate(n.title);
        } catch (_) {}
        if (n.description) {
          try {
            n.description = await translate(n.description);
          } catch (_) {}
        }

        n.title = stripHtml(n.title);
        n.description = stripHtml(n.description);

        // 3. Construir el caption completo
        let caption = format.formatNewsCard(n, i + 1, news.length);

        // 4. Si excede el límite de WhatsApp, mandar imagen+caption recortado
        //    y luego el resto del cuerpo en mensajes de texto separados
        if (caption.length <= MAX_CAPTION) {
          const imageUrl = n.image || FALLBACK_IMAGE;
          try {
            await sock.sendMessage(from, { image: { url: imageUrl }, caption });
          } catch (_) {
            await sock.sendMessage(from, { text: caption });
          }
        } else {
          // Versión corta para el caption (sin el cuerpo largo)
          const shortVersion = format.formatNewsCard(
            { ...n, description: "" },
            i + 1,
            news.length,
          );
          const imageUrl = n.image || FALLBACK_IMAGE;
          try {
            await sock.sendMessage(from, { image: { url: imageUrl }, caption: shortVersion });
          } catch (_) {
            await sock.sendMessage(from, { text: shortVersion });
          }
          // Mandar el cuerpo en mensajes de texto separados (chunks de ~3500 chars en límites de párrafo)
          const bodyText = format.formatNewsBody(n);
          const chunks = splitIntoChunks(bodyText, 3500);
          for (const chunk of chunks) {
            await sleep(400);
            await sock.sendMessage(from, { text: chunk });
          }
        }

        if (i < news.length - 1) await sleep(1000);
      }
    } catch (err) {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} Error al cargar las noticias. Intenta de nuevo.`,
      });
    }
  },
};

/**
 * Divide un texto en chunks respetando límites de párrafo cuando es posible.
 */
function splitIntoChunks(text, maxLen) {
  if (!text) return [];
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let cut = remaining.lastIndexOf("\n\n", maxLen);
    if (cut < maxLen / 2) cut = remaining.lastIndexOf(". ", maxLen);
    if (cut < maxLen / 2) cut = maxLen;
    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
