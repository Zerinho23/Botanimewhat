const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");

const URL_REGEX = /(https?:\/\/[^\s]+)|(wa\.me\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/gi;

async function isAdmin(sock, groupJid, userJid) {
  try {
    const metadata = await sock.groupMetadata(groupJid);
    const participant = metadata.participants.find((p) => p.id === userJid);
    return participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch {
    return false;
  }
}

async function checkAntiSpam(sock, msg, group, sender, from) {
  const now = Date.now();
  if (!group.messageLog) group.messageLog = {};
  if (!Array.isArray(group.messageLog[sender])) group.messageLog[sender] = [];

  group.messageLog[sender] = group.messageLog[sender].filter((t) => now - t < 1000);
  group.messageLog[sender].push(now);

  if (group.messageLog[sender].length > config.antiSpam.maxMessagesPerSecond) {
    if (await isAdmin(sock, from, sender)) return false;
    try {
      await sock.sendMessage(from, { delete: msg.key });
      await sock.sendMessage(from, {
        text: `${config.emojis.warning} @${sender.split("@")[0]} cálmate, estás enviando demasiados mensajes.`,
        mentions: [sender],
      });
      logger.warn(`Spam detectado de ${sender} en ${from}`);
    } catch {}
    db.updateGroup(from, { messageLog: group.messageLog });
    return true;
  }

  db.updateGroup(from, { messageLog: group.messageLog });
  return false;
}

async function checkAntiLink(sock, msg, text, sender, from) {
  const matches = text.match(URL_REGEX);
  if (!matches) return false;

  const allowed = matches.every((url) =>
    config.antiSpam.allowedDomains.some((d) => url.includes(d))
  );
  if (allowed) return false;

  if (await isAdmin(sock, from, sender)) return false;

  try {
    await sock.sendMessage(from, { delete: msg.key });
    await sock.sendMessage(from, {
      text: `${config.emojis.warning} @${sender.split("@")[0]} los enlaces no están permitidos en este grupo.`,
      mentions: [sender],
    });
    logger.warn(`Enlace eliminado de ${sender} en ${from}`);
  } catch {}
  return true;
}

module.exports = { checkAntiSpam, checkAntiLink, isAdmin };
