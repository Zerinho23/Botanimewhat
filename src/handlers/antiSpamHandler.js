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

// Anti-spam de stickers: permite hasta 3 stickers por usuario en una ventana de 30s.
// Al llegar al 4to avisa con un mensaje claro. A partir del 5to borra sin avisar.
async function checkStickerSpam(sock, msg, group, sender, from) {
  const now = Date.now();
  const WINDOW_MS = 30000; // ventana de 30 segundos
  const MAX_STICKERS = 3;  // máximo permitido antes de actuar

  if (!group.stickerLog) group.stickerLog = {};
  if (!Array.isArray(group.stickerLog[sender])) group.stickerLog[sender] = [];

  // Mantener solo stickers dentro de la ventana de tiempo
  group.stickerLog[sender] = group.stickerLog[sender].filter((t) => now - t < WINDOW_MS);
  group.stickerLog[sender].push(now);

  const count = group.stickerLog[sender].length;

  if (count > MAX_STICKERS) {
    if (await isAdmin(sock, from, sender)) {
      db.updateGroup(from, { stickerLog: group.stickerLog });
      return false;
    }
    try {
      // Borrar el sticker excedente
      await sock.sendMessage(from, { delete: msg.key });

      // Advertencia solo en el 4to sticker (primer exceso)
      if (count === MAX_STICKERS + 1) {
        await sock.sendMessage(from, {
          text:
            `${config.emojis.warning} @${sender.split("@")[0]} solo se permiten *3 stickers* cada 30 segundos.\n` +
            `Los siguientes serán eliminados automáticamente. 🚫`,
          mentions: [sender],
        });
      }
      logger.warn(`Sticker spam: ${sender.split("@")[0]} envió ${count} stickers en ${from}`);
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
