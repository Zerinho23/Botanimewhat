const config = require("../config/config");
const db = require("../database/db");
const logger = require("../utils/logger");
const { getCommand } = require("./commandHandler");
const { checkAntiSpam, checkAntiLink, checkStickerSpam } = require("./antiSpamHandler");
const { getGame, endGame } = require("../utils/dinamicaManager");

const cooldowns = new Map();
const xpCooldowns = new Map();
const coinCooldowns = new Map();

// Lazy-load webServer to avoid circular deps
let _ws = null;
function ws() { if (!_ws) _ws = require("../utils/webServer"); return _ws; }

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
    /nombre\s*(o\s*apodo)?:/i, /g[eé]nero\s*[♀️⚧♂️:]/i, /pa[íi]s\s*:/i, /edad\s*:/i,
    /anime[s]?\s*(favorito[s]?)?\s*:/i, /personaje\s*(que\s*m[aá]s\s*te\s*(representa)?)?\s*:/i,
    /(opening|ending)\s*(que\s*nunca)?\s*(te\s*cansas)?\s*:/i, /dato\s*curioso\s*:/i,
    /(cumplea[ñn]os|fecha\s*de\s*cumplea[ñn]os)\s*:/i,
  ];
  return campos.filter((re) => re.test(lower)).length >= 4;
}

// ── Otorgar XP ────────────────────────────────────────────────────────────────
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
  while (user.xp >= required) { user.xp -= required; user.level += 1; leveledUp = true; required = user.level * config.level.levelMultiplier; }
  db.updateUser(userJid, user);
  if (leveledUp && groupJid) {
    await sock.sendMessage(groupJid, {
      text: `${config.emojis.sparkles} ¡@${userJid.split("@")[0]} subió al *nivel ${user.level}*! ${config.emojis.fire}`,
      mentions: [userJid],
    });
  }
}

// ── Otorgar monedas ───────────────────────────────────────────────────────────
function awardCoins(userJid, isCommand) {
  if (!config.economy?.enabled) return;
  if (!isCommand) {
    const cooldownMs = (config.economy.coinCooldownSeconds ?? 30) * 1000;
    const last = coinCooldowns.get(userJid) || 0;
    if (Date.now() - last < cooldownMs) return;
    coinCooldowns.set(userJid, Date.now());
  }
  const gain = isCommand
    ? (config.economy.coinsPerCommand ?? 5)
    : (config.economy.coinsPerMessage ?? 2);
  const user = db.getUser(userJid);
  db.updateUser(userJid, { coins: (user.coins || 0) + gain });
}

