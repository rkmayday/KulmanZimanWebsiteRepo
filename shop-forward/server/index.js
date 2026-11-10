// kulmanziman.shop -> kulmanziman.com, page for page (301, permanent).
//   kulmanziman.shop/ryderziman      -> kulmanziman.com/ryderziman
//   kulmanziman.shop/about.html      -> kulmanziman.com/about
//   kulmanziman.shop/fitness-sample  -> kulmanziman.com/fitness-sample (the .com site sends that on to the Ironpath sample)
// Search engines move each old page's listing over to the matching .com page.
const TARGET = 'https://kulmanziman.com';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    return new Response(null, { status: 301, headers: { Location: TARGET + path + url.search, 'Cache-Control': 'public, max-age=86400' } });
  }
};
