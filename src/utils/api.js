const axios = require("axios");
const config = require("../config/config");
const translator = require("./translator");

const jikan = axios.create({ baseURL: config.api.jikanBase, timeout: 15000 });
const waifuApi = axios.create({ baseURL: config.api.waifuBase, timeout: 15000 });
const nekosApi = axios.create({ baseURL: config.api.nekosBase, timeout: 15000 });

function _normalizeText(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function _bigrams(s) {
  const set = new Set();
  const t = _normalizeText(s);
  if (t.length < 2) return set;
  for (let i = 0; i < t.length - 1; i++) set.add(t.slice(i, i + 2));
  return set;
}

function _diceSimilarity(a, b) {
  const A = _bigrams(a);
  const B = _bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const bg of A) if (B.has(bg)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function _bestSimilarity(anime, queries) {
  const candidates = [
    anime.title,
    anime.title_english,
    anime.title_japanese,
    ...((anime.titles || []).map((t) => t.title)),
    ...((anime.title_synonyms || [])),
  ].filter(Boolean);
  let best = 0;
  for (const q of queries) {
    if (!q) continue;
    for (const c of candidates) {
      const s = _diceSimilarity(q, c);
      if (s > best) best = s;
    }
  }
  return best;
}

async function getRandomAnime() {
  const { data } = await jikan.get("/random/anime");
  return data.data;
}

async function getTopAnimes(limit = 10) {
  const { data } = await jikan.get(`/top/anime?limit=${limit}`);
  return data.data;
}

async function searchCharacter(name) {
  const { data } = await jikan.get(`/characters?q=${encodeURIComponent(name)}&limit=1`);
  return data.data?.[0];
}

async function getRandomCharacter() {
  const { data } = await jikan.get("/random/characters");
  return data.data;
}

async function getRandomWaifu(category = "waifu") {
  try {
    const { data } = await waifuApi.get(`/sfw/${category}`);
    return data.url;
  } catch {
    const { data } = await nekosApi.get("/neko");
    return data.results?.[0]?.url;
  }
}

async function searchAnime(query) {
  if (!query || !query.trim()) return [];
  const original = query.trim();

  let translated = null;
  if (translator.looksSpanish(original)) {
    try {
      const t = await translator.translateForce(original, "en", "es");
      if (t && _normalizeText(t) !== _normalizeText(original)) translated = t.trim();
    } catch (_) {
      translated = null;
    }
  }

  const queriesToSearch = [original];
  if (translated) queriesToSearch.push(translated);

  const results = await Promise.all(
    queriesToSearch.map((q) =>
      jikan
        .get(`/anime?q=${encodeURIComponent(q)}&limit=10`)
        .then((r) => r.data?.data || [])
        .catch(() => []),
    ),
  );

  const merged = new Map();
  for (const list of results) {
    for (const a of list) {
      if (!a || !a.mal_id) continue;
      if (!merged.has(a.mal_id)) merged.set(a.mal_id, a);
    }
  }

  const compareQueries = [original, translated].filter(Boolean);
  const scored = [];
  for (const a of merged.values()) {
    const score = _bestSimilarity(a, compareQueries);
    scored.push({ anime: a, score });
  }

  scored.sort((x, y) => y.score - x.score);

  // Umbral mínimo: si nada se parece, evitamos devolver animes aleatorios.
  const MIN_SCORE = 0.28;
  const filtered = scored.filter((s) => s.score >= MIN_SCORE);

  // Si todo cae bajo el umbral pero el mejor pasa un mínimo muy bajo, lo dejamos.
  const finalList = filtered.length
    ? filtered
    : scored.filter((s) => s.score >= 0.18);

  return finalList.slice(0, 5).map((s) => s.anime);
}

async function getAnimeOpenings() {
  const seasons = ["winter", "spring", "summer", "fall"];
  const season = seasons[Math.floor(Math.random() * seasons.length)];
  const year = 2018 + Math.floor(Math.random() * 7);
  const { data } = await jikan.get(`/seasons/${year}/${season}?limit=10`);
  const list = data.data.filter((a) => a.theme?.openings?.length);
  return list[Math.floor(Math.random() * list.length)];
}

function decodeHtml(s) {
  if (!s) return "";
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&hellip;/g, "...")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .trim();
}

function extractImage(block) {
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image/i);
  if (enclosure) return enclosure[1];
  const mediaContent = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (mediaContent && /\.(jpg|jpeg|png|webp)/i.test(mediaContent[1])) return mediaContent[1];
  const mediaThumb = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mediaThumb) return mediaThumb[1];
  const imgTag = block.match(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i);
  if (imgTag) return imgTag[1];
  return null;
}

function _shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Pool de noticias con caché de 5 min para variar entre llamadas sin saturar las fuentes RSS
let _newsPool = [];
let _newsPoolTime = 0;
const _NEWS_TTL = 5 * 60 * 1000;

// Caché de cuerpos de artículos (10 min) para no re-descargar el mismo artículo
const _articleCache = new Map();
const _ARTICLE_TTL = 10 * 60 * 1000;
const _ARTICLE_MAX_CACHE = 100;

/**
 * Descarga la página del artículo y extrae el texto principal.
 * Devuelve un string con párrafos separados por doble salto, o null si falla.
 */
