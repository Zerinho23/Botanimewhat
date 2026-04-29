const api = require("../../utils/api");
const format = require("../../utils/format");
const config = require("../../config/config");
const { translate } = require("../../utils/translator");

module.exports = {
  name: "personaje",
  description: "Muestra info detallada de un personaje. Uso: !personaje [nombre]",
  aliases: ["character", "char"],
  async execute({ sock, msg, args, from }) {
    if (!args.length) {
      return sock.sendMessage(from, {
        text: `${config.emojis.warning} Debes indicar un nombre.\nEjemplo: *${config.prefix}personaje Naruto Uzumaki*`,
      }, { quoted: msg });
    }
    const name = args.join(" ");
    await sock.sendMessage(from, { text: `${config.emojis.sparkles} Buscando a *${name}*...` }, { quoted: msg });
    try {
      const character = await api.searchCharacter(name);
      if (!character) {
        return sock.sendMessage(from, {
          text: `${config.emojis.error} No encontré ningún personaje con el nombre *${name}*.`,
        }, { quoted: msg });
      }
      if (character.about) {
        character.about = await translate(character.about);
      }
      const caption = format.formatCharacter(character);
      const image = character.images?.jpg?.image_url;
      if (image) {
        await sock.sendMessage(from, { image: { url: image }, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: msg });
      }
    } catch {
      await sock.sendMessage(from, {
        text: `${config.emojis.error} Error al buscar el personaje.`,
      }, { quoted: msg });
    }
  },
};
