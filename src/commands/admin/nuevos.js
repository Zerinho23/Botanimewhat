const config = require("../../config/config");
  const db = require("../../database/db");
  const { isAdmin } = require("../../handlers/antiSpamHandler");
  const logger = require("../../utils/logger");

  function divider() {
    return "━━━━━━━━━━━━━━━━━━━━";
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 60)  return `hace ${mins}min`;
    if (hours < 24)  return `hace ${hours}h`;
    if (days  < 7)   return `hace ${days}d`;
    return new Date(ts).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit" });
  }

  module.exports = {
    name: "nuevos",
    description: "Invoca a todos los miembros que se unieron recientemente al grupo (por defecto últimos 7 días)",
    aliases: ["recientes", "bienvenidos", "newmembers"],
    async execute({ sock, msg, args, from, sender, isGroup }) {
      // Solo en grupos
      if (!isGroup) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} Este comando solo funciona en grupos.`,
        }, { quoted: msg });
      }

      // Solo admins
      if (!(await isAdmin(sock, from, sender))) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} Solo los admins pueden usar este comando.`,
        }, { quoted: msg });
      }

      // Parsear argumento de días (por defecto 7)
      let days = 7;
      const specialModes = ["hoy", "ficha", "pendientes"];
      const onlyPending  = args[0] === "ficha" || args[0] === "pendientes";

      if (args[0] && !onlyPending) {
        if (args[0] === "hoy") {
          days = 1;
        } else {
          const parsed = parseInt(args[0], 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 30) {
            days = parsed;
          } else if (!specialModes.includes(args[0])) {
            return sock.sendMessage(from, {
              text: [
                `${config.emojis.warning} *Uso del comando:*`,
                `*${config.prefix}nuevos* — últimos 7 días (por defecto)`,
                `*${config.prefix}nuevos 3* — últimos 3 días`,
                `*${config.prefix}nuevos hoy* — solo hoy`,
                `*${config.prefix}nuevos ficha* — pendientes de presentación`,
                `_Máximo: 30 días._`,
              ].join("\n"),
            }, { quoted: msg });
          }
        }
      }

      if (onlyPending) days = 1;

      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      const group  = db.getGroup(from);
      const recentJoins = group.recentJoins || {};

      // Obtener participantes actuales para filtrar los que ya salieron
      let currentParticipants = new Set();
      let groupName = group.name || from.split("@")[0];
      try {
        const metadata = await sock.groupMetadata(from);
        for (const p of metadata.participants) currentParticipants.add(p.id);
        groupName = metadata.subject || groupName;
      } catch {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} No pude obtener la lista de miembros. ¿Soy admin?`,
        }, { quoted: msg });
      }

      // Filtrar: unidos dentro del rango Y todavía en el grupo
      const entries = Object.entries(recentJoins)
        .filter(([jid, ts]) => ts >= cutoff && currentParticipants.has(jid))
        .sort(([, a], [, b]) => b - a); // más recientes primero

      // Sin resultados
      if (entries.length === 0) {
        const label = onlyPending
          ? "No hay usuarios pendientes de presentación en las últimas 24h."
          : `No hay nuevos miembros registrados en los últimos ${days} día${days !== 1 ? "s" : ""}.\n${config.emojis.info} _Solo se registran ingresos cuando el bot está activo en el grupo._`;
        return sock.sendMessage(from, {
          text: `${config.emojis.sparkles} ${label}`,
        }, { quoted: msg });
      }

      const mentions  = entries.map(([jid]) => jid);

      // Mensaje personalizado (todo lo que no sea número ni modo especial)
      const customMsg = args
        .filter(a => !specialModes.includes(a) && isNaN(parseInt(a)))
        .join(" ").trim();

      const lines = [
        `🌸✨ *NUEVOS INTEGRANTES* ✨🌸`,
        divider(),
        `${config.emojis.sparkles} *Grupo:* ${groupName}`,
        `📅 *Período:* últimos ${days} día${days !== 1 ? "s" : ""}`,
        `${config.emojis.crown} *Recién llegados:* ${entries.length}`,
        divider(),
      ];

      if (customMsg) {
        lines.push("", `${config.emojis.heart} ${customMsg}`, "");
      } else {
        lines.push("");
      }

      for (const [jid, ts] of entries) {
        const num  = jid.split("@")[0].split(":")[0];
        const user = db.getUser(jid);
        const name = (user?.name && user.name !== `+${num}`) ? user.name : null;
        lines.push(`${config.emojis.cherry} @${num}${name ? ` _(${name} · ${timeAgo(ts)})_` : ` _(${timeAgo(ts)})_`}`);
      }

      lines.push(
        "",
        divider(),
        `${config.emojis.fire} ¡Bienvenidos! Usa *${config.prefix}help* para ver todos los comandos.`,
        `✨ _AnimeBot by zerinho23_`
      );

      logger.info(`!nuevos: ${entries.length} miembro(s) en ${from.split("@")[0]} (${days}d)`);

      await sock.sendMessage(from, {
        text: lines.join("\n"),
        mentions,
      }, { quoted: msg });
    },
  };
  