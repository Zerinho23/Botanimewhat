const MAX_MESSAGES = 500;
const MAX_GROUPS = 100;

const messages = new Map();
const groupMetadataCache = new Map();

function makeKey(jid, id) {
  return `${jid}::${id}`;
}

function saveMessage(msg) {
  if (!msg || !msg.key || !msg.message) return;
  const key = makeKey(msg.key.remoteJid, msg.key.id);
  messages.set(key, msg.message);
  if (messages.size > MAX_MESSAGES) {
    const firstKey = messages.keys().next().value;
    messages.delete(firstKey);
  }
}

async function getMessage(key) {
  if (!key) return undefined;
  const k = makeKey(key.remoteJid, key.id);
  return messages.get(k);
}

async function cachedGroupMetadata(jid, sock) {
  if (!jid.endsWith("@g.us")) return undefined;
  const cached = groupMetadataCache.get(jid);
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) {
    return cached.data;
  }
  try {
    const data = await sock.groupMetadata(jid);
    if (groupMetadataCache.size > MAX_GROUPS) {
      const firstKey = groupMetadataCache.keys().next().value;
      groupMetadataCache.delete(firstKey);
    }
    groupMetadataCache.set(jid, { data, ts: Date.now() });
    return data;
  } catch (_) {
    return undefined;
  }
}

function invalidateGroup(jid) {
  groupMetadataCache.delete(jid);
}

module.exports = {
  saveMessage,
  getMessage,
  cachedGroupMetadata,
  invalidateGroup,
};
