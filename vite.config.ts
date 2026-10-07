// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// The bundler's server runtime helper calls createRequire(import.meta.url) at load time.
// On the edge worker import.meta.url is undefined, which crashes every request (HTTP 500).
// Give it a safe fallback in server output only.
const safeImportMetaUrl = {
  name: "safe-import-meta-url",
  apply: "build" as const,
  renderChunk(code: string) {
    if (!code.includes("import.meta.url)")) return null;
    return { code: code.replace(/import\.meta\.url\)/g, 'import.meta.url||"file:///")'), map: null };
  },
  applyToEnvironment(env: { name: string }) {
    return env.name !== "client";
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [safeImportMetaUrl],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/encode.js"),
        entities: path.resolve(__dirname, "node_modules/entities"),
      },
    },
  },
});
