import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // ... dentro do seu tailwind.config.ts
  theme: {
    extend: {
      fontFamily: {
        // Mapeia a classe 'font-sans' para a Space Grotesk
        sans: ["var(--font-space)", "sans-serif"],
        // Mapeia a classe 'font-mono' para a JetBrains Mono
        mono: ["var(--font-code)", "monospace"],
      },
      // ...
    },
  },
// ...
  plugins: [],
}
export default config
