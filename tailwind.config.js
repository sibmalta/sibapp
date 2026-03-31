/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sib: {
          primary: '#B59A1B',
          primaryLight: '#CDAF2E',
          primaryDark: '#8A7514',
          secondary: '#C2553E',
          sand: '#FAFAF9',
          warm: '#F3F1EC',
          stone: '#E4E1D8',
          text: '#1A2223',
          muted: '#697073',
          mustard: '#B59A1B',
        },
      },
      fontFamily: {
        sans: ['Quicksand', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
