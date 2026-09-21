import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
  assetsInclude: ["**/*.fbx", "**/*.blend", "**/*.stl", "**/*.mp3"],
});
