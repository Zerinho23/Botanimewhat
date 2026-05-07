'use strict';
const { Pool } = require('pg');

let logger;
try { logger = require('../utils/logger'); } catch (_) { logger = { info: console.log, error: console.error, warn: console.warn }; }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  logger.error(`PostgreSQL pool error: ${err.message}`);
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      jid TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS groups (
      jid TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pending (
      group_jid TEXT NOT NULL,
      user_jid  TEXT NOT NULL,
      joined_at BIGINT NOT NULL,
      deadline  BIGINT NOT NULL,
      PRIMARY KEY (group_jid, user_jid)
    );
  `);
  logger.info('✓ PostgreSQL: tablas inicializadas');
}

// ── USUARIOS ─────────────────────────────────────────────────────────────────

function defaultUser(jid) {
  return {
    jid, name: '', xp: 0, level: 1, coins: 0,
    messages: 0, commands: 0, waifus: [], lastDaily: 0, createdAt: Date.now(),
  };
}

async function getUser(jid) {
  const { rows } = await pool.query('SELECT data FROM users WHERE jid = $1', [jid]);
  if (rows.length) return rows[0].data;
  const u = defaultUser(jid);
  await pool.query(
    'INSERT INTO users (jid, data) VALUES ($1, $2) ON CONFLICT (jid) DO NOTHING',
    [jid, u]
  );
  return u;
}

async function updateUser(jid, patch) {
  const current = await getUser(jid);
  const updated = { ...current, ...patch };
  await pool.query(
    'INSERT INTO users (jid, data) VALUES ($1, $2) ON CONFLICT (jid) DO UPDATE SET data = EXCLUDED.data',
    [jid, updated]
  );
  return updated;
}

async function getAllUsers() {
  const { rows } = await pool.query("SELECT data FROM users ORDER BY (data->>'xp')::int DESC NULLS LAST");
  return rows.map(r => r.data);
}

// ── GRUPOS ───────────────────────────────────────────────────────────────────

function defaultGroup(jid) {
  const now = Date.now();
  return {
    jid, name: '', antiSpam: true, antiLink: false, welcome: true, botEnabled: true,
    mutedUsers: [], warnings: {}, messageLog: {}, lastMessageAt: {}, stickerLog: {},
    recentJoins: {}, botJoinedAt: now, lastPurga: null, createdAt: now,
  };
}

async function getGroup(jid) {
  const { rows } = await pool.query('SELECT data FROM groups WHERE jid = $1', [jid]);
  if (rows.length) return rows[0].data;
  const g = defaultGroup(jid);
  await pool.query(
    'INSERT INTO groups (jid, data) VALUES ($1, $2) ON CONFLICT (jid) DO NOTHING',
    [jid, g]
  );
  return g;
}

async function updateGroup(jid, patch) {
  const current = await getGroup(jid);
  const updated = { ...current, ...patch };
  await pool.query(
    'INSERT INTO groups (jid, data) VALUES ($1, $2) ON CONFLICT (jid) DO UPDATE SET data = EXCLUDED.data',
    [jid, updated]
  );
  return updated;
}

async function deleteGroup(jid) {
  await pool.query('DELETE FROM groups WHERE jid = $1', [jid]);
}

async function getAllGroups() {
  const { rows } = await pool.query('SELECT data FROM groups');
  return rows.map(r => r.data);
}

// ── WAIFUS ───────────────────────────────────────────────────────────────────

async function getWaifuOwners() {
  const { rows } = await pool.query(
    "SELECT data FROM users WHERE jsonb_array_length(data->'waifus') > 0"
  );
  return rows.map(r => ({ jid: r.data.jid, waifus: r.data.waifus }));
}

async function assignWaifu(userJid, waifu) {
  const user = await getUser(userJid);
  const waifus = user.waifus || [];
  waifus.push(waifu);
  return updateUser(userJid, { waifus });
}

// ── PENDIENTES ───────────────────────────────────────────────────────────────

async function addPending(groupJid, userJid) {
  const joinedAt = Date.now();
  const deadline = joinedAt + 24 * 60 * 60 * 1000;
  await pool.query(
    'INSERT INTO pending (group_jid, user_jid, joined_at, deadline) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
    [groupJid, userJid, joinedAt, deadline]
  );
}

async function removePending(groupJid, userJid) {
  await pool.query('DELETE FROM pending WHERE group_jid = $1 AND user_jid = $2', [groupJid, userJid]);
}

async function isPending(groupJid, userJid) {
  const { rows } = await pool.query(
    'SELECT 1 FROM pending WHERE group_jid = $1 AND user_jid = $2',
    [groupJid, userJid]
  );
  return rows.length > 0;
}

async function getExpiredPending() {
  const { rows } = await pool.query(
    'SELECT group_jid, user_jid FROM pending WHERE deadline <= $1',
    [Date.now()]
  );
  return rows.map(r => ({ groupJid: r.group_jid, userJid: r.user_jid }));
}

async function removePendingBulk(entries) {
  for (const { groupJid, userJid } of entries) {
    await removePending(groupJid, userJid);
  }
}

// ── No-op para compatibilidad ─────────────────────────────────────────────────
function reload() {}

module.exports = {
  initDB, pool,
  getUser, updateUser, getAllUsers,
  getGroup, updateGroup, deleteGroup, getAllGroups,
  getWaifuOwners, assignWaifu,
  addPending, removePending, isPending, getExpiredPending, removePendingBulk,
  reload,
};
