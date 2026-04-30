const config = require("../config/config");
  const db = require("../database/db");
  const logger = require("../utils/logger");
  const { getCommand } = require("./commandHandler");
  const { checkAntiSpam, checkAntiLink } = require("./antiSpamHandler");

  // Cooldown por usuario: jid -> timestamp del último comando ejecutado
  const cooldowns = new Map();

  function extractText(msg) {
    return (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      ""
    );
  }

  async function awardXp(sock, userJid, groupJid, isCommand) {
    const user = db.getUser(userJid);
    const xpGain = isCommand ? config.level.xpPerCommand : config.level.xpPerMessage;

    user.xp += xpGain;
    user.messages += isCommand ? 0 : 1;
    user.commands += isCommand ? 1 : 0;

    const required = user.level * config.level.levelMultiplier;
    let leveledUp = false;
    if (user.xp >= required) {
      user.level += 1;
      user.xp = 0;
      leveledUp = true;
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
        }

        const isCommand = text.startsWith(config.prefix);

        if (isGroup) {
          try {
            const group = db.getGroup(from);
            const lastMessageAt = group.lastMessageAt || {};
            lastMessageAt[sender] = Date.now();
            db.updateGroup(from, { lastMessageAt });
          } catch (_) {
            // ignore
          }
        }

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

        // --- COOLDOWN ---
        // Los comandos de admin no tienen cooldown (ban, kick, mute, etc.)
        // Los comandos de usuarios (anime, user) tienen cooldown configurable
        const isAdminCmd = command.category === "admin";
        if (!isAdminCmd && !msg.key.fromMe) {
          const cooldownMs = (config.commandCooldown ?? 10) * 1000;
          const lastUse = cooldowns.get(sender) || 0;
          const remaining = cooldownMs - (Date.now() - lastUse);
          if (remaining > 0) {
            const secs = Math.ceil(remaining / 1000);
            await sock.sendMessage(from, {
              text: `⏳ Espera *${secs}s* antes de usar otro comando.`,
            }, { quoted: msg });
            continue;
          }
          cooldowns.set(sender, Date.now());
        }
        // ----------------

        logger.command(sender.split("@")[0], commandName, isGroup ? from : null);

        try {
          await sock.sendPresenceUpdate("composing", from);
        } catch (_) {
          // ignore
        }

        awardXp(sock, sender, isGroup ? from : null, true).catch(() => {});

        try {
          await command.execute({ sock, msg, args, from, sender, isGroup, text });
        } catch (err) {
          logger.error(`Error en comando ${commandName}: ${err.message}`);
          try {
            await sock.sendMessage(from, {
              text: `${config.emojis.error} Hubo un error al ejecutar el comando. Intenta de nuevo.`,
            }, { quoted: msg });
          } catch (_) {
            // ignore
          }
        }

        try {
          await sock.sendPresenceUpdate("paused", from);
        } catch (_) {
          // ignore
        }
      } catch (err) {
        logger.error(`Error procesando mensaje: ${err.message}`);
      }
    }
  }

  module.exports = { handleMessages };
  