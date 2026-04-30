const api = require("../../utils/api");
  const format = require("../../utils/format");
  const config = require("../../config/config");
  const { translate, stripHtml } = require("../../utils/translator");

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  module.exports = {
    name: "recomendaciones",
    description: "Muestra recomendaciones de anime de la temporada actual",
    aliases: ["recomendacion", "recomienda", "recomendar"],
    async execute({ sock, msg, from, args }) {
      let count = parseInt(args?.[0]) || 1;
      if (count < 1) count = 1;
      if (count > 5) count = 5;

      await sock.sendMessage(
        from,
        { text: `${config.emojis.sparkles} Buscando ${count === 1 ? "una recomendación" : `${count} recomendaciones`} de la temporada actual...` },
        { quoted: msg },
      );
      try {
        const animes = await api.getSeasonalAnime(count);
        if (!animes.length) {
          return sock.sendMessage(
            from,
            { text: `${config.emojis.error} No pude obtener recomendaciones. Intenta más tarde.` },
            { quoted: msg },
          );
        }
        const seasonInfo = await api.getCurrentSeasonInfo();

        const headerText = format.formatSeasonHeader(seasonInfo.seasonES, seasonInfo.year, animes.length);
        await sock.sendMessage(from, { text: headerText }, { quoted: msg });
        await sleep(500);

        for (let i = 0; i < animes.length; i++) {
          const anime = animes[i];
          if (anime.synopsis) anime.synopsis = stripHtml(anime.synopsis);
          try {
            if (anime.synopsis) anime.synopsis = await translate(anime.synopsis);
          } catch (_) {}
          if (anime.synopsis) anime.synopsis = stripHtml(anime.synopsis);
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
          { text: `${config.emojis.error} Error al cargar las recomendaciones. Intenta de nuevo.` },
          { quoted: msg },
        );
      }
    },
  };
  