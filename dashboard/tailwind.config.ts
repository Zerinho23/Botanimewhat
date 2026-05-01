/** @type {import('tailwindcss').Config} */
  export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          bg: '#030008',
          bg2: '#07000f',
          blue: '#00c8ff',
          blue2: '#0090cc',
          purple: '#9d4eff',
          green: '#00ff88',
          red: '#ff3355',
          gold: '#ffd700',
          amber: '#ffaa00',
          tx: '#c8e8ff',
          tx2: 'rgba(200,232,255,0.5)',
          tx3: 'rgba(200,232,255,0.25)',
          border: 'rgba(0,180,255,0.15)',
          surface: 'rgba(0,180,255,0.04)',
        },
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
          mono: ['Share Tech Mono', 'monospace'],
          display: ['Rajdhani', 'sans-serif'],
        },
        animation: {
          'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          'fade-in': 'fadeIn 0.2s ease-out',
          'slide-in': 'slideIn 0.2s ease-out',
        },
        keyframes: {
          fadeIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
          slideIn: { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'none' } },
        },
      },
    },
    plugins: [],
  }