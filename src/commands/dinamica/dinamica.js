const config = require("../../config/config");
const api = require("../../utils/api");
const format = require("../../utils/format");
const translator = require("../../utils/translator");
const { isAdmin } = require("../../handlers/antiSpamHandler");
const { startGame, getGame, endGame } = require("../../utils/dinamicaManager");

// ── Pool de preguntas de trivia ───────────────────────────────────────────────
const TRIVIA_POOL = [
  { q: "¿De qué anime es Naruto Uzumaki?", a: "naruto", opts: ["Bleach", "Naruto", "One Piece", "Dragon Ball"], correct: "B" },
  { q: "¿Quién es el capitán del Going Merry?", a: "luffy", opts: ["Zoro", "Sanji", "Luffy", "Nami"], correct: "C" },
  { q: "¿En qué anime aparece el Titán Colosal?", a: "attack on titan", opts: ["Sword Art Online", "Attack on Titan", "Demon Slayer", "My Hero Academia"], correct: "B" },
  { q: "¿Cómo se llama la espada de Ichigo en Bleach?", a: "zangetsu", opts: ["Senbonzakura", "Ryūjin Jakka", "Zangetsu", "Wabisuke"], correct: "C" },
  { q: "¿Cuál es el quirk de Deku en My Hero Academia?", a: "one for all", opts: ["Half-Cold Half-Hot", "One For All", "Explosion", "Erasure"], correct: "B" },
  { q: "¿Qué estudio animó Sword Art Online?", a: "a-1 pictures", opts: ["Ufotable", "Mappa", "A-1 Pictures", "Kyoto Animation"], correct: "C" },
  { q: "¿Cuántos Pilares Hashira hay en Demon Slayer?", a: "nueve", opts: ["Siete", "Ocho", "Nueve", "Diez"], correct: "C" },
  { q: "¿De qué color es el pelo de Rem en Re:Zero?", a: "azul", opts: ["Rosa", "Azul", "Blanco", "Negro"], correct: "B" },
  { q: "¿Quién creó la técnica Edo Tensei en Naruto?", a: "tobirama", opts: ["Orochimaru", "Hashirama", "Tobirama", "Minato"], correct: "C" },
  { q: "¿Cuál es el opening más famoso de Attack on Titan?", a: "guren no yumiya", opts: ["Shinzou wo Sasageyo", "Guren no Yumiya", "My War", "The Rumbling"], correct: "B" },
  { q: "¿Qué poder tiene Lelouch en Code Geass?", a: "geass", opts: ["Sharingan", "Geass", "Rinnegan", "Byakugan"], correct: "B" },
  { q: "¿Cuál es el apellido de Mikasa en AoT?", a: "ackerman", opts: ["Yeager", "Ackerman", "Lenz", "Reiss"], correct: "B" },
  { q: "¿Qué es un Bankai en Bleach?", a: "liberacion final del zanpakuto", opts: ["Tipo de espada", "Técnica de Hollow", "Liberación final del Zanpakuto", "Un Arrancar"], correct: "C" },
  { q: "¿Qué estudio animó Demon Slayer?", a: "ufotable", opts: ["Mappa", "Ufotable", "Bones", "Wit Studio"], correct: "B" },
  { q: "¿Cuál es el apellido de Tanjiro?", a: "tanjiro kamado", opts: ["Uzumaki", "Kamado", "Agatsuma", "Rengoku"], correct: "B" },
  { q: "¿Qué tipo de magia usa Natsu en Fairy Tail?", a: "fuego", opts: ["Hielo", "Rayo", "Fuego", "Gravedad"], correct: "C" },
  { q: "¿Quién es el protagonista de Hunter x Hunter?", a: "gon freecss", opts: ["Killua", "Kurapika", "Leorio", "Gon Freecss"], correct: "D" },
  { q: "¿En qué anime aparece Ryuk, el shinigami?", a: "death note", opts: ["Bleach", "Soul Eater", "Noragami", "Death Note"], correct: "D" },
  { q: "¿Cuántas Dragon Balls hay en la saga original?", a: "siete", opts: ["Tres", "Cinco", "Siete", "Nueve"], correct: "C" },
  { q: "¿Quién tiene el sharingan en Naruto Shippuden?", a: "kakashi", opts: ["Naruto", "Sakura", "Kakashi", "Rock Lee"], correct: "C" },
  { q: "¿De dónde viene Zero Two en Darling in the FranXX?", a: "klaxosaur", opts: ["Es humana", "Es un android", "Es mitad klaxosaur", "Es extraterrestre"], correct: "C" },
  { q: "¿Cuántos episodios tiene FMA: Brotherhood?", a: "64", opts: ["51", "52", "64", "74"], correct: "C" },
  { q: "¿El verdadero nombre de Tuxedo Mask en Sailor Moon?", a: "mamoru chiba", opts: ["Darien Shields", "Mamoru Chiba", "Ken Ito", "Shingo Tsukino"], correct: "B" },
  { q: "¿Qué animal es Chopper en One Piece?", a: "reno", opts: ["Oso", "Conejo", "Mapache", "Reno"], correct: "D" },
  { q: "¿En qué ciudad ocurre Steins;Gate?", a: "akihabara", opts: ["Shibuya", "Shinjuku", "Akihabara", "Harajuku"], correct: "C" },
  { q: "¿La espada legendaria de Kirito en SAO?", a: "excalibur", opts: ["Elucidator", "Dark Repulser", "Excalibur", "Lambent Light"], correct: "C" },
  { q: "¿Quién fue el maestro de Kakashi?", a: "minato", opts: ["Jiraiya", "Orochimaru", "Hiruzen", "Minato"], correct: "D" },
  { q: "¿De qué clan viene Itachi en Naruto?", a: "uchiha", opts: ["Hyuga", "Senju", "Uchiha", "Uzumaki"], correct: "C" },
  { q: "¿Cómo se llama el ataque principal de Goku?", a: "kamehameha", opts: ["Genki-Dama", "Kamehameha", "Masenko", "Galick-Ho"], correct: "B" },
  { q: "¿Cómo se llama el instituto de MHA?", a: "ua", opts: ["Seika", "Shiketsu", "Ketsubutsu", "UA"], correct: "D" },
];

