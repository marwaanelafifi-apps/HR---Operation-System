import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        ring: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%":       { transform: "rotate(18deg)" },
          "30%":       { transform: "rotate(-16deg)" },
          "45%":       { transform: "rotate(14deg)" },
          "60%":       { transform: "rotate(-10deg)" },
          "75%":       { transform: "rotate(6deg)" },
          "90%":       { transform: "rotate(-3deg)" },
        },
      },
      animation: {
        ring: "ring 0.5s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
