import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Deploying to GitHub Pages at the domain root, so keep a root base path in all modes
  const base = mode === "development" ? "/" : "/amirfoodanalysis/";

  return {
    base,
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        disable: false,
        registerType: "autoUpdate",
        includeAssets: ["logo.png"],
        manifest: {
          name: "Rima Food Tracker - Calorie & Diet Tracker",
          short_name: "Rima",
          description: "Track your nutrition and get personalized AI diet plans",
          theme_color: "#22c55e",
          background_color: "#0a0a0b",
          display: "standalone",
          orientation: "portrait",
          scope: base,
          start_url: base,
          icons: [
            {
              src: "/logo.png",
              sizes: "670x670",
              type: "image/png",
            },
            {
              src: "/logo.png",
              sizes: "670x670",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