async function fetchArticleBody(url) {
  if (!url || typeof url !== "string") return null;

  const cached = _articleCache.get(url);
  if (cached && Date.now() - cached.at < _ARTICLE_TTL) return cached.body;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) {
      _articleCache.set(url, { body: null, at: Date.now() });
      return null;
    }
    const html = await res.text();

    // Acotar al área de contenido principal (heurísticas por orden de prioridad)
    let scope = html;
    const candidates = [
      /<article\b[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]+id=["']content["'][^>]*>([\s\S]*?)<\/div>\s*<\/(?:div|article|main)>/i,
      /<div[^>]+class=["'][^"']*(?:article-body|post-content|entry-content|story-body|news-content)[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/(?:div|article|main)>/i,
      /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    ];
    for (const re of candidates) {
      const m = html.match(re);
      if (m && m[1] && m[1].length > 300) {
        scope = m[1];
        break;
      }
    }

    // Quitar scripts/estilos/figcaptions/aside antes de extraer texto
    scope = scope
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
      .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi, "")
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "");

    const pRegex = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
    const paragraphs = [];
    let m;
    let totalLen = 0;
    while ((m = pRegex.exec(scope))) {
      // Limpiar HTML interno del párrafo
      let text = m[1]
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ");
      text = decodeHtml(text).trim();
      if (text.length < 50) continue;

      // Filtrar ruido típico (boilerplate, créditos, suscripciones)
      if (
        /^(subscribe|sign up|click here|follow us|privacy policy|terms of|copyright|©|all rights|by submitting|read more|related|advertisement|sponsored|powered by|share this|tweet|cookies?)/i.test(
          text,
        )
      )
        continue;
      if (/^(image|photo|via|source):\s/i.test(text) && text.length < 120) continue;

      paragraphs.push(text);
      totalLen += text.length;
      if (totalLen > 3500) break;
    }

    // Mantener tamaño del caché acotado
    if (_articleCache.size > _ARTICLE_MAX_CACHE) {
      const firstKey = _articleCache.keys().next().value;
      _articleCache.delete(firstKey);
    }

    if (!paragraphs.length) {
      _articleCache.set(url, { body: null, at: Date.now() });
      return null;
    }
    const body = paragraphs.join("\n\n");
    _articleCache.set(url, { body, at: Date.now() });
    return body;
  } catch (_) {
    return null;
  }
}

async function getAnimeNews(limit = 5) {
  const now = Date.now();
  if (_newsPool.length === 0 || now - _newsPoolTime > _NEWS_TTL) {
    const sources = [
      "https://www.animenewsnetwork.com/all/rss.xml",
      "https://feeds.feedburner.com/crunchyroll/animenews",
    ];
    const allItems = [];
    for (const url of sources) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 AnimeBot/1.0" },
        });
        if (!res.ok) continue;
        const xml = await res.text();
        const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml))) {
          const block = match[1];
          const title = decodeHtml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
          const link = decodeHtml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
          const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "").trim();
          const image = extractImage(block);
          const description = decodeHtml(
            block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "",
          ).slice(0, 1500);
          const author = decodeHtml(
            block.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1] ||
              block.match(/<author>([\s\S]*?)<\/author>/)?.[1] ||
              "",
          ).replace(/^.*?\(|\)$/g, "").trim();
          const categories = [];
          const catRegex = /<category[^>]*>([\s\S]*?)<\/category>/g;
          let cmatch;
          while ((cmatch = catRegex.exec(block))) {
            const cat = decodeHtml(cmatch[1]).trim();
            if (cat && !categories.includes(cat) && categories.length < 6) {
              categories.push(cat);
            }
          }
          const source = url.includes("animenewsnetwork")
            ? "Anime News Network"
            : url.includes("crunchyroll")
              ? "Crunchyroll News"
              : "Otaku News";
          if (title && link) {
            allItems.push({ title, link, pubDate, description, image, author, categories, source });
          }
        }
      } catch (_) {
        // try next source
      }
    }
    if (allItems.length) {
      _newsPool = allItems;
      _newsPoolTime = now;
    }
  }
  if (!_newsPool.length) return [];
  // Mezclar y devolver `limit` noticias aleatorias
  return _shuffle(_newsPool).slice(0, limit);
}

// Pool de animes de temporada con caché de 10 min para no saturar Jikan
let _seasonPool = [];
let _seasonPoolTime = 0;
const _SEASON_TTL = 10 * 60 * 1000;

async function getSeasonalAnime(limit = 5) {
  const now = Date.now();
  if (_seasonPool.length === 0 || now - _seasonPoolTime > _SEASON_TTL) {
    let pool = [];
    try {
      const { data } = await jikan.get("/seasons/now?limit=25");
      pool = Array.isArray(data?.data) ? data.data : [];
    } catch (err) {
      pool = [];
    }
    // Fallback: si Jikan no devuelve temporada actual, usar el top de animes
    if (!pool.length) {
      try {
        const { data } = await jikan.get("/top/anime?limit=25");
        pool = Array.isArray(data?.data) ? data.data : [];
      } catch (err) {
        pool = [];
      }
    }
    if (pool.length) {
      _seasonPool = pool;
      _seasonPoolTime = now;
    }
  }
  if (!_seasonPool.length) return [];
  return _shuffle(_seasonPool).slice(0, limit);
}

async function getCurrentSeasonInfo() {
  const month = new Date().getMonth() + 1;
  let season = "winter";
  if (month >= 3 && month <= 5) season = "spring";
  else if (month >= 6 && month <= 8) season = "summer";
  else if (month >= 9 && month <= 11) season = "fall";
  const seasonES = { winter: "Invierno", spring: "Primavera", summer: "Verano", fall: "Otoño" }[season];
  return { season, seasonES, year: new Date().getFullYear() };
}

module.exports = {
  getRandomAnime,
  getTopAnimes,
  searchCharacter,
  getRandomCharacter,
  getRandomWaifu,
  searchAnime,
  getAnimeOpenings,
  getAnimeNews,
  fetchArticleBody,
  getSeasonalAnime,
  getCurrentSeasonInfo,
};
