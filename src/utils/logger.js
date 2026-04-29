const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

function timestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function writeFile(level, message) {
  const date = new Date().toISOString().split("T")[0];
  const file = path.join(LOG_DIR, `${date}.log`);
  fs.appendFileSync(file, `[${timestamp()}] [${level}] ${message}\n`);
}

function log(level, color, message) {
  const ts = `${colors.gray}[${timestamp()}]${colors.reset}`;
  const tag = `${color}[${level}]${colors.reset}`;
  console.log(`${ts} ${tag} ${message}`);
  writeFile(level, message);
}

module.exports = {
  info: (msg) => log("INFO", colors.cyan, msg),
  success: (msg) => log("OK", colors.green, msg),
  warn: (msg) => log("WARN", colors.yellow, msg),
  error: (msg) => log("ERROR", colors.red, msg),
  debug: (msg) => log("DEBUG", colors.magenta, msg),
  command: (user, cmd, group) =>
    log("CMD", colors.blue, `${user} ejecutó "${cmd}" ${group ? `en ${group}` : "(privado)"}`),
};
