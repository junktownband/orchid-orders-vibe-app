import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        orchid: "rgb(var(--color-orchid) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        coral: "rgb(var(--color-coral) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)"
      },
      boxShadow: {
        glass: "0 18px 48px rgba(0, 0, 0, 0.44), inset 0 1px 0 rgba(255, 255, 255, 0.105)",
        "inner-glass":
          "inset 0 1px 0 rgba(255, 255, 255, 0.095), inset 0 -1px 0 rgba(0, 0, 0, 0.28)",
        command: "0 10px 22px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.14)"
      }
    }
  },
  plugins: []
} satisfies Config;
