import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // json-summary feeds the coverage badges (see the CI workflow)
      reporter: ["json", "text-summary", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      // components/ui holds the generated shadcn/ui components
      exclude: ["src/components/ui/**", "src/test/**", "src/**/*.d.ts"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
