/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed as a GitHub project page: https://naaash03.github.io/nba2k_shot_app/
// If this ever moves to Cloudflare Pages or a custom domain, change base to '/'.
export default defineConfig({
  base: '/nba2k_shot_app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'GreenRep — Jumpshot Timing Trainer',
        short_name: 'GreenRep',
        description:
          'Fan-made jumpshot timing trainer. Not affiliated with 2K, Take-Two, or the NBA.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a0f0c',
        background_color: '#0a0f0c',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**'],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },
})
