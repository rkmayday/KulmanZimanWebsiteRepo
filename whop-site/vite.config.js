import { defineConfig } from 'vite';
import { whop } from '@whop/cli/vite';
import { cpSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';

const here = p => fileURLToPath(new URL(p, import.meta.url));

// Copies the finished black-and-lime site (built by ../build.py --theme noir) into dist/client,
// and the clean-address server into dist/server, before Whop's plugin packs dist/whop-build.zip.
const kulmanZimanSite = () => ({
  name: 'kulman-ziman-site',
  apply: 'build',
  writeBundle() {
    rmSync(here('./dist/client/assets/entry.js'), { force: true });
    cpSync(here('../dist-noir'), here('./dist/client'), { recursive: true });
    for (const f of ['_redirects', 'vercel.json']) rmSync(here('./dist/client/' + f), { force: true });
    mkdirSync(here('./dist/server'), { recursive: true });
    cpSync(here('./server/index.js'), here('./dist/server/index.js'));
  }
});

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: { input: here('./src/entry.js'), output: { entryFileNames: 'assets/entry.js' } }
  },
  plugins: [kulmanZimanSite(), whop()]
});
