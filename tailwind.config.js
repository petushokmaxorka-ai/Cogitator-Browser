/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        void: '#000000',
        iron: {
          dark: '#1E1E1E',
          DEFAULT: '#2A2A2A',
          light: '#3A3A3A',
        },
        omnissiah: {
          red: '#8B0000',
          dim: '#5C0000',
        },
        gold: {
          cogitator: '#c8a86e',
          dim: '#8a7048',
          bright: '#e8c87e',
        },
        noosphere: {
          cyan: '#33ff00',
          dim: '#1a3a1a',
        },
        parchment: {
          DEFAULT: '#c8a86e',
          dim: '#8a7048',
        },
        sacred: '#e8c87e',
      },
      fontFamily: {
        mono: ['Courier New', 'Consolas', 'monospace'],
        display: ['Courier New', 'monospace'],
      },
      boxShadow: {
        'glow-red': '0 0 10px rgba(139, 0, 0, 0.4), 0 0 20px rgba(139, 0, 0, 0.2)',
        'glow-cyan': '0 0 10px rgba(51, 255, 0, 0.35), 0 0 20px rgba(51, 255, 0, 0.15)',
        'glow-gold': '0 0 10px rgba(200, 168, 110, 0.4), 0 0 20px rgba(200, 168, 110, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 4s linear infinite',
        'scan': 'scan 8s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.98' },
          '52%': { opacity: '1' },
          '55%': { opacity: '0.97' },
          '56%': { opacity: '1' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
}
