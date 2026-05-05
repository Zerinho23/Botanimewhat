const config = require("../../config/config");
const api = require("../../utils/api");
const format = require("../../utils/format");
const { isAdmin } = require("../../handlers/antiSpamHandler");
const { startGame, getGame, endGame } = require("../../utils/dinamicaManager");

// ── Pool de preguntas de trivia ───────────────────────────────────────────────
const TRIVIA_POOL = [
  { q: "¿De qué anime es el personaje Naruto Uzumaki?", a: "naruto", opts: ["A) Bleach", "B) Naruto", "C) One Piece", "D) Dragon Ball"], correct: "B" },
  { q: "¿Quién es el capitán del Going Merry en One Piece?", a: "luffy", opts: ["A) Zoro", "B) Sanji", "C) Luffy", "D) Nami"], correct: "C" },
  { q: "¿En qué anime aparece el 'Titán Colosal'?", a: "attack on titan", opts: ["A) Sword Art Online", "B) Attack on Titan", "C) Demon Slayer", "D) My Hero Academia"], correct: "B" },
  { q: "¿Cómo se llama la espada de Ichigo en Bleach?", a: "zangetsu", opts: ["A) Senbonzakura", "B) Ryūjin Jakka", "C) Zangetsu", "D) Wabisuke"], correct: "C" },
  { q: "¿Cuál es el quirk de Deku en My Hero Academia?", a: "one for all", opts: ["A) Half-Cold Half-Hot", "B) One For All", "C) Explosion", "D) Erasure"], correct: "B" },
  { q: "¿Qué estudio animó Sword Art Online?", a: "a-1 pictures", opts: ["A) Ufotable", "B) Mappa", "C) A-1 Pictures", "D) Kyoto Animation"], correct: "C" },
  { q: "¿Cuántos Pilares Hashira hay en Demon Slayer?", a: "nueve", opts: ["A) Siete", "B) Ocho", "C) Nueve", "D) Diez"], correct: "C" },
  { q: "¿De qué color es el pelo de Rem en Re:Zero?", a: "azul", opts: ["A) Rosa", "B) Azul", "C) Blanco", "D) Negro"], correct: "B" },
  { q: "¿Quién creó la técnica Edo Tensei en Naruto?", a: "tobirama", opts: ["A) Orochimaru", "B) Hashirama", "C) Tobirama", "D) Minato"], correct: "C" },
  { q: "¿Cuál es el opening más famoso de Attack on Titan?", a: "guren no yumiya", opts: ["A) Shinzou wo Sasageyo", "B) Guren no Yumiya", "C) My War", "D) The Rumbling"], correct: "B" },
  { q: "¿Qué poder tiene Lelouch en Code Geass?", a: "geass", opts: ["A) Sharingan", "B) Geass", "C) Rinnegan", "D) Byakugan"], correct: "B" },
  { q: "¿Cuál es el apellido de Mikasa en Attack on Titan?", a: "ackerman", opts: ["A) Yeager", "B) Ackerman", "C) Lenz", "D) Reiss"], correct: "B" },
  { q: "¿Qué es un 'Bankai' en Bleach?", a: "liberacion final del zanpakuto", opts: ["A) Tipo de espada", "B) Técnica de Hollow", "C) Liberación final del Zanpakuto", "D) Un arrancar"], correct: "C" },
  { q: "¿Qué estudio animó Demon Slayer: Kimetsu no Yaiba?", a: "ufotable", opts: ["A) Mappa", "B) Ufotable", "C) Bones", "D) Wit Studio"], correct: "B" },
  { q: "¿Cuál es el nombre completo de Tanjiro en Demon Slayer?", a: "tanjiro kamado", opts: ["A) Tanjiro Uzumaki", "B) Tanjiro Kamado", "C) Tanjiro Agatsuma", "D) Tanjiro Rengoku"], correct: "B" },
  { q: "¿Qué tipo de magia usa Natsu en Fairy Tail?", a: "fuego", opts: ["A) Hielo", "B) Rayo", "C) Fuego", "D) Gravedad"], correct: "C" },
  { q: "¿Quién es el protagonista de Hunter x Hunter?", a: "gon freecss", opts: ["A) Killua", "B) Kurapika", "C) Leorio", "D) Gon Freecss"], correct: "D" },
  { q: "¿En qué anime aparece Ryuk, el shinigami con manzanas?", a: "death note", opts: ["A) Bleach", "B) Soul Eater", "C) Noragami", "D) Death Note"], correct: "D" },
  { q: "¿Cuántas Dragon Balls existen en la saga original?", a: "siete", opts: ["A) Tres", "B) Cinco", "C) Siete", "D) Nueve"], correct: "C" },
  { q: "¿Quién tiene el sharingan en Naruto Shippuden?", a: "kakashi", opts: ["A) Naruto", "B) Sakura", "C) Kakashi", "D) Rock Lee"], correct: "C" },
  { q: "¿De dónde viene Zero Two en Darling in the FranXX?", a: "klaxosaur", opts: ["A) Es humana", "B) Es un android", "C) Es mitad klaxosaur", "D) Es extraterrestre"], correct: "C" },
  { q: "¿Cuántos episodios tiene la primera temporada de Fullmetal Alchemist: Brotherhood?", a: "64", opts: ["A) 51", "B) 52", "C) 64", "D) 74"], correct: "C" },
  { q: "¿Cuál es el verdadero nombre de Tuxedo Mask en Sailor Moon?", a: "mamoru chiba", opts: ["A) Darien Shields", "B) Mamoru Chiba", "C) Ken Ito", "D) Shingo Tsukino"], correct: "B" },
  { q: "¿Qué animal es Chopper en One Piece?", a: "reno", opts: ["A) Oso", "B) Conejo", "C) Mapache", "D) Reno"], correct: "D" },
  { q: "¿En qué ciudad ocurre la historia principal de Steins;Gate?", a: "akihabara", opts: ["A) Shibuya", "B) Shinjuku", "C) Akihabara", "D) Harajuku"], correct: "C" },
  { q: "¿Cuál es el nombre de la espada legendaria en Sword Art Online?", a: "excalibur", opts: ["A) Elucidator", "B) Dark Repulser", "C) Excalibur", "D) Lambent Light"], correct: "C" },
  { q: "¿Quién es el maestro de Kakashi en Naruto?", a: "minato", opts: ["A) Jiraiya", "B) Orochimaru", "C) Hiruzen", "D) Minato"], correct: "D" },
  { q: "¿De qué clan viene Itachi en Naruto?", a: "uchiha", opts: ["A) Hyuga", "B) Senju", "C) Uchiha", "D) Uzumaki"], correct: "C" },
  { q: "¿Cómo se llama el ataque principal de Goku?", a: "kamehameha", opts: ["A) Genki-Dama", "B) Kamehameha", "C) Masenko", "D) Galick-Ho"], correct: "B" },
  { q: "¿Cuál es el nombre del instituto en My Hero Academia?", a: "ua", opts: ["A) Seika", "B) Shiketsu", "C) Ketsubutsu", "D) UA"], correct: "D" },
];

