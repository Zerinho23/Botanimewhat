const config = require("../config/config");
const { emojis } = config;

function _xpForNextLevel(level) {
  const mult = config.level?.levelMultiplier ?? 250;
  return level * mult;
}

function _progressBar(current, total, size = 12) {
  if (!total || total <= 0) return "▱".repeat(size);
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * size);
  return "▰".repeat(filled) + "▱".repeat(size - filled);
}

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
  const nextLevel = _xpForNextLevel(user.level);
  const remaining = Math.max(0, nextLevel - user.xp);
  const pct = nextLevel > 0 ? Math.min(100, Math.round((user.xp / nextLevel) * 100)) : 0;
  const bar = _progressBar(user.xp, nextLevel, 14);

  const lines = [
    `${emojis.crown} *Usuario:* ${name || "Otaku"}`,
    "",
    `${emojis.star} *Nivel ${user.level}*`,
    `${emojis.fire} XP:  *${user.xp}* / ${nextLevel}`,
    `${bar}  ${pct}%`,
    `🎯 _Faltan ${remaining} XP para subir_`,
    "",
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

function _statusBadge(status) {
  if (!status) return "❔ Estado desconocido";
  const s = status.toLowerCase();
  if (s.includes("airing") && !s.includes("not")) return "🟢 En emisión";
  if (s.includes("finished") || s.includes("completed")) return "✅ Finalizado";
  if (s.includes("not yet") || s.includes("upcoming")) return "⏳ Próximamente";
  return `📌 ${status}`;
}

function _typeIcon(type) {
  if (!type) return "📺";
  const t = type.toLowerCase();
  if (t === "movie") return "🎬";
  if (t === "ova") return "💿";
  if (t === "ona") return "🌐";
  if (t === "special") return "🎁";
  if (t === "music") return "🎵";
  return "📺";
}

function _scoreStars(score) {
  if (!score || isNaN(score)) return "";
  const n = Math.round(score / 2);
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function _yearOf(anime) {
  if (anime.year) return anime.year;
  if (anime.aired?.from) {
    const d = new Date(anime.aired.from);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return null;
}

function formatSearchResults(query, results) {
  const lines = [
    `${emojis.cherry} *BÚSQUEDA DE ANIME* ${emojis.cherry}`,
    divider(),
    `🔍 _Buscaste:_ *"${query}"*`,
    `${emojis.sparkles} _${results.length} ${results.length === 1 ? "coincidencia" : "coincidencias"} encontrada${results.length === 1 ? "" : "s"}_`,
    divider(),
    "",
  ];

  results.forEach((a, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${emojis.cherry} *${i + 1}.*`;
    const altTitle = a.title_english && a.title_english !== a.title
      ? a.title_english
      : a.title_japanese && a.title_japanese !== a.title
        ? a.title_japanese
        : null;
    const scoreText = a.score ? `⭐ *${a.score}*` : "⭐ _Sin nota_";
    const stars = _scoreStars(a.score);
    const typeIcon = _typeIcon(a.type);
    const typeText = a.type || "N/A";
    const eps = a.episodes ? `${a.episodes} ep${a.episodes === 1 ? "" : "s"}` : "? eps";
    const year = _yearOf(a);
    const genres = a.genres?.slice(0, 3).map((g) => g.name).join(" · ");
    const status = _statusBadge(a.status);

    lines.push(`${medal} *${a.title}*`);
    if (altTitle) lines.push(`   📜 _${altTitle}_`);

    const metaParts = [`${typeIcon} ${typeText}`, `🎞️ ${eps}`, scoreText];
    if (year) metaParts.push(`📅 ${year}`);
    lines.push(`   ${metaParts.join("  ·  ")}`);

    if (stars) lines.push(`   ${stars}`);
    if (genres) lines.push(`   🏷️ _${genres}_`);
    lines.push(`   ${status}`);
    if (i < results.length - 1) lines.push("");
  });

  lines.push("");
  lines.push(divider());
  lines.push(`${emojis.sparkles} _AnimeBot by zerinho23_`);
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
  formatSearchResults,
  formatHelp,
};
