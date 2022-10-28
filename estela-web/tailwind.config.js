/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      fontFamily:{
        courier: ['courier']
      },
      colors: {
        'estela': '#4D47C3',
        'silver': '#6C757D',
        'metal': '#FBFCFD',
        'button-hover': '#F6FAFD',
        'links': '#4D47C3',
        'back-code': '#33525F',
        'estela-blue-low': '#F6FAFD', 
        'estela-black-low': '#9BA2A8',
        'estela-black-medium': '#6C757D',
        'estela-black-full': '#212529',
        'estela-white-medium': '#F9F9F9',
        'estela-green': '#32C3A4',
        'estela-yellow': '#D1A34F',
        'estela-red-full' : '#E34A46',
      },
    },
  },
  plugins: [],
}
