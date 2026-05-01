/** @type {import('tailwindcss').Config} */
  export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
      extend: {
        fontFamily: {
          orbitron: ["'Orbitron'", "sans-serif"],
          display:  ["'Rajdhani'", "sans-serif"],
          mono:     ["'Share Tech Mono'", "monospace"],
        },
        animation: {
          'fade-up': 'fadeUp 0.25s ease-out',
          'spin':    'spin 0.7s linear infinite',
        },
        keyframes: {
          fadeUp: { from:{opacity:'0',transform:'translateY(10px)'}, to:{opacity:'1',transform:'none'} },
          spin:   { to:{transform:'rotate(360deg)'} },
        },
      },
    },
    plugins: [],
  }