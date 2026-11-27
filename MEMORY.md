# Project memory: Ziman Sites

Everything a new Claude session needs to pick up where the last one left off. Keep this file up to date:
when something important changes (a new client, a new version, a decision, a new preference), edit it and push.
Last updated: Nov 27, 2026 (after v298).

## Who and what
- **Ryder Ziman**, 14, founder of **Ziman Sites** (zimansites.com): custom, hand-built, animated websites. No templates.
  - Pricing: from $284 (1 page) up to $994 (full 4–7 pages), paid once, 3 rounds of refinement, money-back guarantee.
- **History:**
  - The business started as **Kulman Ziman** (kulmanziman.com, which now 301-redirects to zimansites.com) with his best friend **Rex Kulman**.
  - Rex built the original blue-and-gold version of the site: the "royal" theme in build.py.
  - Ryder runs it alone now with the black-and-white "mono" theme. He misses building it with Rex.
  - Rex shares this Claude account, so not every request on it is Ryder's.
- **Family:**
  - Ryder's dad is **Michael Ziman** (Ziman Development, custom homes on LBI, NJ, since 1998).
  - His cousins are the **Leebow** family (Todd, Matt and Jon Leebow; Majestic Steel USA).
  - "Ken Ziman" (Paul Weiss) is NOT family; Ryder just came across the name.
  - Ryder's uncle **Derek** runs **HD Development**.
  - Ryder once mused about founding "Ziman Tech" later in life.
- **Hosting:** the site is on **Whop** (app `app_JdRDs81kkoj3CZ`), run as a Cloudflare Worker (`whop-site/server/index.js`).
  - Ryder deploys from his Mac. He has never given a Whop API key; don't ask for one.
- **GitHub:** rkmayday/KulmanZimanWebsiteRepo.

## How Ryder wants to work (important)
- Short, plain answers. Verified, minimal changes.
- **Never change anything he didn't ask about.** He got very angry when the Aurel demo was changed while he only meant the arrow color on its card.
- When a request is ambiguous, ask one short question rather than guess big.
- No em dashes in text he'll paste (LinkedIn, texts). Messages to people: casual, short, ready to copy, and resend them plainly if asked.
- If a website or host is blocked by the network: **don't say it's blocked, just request the allow** (update_environment with the exact host).
- Don't add fake testimonials, stats or client logos. Only list a client after the deal is complete.
- Respect `prefers-reduced-motion` and touch devices.

## Ship process (every site change)
1. Build both versions:
   - `python3 build.py --theme mono` (→ dist-mono)
   - `python3 build.py --theme mono --preview` (→ preview-mono, relative paths, keeps Google Fonts)
2. Commit and push. Media files are gitignored, so `git add -f` them; `static/preview` is gitignored too.
3. If the main site changed, update the Claude preview artifact https://claude.ai/artifact/TwfWuG6g8ErFbHTccXTPXA:
   - publish `preview-mono/index.html` with `root=preview-mono`, plus changed pages in `files`;
   - if mono.css changes, republish all pages.
   - Never publish pages that look like a real company (client previews) to the artifact.
4. Make the deploy zip `ziman-sites-vN.zip`:
   - copy `whop-site/{server,vite.config.js,README.md,wrangler.jsonc,package-lock.json,package.json}`, plus `dist-mono` as `site/`;
   - remove `site/_redirects` and `site/vercel.json`;
   - zip it, put it in the repo root, delete the previous zip;
   - send it to him (display "attach").
5. Give the 4 deploy commands, each in its own bash block:
   ```
   cd ~/Downloads && unzip -o ziman-sites-vN.zip
   cd ~/Downloads/ziman-sites-vN
   npm install
   whop apps deploy --app app_JdRDs81kkoj3CZ
   ```
- **Latest version: v312.**

## The site (mono theme)
- **Pages:** Home, Pricing (products), About, Portfolio, Affiliates, Help, Legal, Get Started, Ryder Ziman (/ryderziman).
- **Home intro:** a loader plays on first visit (3.75 s), then a 3D "ZS" (three.js).
  - Keep the Home page exactly as v260/v262; an attempt to change the intro was "laggy" and reverted.
  - The loader is the reason mobile PageSpeed isn't 100. Don't remove or shorten it unless Ryder decides to.
- **Demos** (/samples/...): aurel, ember-roast, afterglow, synthra, deduction (Facet), ironpath.
  - Portfolio order: aurel, synthra, afterglow, ember-roast, deduction, ironpath.
  - **Aurel:** a headphones demo. Don't modify it unless asked. Its card arrows are light gray #ececec.
- **"Our clients" section:** Sports Culture links to our frozen, compressed copy at /work/sports-culture.
  - Made Construction and Made Properties logos wait in clients/portfolio-logos/ until Jason's deal is done.
- **Profile page (/ryderziman), Nov 27:** flip business card (photo front; back has email, LinkedIn, "Save contact" = /ryder-ziman.vcf),
  signature that writes itself, "The story so far" timeline (dates from git history: Nov 5 Kulman Ziman live, Nov 6 first samples,
  Nov 12 rebrand, Nov 20 Sports Culture, six demos, now, next), and the six demos as live cards. Timeline class is .rz-tl (.timeline is taken).
