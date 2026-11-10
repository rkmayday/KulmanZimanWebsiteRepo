import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { whop } from '@whop/cli/vite';

// Only robots.txt lives in ./site; the worker in server/index.js answers every request with a redirect.
export default defineConfig({
  publicDir: 'site',
  environments: {
    client: { build: { outDir: 'dist/client' } },
    ssr: { build: { outDir: 'dist/server' } }
  },
  plugins: [cloudflare({ viteEnvironment: { name: 'ssr' } }), whop()]
});
