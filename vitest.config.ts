import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Project root, with a trailing slash (so the alias replacement is exact and
// does not accidentally match scoped packages like @anthropic-ai/sdk).
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: root }],
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/database.types.ts"],
    },
  },
});
