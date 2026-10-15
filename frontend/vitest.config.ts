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
      // components/ui and hooks hold the generated shadcn/ui components and
      // their hooks; NavLink is an unused scaffold and main.tsx only mounts App
      exclude: [
        "src/components/ui/**",
        "src/hooks/**",
        "src/components/NavLink.tsx",
        "src/main.tsx",
        // Type declarations only
        "src/lib/types.ts",
        "src/test/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