// ── Manejar respuesta a una dinámica activa ───────────────────────────────────
async function handleDinamicaAnswer(sock, msg, from, sender, text) {
  const game = getGame(from);
  if (!game) return false;

  const result = game.check(text, sender);
  if (!result) return false; // Respuesta incorrecta, dejamos que siga el flujo normal

  // Respuesta correcta — cancelar timeout y cerrar juego
  endGame(from);

  const { winner, reward } = result;
  const winnerUser = db.getUser(winner);
  db.updateUser(winner, { coins: (winnerUser.coins || 0) + reward });

  const typeLabels = { trivia: "la trivia", adivina: "adivinar el anime", personaje: "adivinar el personaje" };
  const label = typeLabels[game.type] || "la dinámica";

  let replyText = [
    `${config.emojis.sparkles} *¡@${winner.split("@")[0]} ganó ${label}!* ${config.emojis.sparkles}`,
    ``,
    `${config.emojis.coin} *+${reward} monedas* agregadas a tu cuenta`,
    `💰 Saldo total: *${(winnerUser.coins || 0) + reward} monedas*`,
  ];

  if (game.type === "adivina" && result.anime) {
    replyText.push(``, `✅ El anime era: *${result.anime.title}*`);
  } else if (game.type === "personaje" && result.character) {
    replyText.push(``, `✅ El personaje era: *${result.character.name}*`);
  } else if (game.type === "trivia") {
    const correctOpt = game.question?.opts?.find((o) => o.startsWith(game.question.correct));
    if (correctOpt) replyText.push(``, `✅ Respuesta correcta: *${correctOpt}*`);
  }

  replyText.push(``, `_Usa *${config.prefix}dinamica* para jugar de nuevo._`);

  await sock.sendMessage(from, {
    text: replyText.join("\n"),
    mentions: [winner],
  }, { quoted: msg });

  return true;
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

      // ── Guardar nombre del usuario ────────────────────────────────
      if (msg.pushName && !msg.key.fromMe) {
        try {
          const u = db.getUser(sender);
          if (u.name !== msg.pushName) db.updateUser(sender, { name: msg.pushName });
        } catch (_) {}
      }

      // ── Modo mantenimiento ────────────────────────────────────────
      if (!msg.key.fromMe) {
        const W = ws();
        if (W.isMaintenanceMode()) {
          try {
            if (isGroup && Math.random() < 0.08) {
              await sock.sendMessage(from, { text: W.getMaintenanceMessage() });
            } else if (!isGroup) {
              await sock.sendMessage(from, { text: W.getMaintenanceMessage() }, { quoted: msg });
            }
          } catch (_) {}
          continue;
        }
      }

      if (msg.message?.stickerMessage) {
        if (isGroup && !msg.key.fromMe) {
          const group = db.getGroup(from);
          if (config.antiSpam.enabled && group.antiSpam) await checkStickerSpam(sock, msg, group, sender, from);
        }
        continue;
      }

      const text = extractText(msg).trim();
      if (!text) continue;
      if (msg.key.fromMe && !text.startsWith(config.prefix)) continue;

      // ── Grupos con bot desactivado ────────────────────────────────
      if (isGroup) {
        const _g = db.getGroup(from);
        if (_g.botEnabled === false) continue;
      }

      // ── Emitir evento de mensaje ──────────────────────────────────
      try {
        ws().emitEvent("msg", {
          sender: sender.split("@")[0],
          group: isGroup ? from.split("@")[0] : null,
          isCmd: text.startsWith(config.prefix),
        });
      } catch (_) {}

      if (text.startsWith(config.prefix)) {
        logger.info(`📥 ${sender.split("@")[0]} en ${isGroup ? "grupo" : "privado"}: "${text.slice(0, 60)}"`);
      }

      // ── Comprobar respuesta a dinámica activa (grupos) ────────────
      if (isGroup && !msg.key.fromMe && !text.startsWith(config.prefix)) {
        const answered = await handleDinamicaAnswer(sock, msg, from, sender, text);
        if (answered) {
          // También damos XP y monedas al ganador por haber participado
          await awardXp(sock, sender, from, false);
          awardCoins(sender, false);
          continue;
        }
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
            logger.info(`✅ Ficha de ${sender.split("@")[0]}`);
            await sock.sendMessage(from, {
              text: `✅ ¡Gracias por presentarte, @${sender.split("@")[0]}! 🎉\nYa formas parte oficial del grupo ${config.emojis.cherry}\nUsa *${config.prefix}help* para ver todo lo que puedes hacer 🌸`,
              mentions: [sender],
            });
          } catch (err) { logger.error(`Error aprobando ficha: ${err.message}`); }
          await awardXp(sock, sender, from, false);
          awardCoins(sender, false);
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
        awardCoins(sender, false);
        continue;
      }

      const args = text.slice(config.prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();
      const command = getCommand(commandName);

      if (!command) {
        await sock.sendMessage(from, { text: `${config.emojis.error} Comando *${commandName}* no encontrado. Usa *${config.prefix}help*.` }, { quoted: msg });
        continue;
      }

      const isAdminCmd = command.category === "admin";
      if (!isAdminCmd && !msg.key.fromMe) {
        const cooldownMs = (config.commandCooldown ?? 10) * 1000;
        const lastUse = cooldowns.get(sender) || 0;
        const remaining = cooldownMs - (Date.now() - lastUse);
        if (remaining > 0) {
          await sock.sendMessage(from, { text: `⏳ Espera *${Math.ceil(remaining/1000)}s* antes de usar otro comando.` }, { quoted: msg });
          continue;
        }
        cooldowns.set(sender, Date.now());
      }

      logger.command(sender.split("@")[0], commandName, isGroup ? from : null);

      try {
        ws().emitEvent("cmd", { sender: sender.split("@")[0], cmd: commandName, group: isGroup ? from.split("@")[0] : null });
      } catch (_) {}

      try { await sock.sendPresenceUpdate("composing", from); } catch (_) {}
      awardXp(sock, sender, isGroup ? from : null, true).catch(() => {});
      awardCoins(sender, true);

      try {
        await command.execute({ sock, msg, args, from, sender, isGroup, text });
      } catch (err) {
        logger.error(`Error en ${commandName}: ${err.message}`);
        try { await sock.sendMessage(from, { text: `${config.emojis.error} Error ejecutando el comando.` }, { quoted: msg }); } catch (_) {}
      }
      try { await sock.sendPresenceUpdate("paused", from); } catch (_) {}

    } catch (err) { logger.error(`Error procesando mensaje: ${err.message}`); }
  }
}

module.exports = { handleMessages };