- **Photo pages for Google Images:** /ryder-ziman-1 … -5, /ryder-ziman-6-feat-maxim-zhukovski, /ryder-ziman-7.
  - Each looks like a fake "404" page with the photo faint behind it (Ryder asked, Nov 27); no link to the site.
  - Titles: "Ziman, Ryder" (1, 2 and 7: "Ziman, Ryder: son of Michael Ziman"). Listed in `PHOTOS` in build.py and the image sitemap.
- **PageSpeed (Nov 26):**
  - mobile performance went 74 → 89 after self-hosting the fonts (assets/fonts, inlined @font-face; the preview still uses Google Fonts);
  - SEO 100 after the email buttons got real hrefs;
  - Accessibility: headings fixed in v296 (should be 100);
  - best practices 100.
- **Caching:** the worker gives versioned /assets files (`?v=`) a one-year immutable cache.

## Clients and leads
- **Sports Culture** (Moshe): a done, paid client. Their copy is at /work/sports-culture.
- **Jason Cutaiar** (Made Construction, Made Properties):
  - previews at /preview/jasoncutaiar, /preview/madeconstruction, /preview/madeproperties;
  - Nov 27 feedback (his own mockup cards): simplify layouts, light gradient background, "made" in negative (outlined).
    Done: Made Properties and Jason Cutaiar are one screen (clients/jason-sites/card-page.html). Made Construction KEEPS all projects (M13, M17, M20, M14), Methods and bio; only its first screen and background match his card. Never remove the projects.
  - Still need his contact email (for forms, if wanted).
  - When the deal completes: re-add the logos, build compressed (<0.5 MB) work copies, remove the big previews.
- **HD Development** (uncle Derek; develophd.com is currently on Wix):
  - redesign built at **zimansites.com/preview/hd** (+ /preview/hd-company, /preview/hd-contact), made by `clients/hd/make.py`;
  - the HD logo is traced to vector (`clients/hd/src/contours.json`), draws itself, then the camera flies through the hole in the D; blueprint page wipe; same 3 pages and copy as the Wix site;
  - **contact form:** uses FormSubmit (`formsubmit.co/ajax/Derek@DevelopHD.com`). Ryder sends one test after deploy; Derek clicks "Activate Form" once. Probably needs re-activating after moving to develophd.com.
  - Ryder loves this site. Next steps: Derek's change requests, then moving the domain off Wix.
- **Nicholas Leone** (CEO, Vulcaris Energy, Houston):
  - concept page at /preview/vulcaris (3D fuel pin that explodes into labeled parts). Ryder liked the explode effect; maybe a future demo.
  - Awaiting his reply.
- **William Murray** (Co-Founder/CTO, Murray Computing Group, Asheville NC; murraycomputing.com):
  - said "Tell me a little more". The pitch is a partnership: Ryder designs and builds front ends for William's clients (white-label or referral). Realistically a few projects a year.
- **Joe Tomasulo** (ERCHAM, **ercham.com**: the MK1, a one-handed gaming keypad with a built-in optical mouse, Kickstarter pre-launch, $169 early bird):
  - Ryder reviewed his site: 25 MB page, a 3D model that crashes the page if its lighting fails to load, and the "check your email" note showing before sign-up.
  - Joe asked "What would you have instead?" First-screen mockup at **zimansites.com/preview/ercham** (static/preview/ercham.html, noindex): his dark gold rune style, one line on what MK1 is, one "Join the waitlist" button.
  - He has no in-hand clip yet, so the mockup uses his product render.
  - Nov 27: Joe said "take everything from ercham.com". Price agreed by Ryder: $284 one-time, paid only if Joe is happy.
    Full page built at /preview/ercham (every section from his site; all media 2.8 MB instead of 25 MB; no 3D model).
    v308: Ryder said it was a downgrade, so it got the big upgrade: scroll-driven 360 spin of the MK1 (101 cut-out frames in ercham-img/spin), live ember/rune background, glow cursor, rune-decode headings, card spotlight + tilt, magnetic buttons, counters, press marquee.
- **Walters Homes** (LBI, NJ builder, Ed Walters Jr., Ship Bottom HQ): just research; Ryder is NOT pitching them (a competitor of his dad's company).

## Brand files
- **LinkedIn:**
  - single banner: `linkedin-banners/ziman-sites-linkedin-banner.png` (logo + "Custom websites, built to order." + Aurel desktop and Synthra phone);
  - the older slideshow set (1-zs, 2-work, 3-offer, 4-founder) is also in `linkedin-banners/`;
  - founder photo crop: `linkedin-banners/ryder-founder.jpg`.
- **Whop:**
  - banner: `linkedin-banners/ziman-sites-whop-banner.png` (4500×1500);
  - logo: `branding/ziman-sites-whop-logo-2048.png`;
  - profile picture: `linkedin-banners/ryder-ziman-profile-picture.jpg`.

## Things not to do (session rules that came up)
- Don't install packages that were refused before (rembg, esbuild, an old OpenCV). Use what's installed: OpenCV 5, PIL, ffmpeg, Playwright.
- Don't bypass bot checks, logins or age verification (Whop or bank).
- Keep private info (emails, etc.) out of requests to outside services.
