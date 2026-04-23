import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3005",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Raise the inline warning threshold; recharts on its own is ~400kb.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into their own chunks so the main bundle
        // stays lean and infrequently-used libs (tiptap, recharts, dnd-kit)
        // only download when the page that needs them is visited.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "tiptap";
          if (id.includes("recharts") || id.includes("d3-")) return "recharts";
          if (id.includes("@dnd-kit")) return "dnd-kit";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "lucide";
          if (id.includes("socket.io-client") || id.includes("engine.io-client"))
            return "socketio";
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "forms";
          if (id.includes("dompurify")) return "sanitize";
          if (
            id.includes("react-dom") ||
            id.includes("react/") ||
            id.includes("react-router") ||
            id.includes("scheduler")
          )
            return "react-vendor";
          if (id.includes("@tanstack/react-query")) return "react-query";
        },
      },
    },
  },
});
