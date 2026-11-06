# kulmanziman.shop on Whop

`site/` holds the finished black-and-lime website. `server/index.js` is the Cloudflare worker that serves it at clean
addresses (`/about`, `/ryderziman`, `/rexkulman`, `/samples/...`) and forwards the old fitness links. No Python is needed to deploy.

```bash
npm install
```

```bash
whop apps deploy --app app_uSQNScwPPUo9Fo
```

`whop apps deploy` runs `npm run build` (Vite + @cloudflare/vite-plugin + whop()), packs `dist/whop-build.zip` and uploads it.

After editing pages in the repo, refresh `site/` with `npm run sync` (needs Python 3), then deploy again.
