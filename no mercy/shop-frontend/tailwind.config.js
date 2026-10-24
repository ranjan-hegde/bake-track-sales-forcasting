/** @type {import('tailwindcss').Config} */
export default {
   content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        sage: {
          50: '#f2fcf5',
          100: '#e1f7e7',
          200: '#c3ebd0',
          300: '#94d6ad',
          400: '#5dbb83',
          500: '#389e63',
          600: '#287f4d',
          700: '#236540',
          800: '#1f5035',
          900: '#1a422d',
        },
        terracotta: {
          500: '#e07a5f',
          600: '#d16042',
        }
      },
      fontFamily: {
        sans: ['Lato', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [],
}

