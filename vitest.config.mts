import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // `server-only` lança erro fora do ambiente react-server; nos testes ele é um módulo vazio.
      "server-only": new URL("./tests/support/empty-module.ts", import.meta.url).pathname,
    },
  },
  test: {
    // `pnpm test:coverage`: cobertura do projeto unit. O `lcov.info` alimenta a cobertura das
    // linhas novas no CI (scripts/cobertura-diff.mjs).
    coverage: {
      provider: "v8",
      // Com `include`, arquivos que nenhum teste importa também entram no relatório, com 0%.
      include: ["src/**/*.{ts,tsx}", "scripts/**/*.mjs"],
      exclude: ["src/lib/supabase/database.types.ts"],
      reporter: ["text-summary", "lcov"],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/support/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Contra o Supabase local: rede e banco reais, então sem paralelismo entre arquivos.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
    ],
  },
});
