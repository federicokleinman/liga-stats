import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        liga: {
          blue: '#1459b4',
          sky: '#72bcde',
          dark: '#0c1220',
          card: '#131d2e',
          border: '#1e3050',
        },
      },
    },
  },
  plugins: [],
};
export default config;
