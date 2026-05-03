
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
    proxy: {
      "/api": {
       // target: "http://localhost:8000",
       target:"https://exodios-backend.onrender.com/",
        // target: "https://exo-hybrid-detection-backend.onrender.com",
        changeOrigin: true,
      },
    },
  },
});

