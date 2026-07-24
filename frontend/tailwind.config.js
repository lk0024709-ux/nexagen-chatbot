/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#090a0f',
        darkCard: 'rgba(17, 18, 27, 0.75)',
        neonCyan: '#00f2fe',
        neonPurple: '#9d4edd',
        neonPink: '#ff007f',
        accentGold: '#ffd166',
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 242, 254, 0.4)',
        'neon-purple': '0 0 15px rgba(157, 78, 221, 0.4)',
        'neon-pink': '0 0 15px rgba(255, 0, 127, 0.4)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
