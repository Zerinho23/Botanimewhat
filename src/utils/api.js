const axios = require("axios");
const config = require("../config/config");

const jikan = axios.create({ baseURL: config.api.jikanBase, timeout: 15000 });
const waifuApi = axios.create({ baseURL: config.api.waifuBase, timeout: 15000 });
const nekosApi = axios.create({ baseURL: config.api.nekosBase, timeout: 15000 });

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
  const { data } = await jikan.get(`/anime?q=${encodeURIComponent(query)}&limit=5`);
  return data.data;
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

async function getAnimeNews(limit = 5) {
  const sources = [
    "https://www.animenewsnetwork.com/all/rss.xml",
    "https://feeds.feedburner.com/crunchyroll/animenews",
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 AnimeBot/1.0" },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = [];
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) && items.length < limit) {
        const block = match[1];
        const title = decodeHtml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "");
        const link = decodeHtml(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "");
        const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "").trim();
        const image = extractImage(block);
        const description = decodeHtml(
          block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "",
        ).slice(0, 350);
        if (title && link) items.push({ title, link, pubDate, description, image });
      }
      if (items.length) return items;
    } catch (_) {
      // try next source
    }
  }
  return [];
}

async function getSeasonalAnime(limit = 5) {
  const { data } = await jikan.get(`/seasons/now?limit=${limit}`);
  return data.data || [];
}

async function getCurrentSeasonInfo() {
  const month = new Date().getMonth() + 1;
  let season = "winter";
  if (month >= 3 && month <= 5) season = "spring";
  else if (month >= 6 && month <= 8) season = "summer";
  else if (month >= 9 && month <= 11) season = "fall";
  const seasonES = {
    winter: "Invierno",
    spring: "Primavera",
    summer: "Verano",
    fall: "Otoño",
  }[season];
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
  getSeasonalAnime,
  getCurrentSeasonInfo,
};
