/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#FAF9F6',
        darksurface: '#EDE8DC',
        darkborder: '#D4C9B0',
        primary: {
          DEFAULT: '#E8920A',
          hover: '#C97A08',
          light: '#E8920A',
        },
        accent: {
          DEFAULT: '#2D5016',
          hover: '#2D5016',
        },
        textPrimary: '#1C2B1A',
        textSecondary: '#5C6B3A',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
