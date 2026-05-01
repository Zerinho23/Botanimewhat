# BotAnime Dashboard

  Panel de control moderno para **BotAnime** (WhatsApp + Baileys), construido con **React + Vite + Tailwind CSS**.

  ## Características

  - **Vista general** — Estado del bot, estadísticas, actividad en tiempo real
  - **Usuarios** — Tabla de ranking con niveles, XP y monedas
  - **Grupos** — Lista de grupos gestionados con sus configuraciones
  - **Moderación** — Historial de acciones de moderación
  - **Actividad** — Log en tiempo real vía SSE
  - **Configuración** — Edita el prefijo, nombre del bot y más
  - **Conexión** — Genera QR o código de emparejamiento

  ## Deploy en Vercel

  ### 1. Configura el bot con CORS

  El archivo `src/utils/webServer.js` ya incluye el middleware CORS. Asegúrate de hacer pull de los últimos cambios en tu bot.

  ### 2. Importa el proyecto en Vercel

  1. Ve a [vercel.com](https://vercel.com) → **New Project**
  2. Importa el repo `Zerinho23/Botanimewhat`
  3. En **Root Directory**, selecciona `dashboard`
  4. Framework: **Vite**

  ### 3. Variable de entorno

  En Vercel → Settings → Environment Variables:

  | Variable | Valor |
  |----------|-------|
  | `VITE_API_URL` | `https://tu-bot.railway.app` (URL pública del bot) |

  ### 4. Deploy

  ¡Haz click en **Deploy** y listo!

  ## Desarrollo local

  ```bash
  cd dashboard
  npm install
  cp .env.example .env
  # Edita .env con la URL de tu bot
  npm run dev
  ```

  ## Stack

  - React 18 + TypeScript
  - Vite 5
  - Tailwind CSS 3
  - React Router 6
  - Lucide React (iconos)
  - Recharts (gráficas)
  