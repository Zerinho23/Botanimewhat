const config = require("../../config/config");
  const { isAdmin } = require("../../handlers/antiSpamHandler");

  module.exports = {
    name: "invocar",
    description: "Tagea a todos los integrantes del grupo (solo admins)",
    aliases: ["all", "todos", "llamar", "convocar"],
    async execute({ sock, msg, args, from, sender, isGroup }) {
      if (!isGroup) {
        return sock.sendMessage(from, {
          text: `${config.emojis.warning} Este comando solo funciona en grupos.`,
        }, { quoted: msg });
      }

      if (!(await isAdmin(sock, from, sender))) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} Solo los admins pueden usar este comando.`,
        }, { quoted: msg });
      }

      let metadata;
      try {
        metadata = await sock.groupMetadata(from);
      } catch (err) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} No pude obtener los miembros del grupo.`,
        }, { quoted: msg });
      }

      const participants = metadata.participants.map((p) => p.id);
      const customMsg = args.join(" ").trim();

      const lines = [
        `${config.emojis.fire} *¡ATENCIÓN, OTAKUS!* ${config.emojis.fire}`,
        `━━━━━━━━━━━━━━━━━━━━`,
      ];

      if (customMsg) {
        lines.push(`${config.emojis.sparkles} ${customMsg}`);
        lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      }

      lines.push(`${config.emojis.crown} *Grupo:* ${metadata.subject}`);
      lines.push(`${config.emojis.info} *Miembros convocados:* ${participants.length}`);
      lines.push(`━━━━━━━━━━━━━━━━━━━━`);
      lines.push("");

      for (const jid of participants) {
        lines.push(`• @${jid.split("@")[0]}`);
      }

      lines.push("");
      lines.push(`✨ _AnimeBot by zerinho23_`);

      await sock.sendMessage(from, {
        text: lines.join("\n"),
        mentions: participants,
      }, { quoted: msg });
    },
  };
  