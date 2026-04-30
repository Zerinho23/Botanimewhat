const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");

const URL_REGEX = /(https?:\/\/[^\s]+)|(wa\.me\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)/gi;

// Normaliza un JID a su parte de usuario, sin sufijos de dispositivo.
function _userPart(jid) {
  return (jid || "").split("@")[0].split(":")[0];
}

async function isAdmin(sock, groupJid, userJid) {
  if (!groupJid || !userJid) return false;

  // El dueño del bot siempre es admin
  try {
    const ownerNum = (config.ownerNumber || "").replace(/\D/g, "");
    const userNum = _userPart(userJid).replace(/\D/g, "");
    if (ownerNum && userNum && userNum === ownerNum) return true;
  } catch {}

  try {
    // Usar caché de metadatos para evitar llamadas repetidas a WhatsApp
    const { cachedGroupMetadata } = require("../utils/messageStore");
    const cached = cachedGroupMetadata(groupJid);
    const metadata = cached || (await sock.groupMetadata(groupJid));
    if (!metadata?.participants) return false;

    const target = _userPart(userJid);

    // Comparar con id, lid y jid en formato exacto y también solo con la parte de usuario,
    // para soportar JIDs nuevos (LID) y antiguos (@s.whatsapp.net) sin falsos negativos.
    const participant = metadata.participants.find((p) => {
      if (!p) return false;
      if (p.id === userJid || p.lid === userJid || p.jid === userJid) return true;
      if (_userPart(p.id) === target) return true;
      if (_userPart(p.lid) === target) return true;
      if (_userPart(p.jid) === target) return true;
      return false;
    });

    return participant?.admin === "admin" || participant?.admin === "superadmin";
  } catch (err) {
    logger.warn(`isAdmin falló para ${userJid} en ${groupJid}: ${err.message}`);
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

// Anti-spam de stickers: permite 1 sticker por usuario en una ventana de 10s,
// borra los siguientes y avisa al usuario una sola vez.
async function checkStickerSpam(sock, msg, group, sender, from) {
  const now = Date.now();
  const WINDOW_MS = 10000;
  const MAX_STICKERS = 1;

  if (!group.stickerLog) group.stickerLog = {};
  if (!Array.isArray(group.stickerLog[sender])) group.stickerLog[sender] = [];

  // Mantener solo stickers dentro de la ventana
  group.stickerLog[sender] = group.stickerLog[sender].filter((t) => now - t < WINDOW_MS);
  group.stickerLog[sender].push(now);

  if (group.stickerLog[sender].length > MAX_STICKERS) {
    if (await isAdmin(sock, from, sender)) {
      db.updateGroup(from, { stickerLog: group.stickerLog });
      return false;
    }
    try {
      // Borrar el sticker excedente
      await sock.sendMessage(from, { delete: msg.key });
      // Avisar solo en el primer exceso (cuando hay exactamente 2)
      if (group.stickerLog[sender].length === 2) {
        await sock.sendMessage(from, {
          text: `${config.emojis.warning} @${sender.split("@")[0]} evita hacer spam de stickers.`,
          mentions: [sender],
        });
      }
      logger.warn(`Sticker spam detectado de ${sender} en ${from}`);
    } catch {}
    db.updateGroup(from, { stickerLog: group.stickerLog });
    return true;
  }

  db.updateGroup(from, { stickerLog: group.stickerLog });
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

module.exports = { checkAntiSpam, checkStickerSpam, checkAntiLink, isAdmin };