// Colores de las opciones A B C D
const OPT_ICONS = ["🔵", "🟡", "🔴", "🟢"];
const OPT_LETTERS = ["A", "B", "C", "D"];

// ── Formatear opciones de trivia ──────────────────────────────────────────────
function formatOpts(opts) {
  return opts.map((opt, i) => `${OPT_ICONS[i]} *${OPT_LETTERS[i]})* ${opt}`).join("\n");
}

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
  const cL = correctLetter.toLowerCase();

  // Letra sola: "b"
  if (/^[abcd]$/.test(norm)) return norm === cL;

  // Letra dentro del mensaje: "creo que b", "la b", "b es", "mi respuesta b"
  const words = norm.split(" ");
  const letterWord = words.find(w => /^[abcd]$/.test(w));
  if (letterWord) return letterWord === cL;

  // Coincidencia exacta con el texto de la respuesta correcta
  return norm === normalizeText(correctAnswer);
}

// ── Validación de anime/personaje ─────────────────────────────────────────────
// Reglas (de más a menos permisiva):
//  1. Coincidencia exacta normalizada
//  2. La respuesta del usuario es subcadena del título (≥4 chars): "demon slayer" en "demon slayer kimetsu no yaiba"
//  3. El título es subcadena de la respuesta del usuario
//  4. Por palabras clave:
//     - 1 palabra clave en el título: debe estar en la respuesta
//     - 2 palabras clave: basta 1 (nombre o apellido)
//     - 3+ palabras clave: al menos 2 deben coincidir
function checkAnimeAnswer(userText, correctTitle) {
  const norm = normalizeText(userText.trim());
  const normTitle = normalizeText(correctTitle);

  if (norm.length < 2) return false;

  // 1. Coincidencia exacta
  if (norm === normTitle) return true;

  // 2. Subcadena: "demon slayer" está dentro de "demon slayer kimetsu no yaiba"
  if (norm.length >= 4 && normTitle.includes(norm)) return true;

  // 3. El título cabe dentro de lo que escribió el usuario
  if (normTitle.length >= 4 && norm.includes(normTitle)) return true;

  const STOP = new Set(["the", "los", "las", "del", "una", "uno", "que", "con", "por", "para", "and", "de", "no", "wa", "ga"]);
  const titleWords = normTitle.split(" ").filter(w => w.length > 2 && !STOP.has(w));

  if (titleWords.length === 0) return false;

  const userWordSet = new Set(norm.split(" ").filter(w => w.length > 1));
  const matched = titleWords.filter(w => userWordSet.has(w));

  // 4a. 1 palabra clave: debe coincidir exactamente
  if (titleWords.length === 1) return matched.length >= 1;

  // 4b. 2 palabras clave (nombre + apellido): con 1 basta
  if (titleWords.length === 2) return matched.length >= 1;

  // 4c. 3+ palabras clave: al menos 2 deben coincidir
  return matched.length >= 2;
}

// ── Traducir sinopsis al español (con límite corto para dinámicas) ─────────────
async function translateSynopsis(text, maxChars = 220) {
  if (!text) return "Sin sinopsis disponible.";
  try {
    const translated = await translator.translate(text, "es");
    const result = translated || text;
    return result.length > maxChars ? result.slice(0, maxChars).trimEnd() + "…" : result;
  } catch (_) {
    return text.length > maxChars ? text.slice(0, maxChars).trimEnd() + "…" : text;
  }
}

