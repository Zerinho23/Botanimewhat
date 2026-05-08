const db = require("../../database/db");
  const format = require("../../utils/format");
  const config = require("../../config/config");

  const RARITY_ORDER = ["🌟 LEGENDARIA", "💎 ÉPICA", "🔮 RARA", "⭐ COMÚN"];
  const RARITY_SCORE = { "🌟 LEGENDARIA": 5, "💎 ÉPICA": 3, "🔮 RARA": 2, "⭐ COMÚN": 1 };

  function getRarityKey(rarity = "") {
    if (rarity.includes("LEGENDARIA")) return "🌟 LEGENDARIA";
    if (rarity.includes("ÉPICA") || rarity.includes("EPICA")) return "💎 ÉPICA";
    if (rarity.includes("RARA")) return "🔮 RARA";
    return "⭐ COMÚN";
  }

  function rarityEmoji(key) {
    return key.split(" ")[0];
  }

  function timeAgo(ts) {
    if (!ts) return "";
    const d = Math.floor((Date.now() - ts) / 86400000);
    if (d === 0) return " _(hoy)_";
    if (d === 1) return " _(ayer)_";
    return ` _(${d}d)_`;
  }

  module.exports = {
    name: "coleccion",
    description: "Ver tu colección de waifus",
    aliases: ["miswaifus", "harem", "collection"],
    async execute({ sock, msg, sender, from }) {
      const user = await db.getUser(sender);
      const waifus = Array.isArray(user.waifus) ? user.waifus : [];

      if (!waifus.length) {
        return sock.sendMessage(from, {
          text: `${config.emojis.info} Aún no tienes waifus en tu colección.\n\nUsa *${config.prefix}waifu* (cuesta ${config.economy?.waifuCost ?? 50} ${config.emojis.coin}) para invocar una.`,
        }, { quoted: msg });
      }

      const userName = msg.pushName || sender.split("@")[0];

      // ── Agrupar por nombre y rareza ──────────────────────────────────────────
      const grouped = {};
      for (const w of waifus) {
        const key = w.name || "Desconocida";
        if (!grouped[key]) grouped[key] = { name: key, rarity: getRarityKey(w.rarity), count: 0, imageUrl: w.imageUrl, lastObtained: 0 };
        grouped[key].count++;
        if ((w.obtainedAt || 0) > grouped[key].lastObtained) {
          grouped[key].lastObtained = w.obtainedAt || 0;
          if (w.imageUrl) grouped[key].imageUrl = w.imageUrl;
        }
      }
      const unique = Object.values(grouped);

      // ── Ordenar: rareza desc, luego nombre ──────────────────────────────────
      unique.sort((a, b) => {
        const ra = RARITY_ORDER.indexOf(a.rarity);
        const rb = RARITY_ORDER.indexOf(b.rarity);
        return ra !== rb ? ra - rb : a.name.localeCompare(b.name);
      });

      // ── Estadísticas ─────────────────────────────────────────────────────────
      const counts = { "🌟 LEGENDARIA": 0, "💎 ÉPICA": 0, "🔮 RARA": 0, "⭐ COMÚN": 0 };
      let totalScore = 0;
      for (const w of waifus) {
        const k = getRarityKey(w.rarity);
        counts[k]++;
        totalScore += RARITY_SCORE[k];
      }
      const duplicates = waifus.length - unique.length;

      // ── Waifu top (para imagen principal) ────────────────────────────────────
      const topWaifu = unique.find(w => w.imageUrl) || unique[0];

      // ── Construir texto ──────────────────────────────────────────────────────
      const display = unique.slice(0, 20);
      const lines = [
        `${config.emojis.crown} *${userName}* — ${waifus.length} invocación${waifus.length !== 1 ? "es" : ""} · ${unique.length} únicas`,
        "",
        `🌟 ${counts["🌟 LEGENDARIA"]}  💎 ${counts["💎 ÉPICA"]}  🔮 ${counts["🔮 RARA"]}  ⭐ ${counts["⭐ COMÚN"]}`,
        duplicates > 0 ? `♻️ Duplicadas: ${duplicates}  |  🏆 Score: ${totalScore} pts` : `🏆 Score total: ${totalScore} pts`,
        "",
        `${config.emojis.heart} *Colección (ordenada por rareza):*`,
        ...display.map((w) => {
          const dup = w.count > 1 ? ` ×${w.count}` : "";
          return `  ${rarityEmoji(w.rarity)} *${w.name}*${dup}${timeAgo(w.lastObtained)}`;
        }),
      ];

      if (unique.length > 20) lines.push("", `_... y ${unique.length - 20} waifus más_`);

      const caption = format.box("COLECCIÓN DE WAIFUS", lines);

      // ── Enviar con imagen si hay ─────────────────────────────────────────────
      if (topWaifu?.imageUrl) {
        try {
          await sock.sendMessage(from, { image: { url: topWaifu.imageUrl }, caption }, { quoted: msg });
          return;
        } catch (_) {}
      }
      await sock.sendMessage(from, { text: caption }, { quoted: msg });
    },
  };
  