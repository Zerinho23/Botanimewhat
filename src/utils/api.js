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

module.exports = {
  getRandomAnime,
  getTopAnimes,
  searchCharacter,
  getRandomCharacter,
  getRandomWaifu,
  searchAnime,
  getAnimeOpenings,
};
