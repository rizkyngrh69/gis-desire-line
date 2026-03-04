/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0f1117",
        panel: "#1a1d2e",
        border: "#2a2d3e",
        accent: "#6366f1",
        "accent-hover": "#4f52d8",
        muted: "#8b8fa8",
        danger: "#ef4444",
      },
    },
  },
  plugins: [],
};
