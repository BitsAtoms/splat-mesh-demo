import { defineConfig } from "vite";

export default defineConfig({
  // Rutas relativas: el build funciona igual en https://<usuario>.github.io/<repo>/ que en cualquier otra subcarpeta.
  base: "./",
  build: {
    target: "es2022",
    // Spark incluye su WebAssembly embebido (~2,4 MB); no tiene sentido avisar por tamaño de chunk.
    chunkSizeWarningLimit: 5000,
  },
});
