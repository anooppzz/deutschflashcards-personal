import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { execSync } from 'node:child_process'

// Shown at the bottom of the app ("Version 6.10.2026 · ed46532") so the
// learner can tell whether the phone has the newest deploy.
const commit = () => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7)
  try { return execSync('git rev-parse --short HEAD').toString().trim() } catch { return 'dev' }
}
const BUILD = { date: new Date().toISOString(), commit: commit() }

// https://vite.dev/config/
// viteSingleFile inlines all JS/CSS into one HTML file at build time —
// this is what preserves the "single self-contained file, file:// compatible"
// constraint while letting us develop with real, separate source files.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: { __BUILD__: JSON.stringify(BUILD) },
  build: {
    // Keep everything in one chunk so the plugin has nothing left to split.
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
})
