/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Inter'", "sans-serif"],
      },
      colors: {
        bg: "#0a0a0f",
        surface: "#111118",
        border: "#1e1e2e",
        accent: "#7c6af7",
        "accent-dim": "#4a4180",
        safe: "#22c55e",
        risky: "#f59e0b",
        hallucinated: "#ef4444",
        muted: "#4a4a6a",
        text: "#e2e2f0",
        "text-dim": "#8888aa",
      },
    },
  },
  plugins: [],
};
