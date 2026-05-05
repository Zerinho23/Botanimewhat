const config = require("../../config/config");
const api = require("../../utils/api");
const format = require("../../utils/format");
const translator = require("../../utils/translator");
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
  { q: "¿Cuántos episodios tiene Fullmetal Alchemist: Brotherhood?", a: "64", opts: ["A) 51", "B) 52", "C) 64", "D) 74"], correct: "C" },
  { q: "¿Cuál es el verdadero nombre de Tuxedo Mask en Sailor Moon?", a: "mamoru chiba", opts: ["A) Darien Shields", "B) Mamoru Chiba", "C) Ken Ito", "D) Shingo Tsukino"], correct: "B" },
  { q: "¿Qué animal es Chopper en One Piece?", a: "reno", opts: ["A) Oso", "B) Conejo", "C) Mapache", "D) Reno"], correct: "D" },
  { q: "¿En qué ciudad ocurre la historia de Steins;Gate?", a: "akihabara", opts: ["A) Shibuya", "B) Shinjuku", "C) Akihabara", "D) Harajuku"], correct: "C" },
  { q: "¿Cuál es la espada legendaria de Sword Art Online?", a: "excalibur", opts: ["A) Elucidator", "B) Dark Repulser", "C) Excalibur", "D) Lambent Light"], correct: "C" },
  { q: "¿Quién es el maestro de Kakashi en Naruto?", a: "minato", opts: ["A) Jiraiya", "B) Orochimaru", "C) Hiruzen", "D) Minato"], correct: "D" },
  { q: "¿De qué clan viene Itachi en Naruto?", a: "uchiha", opts: ["A) Hyuga", "B) Senju", "C) Uchiha", "D) Uzumaki"], correct: "C" },
  { q: "¿Cómo se llama el ataque principal de Goku?", a: "kamehameha", opts: ["A) Genki-Dama", "B) Kamehameha", "C) Masenko", "D) Galick-Ho"], correct: "B" },
  { q: "¿Cuál es el nombre del instituto en My Hero Academia?", a: "ua", opts: ["A) Seika", "B) Shiketsu", "C) Ketsubutsu", "D) UA"], correct: "D" },
];

// ── Normalización ─────────────────────────────────────────────────────────────
function normalizeText(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Validación de trivia (opción múltiple) ────────────────────────────────────
function checkTriviaAnswer(userText, correctLetter, correctAnswer) {
  const norm = normalizeText(userText.trim());

  // Acepta solo la letra (A, B, C o D)
  if (/^[abcd]$/.test(norm)) {
    return norm === correctLetter.toLowerCase();
  }

  // Acepta la respuesta completa escrita (coincidencia exacta normalizada)
  const normAnswer = normalizeText(correctAnswer);
  return norm === normAnswer;
}

// ── Validación de anime/personaje (matching ESTRICTO de palabras enteras) ─────
function checkAnimeAnswer(userText, correctTitle) {
  const norm = normalizeText(userText.trim());
  const normTitle = normalizeText(correctTitle);

  // Respuesta demasiado corta para ser válida
  if (norm.length < 3) return false;

  // Coincidencia exacta completa
  if (norm === normTitle) return true;

  // Palabras significativas del título (> 2 caracteres, sin artículos comunes)
  const STOP_WORDS = new Set(["the", "los", "las", "del", "una", "uno", "que", "con", "por", "para"]);
  const titleWords = normTitle.split(" ").filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Si el título no tiene palabras significativas, exigir coincidencia exacta
  if (titleWords.length === 0) return norm === normTitle;

  // Palabras exactas que el usuario escribió (conjunto)
  const userWords = new Set(norm.split(" ").filter((w) => w.length > 1));

  // Contar cuántas palabras significativas del título están en la respuesta (match exacto de palabra completa)
  const matched = titleWords.filter((w) => userWords.has(w));
  const ratio = matched.length / titleWords.length;

  // Para títulos de 1 sola palabra significativa: debe aparecer exactamente
  if (titleWords.length === 1) {
    return userWords.has(titleWords[0]);
  }

  // Para títulos de 2+ palabras: al menos 80% de palabras significativas deben coincidir
  // Y al menos 2 palabras deben coincidir
  return ratio >= 0.8 && matched.length >= 2;
}

// ── Traducir sinopsis al español ──────────────────────────────────────────────
async function translateSynopsis(text, maxChars = 280) {
  if (!text) return "Sin sinopsis disponible.";
  try {
    const translated = await translator.translate(text, "es");
    const result = translated || text;
    return result.length > maxChars ? result.slice(0, maxChars) + "..." : result;
  } catch (_) {
    return text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
  }
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
    `⏳ Tienes *${timeoutSecs} segundos*. Escribe la letra (A, B, C o D) o la respuesta exacta.`,
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
    check: (text, sender) =>
      checkTriviaAnswer(text, q.correct, q.a) ? { winner: sender, reward } : null,
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

  // Traducir sinopsis al español
  const synopsis = await translateSynopsis(anime.synopsis, 300);

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
    `⏳ Tienes *${timeoutSecs} segundos*. Escribe el nombre *exacto* del anime.`,
  ].join("\n");

  await sock.sendMessage(groupJid, { text });

  const allTitles = [
    anime.title,
    anime.title_english,
    anime.title_japanese,
    ...((anime.titles || []).map((t) => t.title)),
    ...((anime.title_synonyms || [])),
  ].filter(Boolean);

  const timeout = setTimeout(async () => {
    if (!getGame(groupJid)) return;
    endGame(groupJid);
    try {
      await sock.sendMessage(groupJid, {
        text: `⏰ *¡Tiempo agotado!*\n\nEl anime era: *${anime.title}*\n🔗 ${anime.url}\n\n_Usa *${config.prefix}dinamica* para jugar de nuevo._`,
      });
    } catch (_) {}
  }, timeoutSecs * 1000);

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

  // Traducir descripción al español
  const about = await translateSynopsis(character.about, 280);
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
    `⏳ Tienes *${timeoutSecs} segundos*. Escribe el nombre *exacto* del personaje.`,
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

  startTrivia,
  startAdivina,
  startAdivinaPersonaje,

  async execute({ sock, msg, args, from, isGroup, sender }) {
    if (!isGroup) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Las dinámicas solo funcionan en grupos.`,
      }, { quoted: msg });
    }

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

    const chosen = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
    if (chosen === "trivia") return startTrivia(sock, from);
    if (chosen === "adivina") return startAdivina(sock, from);
    return startAdivinaPersonaje(sock, from);
  },
};
