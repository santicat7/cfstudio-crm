/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // Semantic tokens (auto light/dark via CSS variables)
        page:    'var(--c-page)',
        card:    'var(--c-card)',
        subtle:  'var(--c-subtle)',
        line:    'var(--c-line)',
        strong:  'var(--c-strong)',
        body:    'var(--c-body)',
        soft:    'var(--c-soft)',
        muted:   'var(--c-muted)',
        faint:   'var(--c-faint)',
        dim:     'var(--c-dim)',
        ink:     'var(--c-ink)',
        inkh:    'var(--c-inkh)',
        dot:     'var(--c-dot)',
        golddk:  'var(--c-golddk)',
        gold:    '#C9A96E',
        // legacy
        surface: '#F5F0E8',
        cream:   '#F5F0E8',
        'gold-dk': '#8B6A35',
      },
    },
  },
  plugins: [],
}
