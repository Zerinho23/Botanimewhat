# 🌸 AnimeBot — Bot de WhatsApp para Otakus 🌸

Bot avanzado de WhatsApp enfocado en anime, desarrollado en **Node.js** con la librería **Baileys**.
Funciona en grupos y chats privados, con sistema modular de comandos, niveles, economía,
moderación, anti-spam y conexión a APIs públicas de anime (Jikan / Waifu.pics).

---

## ✨ Funcionalidades

- ✅ Sistema de comandos con prefijo configurable (por defecto `!`)
- ✅ Comandos de anime: `!anime`, `!top`, `!personaje`, `!waifu`, `!opening`, `!buscar`
- ✅ Integración con **Jikan API** (MyAnimeList) y **Waifu.pics**
- ✅ Envío automático de imágenes (waifus, personajes, escenas)
- ✅ Sistema de **niveles y XP** por interacción en grupo
- ✅ Sistema de **economía** con monedas, daily reward y tienda de waifus
- ✅ Base de datos en **JSON** (sin dependencias extra) — fácil de migrar a Mongo
- ✅ Comandos de administración: `!ban`, `!kick`, `!mute`, `!antilink`
- ✅ Eliminación automática de **spam** y **enlaces no permitidos**
- ✅ Mensajes con formato bonito, emojis y estilo otaku
- ✅ Sistema de **logs** con archivos por día
- ✅ Estructura modular y escalable

---

## 📁 Estructura del proyecto

```
whatsapp-anime-bot/
├── src/
│   ├── index.js                  # Punto de entrada
│   ├── config/
│   │   └── config.js             # Prefijo, emojis, APIs, economía
│   ├── commands/                 # Comandos modulares
│   │   ├── anime/                # !anime, !top, !personaje, !waifu, !opening, !buscar
│   │   ├── user/                 # !help, !perfil, !rank
│   │   ├── economy/              # !daily, !coins, !comprarwaifu
│   │   └── admin/                # !ban, !kick, !mute, !antilink
│   ├── events/
│   │   ├── connection.js         # Manejo de conexión y QR
│   │   └── groupEvents.js        # Bienvenidas y despedidas
│   ├── handlers/
│   │   ├── commandHandler.js     # Carga dinámica de comandos
│   │   ├── messageHandler.js     # Procesa cada mensaje entrante
│   │   └── antiSpamHandler.js    # Anti-spam y anti-link
│   ├── database/
│   │   ├── db.js                 # CRUD de usuarios y grupos
│   │   └── data/                 # users.json, groups.json (auto)
│   └── utils/
│       ├── api.js                # Conexión a Jikan / Waifu APIs
│       ├── format.js             # Formato bonito de mensajes
│       └── logger.js             # Logs por consola y archivo
├── auth/                         # Sesión WhatsApp (auto, NO subir a git)
├── logs/                         # Archivos de log diarios (auto)
├── package.json
└── README.md
```

---

## 🚀 Instalación paso a paso

### 1. Requisitos previos

- **Node.js 18 o superior** (recomendado 20+)
- npm o pnpm
- Un teléfono con WhatsApp activo para escanear el QR

### 2. Clonar / copiar la carpeta

```bash
cd whatsapp-anime-bot
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar el bot

Edita `src/config/config.js` y cambia:

- `prefix` → tu prefijo preferido (ej: `!`, `.`, `/`)
- `ownerNumber` → tu número de WhatsApp (formato internacional sin `+`)
- `economy.enabled` → activa/desactiva el sistema de monedas

### 5. Ejecutar el bot

```bash
npm start
```

La primera vez aparecerá un **código QR** en la terminal. Escanéalo desde:
*WhatsApp → Configuración → Dispositivos vinculados → Vincular un dispositivo*.

La sesión se guarda en `/auth` para que no tengas que escanear de nuevo.

---

## 📜 Lista de comandos

### 🎌 Anime
| Comando | Descripción |
|--------|-------------|
| `!anime` | Recomienda un anime aleatorio con info y portada |
| `!top [n]` | Top de animes populares (n: 1-25) |
| `!personaje [nombre]` | Información detallada de un personaje |
| `!waifu` | Asigna una waifu aleatoria |
| `!opening` | Recomienda un opening de anime |
| `!buscar [nombre]` | Busca animes por nombre |

### 👤 Usuario
| Comando | Descripción |
|--------|-------------|
| `!help` | Menú completo de comandos |
| `!perfil` | Tu perfil con nivel, XP y monedas |
| `!rank` | Top 10 de usuarios con más nivel |

### 🪙 Economía
| Comando | Descripción |
|--------|-------------|
| `!daily` | Recompensa diaria de monedas |
| `!coins` | Tu saldo actual |
| `!comprarwaifu` | Compra una waifu premium |

### 🛡️ Administración (solo admins de grupo)
| Comando | Descripción |
|--------|-------------|
| `!ban @usuario` | Banea/expulsa al usuario |
| `!kick @usuario` | Expulsa al usuario |
| `!mute @usuario` | Silencia (borra sus mensajes) — toggle |
| `!antilink on/off` | Activa o desactiva el filtro de enlaces |

---

## 🌐 Despliegue en VPS / Hosting

### Opción A — VPS Linux (Ubuntu / Debian)

```bash
# 1. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

# 2. Clonar el bot
git clone <tu-repo> bot
cd bot/whatsapp-anime-bot

# 3. Instalar
npm install

# 4. Ejecutar con PM2 (mantiene el bot vivo 24/7)
sudo npm i -g pm2
pm2 start src/index.js --name animebot
pm2 logs animebot          # ver QR y logs
pm2 save
pm2 startup                # auto-arranque al reiniciar
```

### Opción B — Termux (Android)

```bash
pkg update && pkg upgrade
pkg install nodejs git
git clone <tu-repo>
cd whatsapp-anime-bot
npm install
npm start
```

### Opción C — Railway / Render / Fly.io

1. Sube el código a GitHub.
2. Conéctalo a la plataforma.
3. Comando de inicio: `node src/index.js`
4. **Importante:** debes tener acceso a los logs para escanear el QR la primera vez.
5. Persistencia: monta un volumen para `/auth` y `/src/database/data` para no perder sesión y datos.

---

## 🧩 Cómo agregar comandos nuevos

Crea un archivo dentro de `src/commands/<categoria>/` (ej: `src/commands/anime/manga.js`):

```js
module.exports = {
  name: "manga",
  description: "Busca un manga",
  aliases: ["m"],
  async execute({ sock, msg, args, from, sender, isGroup }) {
    await sock.sendMessage(from, { text: "Hola desde el comando manga" }, { quoted: msg });
  },
};
```

¡Reinicia el bot y listo! Se carga automáticamente.

---

## 📦 Migrar a MongoDB (opcional)

Sustituye `src/database/db.js` por una capa con `mongoose`:

```bash
npm install mongoose
```

Mantén las mismas funciones (`getUser`, `updateUser`, `getGroup`, etc.) para no tocar el resto del código.

---

## ⚠️ Notas importantes

- **No subas la carpeta `/auth` a Git** (ya está en `.gitignore`). Contiene tu sesión de WhatsApp.
- Usa el bot de forma responsable — WhatsApp puede banear cuentas que envíen spam masivo.
- Las APIs públicas (Jikan) tienen límites de rate — el bot ya maneja errores básicos.
- Para alto volumen, considera cachear respuestas con Redis.

---

## 📄 Licencia

MIT — úsalo, modifícalo y compártelo libremente.

🌸 *Hecho con amor para la comunidad otaku* 🌸
