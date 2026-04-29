const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const BACKUP_REPO = process.env.AUTH_BACKUP_REPO || "whatsapp-bot-auth-backup";
const BACKUP_FILE = "auth-backup.enc";
const API_BASE = "https://api.github.com";

const HEADERS = TOKEN
  ? {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "whatsapp-anime-bot",
    }
  : null;

let cachedUsername = null;
let lastBackupSha = null;
let backupTimer = null;
let backupInProgress = false;

function deriveKey() {
  return crypto.createHash("sha256").update(TOKEN || "fallback-key").digest();
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decrypt(b64) {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

async function getUsername() {
  if (cachedUsername) return cachedUsername;
  const res = await fetch(`${API_BASE}/user`, { headers: HEADERS });
  if (!res.ok) throw new Error(`GitHub /user falló: ${res.status}`);
  cachedUsername = (await res.json()).login;
  return cachedUsername;
}

async function ensureRepoExists(user) {
  const check = await fetch(`${API_BASE}/repos/${user}/${BACKUP_REPO}`, { headers: HEADERS });
  if (check.ok) return true;
  if (check.status !== 404) throw new Error(`Verificación repo falló: ${check.status}`);
  logger.info(`Creando repo privado de respaldo: ${user}/${BACKUP_REPO}`);
  const create = await fetch(`${API_BASE}/user/repos`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      name: BACKUP_REPO,
      private: true,
      auto_init: true,
      description: "Backup encriptado de sesion de WhatsApp",
    }),
  });
  if (!create.ok) {
    const txt = await create.text();
    throw new Error(`No pude crear repo de respaldo (${create.status}): ${txt.slice(0, 150)}`);
  }
  return true;
}

async function fetchBackupMetadata(user) {
  const res = await fetch(
    `${API_BASE}/repos/${user}/${BACKUP_REPO}/contents/${BACKUP_FILE}`,
    { headers: HEADERS },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lectura backup falló: ${res.status}`);
  return await res.json();
}

async function restoreAuth(authDir) {
  if (!TOKEN) {
    logger.warn("Sin GITHUB_PERSONAL_ACCESS_TOKEN: no hay respaldo automático.");
    return false;
  }
  try {
    const user = await getUsername();
    const meta = await fetchBackupMetadata(user);
    if (!meta) {
      logger.info("Sin respaldo previo en GitHub. Comenzando desde cero.");
      return false;
    }
    const encryptedB64 = Buffer.from(meta.content, "base64").toString("utf8").trim();
    const json = decrypt(encryptedB64);
    const files = JSON.parse(json);
    fs.mkdirSync(authDir, { recursive: true });
    let count = 0;
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(authDir, name), content, "utf8");
      count++;
    }
    lastBackupSha = meta.sha;
    logger.success(`Sesión restaurada desde GitHub (${count} archivos).`);
    return true;
  } catch (err) {
    logger.error(`No pude restaurar sesión: ${err.message}`);
    return false;
  }
}

async function performBackup(authDir) {
  if (!TOKEN || backupInProgress) return;
  if (!fs.existsSync(authDir)) return;
  backupInProgress = true;
  try {
    const files = {};
    for (const name of fs.readdirSync(authDir)) {
      const full = path.join(authDir, name);
      if (fs.statSync(full).isFile()) {
        files[name] = fs.readFileSync(full, "utf8");
      }
    }
    if (Object.keys(files).length === 0) return;
    const user = await getUsername();
    await ensureRepoExists(user);
    if (lastBackupSha === null) {
      const meta = await fetchBackupMetadata(user);
      lastBackupSha = meta ? meta.sha : null;
    }
    const encrypted = encrypt(JSON.stringify(files));
    const contentB64 = Buffer.from(encrypted).toString("base64");
    const body = {
      message: `Auto-backup ${new Date().toISOString()}`,
      content: contentB64,
    };
    if (lastBackupSha) body.sha = lastBackupSha;
    const res = await fetch(
      `${API_BASE}/repos/${user}/${BACKUP_REPO}/contents/${BACKUP_FILE}`,
      { method: "PUT", headers: HEADERS, body: JSON.stringify(body) },
    );
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`PUT falló (${res.status}): ${txt.slice(0, 150)}`);
    }
    const data = await res.json();
    lastBackupSha = data.content.sha;
    logger.info(`💾 Sesión respaldada en GitHub (${Object.keys(files).length} archivos).`);
  } catch (err) {
    logger.error(`Error de respaldo: ${err.message}`);
  } finally {
    backupInProgress = false;
  }
}

function scheduleBackup(authDir) {
  if (!TOKEN) return;
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => performBackup(authDir), 8000);
}

module.exports = { restoreAuth, scheduleBackup, performBackup };
