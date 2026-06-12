/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
        surface: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 700: '#1e293b', 800: '#1a1f2e', 900: '#0f172a', 950: '#0a0e1a' },
        score: { good: '#0cce6b', average: '#ffa400', poor: '#ff4e42' }
      }
    }
  },
  plugins: []
};
