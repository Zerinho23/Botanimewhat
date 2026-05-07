const db = require("../../database/db");
const format = require("../../utils/format");
const api = require("../../utils/api");
const config = require("../../config/config");

const WAIFU_COST = config.economy?.waifuCost ?? 50;

const WAIFU_NAMES = [
  "Rem", "Zero Two", "Asuna", "Mikasa", "Nezuko", "Hinata", "Rias Gremory",
  "Tohru", "Megumin", "Aqua", "Emilia", "Beatrice", "Raphtalia", "Violet Evergarden",
  "Erza Scarlet", "Lucy Heartfilia", "Albedo", "Shiro", "Holo", "Rize", "Chika Fujiwara",
  "Kaguya Shinomiya", "Ai Hayasaka", "Nino Nakano", "Miku Nakano", "Ino Yamanaka",
  "Sakura Haruno", "Nobara Kugisaki", "Mirko", "Nami", "Robin", "Boa Hancock",
  "Saber", "Rin Tohsaka", "Tohsaka Rin", "Maki Zenin", "Yukino Yukinoshita",
  "Yui Yuigahama", "Chitoge Kirisaki", "Kosaki Onodera", "Ryuuko Matoi", "Satsuki Kiryuin",
];

function randomWaifuName() {
  return WAIFU_NAMES[Math.floor(Math.random() * WAIFU_NAMES.length)];
}

function getRarity() {
  const r = Math.random();
  if (r < 0.03) return { rarity: "🌟 LEGENDARIA", multiplier: 5 };
  if (r < 0.10) return { rarity: "💎 ÉPICA", multiplier: 3 };
  if (r < 0.25) return { rarity: "🔮 RARA", multiplier: 2 };
  return { rarity: "⭐ COMÚN", multiplier: 1 };
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

    // Descontar monedas primero
    await db.updateUser(sender, { coins: user.coins - WAIFU_COST });

    let imageUrl = null;
    try {
      imageUrl = await api.getRandomWaifu("waifu");
    } catch (_) {}

    const { rarity, multiplier } = getRarity();
    const name = randomWaifuName();
    const waifuEntry = { name, rarity, obtainedAt: Date.now(), imageUrl };

    const updatedUser = await db.getUser(sender);
    const waifus = updatedUser.waifus || [];
    waifus.push(waifuEntry);
    await db.updateUser(sender, { waifus });

    const lines = [
      `${config.emojis.heart} *¡Nueva waifu obtenida!*`,
      "",
      `${config.emojis.crown} *${name}*`,
      `${rarity}`,
      multiplier > 1 ? `${config.emojis.sparkles} _Bonus de rareza x${multiplier}_` : null,
      "",
      `${config.emojis.coin} Gastaste: *${WAIFU_COST}* monedas`,
      `📦 Colección: *${waifus.length}* waifu${waifus.length !== 1 ? "s" : ""}`,
      "",
      `_Usa *${config.prefix}coleccion* para ver todas._`,
    ].filter(Boolean);

    const caption = format.box("WAIFU INVOCADA", lines);

    if (imageUrl) {
      await sock.sendMessage(from, { image: { url: imageUrl }, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(from, { text: caption }, { quoted: msg });
    }
  },
};
