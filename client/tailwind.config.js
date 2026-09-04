/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#dbe6ff', 200: '#bccfff', 300: '#8eabff',
          400: '#597dff', 500: '#3355ff', 600: '#1f36f5', 700: '#1929d8',
          800: '#1b26af', 900: '#1d288a', 950: '#141a52'
        },
        ink: {
          900: '#0a0f1f', 800: '#0f1730', 700: '#16203f', 600: '#1e2b4f'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif']
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(51,85,255,0.45)'
      }
    }
  },
  plugins: []
};
