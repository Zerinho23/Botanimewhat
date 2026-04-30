const { emojis } = require("../config/config");

function divider() {
  return "━━━━━━━━━━━━━━━━━━━━";
}

function header(title) {
  return `${emojis.cherry} *${title}* ${emojis.cherry}\n${divider()}`;
}

function footer() {
  return `${divider()}\n${emojis.sparkles} _AnimeBot by zerinho23_`;
}

function box(title, lines) {
  return `${header(title)}\n${lines.join("\n")}\n${footer()}`;
}

function truncate(text, max = 400) {
  if (!text) return "Sin descripción.";
  return text.length > max ? text.substring(0, max) + "..." : text;
}

function formatAnime(anime) {
  const lines = [
    `${emojis.star} *Título:* ${anime.title}`,
    `${emojis.fire} *Tipo:* ${anime.type || "N/A"}`,
    `${emojis.crown} *Episodios:* ${anime.episodes || "?"}`,
    `${emojis.heart} *Score:* ${anime.score || "N/A"}/10`,
    `${emojis.info} *Estado:* ${anime.status || "N/A"}`,
    `${emojis.rose} *Géneros:* ${anime.genres?.map((g) => g.name).join(", ") || "N/A"}`,
    "",
    `📖 *Sinopsis:*`,
    truncate(anime.synopsis),
    "",
    `🔗 ${anime.url}`,
  ];
  return box("RECOMENDACIÓN ANIME", lines);
}

function formatTop(animes) {
  const lines = animes.map((a, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    return `${medal} *${a.title}* — ⭐ ${a.score || "N/A"}`;
  });
  return box("TOP ANIMES", lines);
}

function formatCharacter(character) {
  const lines = [
    `${emojis.crown} *Nombre:* ${character.name}`,
    `${emojis.heart} *Kanji:* ${character.name_kanji || "N/A"}`,
    `${emojis.star} *Favoritos:* ${character.favorites?.toLocaleString() || 0}`,
    "",
    `📖 *Sobre el personaje:*`,
    truncate(character.about, 600),
    "",
    `🔗 ${character.url}`,
  ];
  return box("INFORMACIÓN DE PERSONAJE", lines);
}

function formatWaifu(character, owner) {
  const lines = [
    `${emojis.heart} *Tu nueva waifu es:*`,
    `${emojis.crown} *${character.name}*`,
    `${emojis.star} Favoritos globales: ${character.favorites?.toLocaleString() || "N/A"}`,
    "",
    `${emojis.rose} _Asignada a:_ @${owner.split("@")[0]}`,
    "",
    truncate(character.about, 300),
  ];
  return box("WAIFU ASIGNADA", lines);
}

function formatProfile(user, name) {
  const nextLevel = user.level * 100;
  const lines = [
    `${emojis.crown} *Usuario:* ${name || "Otaku"}`,
    `${emojis.star} *Nivel:* ${user.level}`,
    `${emojis.fire} *XP:* ${user.xp} / ${nextLevel}`,
    `${emojis.coin} *Monedas:* ${user.coins}`,
    `${emojis.heart} *Waifus:* ${user.waifus?.length || 0}`,
    `💬 *Mensajes:* ${user.messages}`,
    `⚡ *Comandos:* ${user.commands}`,
  ];
  return box("PERFIL OTAKU", lines);
}

function highlightKeywords(text) {
  if (!text) return text;
  return text.replace(
    /\b(Manga|Anime|Película|Pelicula|Serie|Temporada|Episodio|Capítulo|Capitulo|Estudio|Studio|Director|Productor|Trailer|Tráiler|Adaptación|Adaptacion|Estreno|Lanzamiento|Anuncio|Confirmado|Revelado|Oficial|Spin-off|Final|Continuación|Continuacion|Live-action|Light Novel|OVA|ONA|Especial|Reparto|Doblaje|Voz|Personaje|Protagonista|Manga\w*|Anime\w*)\b/gi,
    "*$1*",
  );
}

function formatDateES(input) {
  if (!input) return null;
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return null;
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch (_) {
    return null;
  }
}

function formatNewsCard(news, index, total) {
  const date = formatDateES(news.pubDate);
  const desc = news.description ? highlightKeywords(truncate(news.description, 350)) : "";
  const lines = [
    `📰 *NOTICIAS DE ANIME*  ${index}/${total}`,
    divider(),
    "",
    `${emojis.cherry} *${news.title}*`,
    "",
  ];
  if (desc) {
    lines.push(`📌 ${desc}`);
    lines.push("");
  }
  if (date) lines.push(`📅 _${date}_`);
  lines.push(`🔗 ${news.link}`);
  lines.push("");
  lines.push(divider());
  lines.push(`${emojis.sparkles} _AnimeBot by zerinho23_`);
  return lines.join("\n");
}

function formatSeasonHeader(seasonES, year, total) {
  return [
    `🌸 *ESTRENOS DE LA TEMPORADA* 🌸`,
    divider(),
    `${emojis.sparkles} *${seasonES} ${year}*`,
    `${emojis.fire} Mostrando los ${total} animes más esperados`,
    divider(),
  ].join("\n");
}

function formatSeasonCard(anime, index, total) {
  const studios = anime.studios?.map((s) => s.name).join(", ") || "Desconocido";
  const genres = anime.genres?.map((g) => g.name).join(", ") || "N/A";
  const synopsis = anime.synopsis ? truncate(anime.synopsis, 280) : "Sin sinopsis disponible.";
  const aired = anime.aired?.string || "Por confirmar";
  const lines = [
    `🎬 *ESTRENO ${index}/${total}*`,
    divider(),
    "",
    `${emojis.cherry} *${anime.title}*`,
    anime.title_japanese ? `${emojis.heart} _${anime.title_japanese}_` : null,
    "",
    `📺 *Tipo:* ${anime.type || "N/A"}`,
    `🎞️ *Episodios:* ${anime.episodes || "Por confirmar"}`,
    `${emojis.star} *Score:* ${anime.score ? `${anime.score}/10` : "Sin puntaje aún"}`,
    `🏢 *Estudio:* ${studios}`,
    `${emojis.rose} *Géneros:* ${genres}`,
    `📅 *Emisión:* ${aired}`,
    "",
    `📌 *Sinopsis:*`,
    synopsis,
    "",
    `🔗 ${anime.url}`,
    "",
    divider(),
    `${emojis.sparkles} _AnimeBot by zerinho23_`,
  ].filter(Boolean);
  return lines.join("\n");
}

function formatHelp(prefix, commands) {
  const grouped = {};
  for (const cmd of commands) {
    if (!grouped[cmd.category]) grouped[cmd.category] = [];
    grouped[cmd.category].push(cmd);
  }
  const lines = [];
  for (const cat of Object.keys(grouped)) {
    lines.push(`\n${emojis.sparkles} *${cat.toUpperCase()}*`);
    for (const cmd of grouped[cat]) {
      lines.push(`  ${prefix}${cmd.name} — ${cmd.description}`);
    }
  }
  return box(`MENÚ DE ${commands.length} COMANDOS`, lines);
}

module.exports = {
  divider,
  header,
  footer,
  box,
  truncate,
  formatAnime,
  formatTop,
  formatCharacter,
  formatWaifu,
  formatProfile,
  formatNewsCard,
  formatSeasonHeader,
  formatSeasonCard,
  formatHelp,
};
