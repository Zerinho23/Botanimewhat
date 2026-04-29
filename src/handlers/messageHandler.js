const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");
const { getCommand } = require("./commandHandler");
const { checkAntiSpam, checkAntiLink } = require("./antiSpamHandler");

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
  const coinGain = isCommand ? config.economy.coinsPerCommand : config.economy.coinsPerMessage;

  user.xp += xpGain;
  user.messages += isCommand ? 0 : 1;
  user.commands += isCommand ? 1 : 0;
  if (config.economy.enabled) user.coins += coinGain;

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
      if (!msg.message || msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const sender = isGroup ? msg.key.participant : from;
      if (!sender) continue;

      const text = extractText(msg).trim();
      if (!text) continue;

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

      logger.command(sender.split("@")[0], commandName, isGroup ? from : null);
      await awardXp(sock, sender, isGroup ? from : null, true);

      await command.execute({ sock, msg, args, from, sender, isGroup, text });
    } catch (err) {
      logger.error(`Error procesando mensaje: ${err.message}`);
    }
  }
}

module.exports = { handleMessages };
