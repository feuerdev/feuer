/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgba(216, 142, 6, 0.9)",
      },
      backgroundImage: {
        "login-cover": "url('../../public/img/login_bg.png')",
      },
      fontFamily: {
        "monospace": "monospace"
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      }
    },
  },
  plugins: [],
};
