import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    exclude: ["**/node_modules/**"],
    coverage: {
      provider: "v8",
      include: ["src/domains/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
