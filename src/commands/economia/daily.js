const db = require("../../database/db");
const format = require("../../utils/format");
const config = require("../../config/config");

const DAILY_MS = 24 * 60 * 60 * 1000;

module.exports = {
  name: "daily",
  description: "Recoge tu recompensa diaria de monedas",
  aliases: ["diario", "recompensa", "claim"],
  async execute({ sock, msg, sender, from }) {
    const user = await db.getUser(sender);
    const now = Date.now();
    const last = user.lastDaily || 0;
    const diff = now - last;

    if (diff < DAILY_MS) {
      const remaining = DAILY_MS - diff;
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Ya recogiste tu daily hoy.\n\n⏳ Vuelve en *${hours}h ${minutes}m*.`,
      }, { quoted: msg });
    }

    const reward = config.economy.dailyReward ?? 100;
    const bonus = user.level >= 10 ? Math.floor(reward * 0.5) : 0;
    const total = reward + bonus;

    await db.updateUser(sender, {
      coins: (user.coins || 0) + total,
      lastDaily: now,
    });

    const lines = [
      `${config.emojis.sparkles} *¡Recompensa reclamada!*`,
      "",
      `${config.emojis.coin} *+${reward} monedas* base`,
      bonus ? `${config.emojis.fire} *+${bonus} monedas* (bonus nivel ${user.level})` : null,
      ``,
      `${config.emojis.coin} *Total: ${(user.coins || 0) + total} monedas*`,
      "",
      `_Vuelve mañana para tu próximo daily._`,
    ].filter(Boolean);

    await sock.sendMessage(from, { text: format.box("DAILY RECLAMADO", lines) }, { quoted: msg });
  },
};
