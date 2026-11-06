# Put kulmanziman.shop on Whop

This folder packages the black-and-lime site for Whop website hosting.
`npm run build` rebuilds the site (`../build.py --theme noir`) and packs `dist/whop-build.zip`
in the format the Whop CLI uploads. `server/index.js` serves pages at clean addresses
(`/about`, `/ryderziman`, `/rexkulman`, `/samples/...`) and forwards the old fitness links.

Needs: Node.js 20+, Python 3, a Whop account.

```bash
curl -fsSL https://whop.com/install.sh | sh
```

```bash
whop
```

(Sign in and pick your Kulman Ziman business.)

```bash
cd whop-site && npm install
```

Create the website on Whop, attached to your domain (choose this ONCE; "website" can't be changed later):

```bash
whop apps init --app_type website --name "Kulman Ziman" --domain kulmanziman.shop
```

`init` scaffolds a starter project into a new folder; delete that folder and keep this one, then link it:

```bash
whop apps deploy --app app_xxxxxxxx
```

(`app_xxxxxxxx` is the app id `init` printed.) Later updates are just `whop apps deploy`.

Domain: because you already own kulmanziman.shop, Whop lists DNS records to add at your domain
registrar. Check progress with `whop domains get kulmanziman.shop`.
