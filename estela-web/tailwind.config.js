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
        'estela-white-medium': '#F9F9F9',
        'links': '#4D47C3',
        'back-code': '#33525F',
        'estela-blue-full': '#4D47C3',
        'estela-blue-low': '#F6FAFD',
        'estela-blue-medium': '#3C7BC6',
        'estela-black-low': '#9BA2A8',
        'estela-black-medium': '#6C757D',
        'estela-black-full': '#212529',
        'estela-white-low': '#F1F1F1',
        'estela-green': '#32C3A4',
        'estela-green-full': '#489019',
        'estela-states-green-medium': '#7DC932',
        'estela-yellow': '#D1A34F',
        'estela-red-full' : '#E34A46',
        'estela-red-low' : '#FFF5F2',
      },
    },
  },
  plugins: [],
}
