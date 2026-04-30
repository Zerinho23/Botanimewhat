const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");
const { translate } = require("../../utils/translator");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = {
  name: "estreno",
  description: "Muestra los animes que se estrenan esta temporada",
  aliases: ["estrenos", "temporada", "season"],
  async execute({ sock, msg, from }) {
    await sock.sendMessage(
      from,
      { text: `${config.emojis.sparkles} Buscando los estrenos de la temporada actual...` },
      { quoted: msg },
    );
    try {
      const animes = await api.getSeasonalAnime(5);
      if (!animes.length) {
        return sock.sendMessage(
          from,
          { text: `${config.emojis.error} No pude obtener estrenos. Intenta más tarde.` },
          { quoted: msg },
        );
      }
      const seasonInfo = await api.getCurrentSeasonInfo();

      const headerText = format.formatSeasonHeader(seasonInfo.seasonES, seasonInfo.year, animes.length);
      await sock.sendMessage(from, { text: headerText }, { quoted: msg });
      await sleep(500);

      for (let i = 0; i < animes.length; i++) {
        const anime = animes[i];
        try {
          if (anime.synopsis) anime.synopsis = await translate(anime.synopsis);
        } catch (_) {
          // dejar original si falla
        }
        const caption = format.formatSeasonCard(anime, i + 1, animes.length);
        const imageUrl =
          anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;
        try {
          if (imageUrl) {
            await sock.sendMessage(from, { image: { url: imageUrl }, caption });
          } else {
            await sock.sendMessage(from, { text: caption });
          }
        } catch (_) {
          await sock.sendMessage(from, { text: caption });
        }
        if (i < animes.length - 1) await sleep(800);
      }
    } catch (err) {
      await sock.sendMessage(
        from,
        { text: `${config.emojis.error} Error al cargar los estrenos. Intenta de nuevo.` },
        { quoted: msg },
      );
    }
  },
};
