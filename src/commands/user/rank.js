const db = require("../../database/db");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "rank",
  description: "Top 15 hunters con más nivel",
  aliases: ["leaderboard", "lb", "top"],
  async execute({ sock, msg, from }) {
    const users = (await db.getAllUsers())
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 15);

    if (!users.length) {
      return sock.sendMessage(from, {
        text: `${config.emojis.info} Aún no hay usuarios registrados.`,
      }, { quoted: msg });
    }

    const text = format.formatRankBoard(users);
    await sock.sendMessage(from, {
      text,
      mentions: users.map((u) => u.jid),
    }, { quoted: msg });
  },
};