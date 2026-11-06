import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { whop } from '@whop/cli/vite';

// The finished site lives in ./site and is copied as-is into dist/client.
// server/index.js (the Cloudflare worker) serves it at clean addresses.
export default defineConfig({
  publicDir: 'site',
  environments: {
    client: { build: { outDir: 'dist/client' } },
    ssr: { build: { outDir: 'dist/server' } }
  },
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), whop()]
});
