const db = require("../../database/db");
  const format = require("../../utils/format");
  const api = require("../../utils/api");
  const config = require("../../config/config");

  const WAIFU_COST = config.economy?.waifuCost ?? 50;

  const WAIFU_NAMES = [
    "Rem", "Zero Two", "Asuna", "Mikasa", "Nezuko", "Hinata", "Rias Gremory",
    "Tohru", "Megumin", "Aqua", "Emilia", "Beatrice", "Raphtalia", "Violet Evergarden",
    "Erza Scarlet", "Lucy Heartfilia", "Albedo", "Shiro", "Holo", "Rize", "Chika Fujiwara",
    "Kaguya Shinomiya", "Ai Hayasaka", "Nino Nakano", "Miku Nakano",
    "Nobara Kugisaki", "Mirko", "Boa Hancock",
    "Saber", "Rin Tohsaka", "Maki Zenin", "Yukino Yukinoshita",
    "Yui Yuigahama", "Ryuuko Matoi", "Satsuki Kiryuin",
    "Nezuko Kamado", "Shinobu Kocho", "Mitsuri Kanroji",
    "Nami", "Robin", "Yamato",
    "Sakura Haruno", "Tsunade", "Hinata Hyuga",
    "Ochaco Uraraka", "Tsuyu Asui",
    "Rukia Kuchiki", "Orihime Inoue",
    "Kurisu Makise", "Nagato",
  ];

  function randomWaifuName() {
    return WAIFU_NAMES[Math.floor(Math.random() * WAIFU_NAMES.length)];
  }

  function getRarity() {
    const r = Math.random();
    if (r < 0.03) return { rarity: "🌟 LEGENDARIA", multiplier: 5 };
    if (r < 0.10) return { rarity: "💎 ÉPICA",      multiplier: 3 };
    if (r < 0.25) return { rarity: "🔮 RARA",       multiplier: 2 };
    return         { rarity: "⭐ COMÚN",             multiplier: 1 };
  }

  async function resolveWaifu(name) {
    try {
      const character = await api.searchCharacter(name);
      if (character) {
        const imageUrl =
          character.images?.webp?.image_url ||
          character.images?.jpg?.image_url  ||
          null;
        return {
          name:        character.name || name,
          imageUrl,
          favorites:   character.favorites ?? 0,
          found:       true,
        };
      }
    } catch (_) {}
    // Fallback: imagen genérica de waifu.pics
    let imageUrl = null;
    try { imageUrl = await api.getRandomWaifu("waifu"); } catch (_) {}
    return { name, imageUrl, favorites: 0, found: false };
  }

  module.exports = {
    name: "waifu",
    description: `Obtén una waifu aleatoria por ${WAIFU_COST} monedas`,
    aliases: ["gacha"],
    async execute({ sock, msg, sender, from }) {
      const user = await db.getUser(sender);
      if ((user.coins || 0) < WAIFU_COST) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} Necesitas *${WAIFU_COST}* ${config.emojis.coin} para invocar una waifu.\n\nTienes *${user.coins || 0}* monedas.\n\n_Usa *${config.prefix}daily* para ganar monedas._`,
        }, { quoted: msg });
      }

      await db.updateUser(sender, { coins: user.coins - WAIFU_COST });

      const pickedName = randomWaifuName();
      const { name, imageUrl, favorites, found } = await resolveWaifu(pickedName);
      const { rarity, multiplier } = getRarity();

      const waifuEntry = { name, rarity, obtainedAt: Date.now(), imageUrl };
      const updatedUser = await db.getUser(sender);
      const waifus = Array.isArray(updatedUser.waifus) ? updatedUser.waifus : [];
      waifus.push(waifuEntry);
      await db.updateUser(sender, { waifus });

      const lines = [
        `${config.emojis.heart} *¡Nueva waifu obtenida!*`,
        "",
        `${config.emojis.crown} *${name}*`,
        `${rarity}`,
        multiplier > 1 ? `${config.emojis.sparkles} _Bonus de rareza x${multiplier}_` : null,
        favorites > 0  ? `❤️ _${favorites.toLocaleString()} fans globales_`            : null,
        "",
        `${config.emojis.coin} Gastaste: *${WAIFU_COST}* monedas`,
        `📦 Colección: *${waifus.length}* waifu${waifus.length !== 1 ? "s" : ""}`,
        "",
        `_Usa *${config.prefix}coleccion* para ver todas._`,
      ].filter(Boolean);

      const caption = format.box("WAIFU INVOCADA", lines);

      if (imageUrl) {
        try {
          await sock.sendMessage(from, { image: { url: imageUrl }, caption }, { quoted: msg });
          return;
        } catch (_) {}
      }
      await sock.sendMessage(from, { text: caption }, { quoted: msg });
    },
  };
  