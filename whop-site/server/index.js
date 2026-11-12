// Whop hosting (Cloudflare Workers runtime): serve the static site at clean addresses.
//   kulmanziman.com/about        -> about.html
//   kulmanziman.com/ryderziman   -> ryderziman.html
//   kulmanziman.com/samples/...  -> samples/....html
// and forward the old live-site links to the new Ironpath sample.
//
// Clean addresses ask for the exact .html file FIRST: the host may answer any unknown address with the
// home page (200), so "try the plain path, then .html on a 404" would show the home page for every link.
const REDIRECTS = { '/fitness-sample': '/samples/ironpath', '/ironpath-app': '/samples/ironpath', '/rexkulman': '/about' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (REDIRECTS[path]) return Response.redirect(new URL(REDIRECTS[path] + url.search, url), 301);
    if (path.length > 1 && path.endsWith('/')) return Response.redirect(new URL(path.slice(0, -1) + url.search, url), 301);
    // Google Search Console ownership check (HTML-file method): answer /google<id>.html with the content Google expects
    const g = path.match(/^\/(google[0-9a-f]{8,32}\.html)$/);
    if (g) return new Response('google-site-verification: ' + g[1], { headers: { 'content-type': 'text/html; charset=utf-8' } });
    if (path.endsWith('.html')) {                                   // /about.html -> /about
      const clean = path === '/index.html' ? '/' : path.slice(0, -5);
      return Response.redirect(new URL(clean + url.search, url), 301);
    }
    if (path !== '/' && !path.split('/').pop().includes('.')) {
      const page = await env.ASSETS.fetch(new Request(new URL(path + '.html', url), request));
      if (page.status === 200) return page;
    }
    return env.ASSETS.fetch(request);
  }
};
