import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        mono: ["Space Mono", "monospace"],
        jp: ["Noto Sans JP", "sans-serif"],
      },
      colors: {
        ink: "#1a1a2e",
        ink2: "#4a4a6a",
        ink3: "#9090a8",
        accent: "#534AB7",
        accent2: "#7F77DD",
        "accent-soft": "#EEEDFE",
        jade: "#1D9E75",
        "jade-soft": "#E1F5EE",
        coral: "#D85A30",
        "coral-soft": "#FAECE7",
      },
    },
  },
  plugins: [],
} satisfies Config;
