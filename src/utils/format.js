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
  formatHelp,
};
