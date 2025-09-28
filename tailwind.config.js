/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        card: "#111827",
        primary: "#4F46E5",
        text: "#E5E7EB",
        muted: "#9CA3AF",
        border: "#1F2937",
      },
    },
  },
  plugins: [],
};