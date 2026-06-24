import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101312",
        panel: "#171b19",
        orchid: "#9bb7ff",
        mint: "#7dd3c7",
        coral: "#fb7185",
        amber: "#f5c56b"
      },
      boxShadow: {
        glass:
          "0 18px 52px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        "inner-glass": "inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 0 rgba(0, 0, 0, 0.26)",
        command: "0 12px 28px rgba(125, 211, 199, 0.18)"
      }
    }
  },
  plugins: []
} satisfies Config;
