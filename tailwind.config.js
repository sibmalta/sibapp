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
    },
  },
  plugins: [],
}
