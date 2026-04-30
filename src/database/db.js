const fs = require("fs");
const path = require("path");
const { scheduleDbBackup } = require("../utils/dbBackup");

const DB_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DB_DIR, "users.json");
const GROUPS_FILE = path.join(DB_DIR, "groups.json");
const WAIFUS_FILE = path.join(DB_DIR, "waifus.json");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function load(file, defaultValue = {}) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw || "{}");
  } catch (err) {
    console.error(`Error cargando ${file}:`, err.message);
    return defaultValue;
  }
}

function save(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    // Programa un respaldo en GitHub (debounced) para que sobreviva a reinicios de Railway
    scheduleDbBackup(DB_DIR);
  } catch (err) {
    console.error(`Error guardando ${file}:`, err.message);
  }
}

let users = load(USERS_FILE, {});
let groups = load(GROUPS_FILE, {});
let waifus = load(WAIFUS_FILE, {});

// Recarga los datos desde disco. Útil después de restaurar archivos desde el backup remoto.
function reload() {
  users = load(USERS_FILE, {});
  groups = load(GROUPS_FILE, {});
  waifus = load(WAIFUS_FILE, {});
}

function getUser(jid) {
  if (!users[jid]) {
    users[jid] = {
      jid,
      xp: 0,
      level: 1,
      coins: 0,
      messages: 0,
      commands: 0,
      waifus: [],
      lastDaily: 0,
      createdAt: Date.now(),
    };
    save(USERS_FILE, users);
  }
  return users[jid];
}

function updateUser(jid, data) {
  users[jid] = { ...getUser(jid), ...data };
  save(USERS_FILE, users);
  return users[jid];
}

function getGroup(jid) {
  if (!groups[jid]) {
    const now = Date.now();
    groups[jid] = {
      jid,
      name: "",
      antiSpam: true,   // antispam activo por defecto
      antiLink: false,  // antilink desactivado por defecto; el admin lo activa con !antilink on
      welcome: true,
      mutedUsers: [],
      warnings: {},
      messageLog: {},
      lastMessageAt: {},
      botJoinedAt: now, // cuándo el bot empezó a observar este grupo (para !purga / !fantasmas)
      createdAt: now,
    };
    save(GROUPS_FILE, groups);
  }
  return groups[jid];
}

function updateGroup(jid, data) {
  groups[jid] = { ...getGroup(jid), ...data };
  save(GROUPS_FILE, groups);
  return groups[jid];
}

function getAllUsers() {
  return Object.values(users);
}

function getWaifuOwners() {
  return waifus;
}

function assignWaifu(userJid, waifu) {
  const user = getUser(userJid);
  user.waifus.push(waifu);
  updateUser(userJid, { waifus: user.waifus });
}

module.exports = {
  getUser,
  updateUser,
  getGroup,
  updateGroup,
  getAllUsers,
  getWaifuOwners,
  assignWaifu,
  reload,
};
