# zimansites.com on Whop

`site/` holds the finished website (the white "mono" design). `server/index.js` is the Cloudflare worker that serves it at clean
addresses (`/about`, `/products`, `/ryderziman`, `/samples/...`) and forwards the old `/fitness-sample` and `/ironpath-app` links.

First time (creates the Whop website app, deploys, and attaches the domain):

```bash
npm install
```

```bash
whop apps deploy --app app_XXXXXXXX
```

```bash
whop domains update zimansites.com --website '{"app_id":"app_XXXXXXXX"}'
```

Later updates: `npm run sync` (needs Python 3) then `whop apps deploy`.
