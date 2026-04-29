const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const commands = new Map();

function loadCommands() {
  commands.clear();
  const commandsDir = path.join(__dirname, "..", "commands");
  const categories = fs.readdirSync(commandsDir);

  for (const category of categories) {
    const catPath = path.join(commandsDir, category);
    if (!fs.statSync(catPath).isDirectory()) continue;
    const files = fs.readdirSync(catPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      try {
        const command = require(path.join(catPath, file));
        if (!command.name || !command.execute) continue;
        command.category = category;
        commands.set(command.name, command);
        if (command.aliases) {
          for (const alias of command.aliases) commands.set(alias, command);
        }
      } catch (err) {
        logger.error(`Error cargando comando ${file}: ${err.message}`);
      }
    }
  }

  const unique = new Set([...commands.values()].map((c) => c.name));
  logger.success(`${unique.size} comandos cargados`);
}

function getCommand(name) {
  return commands.get(name?.toLowerCase());
}

function getAllCommands() {
  return [...new Set(commands.values())];
}

module.exports = { loadCommands, getCommand, getAllCommands };
