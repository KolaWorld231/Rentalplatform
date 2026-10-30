import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // The real package throws when imported outside Next's bundler
      // (which is the whole point in app code); under Vitest it's a no-op.
      "server-only": path.resolve(__dirname, "tests/unit/__mocks__/server-only.ts"),
    },
  },
});
