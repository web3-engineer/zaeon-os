import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'
// As SKINS do laboratório (lib/skins): cyan/sky/blue e três fundos escuros leem variáveis CSS; o valor padrão
// é a cor de sempre, e `[data-skin="…"]` (posto no <html> só dentro do laboratório) troca o matiz.
import { coresDoTailwind, cssBaseDasSkins } from './lib/skins/variaveis'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // lib/ também guarda classes (lib/canal/vidro.ts, lib/rooms/temas.ts): sem isto o Tailwind não as gera
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space)", "sans-serif"],
        mono: ["var(--font-code)", "monospace"],
        tech: ["var(--font-tech)", "var(--font-space)", "sans-serif"],
        display: ["var(--font-display)", "var(--font-space)", "sans-serif"],
        // letra à mão dos blocos de papel (components/trechos)
        mao: ["var(--font-mao)", "Caveat", "'Segoe Script'", "cursive"],
      },
      colors: {
        // #870: em canais RGB pra a transparência funcionar (bg-background/80 na barra de cima); sem "/N" é a cor cheia
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--foreground-rgb) / <alpha-value>)",
        ...coresDoTailwind(),
      },
    },
  },
  plugins: [plugin(({ addBase }) => addBase(cssBaseDasSkins()))],
}
export default config