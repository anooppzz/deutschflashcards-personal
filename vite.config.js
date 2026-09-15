import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// viteSingleFile inlines all JS/CSS into one HTML file at build time —
// this is what preserves the "single self-contained file, file:// compatible"
// constraint while letting us develop with real, separate source files.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    // Keep everything in one chunk so the plugin has nothing left to split.
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
})
