# Kulman Ziman website

Static, dependency-free rebuild of kulmanziman.shop. No framework and no npm install.

```
src/pages/*.html   page content (front-matter: title, description, path, nav, jsonld)
assets/site.css    all styles (brand palette, realistic device/desk scene, components)
assets/site.js     small enhancements: nav, reveal, tilt, tabs, FAQ search, calculator, brief form
build.py           wraps pages with shared head/nav/footer -> dist/
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

## Not included in this rebuild

`/fitness-sample`, `/ironpath-app`, `/rexkulman` and `/ryderziman` already exist on the live site and are linked, not rebuilt.
Carry them over from the existing codebase, or the links will 404.

The checkout link and contact email are set once at the top of `build.py`.

See `IMPROVEMENTS.md` for the review of the live site.

## Interactive pieces (`assets/motion.js`)

All of these switch off for `prefers-reduced-motion`. Pointer-only effects are skipped on touch screens.

| Piece | Where |
|---|---|
| Hero parallax: laptop, phone, mug and light layers move at different depths | Home hero |
| Draggable glass cards that glide and spring back | Home hero |
| Live laptop dashboard: ticking numbers and re-growing bars | Home hero |
| Reading progress bar | Every page |
| Count-up numbers | Home guarantee strip |
| Infinite marquee that pauses on hover | Below the strip |
| Mission quote lights up word by word as you scroll | Home |
| Process rail fills and step numbers darken on scroll | Home |
| **Homepage playground**: name, headline, industry, colour, type and mode drive a live mock site; "Surprise me"; "Send this as my brief" emails the result | Home |
| Magnetic buttons | Every page |
| 3D tilt with moving glare on cards | Every page |
| Cursor spotlight on dark sections | Every page |
| Coin stack that grows with the earnings slider | Affiliates |
