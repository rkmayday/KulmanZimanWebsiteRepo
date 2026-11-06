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
The site uses clean URLs (`/products`), which map to `dist/products/index.html`.

`python3 build.py --preview` writes flat files with relative links to `preview/`, for a private preview page.

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
