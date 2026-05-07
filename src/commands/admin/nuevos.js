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
    if (mins  < 1)   return "recién";
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
      const group  = await db.getGroup(from);

      // Obtener metadatos del grupo (participantes actuales + timestamps lb)
      let metadata;
      try {
        metadata = await sock.groupMetadata(from);
      } catch {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} No pude obtener la lista de miembros. ¿Soy admin?`,
        }, { quoted: msg });
      }

      const groupName = metadata.subject || group.name || from.split("@")[0];
      const currentParticipants = new Set(metadata.participants.map(p => p.id));

      // ── Construir mapa de timestamps de ingreso ─────────────────────────────
      // Prioridad:
      //   1. recentJoins (registrado por el evento group-participants.update)
      //   2. Campo "lb" de los metadatos de WhatsApp (timestamp de ingreso real)
      // Así funciona aunque el miembro haya entrado antes de que existiera el comando.

      const recentJoins = group.recentJoins || {};

      // Construir mapa combinado: jid → timestamp
      const joinMap = {};

      // Primero, volcar los datos del campo lb de WhatsApp (más histórico)
      for (const p of metadata.participants) {
        const lb = p.lb; // timestamp en segundos en Baileys
        if (lb && typeof lb === "number" && lb > 0) {
          // lb puede venir en segundos (epoch unix) o milisegundos
          const ts = lb > 1e12 ? lb : lb * 1000;
          joinMap[p.id] = ts;
        }
      }

      // Después, sobrescribir con recentJoins (más preciso cuando existe)
      for (const [jid, ts] of Object.entries(recentJoins)) {
        joinMap[jid] = ts;
      }

      // ── Filtrar: dentro del rango Y todavía en el grupo ─────────────────────
      const entries = Object.entries(joinMap)
        .filter(([jid, ts]) => ts >= cutoff && currentParticipants.has(jid))
        .sort(([, a], [, b]) => b - a); // más recientes primero

      // ── Sin resultados ───────────────────────────────────────────────────────
      if (entries.length === 0) {
        // Si no hay datos lb ni recentJoins, ofrecer listar todos los participantes
        const hasAnyData = Object.keys(joinMap).length > 0;
        let label;
        if (onlyPending) {
          label = "No hay usuarios pendientes de presentación en las últimas 24h.";
        } else if (!hasAnyData) {
          label = [
            `No hay datos de ingreso para los últimos ${days} día${days !== 1 ? "s" : ""}.`,
            `${config.emojis.info} _WhatsApp no reportó timestamps de ingreso para este grupo._`,
            `Tip: usa *${config.prefix}nuevos 30* para ampliar el rango, o el bot irá registrando nuevos ingresos automáticamente.`,
          ].join("\n");
        } else {
          label = `No hay nuevos miembros en los últimos ${days} día${days !== 1 ? "s" : ""}. Prueba con un número mayor, ej: *${config.prefix}nuevos 14*`;
        }
        return sock.sendMessage(from, {
          text: `${config.emojis.sparkles} ${label}`,
        }, { quoted: msg });
      }

      const mentions = entries.map(([jid]) => jid);

      // Mensaje personalizado
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
        const user = await db.getUser(jid);
        const name = (user?.name && user.name !== `+${num}`) ? user.name : null;
        lines.push(`${config.emojis.cherry} @${num}${name ? ` _(${name} · ${timeAgo(ts)})_` : ` _(${timeAgo(ts)})_`}`);
      }

      lines.push(
        "",
        divider(),
        `${config.emojis.fire} ¡Bienvenidos! Usa *${config.prefix}help* para ver todos los comandos.`,
        `✨ _AnimeBot by zerinho23_`
      );

      // Guardar en recentJoins los que venían de lb (para futuras consultas más rápidas)
      const updatedJoins = { ...recentJoins };
      let changed = false;
      for (const [jid, ts] of entries) {
        if (!updatedJoins[jid]) { updatedJoins[jid] = ts; changed = true; }
      }
      if (changed) await db.updateGroup(from, { recentJoins: updatedJoins });

      logger.info(`!nuevos: ${entries.length} miembro(s) en ${from.split("@")[0]} (${days}d)`);

      await sock.sendMessage(from, {
        text: lines.join("\n"),
        mentions,
      }, { quoted: msg });
    },
  };
  