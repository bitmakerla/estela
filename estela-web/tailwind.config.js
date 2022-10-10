/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        'estela': '#4D47C3',
        'button-hover': '#F6FAFD',
      },
    },
  },
  plugins: [],
}
