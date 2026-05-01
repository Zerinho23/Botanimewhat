const fs = require("fs");
const path = require("path");
const { scheduleDbBackup } = require("../utils/dbBackup");

const DB_DIR = path.join(__dirname, "data");
const USERS_FILE   = path.join(DB_DIR, "users.json");
const GROUPS_FILE  = path.join(DB_DIR, "groups.json");
const WAIFUS_FILE  = path.join(DB_DIR, "waifus.json");
const PENDING_FILE = path.join(DB_DIR, "pending.json");

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

function load(file, defaultValue = {}) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(defaultValue, null, 2)); return defaultValue; }
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw || "{}");
  } catch (err) { console.error(`Error cargando ${file}:`, err.message); return defaultValue; }
}

function save(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); scheduleDbBackup(DB_DIR); }
  catch (err) { console.error(`Error guardando ${file}:`, err.message); }
}

let users   = load(USERS_FILE, {});
let groups  = load(GROUPS_FILE, {});
let waifus  = load(WAIFUS_FILE, {});
let pending = load(PENDING_FILE, {});

function reload() {
  users   = load(USERS_FILE, {});
  groups  = load(GROUPS_FILE, {});
  waifus  = load(WAIFUS_FILE, {});
  pending = load(PENDING_FILE, {});
}

// ── USUARIOS ──────────────────────────────────────────────────────────────────
function getUser(jid) {
  if (!users[jid]) {
    users[jid] = {
      jid,
      name: "",
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

// ── GRUPOS ────────────────────────────────────────────────────────────────────
function getGroup(jid) {
  if (!groups[jid]) {
    const now = Date.now();
    groups[jid] = {
      jid,
      name: "",
      antiSpam: true,
      antiLink: false,
      welcome: true,
      mutedUsers: [],
      warnings: {},
      messageLog: {},
      lastMessageAt: {},
      botJoinedAt: now,
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

function getAllUsers() { return Object.values(users); }

// ── WAIFUS ────────────────────────────────────────────────────────────────────
function getWaifuOwners() { return waifus; }

function assignWaifu(userJid, waifu) {
  const user = getUser(userJid);
  user.waifus.push(waifu);
  updateUser(userJid, { waifus: user.waifus });
}

// ── PENDIENTES ────────────────────────────────────────────────────────────────
const DEADLINE_MS = 24 * 60 * 60 * 1000;

function addPending(groupJid, userJid) {
  if (!pending[groupJid]) pending[groupJid] = {};
  const now = Date.now();
  pending[groupJid][userJid] = { joinedAt: now, deadline: now + DEADLINE_MS };
  save(PENDING_FILE, pending);
}

function removePending(groupJid, userJid) {
  if (!pending[groupJid]) return;
  delete pending[groupJid][userJid];
  if (Object.keys(pending[groupJid]).length === 0) delete pending[groupJid];
  save(PENDING_FILE, pending);
}

function isPending(groupJid, userJid) { return !!(pending[groupJid] && pending[groupJid][userJid]); }

function getExpiredPending() {
  const now = Date.now(), expired = [];
  for (const groupJid of Object.keys(pending)) {
    for (const userJid of Object.keys(pending[groupJid])) {
      if (pending[groupJid][userJid].deadline <= now) expired.push({ groupJid, userJid, deadline: pending[groupJid][userJid].deadline });
    }
  }
  return expired;
}

function removePendingBulk(entries) { for (const { groupJid, userJid } of entries) removePending(groupJid, userJid); }

module.exports = {
  getUser, updateUser, getGroup, updateGroup, getAllUsers,
  getWaifuOwners, assignWaifu, reload,
  addPending, removePending, isPending, getExpiredPending, removePendingBulk,
};
