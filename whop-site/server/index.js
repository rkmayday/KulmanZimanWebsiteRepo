// Whop hosting (Cloudflare Workers runtime): serve the static site at clean addresses.
//   kulmanziman.shop/about        -> about.html
//   kulmanziman.shop/ryderziman   -> ryderziman.html
//   kulmanziman.shop/samples/...  -> samples/....html
// and forward the old live-site links to the new Ironpath sample.
const REDIRECTS = { '/fitness-sample': '/samples/ironpath', '/ironpath-app': '/samples/ironpath' };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (REDIRECTS[path]) return Response.redirect(new URL(REDIRECTS[path] + url.search, url), 301);
    if (path.length > 1 && path.endsWith('/')) return Response.redirect(new URL(path.slice(0, -1) + url.search, url), 301);
    let res = await env.ASSETS.fetch(request);
    if (res.status === 404 && !path.split('/').pop().includes('.')) {
      res = await env.ASSETS.fetch(new Request(new URL(path + '.html' + url.search, url), request));
    }
    return res;
  }
};
