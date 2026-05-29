/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        surface: '#F5F0E8',
        ink: '#1A1814',
        cream: '#F5F0E8',
        gold: '#C9A96E',
        'gold-dk': '#8B6A35',
      },
    },
  },
  plugins: [],
}
