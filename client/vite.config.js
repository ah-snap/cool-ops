import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  envPrefix: ["VITE_", "REACT_APP_"],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "scheduler"],
          "router-vendor": ["react-router", "react-router-dom", "@remix-run/router"],
          "mui-vendor": [
            "@mui/material",
            "@mui/system",
            "@mui/utils",
            "@mui/private-theming",
            "@mui/styled-engine",
            "@emotion/react",
            "@emotion/styled",
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
