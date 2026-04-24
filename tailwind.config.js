/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sib: {
          primary: '#D2691E',
          primaryLight: '#E07A30',
          primaryDark: '#B85A18',
          secondary: '#D2691E',
          sand: '#F5F5F4',
          warm: '#F0F0EE',
          stone: '#DDDCDA',
          text: '#1A2223',
          muted: '#697073',
          ash: '#D0CFCC',
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
