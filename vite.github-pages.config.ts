import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const pagesRoot = fileURLToPath(new URL("./github-pages", import.meta.url));
const outputRoot = fileURLToPath(
  new URL("./github-pages-dist", import.meta.url),
);

export default defineConfig({
  root: pagesRoot,
  base: "./",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [react()],
  server: {
    fs: {
      allow: [projectRoot],
    },
  },
  build: {
    outDir: outputRoot,
    emptyOutDir: true,
    target: "es2022",
  },
});
