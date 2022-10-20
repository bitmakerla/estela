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
        'silver': '#6C757D',
        'metal': '#FBFCFD',
        'button-hover': '#F6FAFD',
      },
    },
  },
  plugins: [],
}
