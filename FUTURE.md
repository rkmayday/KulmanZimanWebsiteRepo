# Future plans (not started)

## Member accounts upgrade
- Sell as an add-on once a few normal clients are done. Don't build logins from scratch: use a hosted login service (Memberstack, Outseta or Supabase).
- Price: about $600–$1,000 setup plus $25–$50/month upkeep. Market rate is $800–$3,000+ for freelancers.
- Build one demo sample first, then update Help and Legal (scope section) to allow "member areas on a trusted login service".

## Other ideas
- Live chat on the site with Crisp (free; not tied to Whop).
- More demo samples (barber, restaurant, contractor).
- Move the domain to Cloudflare once the transfer lock ends (~Jan 12, 2027), then consider moving hosting off Whop.

## Maxim Zhukovski's profile page (removed from the site, stored)
- The page is kept, unchanged, in `src/archive/maximzhukovski.html` (the build does not publish anything in `src/archive/`).
  Its background is `assets/needle-field.js` (still in the repo).
- To bring it back: move the file back to `src/pages/`, and put this back in the footer in `build.py`, right after the Founder list:
  `<h4 style="margin-top:22px">Head of Sales</h4><ul><li><a href="/maximzhukovski">Maxim Zhukovski</a></li></ul>`

## IndexNow (tells Bing, Yahoo, DuckDuckGo and others when pages change)
- Key file: `static/3cc1daffabac516715d3bfad158291d7.txt` (served at https://zimansites.com/3cc1daffabac516715d3bfad158291d7.txt).
- After a deploy that changes pages, ping them from the project folder:
  `curl -X POST https://api.indexnow.org/indexnow -H "Content-Type: application/json; charset=utf-8" --data @indexnow.json`
  (a 200 or 202 answer means it was accepted; add any new page addresses to indexnow.json first).

## Client work on the portfolio (start once there are 4 finished client sites)
- Each client gets a case study page: `zimansites.com/portfolio/<client>` (e.g. `/portfolio/sportsculture`) with a short write-up
  (client, what they needed, what was built, package), the preview video (recorded on delivery day, desktop + phone)
  and a "Try the site" button that opens an archived copy of the site as delivered.
- The archived copy: `noindex`, forms and buy buttons switched off, and a banner across the top:
  "Archived copy of the <Client> site, built by Ziman Sites in <month year> · Visit the live site →".
- Get the client's OK in writing before publishing their copy. Keep a copy of every delivered site's files.
- Portfolio page: a "Client work" section on top, the four samples below as "Concepts"; drop the samples at 5–6 clients.
- On delivery day: record the previews, save the files, ask permission.
