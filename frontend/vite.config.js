// // // // // import { defineConfig } from "vite";
// // // // // import react from "@vitejs/plugin-react";

// // // // // export default defineConfig({
// // // // //   plugins: [react()],
// // // // //   server: {
// // // // //     port: 3000,
// // // // //     host: true,
// // // // //     allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
// // // // //     proxy: {
// // // // //       "/api": {
// // // // //         target: "https://exo-hybrid-detection.onrender.com",
// // // // //         changeOrigin: true,
// // // // //       },
// // // // //     },
// // // // //   },
// // // // //   preview: {
// // // // //     port: 3000,
// // // // //     host: true,
// // // // //     allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
// // // // //   },
// // // // //   ddefine: {
// // // // //   import.meta.env.VITE_API_URL: JSON.stringify("https://exo-hybrid-detection.onrender.com"),
// // // // // },
// // // // // });

// // // // // import { defineConfig } from "vite";
// // // // // import react from "@vitejs/plugin-react";

// // // // // export default defineConfig({
// // // // //   plugins: [react()],
// // // // //   server: {
// // // // //     port: 3000,
// // // // //     host: true,
// // // // //     proxy: {
// // // // //       "/api": {
// // // // //         target: "import.meta.env.VITE_API_URL",
// // // // //         changeOrigin: true,
// // // // //       },
// // // // //     },
// // // // //   },
// // // // //   preview: {
// // // // //     port: 3000,
// // // // //     host: true,
// // // // //     allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
// // // // //   },
// // // // //   define: {
// // // // //     import.meta.env.VITE_API_URL: JSON.stringify("import.meta.env.VITE_API_URL"),
// // // // //   },
// // // // // });

// // // // import { defineConfig } from "vite";
// // // // import react from "@vitejs/plugin-react";

// // // // export default defineConfig({
// // // //   plugins: [react()],
// // // //   server: {
// // // //     port: 3000,
// // // //     host: true,
// // // //     proxy: {
// // // //       "/api": {
// // // //         target: "import.meta.env.VITE_API_URL",
// // // //         changeOrigin: true,
// // // //       },
// // // //     },
// // // //   },
// // // //   preview: {
// // // //     port: 3000,
// // // //     host: true,
// // // //     allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
// // // //   },
// // // //   define: {
// // // //     import.meta.env.VITE_API_URL: JSON.stringify("https://exo-hybrid-detection-backend.onrender.com"),
// // // //   },
// // // // });

// // // import { defineConfig } from "vite";
// // // import react from "@vitejs/plugin-react";

// // // export default defineConfig({
// // //   plugins: [react()],
// // //   server: {
// // //     port: 3000,
// // //     host: true,
// // //     proxy: {
// // //       "/api": {
// // //         target: "http://localhost:8000",
// // //         changeOrigin: true,
// // //       },
// // //     },
// // //   },
// // //   preview: {
// // //     port: 3000,
// // //     host: true,
// // //     allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
// // //   },
// // //   define: {
// // //     import.meta.env.VITE_API_URL: JSON.stringify("https://exo-hybrid-detection-backend.onrender.com"),
// // //   },
// // // });

// // import { defineConfig } from "vite";
// // import react from "@vitejs/plugin-react";

// // export default defineConfig({
// //   plugins: [react()],
// //   server: {
// //     port: 3000,
// //     host: true,
// //     proxy: {
// //       "/api": {
// //         target: "http://localhost:8000",
// //         changeOrigin: true,
// //       },
// //     },
// //   },
// //   preview: {
// //     port: 3000,
// //     host: true,
// //     allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
// //   },
// // });

// // import { defineConfig } from "vite";
// // import react from "@vitejs/plugin-react";

// // export default defineConfig({
// //   plugins: [react()],
// //   server: {
// //     port: 3000,
// //     host: true,
// //     proxy: {
// //       "/api": {
// //         // target: "http://localhost:8000",
// //         target: "https://exo-hybrid-detection-backend.onrender.com",
// //         changeOrigin: true,
// //       },
// //     },
// //   },
// // });

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
        target: "http://localhost:8000",
        // target: "https://exo-hybrid-detection-backend.onrender.com",
        changeOrigin: true,
      },
    },
  },
});

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   server: {
//     port: 3000,
//     host: true,
//     allowedHosts: ["exoplanet-detection-sp06.onrender.com"],
//     proxy: {
//       "/api": {
//         target: "http://localhost:8000",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ""),
//       },
//     },
//   },
// });