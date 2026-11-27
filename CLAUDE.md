# Working on this repo

- **Read MEMORY.md first.** It holds everything about Ziman Sites, Ryder, the clients, the ship process and how he
  wants to work, so a new session can pick up where the last one left off. Update it (and push) whenever something
  important changes.

- **Always back up to GitHub.** After every meaningful change, commit and push to the
  KulmanZimanWebsiteRepo GitHub repository. Never leave work only in a local or cloud checkout.
- Build with `python3 build.py`; output goes to `dist/` (not committed).
- Respect `prefers-reduced-motion` and touch devices for anything added to `assets/motion.js`.
- Sample (demo) openings: one scroll to play, then the scroll glides to a stop right after the animation,
  when the headline is fully in: set `data-stop` on the `.stage` to that point on the timeline (smooth.js stops there).
- Don't add testimonials, client logos or stats that aren't real.
- Client copies on the Portfolio "Our clients" section (static/work/<client>.html, made by a clients/make-*.py script):
  before adding one, compress it as much as possible without a visible change: every photo resized to the size it
  shows at (about 900 px wide) and compressed, only the best few photos per project, the Google Sheet switched off
  (frozen as built), kept out of search (noindex). Target: under 0.5 MB per client site. Only list a client once the
  deal is complete (paid and handed over); their logos wait in clients/portfolio-logos/ until then.
