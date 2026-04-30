// Respaldo encriptado de la base de datos local (users.json, groups.json, waifus.json)
// en el mismo repositorio de GitHub que ya usa authBackup.js. Necesario porque el
// sistema de archivos de Railway es efímero y se borra en cada redeploy/reinicio,
// haciendo que los niveles, monedas y demás progreso de los usuarios se reinicien.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const BACKUP_REPO = process.env.AUTH_BACKUP_REPO || "whatsapp-bot-auth-backup";
const BACKUP_FILE = "db-backup.enc";
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
const DEBOUNCE_MS = 8000;

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
      description: "Backup encriptado de sesion y datos de WhatsApp bot",
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
  if (!res.ok) throw new Error(`Lectura DB backup falló: ${res.status}`);
  return await res.json();
}

async function restoreDatabase(dbDataDir) {
  if (!TOKEN) {
    logger.warn("Sin GITHUB_PERSONAL_ACCESS_TOKEN: la DB no se respalda en GitHub.");
    return false;
  }
  try {
    const user = await getUsername();
    const meta = await fetchBackupMetadata(user);
    if (!meta) {
      logger.info("Sin respaldo previo de DB en GitHub. Comenzando desde cero.");
      return false;
    }
    const encryptedB64 = Buffer.from(meta.content, "base64").toString("utf8").trim();
    const json = decrypt(encryptedB64);
    const files = JSON.parse(json);
    fs.mkdirSync(dbDataDir, { recursive: true });
    let count = 0;
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dbDataDir, name), content, "utf8");
      count++;
    }
    lastBackupSha = meta.sha;
    logger.success(`Base de datos restaurada desde GitHub (${count} archivos).`);
    return true;
  } catch (err) {
    logger.error(`No pude restaurar la DB: ${err.message}`);
    return false;
  }
}

async function uploadBackup(user, body, allowRetry = true) {
  const res = await fetch(
    `${API_BASE}/repos/${user}/${BACKUP_REPO}/contents/${BACKUP_FILE}`,
    { method: "PUT", headers: HEADERS, body: JSON.stringify(body) },
  );
  if (res.ok) return await res.json();
  const txt = await res.text();
  if ((res.status === 409 || res.status === 422) && allowRetry) {
    logger.warn(`Conflicto en DB backup (${res.status}). Refrescando sha y reintentando...`);
    const meta = await fetchBackupMetadata(user);
    const newBody = { ...body };
    if (meta) newBody.sha = meta.sha;
    else delete newBody.sha;
    return uploadBackup(user, newBody, false);
  }
  throw new Error(`PUT DB falló (${res.status}): ${txt.slice(0, 150)}`);
}

async function performDbBackup(dbDataDir) {
  if (!TOKEN || backupInProgress) return;
  if (!fs.existsSync(dbDataDir)) return;
  backupInProgress = true;
  try {
    const files = {};
    for (const name of fs.readdirSync(dbDataDir)) {
      const full = path.join(dbDataDir, name);
      if (fs.statSync(full).isFile() && name.endsWith(".json")) {
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
      message: `DB auto-backup ${new Date().toISOString()}`,
      content: contentB64,
    };
    if (lastBackupSha) body.sha = lastBackupSha;
    const data = await uploadBackup(user, body);
    lastBackupSha = data.content.sha;
    logger.info(`💾 DB respaldada en GitHub (${Object.keys(files).length} archivos).`);
  } catch (err) {
    logger.error(`Error de respaldo DB: ${err.message}`);
  } finally {
    backupInProgress = false;
  }
}

// Debounce: agrupa múltiples cambios en un solo backup tras DEBOUNCE_MS de calma.
function scheduleDbBackup(dbDataDir) {
  if (!TOKEN) return;
  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    backupTimer = null;
    performDbBackup(dbDataDir);
  }, DEBOUNCE_MS);
}

module.exports = { restoreDatabase, scheduleDbBackup, performDbBackup };
