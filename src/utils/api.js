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
        const description = decodeHtml(
          block.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "",
        ).slice(0, 200);
        if (title && link) items.push({ title, link, pubDate, description });
      }
      if (items.length) return items;
    } catch (_) {
      // try next source
    }
  }
  return [];
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
};
