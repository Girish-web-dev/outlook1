import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        graphite: "#1a1b1f",
        mist: "#f6f7f9",
        line: "#e6e8ee",
        brand: "#2563eb",
        signal: "#0f9f6e",
        warning: "#b7791f"
      },
      boxShadow: {
        soft: "0 12px 40px rgba(17, 17, 17, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
