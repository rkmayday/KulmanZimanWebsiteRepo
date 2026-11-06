# KulmanZimanWebsiteRepo
This is the codebase for the official KulmanZiman website.

A static site with a live 3D scene, with no framework and no npm install. Three.js r128 loads from cdnjs.

```
src/pages/*.html   page content (front-matter: title, description, path, nav, jsonld)
assets/site.css    all styles (royal blue / gold / silver, glass panels, dock, playground)
assets/world.js    the 3D world: gold crown over reflective water, glass bubbles, scroll dive
assets/site.js     nav, reveal, tabs, flip card, FAQ search, calculator, brief form
assets/motion.js   section dock, count-ups, scroll effects, tilt, playground, coins
build.py           wraps pages with shared head/nav/footer
```

## Build and preview

```bash
python3 build.py
```

```bash
cd dist && python3 -m http.server 8080
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages).
Pages are written as flat files (`dist/products.html`, `dist/ryderziman.html`) and served at clean URLs with no trailing slash (`/products`, `/ryderziman`). Vercel needs the included `vercel.json`; Netlify, Cloudflare Pages and GitHub Pages do this by default.

`python3 build.py --preview` writes flat files with relative links to `preview/`, for a private preview page.

## Themes

The same pages build in two looks:

| Theme | Command | Look |
|---|---|---|
| Royal (default) | `python3 build.py` | Royal blue, gold and silver; a gold crown over reflective water; scrolling dives under the sea (`assets/world.js`). |
| Noir | `python3 build.py --theme noir` | Black 60%, white 30%, lime 10%; a chrome crown in a black studio with a glossy grid floor; scrolling flies through a corridor of light-gates (`assets/world-noir.js`, `assets/theme-noir.css`). Output goes to `dist-noir/`. |

In noir, the crown and shapes sink into the floor as you start scrolling, and clicking a chrome sphere or white cube shatters it into lime sparks.

## The 3D world (`assets/world.js`)

| What | How it behaves |
|---|---|
| Gold crown (velvet lining, sapphires, silver pearls, floating sapphire) | Turns toward the cursor. Drag it to spin it, with momentum. Click it for a "coronation": spin, jump and a burst of gold sparkles. |
| Reflective water | Real planar reflection, rendered at half resolution, with animated ripples and sparkle. |
| Glass bubbles | Drift away from the cursor. Click one to pop it; it rises again from the water. |
| Scroll | The camera dives through the surface into a deep royal sea with light rays, gold specks and slowly sinking coins. Inner pages start just under the surface. |
| Reduced motion | No animation; the camera still follows the scroll with still frames. |
| No WebGL | The CSS gradient behind `#world` stays and the page works normally. |

## Not included in this rebuild

`/fitness-sample`, `/ironpath-app`, `/rexkulman` and `/ryderziman` already exist on the live site.
Carry them over or the links will 404 (in preview mode they point at the live pages).

The checkout link and contact email are set once at the top of `build.py`.

See `IMPROVEMENTS.md` for the review of the original site.
