/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        spark: {
          50:  '#fff5f5',
          100: '#ffe0e0',
          200: '#ffb3b3',
          300: '#ff8080',
          400: '#ff4d4d',
          500: '#E2001A',
          600: '#C4001A',
          700: '#A30016',
          800: '#7A0010',
          900: '#52000B',
        },
      },
      fontFamily: {
        sans: [
          'Source Sans 3',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