function normalizeAnswer(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkTriviaAnswer(userText, correctLetter, correctAnswer) {
  const norm = normalizeAnswer(userText);
  if (/^[abcd]$/.test(norm)) return norm === correctLetter.toLowerCase();
  const normAnswer = normalizeAnswer(correctAnswer);
  const words = normAnswer.split(" ").filter((w) => w.length > 2);
  const matchedWords = words.filter((w) => norm.includes(w));
  return matchedWords.length >= Math.ceil(words.length * 0.6) || norm.includes(normAnswer);
}

function checkAnimeAnswer(userText, correctTitle) {
  const norm = normalizeAnswer(userText);
  const normTitle = normalizeAnswer(correctTitle);
  if (norm === normTitle) return true;
  const words = normTitle.split(" ").filter((w) => w.length > 2);
  if (!words.length) return norm.includes(normTitle.split(" ")[0]);
  const matched = words.filter((w) => norm.includes(w));
  return matched.length >= Math.ceil(words.length * 0.65);
}

// ── Trivia ────────────────────────────────────────────────────────────────────
async function startTrivia(sock, groupJid, autoMode = false) {
  if (getGame(groupJid)) {
    if (!autoMode) await sock.sendMessage(groupJid, { text: `${config.emojis.warning} Ya hay una dinámica activa. ¡Responde primero!` });
    return;
  }

  const q = TRIVIA_POOL[Math.floor(Math.random() * TRIVIA_POOL.length)];
  const reward = config.dinamica?.triviaReward ?? 30;
  const timeoutSecs = config.dinamica?.timeoutSeconds ?? 90;

  const text = [
    `🎮 *¡TRIVIA ANIME!* 🎮`,
    format.divider(),
    ``,
    `❓ *${q.q}*`,
    ``,
    ...q.opts,
    ``,
    `${config.emojis.coin} Premio: *${reward} monedas* al primero en responder correctamente`,
    `⏳ Tienes *${timeoutSecs} segundos*. Escribe la letra (A, B, C o D) o la respuesta completa.`,
  ].join("\n");

  await sock.sendMessage(groupJid, { text });

  const timeout = setTimeout(async () => {
    if (!getGame(groupJid)) return;
    endGame(groupJid);
    try {
      const correctOpt = q.opts.find((o) => o.startsWith(q.correct));
      await sock.sendMessage(groupJid, {
        text: `⏰ *¡Tiempo agotado!*\n\nLa respuesta correcta era: *${correctOpt}*\n\n_Nadie ganó esta vez. Usa *${config.prefix}dinamica* para jugar de nuevo._`,
      });
    } catch (_) {}
  }, timeoutSecs * 1000);

  startGame(groupJid, {
    type: "trivia",
    question: q,
    reward,
    timeout,
    check: (text, sender) => checkTriviaAnswer(text, q.correct, q.a) ? { winner: sender, reward } : null,
  });
}

// ── Adivina el anime ──────────────────────────────────────────────────────────
async function startAdivina(sock, groupJid, autoMode = false) {
  if (getGame(groupJid)) {
    if (!autoMode) await sock.sendMessage(groupJid, { text: `${config.emojis.warning} Ya hay una dinámica activa. ¡Responde primero!` });
    return;
  }

  let anime = null;
  for (let i = 0; i < 3; i++) {
    try {
      const c = await api.getRandomAnime();
      if (c?.synopsis && c?.title) { anime = c; break; }
    } catch (_) {}
  }

  if (!anime) {
    if (!autoMode) await sock.sendMessage(groupJid, { text: `${config.emojis.error} No pude obtener un anime ahora. Intenta de nuevo.` });
    return;
  }

  const reward = config.dinamica?.adivinaReward ?? 50;
  const timeoutSecs = config.dinamica?.timeoutSeconds ?? 90;
  const synopsis = anime.synopsis.length > 280 ? anime.synopsis.slice(0, 280) + "..." : anime.synopsis;

  const hints = [
    anime.type ? `📺 *Tipo:* ${anime.type}` : null,
    anime.episodes ? `🎞️ *Episodios:* ${anime.episodes}` : null,
    anime.score ? `⭐ *Score:* ${anime.score}/10` : null,
    anime.genres?.length ? `🏷️ *Géneros:* ${anime.genres.slice(0, 2).map((g) => g.name).join(", ")}` : null,
    anime.aired?.prop?.from?.year ? `📅 *Año:* ${anime.aired.prop.from.year}` : null,
  ].filter(Boolean);

  const text = [
    `🎯 *¡ADIVINA EL ANIME!* 🎯`,
    format.divider(),
    ``,
    `📖 *Sinopsis:*`,
    synopsis,
    ``,
    ...hints,
    ``,
    `${config.emojis.coin} Premio: *${reward} monedas* al primero en acertar`,
    `⏳ Tienes *${timeoutSecs} segundos*. Escribe el nombre del anime en el chat.`,
  ].join("\n");

  await sock.sendMessage(groupJid, { text });

  const timeout = setTimeout(async () => {
    if (!getGame(groupJid)) return;
    endGame(groupJid);
    try {
      await sock.sendMessage(groupJid, {
        text: `⏰ *¡Tiempo agotado!*\n\nEl anime era: *${anime.title}*\n🔗 ${anime.url}\n\n_Usa *${config.prefix}dinamica* para jugar de nuevo._`,
      });
    } catch (_) {}
  }, timeoutSecs * 1000);

  const allTitles = [
    anime.title, anime.title_english, anime.title_japanese,
    ...((anime.titles || []).map((t) => t.title)),
    ...((anime.title_synonyms || [])),
  ].filter(Boolean);

  startGame(groupJid, {
    type: "adivina",
    anime,
    reward,
    timeout,
    check: (text, sender) => {
      for (const t of allTitles) {
        if (checkAnimeAnswer(text, t)) return { winner: sender, reward, anime };
      }
      return null;
    },
  });
}

// ── Adivina el personaje ──────────────────────────────────────────────────────
async function startAdivinaPersonaje(sock, groupJid, autoMode = false) {
  if (getGame(groupJid)) {
    if (!autoMode) await sock.sendMessage(groupJid, { text: `${config.emojis.warning} Ya hay una dinámica activa. ¡Responde primero!` });
    return;
  }

  let character = null;
  for (let i = 0; i < 3; i++) {
    try {
      const c = await api.getRandomCharacter();
      if (c?.name && c?.about) { character = c; break; }
    } catch (_) {}
  }

  if (!character) {
    if (!autoMode) await sock.sendMessage(groupJid, { text: `${config.emojis.error} No pude obtener un personaje ahora. Intenta de nuevo.` });
    return;
  }

  const reward = config.dinamica?.personajeReward ?? 40;
  const timeoutSecs = config.dinamica?.timeoutSeconds ?? 90;
  const about = character.about.length > 250 ? character.about.slice(0, 250) + "..." : character.about;
  const animeNames = character.anime?.slice(0, 2).map((a) => a.anime?.title).filter(Boolean).join(", ");

  const text = [
    `🧩 *¡ADIVINA EL PERSONAJE!* 🧩`,
    format.divider(),
    ``,
    `📖 *Descripción:*`,
    about,
    animeNames ? `\n🎬 *Aparece en:* ${animeNames}` : ``,
    `⭐ *Favoritos globales:* ${character.favorites?.toLocaleString() || "N/A"}`,
    ``,
    `${config.emojis.coin} Premio: *${reward} monedas* al primero en acertar`,
    `⏳ Tienes *${timeoutSecs} segundos*. Escribe el nombre del personaje.`,
  ].filter(Boolean).join("\n");

  await sock.sendMessage(groupJid, { text });

  const timeout = setTimeout(async () => {
    if (!getGame(groupJid)) return;
    endGame(groupJid);
    try {
      await sock.sendMessage(groupJid, {
        text: `⏰ *¡Tiempo agotado!*\n\nEl personaje era: *${character.name}*\n🔗 ${character.url}\n\n_Usa *${config.prefix}dinamica* para jugar de nuevo._`,
      });
    } catch (_) {}
  }, timeoutSecs * 1000);

  startGame(groupJid, {
    type: "personaje",
    character,
    reward,
    timeout,
    check: (text, sender) => {
      if (checkAnimeAnswer(text, character.name)) return { winner: sender, reward };
      if (character.name_kanji && checkAnimeAnswer(text, character.name_kanji)) return { winner: sender, reward };
      return null;
    },
  });
}

// ── Comando principal !dinamica ───────────────────────────────────────────────
const GAME_TYPES = ["trivia", "adivina", "personaje"];

module.exports = {
  name: "dinamica",
  description: "Solo admins. Inicia una dinámica de anime. Tipos: trivia, adivina, personaje",
  aliases: ["juego", "game", "play", "reto"],

  // Exportadas para el auto-scheduler en index.js
  startTrivia,
  startAdivina,
  startAdivinaPersonaje,

  async execute({ sock, msg, args, from, isGroup, sender }) {
    if (!isGroup) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Las dinámicas solo funcionan en grupos.`,
      }, { quoted: msg });
    }

    // Solo admins pueden iniciar dinámicas
    const admin = await isAdmin(sock, from, sender);
    if (!admin) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Solo los *administradores* pueden iniciar dinámicas.`,
      }, { quoted: msg });
    }

    const type = args[0]?.toLowerCase();

    if (type === "trivia") return startTrivia(sock, from);
    if (type === "adivina") return startAdivina(sock, from);
    if (type === "personaje") return startAdivinaPersonaje(sock, from);

    // Sin argumento: tipo aleatorio
    const chosen = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
    if (chosen === "trivia") return startTrivia(sock, from);
    if (chosen === "adivina") return startAdivina(sock, from);
    return startAdivinaPersonaje(sock, from);
  },
};