// ── Línea de pistas inline (compacta) ────────────────────────────────────────
function buildHintsLine(anime) {
  const parts = [];
  if (anime.type) parts.push(`📺 ${anime.type}`);
  if (anime.episodes) parts.push(`🎞️ ${anime.episodes} ep`);
  if (anime.score) parts.push(`⭐ ${anime.score}`);
  if (anime.aired?.prop?.from?.year) parts.push(`📅 ${anime.aired.prop.from.year}`);
  if (anime.genres?.length) parts.push(`🏷️ ${anime.genres.slice(0, 2).map((g) => g.name).join(", ")}`);
  return parts.join("  ·  ");
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
    `🎮 *TRIVIA* ${format.divider()}`,
    ``,
    `❓ *${q.q}*`,
    ``,
    formatOpts(q.opts),
    ``,
    `💰 *+${reward}* monedas  ·  ⏱️ *${timeoutSecs}s*`,
    `_Responde con la letra o la respuesta exacta_`,
  ].join("\n");

  await sock.sendMessage(groupJid, { text });

  const timeout = setTimeout(async () => {
    if (!getGame(groupJid)) return;
    endGame(groupJid);
    try {
      const correctOpt = q.opts[OPT_LETTERS.indexOf(q.correct)];
      await sock.sendMessage(groupJid, {
        text: [
          `⏰ *Tiempo agotado*`,
          ``,
          `La respuesta era: ${OPT_ICONS[OPT_LETTERS.indexOf(q.correct)]} *${q.correct}) ${correctOpt}*`,
          `_Usa *${config.prefix}dinamica* para volver a jugar_`,
        ].join("\n"),
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
  const synopsis = await translateSynopsis(anime.synopsis, 220);
  const hintsLine = buildHintsLine(anime);

  const lines = [
    `🎯 *¿DE QUÉ ANIME ES?* ${format.divider()}`,
    ``,
    `📖 ${synopsis}`,
  ];
  if (hintsLine) lines.push(``, hintsLine);
  lines.push(
    ``,
    `💰 *+${reward}* monedas  ·  ⏱️ *${timeoutSecs}s*`,
    `_Escribe el nombre del anime_`,
  );

  await sock.sendMessage(groupJid, { text: lines.join("\n") });

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
        text: [
          `⏰ *Tiempo agotado*`,
          ``,
          `Era: 🎬 *${anime.title}*`,
          anime.url ? `🔗 ${anime.url}` : null,
          `_Usa *${config.prefix}dinamica* para volver a jugar_`,
        ].filter(Boolean).join("\n"),
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
  const about = await translateSynopsis(character.about, 220);
  const animeNames = character.anime?.slice(0, 2).map((a) => a.anime?.title).filter(Boolean).join(", ");

  const lines = [
    `🧩 *¿QUIÉN SOY?* ${format.divider()}`,
    ``,
    `📖 ${about}`,
  ];
  if (animeNames) lines.push(``, `🎬 Aparece en: *${animeNames}*`);
  if (character.favorites) lines.push(`⭐ ${character.favorites.toLocaleString()} favoritos globales`);
  lines.push(
    ``,
    `💰 *+${reward}* monedas  ·  ⏱️ *${timeoutSecs}s*`,
    `_Escribe el nombre del personaje_`,
  );

  await sock.sendMessage(groupJid, { text: lines.join("\n") });

  const timeout = setTimeout(async () => {
    if (!getGame(groupJid)) return;
    endGame(groupJid);
    try {
      await sock.sendMessage(groupJid, {
        text: [
          `⏰ *Tiempo agotado*`,
          ``,
          `Era: 🧩 *${character.name}*`,
          character.url ? `🔗 ${character.url}` : null,
          `_Usa *${config.prefix}dinamica* para volver a jugar_`,
        ].filter(Boolean).join("\n"),
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
  description: "Inicia una dinámica de anime (solo admins). Tipos: trivia, adivina, personaje",
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

    // Detener dinámica activa
    if (type === "stop" || type === "fin" || type === "parar") {
      const game = getGame(from);
      if (!game) {
        return sock.sendMessage(from, { text: `${config.emojis.info} No hay ninguna dinámica activa ahora mismo.` }, { quoted: msg });
      }
      endGame(from);
      return sock.sendMessage(from, { text: `🛑 *Dinámica cancelada* por el admin.` }, { quoted: msg });
    }

    if (type === "trivia") return startTrivia(sock, from);
    if (type === "adivina") return startAdivina(sock, from);
    if (type === "personaje") return startAdivinaPersonaje(sock, from);

    // Sin argumento — elegir aleatoriamente
    const chosen = GAME_TYPES[Math.floor(Math.random() * GAME_TYPES.length)];
    if (chosen === "trivia") return startTrivia(sock, from);
    if (chosen === "adivina") return startAdivina(sock, from);
    return startAdivinaPersonaje(sock, from);
  },
};
