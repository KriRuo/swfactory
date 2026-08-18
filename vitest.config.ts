import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "fixtures/*/test/**/*.test.ts"],
  },
});
