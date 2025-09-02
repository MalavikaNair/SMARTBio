/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./outreach/*.html"],
  theme: {
    extend: {
      colors: {
        'primary': '#10b981',
        'primary-dark': '#047857',
        'dark-bg': '#1f1f1f',
        'card-bg': 'rgba(20, 20, 20, 0.7)',
        'light-text': '#f3f4f6',
        'medium-text': '#9ca3af'
      }
    }
  },
  plugins: []
}
