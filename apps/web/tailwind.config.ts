import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-poppins)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#22C55E",
          dark: "#15803D",
        },
        secondary: {
          DEFAULT: "#2563EB",
          dark: "#1E40AF",
        },
        surface: "#F3F4F6",
        muted: "#9CA3AF",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #22C55E 0%, #2563EB 100%)",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
