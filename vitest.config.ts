import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // tsconfig usa jsx:"preserve" (o Next compila); no teste quem compila é o esbuild.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    // .test.tsx = testes de UI (jsdom, declarado por arquivo com `// @vitest-environment jsdom`).
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "infra/**/*.test.ts", "lib/**/*.test.tsx", "app/**/*.test.tsx", "components/**/*.test.tsx"],
    environment: "node",
    // Cobertura (npm run test:coverage) escopada ao que é NOVO — o legado sem teste não
    // pode diluir nem bloquear o portão das unidades novas.
    coverage: {
      provider: "v8",
      include: ["lib/cartolina/**/*.ts", "lib/harness/caderno/**/*.ts", "lib/ui/globo.ts", "lib/agent/runChatTurn.ts", "lib/agent/chat-turn-wire.ts", "lib/queue/chat.ts", "lib/queue/chat-worker.ts", "lib/queue/reaper.ts", "lib/chat/turnoRetomavel.ts", "lib/agent/chat-turn-tail.ts", "lib/agent/chat-turn-store.ts", "lib/chat/auraClient.ts", "lib/chat/useAuraChat.ts", "lib/chat/useScholar.ts", "lib/scholar/scholarClient.ts", "lib/studio/studioClient.ts", "lib/ui/useIsMobile.ts", "lib/ui/mobilePref.ts", "components/mobile/**/*.tsx", "components/lounge/CartolinaComentarios.tsx", "components/lounge/useCartolinaCowork.ts"],
      exclude: ["**/*.test.*"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
