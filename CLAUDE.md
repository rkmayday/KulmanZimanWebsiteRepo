# Working on this repo

- **Always back up to GitHub.** After every meaningful change, commit and push to the
  KulmanZimanWebsiteRepo GitHub repository. Never leave work only in a local or cloud checkout.
- Build with `python3 build.py`; output goes to `dist/` (not committed).
- Respect `prefers-reduced-motion` and touch devices for anything added to `assets/motion.js`.
- Sample (demo) openings: one scroll to play, then the scroll glides to a stop right after the animation,
  when the headline is fully in: set `data-stop` on the `.stage` to that point on the timeline (smooth.js stops there).
- Don't add testimonials, client logos or stats that aren't real.
