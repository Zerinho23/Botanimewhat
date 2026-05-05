const db = require("../../database/db");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "coleccion",
  description: "Ver tu colección de waifus",
  aliases: ["miswaifus", "harem", "collection"],
  async execute({ sock, msg, sender, from }) {
    const user = db.getUser(sender);
    const waifus = user.waifus || [];

    if (!waifus.length) {
      return sock.sendMessage(from, {
        text: `${config.emojis.info} Aún no tienes waifus en tu colección.\n\nUsa *${config.prefix}waifu* (cuesta ${config.economy?.waifuCost ?? 50} ${config.emojis.coin}) para invocar una.`,
      }, { quoted: msg });
    }

    const name = msg.pushName || sender.split("@")[0];

    // Contar rarezas
    const counts = { legendaria: 0, epica: 0, rara: 0, comun: 0 };
    for (const w of waifus) {
      if (w.rarity?.includes("LEGENDARIA")) counts.legendaria++;
      else if (w.rarity?.includes("ÉPICA") || w.rarity?.includes("EPICA")) counts.epica++;
      else if (w.rarity?.includes("RARA")) counts.rara++;
      else counts.comun++;
    }

    // Mostrar últimas 15
    const display = waifus.slice(-15).reverse();
    const lines = [
      `${config.emojis.crown} *${name}* — ${waifus.length} waifu${waifus.length !== 1 ? "s" : ""}`,
      "",
      `🌟 Legendarias: ${counts.legendaria}  💎 Épicas: ${counts.epica}`,
      `🔮 Raras: ${counts.rara}  ⭐ Comunes: ${counts.comun}`,
      "",
      `${config.emojis.heart} *Últimas obtenidas:*`,
      ...display.map((w, i) => `  ${i + 1}. *${w.name}* — ${w.rarity || "⭐ COMÚN"}`),
    ];

    if (waifus.length > 15) {
      lines.push(``, `_... y ${waifus.length - 15} más_`);
    }

    await sock.sendMessage(from, { text: format.box("COLECCIÓN DE WAIFUS", lines) }, { quoted: msg });
  },
};
