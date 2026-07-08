// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    build: {
      // The default (500kB) was firing on our single ~575kB pre-split chunk;
      // manualChunks below now keeps every chunk comfortably under this.
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Split the client bundle into vendor chunks so browsers can cache
          // large, slow-changing libraries independently of app code and of
          // each other, instead of one ~575kB "index" mega-chunk that gets
          // invalidated on every deploy.
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("react-dom") || id.includes("/react/") || id.includes("scheduler")) return "vendor-react";
            if (id.includes("@tanstack/react-router") || id.includes("@tanstack/router-core") || id.includes("@tanstack/history")) return "vendor-router";
            if (id.includes("@tanstack/react-query") || id.includes("@tanstack/query-core")) return "vendor-query";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@dnd-kit")) return "vendor-dnd-kit";
            if (id.includes("lucide-react")) return "vendor-icons";
            return undefined;
          },
        },
      },
    },
  },
});
