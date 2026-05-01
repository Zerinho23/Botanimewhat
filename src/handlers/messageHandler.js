const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");
const { getCommand } = require("./commandHandler");
const { checkAntiSpam, checkAntiLink, checkStickerSpam } = require("./antiSpamHandler");

const cooldowns = new Map();
const xpCooldowns = new Map();

function extractText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  );
}

function isFichaRellena(text) {
  const lower = text.toLowerCase();
  const campos = [
    /nombre\s*(o\s*apodo)?:/i,
    /g[eé]nero\s*[♀️⚧♂️:]/i,
    /pa[íi]s\s*:/i,
    /edad\s*:/i,
    /anime[s]?\s*(favorito[s]?)?\s*:/i,
    /personaje\s*(que\s*m[aá]s\s*te\s*(representa)?)?\s*:/i,
    /(opening|ending)\s*(que\s*nunca)?\s*(te\s*cansas)?\s*:/i,
    /dato\s*curioso\s*:/i,
    /(cumplea[ñn]os|fecha\s*de\s*cumplea[ñn]os)\s*:/i,
  ];
  const hits = campos.filter((re) => re.test(lower)).length;
  return hits >= 4;
}

async function awardXp(sock, userJid, groupJid, isCommand) {
  if (!isCommand) {
    const cooldownMs = (config.level.xpCooldownSeconds ?? 30) * 1000;
    const last = xpCooldowns.get(userJid) || 0;
    if (Date.now() - last < cooldownMs) {
      const u = db.getUser(userJid);
      u.messages += 1;
      db.updateUser(userJid, u);
      return;
    }
    xpCooldowns.set(userJid, Date.now());
  }

  const user = db.getUser(userJid);
  const xpGain = isCommand ? config.level.xpPerCommand : config.level.xpPerMessage;
  user.xp += xpGain;
  user.messages += isCommand ? 0 : 1;
  user.commands += isCommand ? 1 : 0;

  let leveledUp = false;
  let required = user.level * config.level.levelMultiplier;
  while (user.xp >= required) {
    user.xp -= required;
    user.level += 1;
    leveledUp = true;
    required = user.level * config.level.levelMultiplier;
  }
  db.updateUser(userJid, user);

  if (leveledUp && groupJid) {
    await sock.sendMessage(groupJid, {
      text: `${config.emojis.sparkles} ¡@${userJid.split("@")[0]} subió al *nivel ${user.level}*! ${config.emojis.fire}`,
      mentions: [userJid],
    });
  }
}

async function handleMessages(sock, { messages }) {
  for (const msg of messages) {
    try {
      if (!msg.message) continue;

      const from = msg.key.remoteJid;
      if (!from || from === "status@broadcast") continue;
      const isGroup = from.endsWith("@g.us");
      const sender = isGroup
        ? msg.key.participant
        : msg.key.fromMe
          ? sock.user?.id?.split(":")[0] + "@s.whatsapp.net"
          : from;
      if (!sender) continue;

      // ── GUARDAR NOMBRE DEL USUARIO ────────────────────────────────
      if (msg.pushName && !msg.key.fromMe) {
        try {
          const u = db.getUser(sender);
          if (u.name !== msg.pushName) db.updateUser(sender, { name: msg.pushName });
        } catch (_) {}
      }
      // ─────────────────────────────────────────────────────────────

      if (msg.message?.stickerMessage) {
        if (isGroup && !msg.key.fromMe) {
          const group = db.getGroup(from);
          if (config.antiSpam.enabled && group.antiSpam) {
            await checkStickerSpam(sock, msg, group, sender, from);
          }
        }
        continue;
      }

      const text = extractText(msg).trim();
      if (!text) continue;

      if (msg.key.fromMe && !text.startsWith(config.prefix)) continue;

      if (text.startsWith(config.prefix)) {
        logger.info(`📥 Mensaje de ${sender.split("@")[0]} en ${isGroup ? "grupo" : "privado"}: "${text.slice(0, 60)}"`);
      }

      if (isGroup) {
        const group = db.getGroup(from);

        if (group.mutedUsers?.includes(sender)) {
          try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
          continue;
        }

        if (config.antiSpam.enabled && group.antiSpam) {
          if (await checkAntiSpam(sock, msg, group, sender, from)) continue;
        }
        if (config.antiSpam.deleteLinks && group.antiLink) {
          if (await checkAntiLink(sock, msg, text, sender, from)) continue;
        }

        if (!msg.key.fromMe && db.isPending(from, sender) && isFichaRellena(text)) {
          try {
            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });
            db.removePending(from, sender);
            logger.info(`✅ Ficha recibida de ${sender.split("@")[0]} en ${from}`);
            await sock.sendMessage(from, {
              text:
                `✅ ¡Gracias por presentarte, @${sender.split("@")[0]}! 🎉\n` +
                `Ya formas parte oficial del grupo ${config.emojis.cherry}\n` +
                `Usa *${config.prefix}help* para ver todo lo que puedes hacer 🌸`,
              mentions: [sender],
            });
          } catch (err) {
            logger.error(`Error aprobando ficha de ${sender.split("@")[0]}: ${err.message}`);
          }
          await awardXp(sock, sender, from, false);
          continue;
        }

        try {
          const lastMessageAt = group.lastMessageAt || {};
          lastMessageAt[sender] = Date.now();
          db.updateGroup(from, { lastMessageAt });
        } catch (_) {}
      }

      const isCommand = text.startsWith(config.prefix);

      if (!isCommand) {
        await awardXp(sock, sender, isGroup ? from : null, false);
        continue;
      }

      const args = text.slice(config.prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();
      const command = getCommand(commandName);

      if (!command) {
        await sock.sendMessage(from, {
          text: `${config.emojis.error} Comando *${commandName}* no encontrado. Usa *${config.prefix}help* para ver los comandos.`,
        }, { quoted: msg });
        continue;
      }

      const isAdminCmd = command.category === "admin";
      if (!isAdminCmd && !msg.key.fromMe) {
        const cooldownMs = (config.commandCooldown ?? 10) * 1000;
        const lastUse = cooldowns.get(sender) || 0;
        const remaining = cooldownMs - (Date.now() - lastUse);
        if (remaining > 0) {
          const secs = Math.ceil(remaining / 1000);
          await sock.sendMessage(from, { text: `⏳ Espera *${secs}s* antes de usar otro comando.` }, { quoted: msg });
          continue;
        }
        cooldowns.set(sender, Date.now());
      }

      logger.command(sender.split("@")[0], commandName, isGroup ? from : null);

      try { await sock.sendPresenceUpdate("composing", from); } catch (_) {}

      awardXp(sock, sender, isGroup ? from : null, true).catch(() => {});

      try {
        await command.execute({ sock, msg, args, from, sender, isGroup, text });
      } catch (err) {
        logger.error(`Error en comando ${commandName}: ${err.message}`);
        try {
          await sock.sendMessage(from, {
            text: `${config.emojis.error} Hubo un error al ejecutar el comando. Intenta de nuevo.`,
          }, { quoted: msg });
        } catch (_) {}
      }

      try { await sock.sendPresenceUpdate("paused", from); } catch (_) {}

    } catch (err) {
      logger.error(`Error procesando mensaje: ${err.message}`);
    }
  }
}

module.exports = { handleMessages };
