/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#10152D",
        indigoDeep: "#191D3B",
        purpleDark: "#292344",
        lavenderMist: "#8C8BA9",
        peach: "#F2B49E",
        coral: "#F28B83",
        gold: "#F2C879",
        forest: "#718D82",
        textPrimary: "#F5F2F0",
        textSecondary: "#AAA9BE",
      },
      fontFamily: {
        serif: ['"Playfair Display"', "serif"],
        sans: ['"Inter"', "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 10px 30px -10px rgba(0,0,0,0.5)",
        glow: "0 0 20px rgba(242,180,158,0.15)",
      },
    },
  },
  plugins: [],
};
