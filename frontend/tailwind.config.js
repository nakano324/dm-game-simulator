/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./App.tsx",
    "./src/**/*.{js,jsx,ts,tsx,html}"
  ],
  safelist: [
    'animate-summon',
    'animate-aura',
    'animate-flash-fade'
  ],
  theme: {
    extend: {
      keyframes: {
        // ① カード登場＋回転＋着地＋揺れ
        summon: {
          '0%':   { transform: 'scale(0) rotate(-30deg)', opacity: '0' },
          '40%':  { transform: 'scale(1.5) rotate(10deg)', opacity: '1' },
          '60%':  { transform: 'scale(1) rotate(0deg)' },
          '75%':  { transform: 'translateX(-6px)' },
          '90%':  { transform: 'translateX(4px)' },
          '100%': { transform: 'translateX(0)' }
        },
        // ② 文明オーラ
        aura: {
          '0%':   { transform: 'scale(0)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' }
        },
        // ③ フラッシュフェード
        'flash-fade': {
          '0%':   { opacity: '1' },
          '100%': { opacity: '0' }
        }
      },
      animation: {
        'summon':     'summon 1.6s ease-out forwards',
        'aura':       'aura 0.6s ease-out forwards',
        'flash-fade': 'flash-fade 0.4s ease-out forwards'
      }
    }
  },
  plugins: []
};
