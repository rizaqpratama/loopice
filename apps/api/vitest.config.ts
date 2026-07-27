import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Integration tests share one Postgres instance and mutate real rows,
    // so they run sequentially rather than in parallel workers.
    fileParallelism: false,
  },
});
