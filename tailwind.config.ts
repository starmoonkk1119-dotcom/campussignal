import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#0F1D33",
        status: {
          eligible: {
            background: "#DCFCE7",
            foreground: "#166534",
            ring: "#86EFAC",
          },
          "not-eligible": {
            background: "#FEE2E2",
            foreground: "#B91C1C",
            ring: "#FCA5A5",
          },
          "needs-verification": {
            background: "#FEF3C7",
            foreground: "#B45309",
            ring: "#FCD34D",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
