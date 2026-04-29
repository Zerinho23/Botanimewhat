const config = require("../../config/config");
const format = require("../../utils/format");
const { getAllCommands } = require("../../handlers/commandHandler");

module.exports = {
  name: "help",
  description: "Muestra el menú de comandos",
  aliases: ["menu", "ayuda", "comandos"],
  async execute({ sock, msg, from }) {
    const commands = getAllCommands();
    const text = format.formatHelp(config.prefix, commands);
    await sock.sendMessage(from, { text }, { quoted: msg });
  },
};
