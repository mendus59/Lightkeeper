import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works at https://<user>.github.io/<repo>/ whatever the repo's casing.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
