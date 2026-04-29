const db = require("../../database/db");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "rank",
  description: "Top 10 usuarios con más nivel",
  aliases: ["leaderboard", "lb"],
  async execute({ sock, msg, from }) {
    const users = db.getAllUsers()
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    if (!users.length) {
      return sock.sendMessage(from, {
        text: `${config.emojis.info} Aún no hay usuarios registrados.`,
      }, { quoted: msg });
    }

    const lines = users.map((u, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      return `${medal} @${u.jid.split("@")[0]} — Nv. *${u.level}* (${u.xp} XP)`;
    });

    await sock.sendMessage(from, {
      text: format.box("RANKING OTAKU", lines),
      mentions: users.map((u) => u.jid),
    }, { quoted: msg });
  },
};
