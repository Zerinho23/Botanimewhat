const db = require("../../database/db");
const format = require("../../utils/format");
const config = require("../../config/config");

module.exports = {
  name: "transferir",
  description: "Envía monedas a otro usuario. Uso: !transferir @usuario cantidad",
  aliases: ["dar", "send", "pagar"],
  async execute({ sock, msg, sender, from, args }) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!mentioned) {
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Menciona al usuario. Ej: *${config.prefix}transferir @usuario 50*`,
      }, { quoted: msg });
    }

    const amount = parseInt(args.find((a) => /^\d+$/.test(a)));
    if (!amount || amount <= 0) {
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Indica cuántas monedas. Ej: *${config.prefix}transferir @usuario 50*`,
      }, { quoted: msg });
    }

    if (mentioned === sender) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} No puedes transferirte monedas a ti mismo.`,
      }, { quoted: msg });
    }

    const giver = await db.getUser(sender);
    if ((giver.coins || 0) < amount) {
      return sock.sendMessage(from, {
        text: `${config.emojis.error} No tienes suficientes monedas. Tienes *${giver.coins || 0}* ${config.emojis.coin}`,
      }, { quoted: msg });
    }

    const receiver = await db.getUser(mentioned);
    await db.updateUser(sender, { coins: giver.coins - amount });
    await db.updateUser(mentioned, { coins: (receiver.coins || 0) + amount });

    const lines = [
      `${config.emojis.success} *¡Transferencia exitosa!*`,
      "",
      `💸 *De:* @${sender.split("@")[0]}`,
      `📬 *Para:* @${mentioned.split("@")[0]}`,
      `${config.emojis.coin} *Cantidad:* ${amount} monedas`,
      "",
      `Tu saldo: *${giver.coins - amount}* monedas`,
    ];

    await sock.sendMessage(from, {
      text: format.box("TRANSFERENCIA", lines),
      mentions: [sender, mentioned],
    }, { quoted: msg });
  },
};
