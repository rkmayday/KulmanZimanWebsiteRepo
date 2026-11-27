// Whop hosting (Cloudflare Workers runtime): serve the static site at clean addresses.
//   kulmanziman.com/about        -> about.html
//   kulmanziman.com/ryderziman   -> ryderziman.html
//   kulmanziman.com/samples/...  -> samples/....html
// and forward the old live-site links to the new Ironpath sample.
//
// Clean addresses ask for the exact .html file FIRST: the host may answer any unknown address with the
// home page (200), so "try the plain path, then .html on a 404" would show the home page for every link.
const REDIRECTS = { '/fitness-sample': '/samples/ironpath', '/ironpath-app': '/samples/ironpath', '/rexkulman': '/about', '/samples/ashgrove': '/portfolio' };

const FORWARD_OLD_DOMAIN = true;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    // the business is now Ziman Sites: the old kulmanziman.com address forwards every page to zimansites.com
    // (switch FORWARD_OLD_DOMAIN on only once zimansites.com is connected and loading, or the old address would lead nowhere)
    if (FORWARD_OLD_DOMAIN && /(^|\.)kulmanziman\.com$/.test(url.hostname)) return Response.redirect('https://zimansites.com' + path + url.search, 301);
    if (url.hostname === 'www.zimansites.com') return Response.redirect('https://zimansites.com' + path + url.search, 301);
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
    const res = await env.ASSETS.fetch(request);
    // the contact card: send it as a vCard so phones open it straight in Contacts
    if (res.status === 200 && path.endsWith('.vcf')) {
      const r = new Response(res.body, res);
      r.headers.set('content-type', 'text/vcard; charset=utf-8');
      r.headers.set('content-disposition', 'attachment; filename="Ryder Ziman.vcf"');
      return r;
    }
    // files under /assets/ linked with ?v=<hash> change their address whenever they change, so browsers can keep them for a year
    if (res.status === 200 && path.startsWith('/assets/') && url.searchParams.has('v')) {
      const r = new Response(res.body, res);
      r.headers.set('cache-control', 'public, max-age=31536000, immutable');
      return r;
    }
    return res;
  }
};
