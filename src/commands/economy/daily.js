const db = require("../../database/db");
const config = require("../../config/config");

module.exports = {
  name: "daily",
  description: "Reclama tu recompensa diaria de monedas",
  aliases: ["diario", "claim"],
  async execute({ sock, msg, sender, from }) {
    if (!config.economy.enabled) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} Economía desactivada.`,
      }, { quoted: msg });
    }
    const user = db.getUser(sender);
    const now = Date.now();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    const diff = now - (user.lastDaily || 0);

    if (diff < ONE_DAY) {
      const left = ONE_DAY - diff;
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Ya reclamaste hoy. Vuelve en *${h}h ${m}m*.`,
      }, { quoted: msg });
    }

    user.coins += config.economy.dailyReward;
    user.lastDaily = now;
    db.updateUser(sender, user);

    await sock.sendMessage(from, {
      text: `${config.emojis.coin} ¡Recibiste *${config.economy.dailyReward}* monedas!\n${config.emojis.sparkles} Total: *${user.coins}* monedas.`,
    }, { quoted: msg });
  },
};
