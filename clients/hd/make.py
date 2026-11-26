# HD Development redesign concept (for Derek / develophd.com): 3 pages with the same content as the current Wix site.
# Writes static/preview/hd.html, hd-company.html, hd-contact.html (noindex). The HD logo is traced from the
# original PNG (src/contours.json, made with OpenCV) so it can draw itself and zoom without blurring.
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "static/preview"
C = json.load(open(pathlib.Path(__file__).parent / "src/contours.json"))
HD = C[14]["d"] + C[15]["d"]          # the H+D shape with the hole of the D (even-odd)
COUNTER = C[15]["d"]                  # the hole of the D: the window we fly through
LETTERS = "".join(o["d"] for o in C[:14])   # D E V E L O P M E N T (holes included, even-odd)
# one path per letter, each with its holes (O, P, D), left to right for the letter-by-letter reveal
GLYPHS = [o["d"] + "".join(h["d"] for h in C[:14] if h["parent"] == o["i"]) for o in sorted((o for o in C[:14] if o["parent"] == -1), key=lambda o: o["bbox"][0])]
EMAIL, PHONE, TEL = "Derek@DevelopHD.com", "732-740-1059", "+17327401059"
BLURB = ("HD is an honest, efficient and detail oriented Developer. From entitlements to site work, "
         "our Partners can rely on us to deliver on-time and up to spec.")

LOGO_SVG = f'''<svg class="mark" viewBox="236 228 582 526" aria-hidden="true"><defs><linearGradient id="g{{id}}" x1="241" x2="813" gradientUnits="userSpaceOnUse"><stop offset=".36" stop-color="#0f293e"/><stop offset=".56" stop-color="#0c3536"/></linearGradient></defs>
<path fill="url(#g{{id}})" fill-rule="evenodd" d="{HD}"/><path fill="#0c3536" fill-rule="evenodd" d="{LETTERS}"/></svg>'''

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
<meta name="theme-color" content="#f3f5f4">
<title>{title}</title>
<link rel="icon" href="/preview/hd-img/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<script>document.documentElement.classList.add('js');try{if(sessionStorage.getItem('hd-wipe')==='1'){document.documentElement.classList.add('wipe-in');sessionStorage.removeItem('hd-wipe')}}catch(e){}</script>
<style>
:root{--paper:#f3f5f4;--paper2:#e9eeec;--navy:#0f293e;--green:#0c3536;--deep:#071a24;--ink:#0f293e;--mut:#5a6b70;--line:rgba(15,41,62,.09);--line2:rgba(15,41,62,.18);--mint:#9fd5c4;
  --display:"Archivo",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
html,body{overflow-x:clip;max-width:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 var(--body);-webkit-font-smoothing:antialiased}
a{color:inherit}
img,svg{display:block;max-width:100%}
.wrap{width:min(1240px,100%);margin-inline:auto;padding-inline:max(22px,env(safe-area-inset-left)) max(22px,env(safe-area-inset-right))}
.mono{font:500 11.5px/1.3 var(--mono);letter-spacing:.18em;text-transform:uppercase}
.grid-bg{background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:44px 44px}
.btn{display:inline-flex;align-items:center;gap:12px;height:54px;padding:0 26px;border-radius:4px;background:var(--green);color:#fff;text-decoration:none;font:600 15px var(--body);border:0;cursor:pointer;
  transition:transform .3s,box-shadow .3s,background .3s}
.btn svg{width:18px;transition:transform .3s}
.btn:hover{transform:translateY(-2px);box-shadow:0 18px 40px -16px rgba(12,53,54,.7)}
.btn:hover svg{transform:translateX(4px)}
.btn.light{background:#fff;color:var(--green)}
:focus-visible{outline:2px solid var(--mint);outline-offset:3px}

/* nav */
.nav{position:fixed;inset:0 0 auto;z-index:50;padding-top:env(safe-area-inset-top);transition:color .4s,background .4s,backdrop-filter .4s}
.nav .wrap{display:flex;align-items:center;justify-content:space-between;height:76px}
.nav .brand{display:flex;align-items:center;text-decoration:none}
.nav .brand .mark{width:58px;height:auto;transition:filter .4s}
.nav ul{display:flex;gap:6px;list-style:none;margin:0;padding:0}
.nav ul a{display:block;padding:9px 14px;border-radius:999px;text-decoration:none;font:500 14.5px var(--body);transition:background .25s}
.nav ul a:hover{background:rgba(15,41,62,.07)}
.nav ul a[aria-current]{background:rgba(15,41,62,.09)}
.nav.dark{color:#fff}
.nav.dark .brand .mark{filter:brightness(0) invert(1)}
.nav.dark ul a:hover,.nav.dark ul a[aria-current]{background:rgba(255,255,255,.12)}
.nav.solid{background:rgba(243,245,244,.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
.nav.dark.solid{background:rgba(7,26,36,.7)}
@media (max-width:520px){.nav ul a{padding:8px 10px;font-size:13.5px}.nav .brand .mark{width:48px}}

/* contact band + footer */
.band{position:relative;background:var(--deep);color:#fff;overflow:hidden;padding:120px 0 0}
.band .plan-bg{position:absolute;inset:0;opacity:.5;pointer-events:none}
.band .wrap{position:relative}
.band h2{font:800 clamp(2.6rem,7vw,6.2rem)/.95 var(--display);font-stretch:112%;letter-spacing:-.035em;margin:18px 0 48px;text-wrap:balance}
.band .k{color:var(--mint)}
.band .rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-top:1px solid rgba(255,255,255,.16)}
.band .rows a{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:30px 0;text-decoration:none;border-bottom:1px solid rgba(255,255,255,.16);min-width:0}
.band .rows a:first-child{padding-right:28px;border-right:1px solid rgba(255,255,255,.16)}
.band .rows a:last-child{padding-left:28px}
.band .rows span{display:block}
.band .rows .v{font:600 clamp(1.15rem,2.4vw,1.9rem) var(--display);letter-spacing:-.01em;overflow-wrap:anywhere}
.band .rows .mono{color:rgba(255,255,255,.55);margin-bottom:8px}
.band .rows svg{width:26px;flex:none;transition:transform .35s}
.band .rows a:hover svg{transform:translate(5px,-5px)}
@media (max-width:760px){.band .rows{grid-template-columns:1fr}.band .rows a:first-child{border-right:0;padding-right:0}.band .rows a:last-child{padding-left:0}}
.foot{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;padding:34px 0 calc(34px + env(safe-area-inset-bottom));color:rgba(255,255,255,.5)}
.foot .mark{width:64px;filter:brightness(0) invert(1);opacity:.85}

/* reveal */
.js .rv{opacity:0;transform:translateY(28px);transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1)}
.js .rv.in{opacity:1;transform:none}

/* page wipe: a blueprint sheet slides over between pages */
.wipe{position:fixed;inset:0;z-index:100;background:var(--green);pointer-events:none;clip-path:inset(100% 0 0 0);display:grid;place-items:center}
.wipe::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:44px 44px}
.wipe .mark{width:min(30vw,170px);filter:brightness(0) invert(1);opacity:0;transform:scale(.9);transition:opacity .3s,transform .5s}
.wipe.go{animation:wipeIn .55s cubic-bezier(.7,0,.25,1) forwards}
.wipe.go .mark{opacity:1;transform:none;transition-delay:.25s}
.wipe-in .wipe{clip-path:inset(0 0 0 0)}
.wipe-in .wipe .mark{opacity:1;transform:none}
.wipe.out{animation:wipeOut .7s .15s cubic-bezier(.7,0,.25,1) forwards}
.wipe.out .mark{opacity:0;transition-delay:0s}
@keyframes wipeIn{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes wipeOut{from{clip-path:inset(0 0 0 0)}to{clip-path:inset(0 0 100% 0)}}
@media (prefers-reduced-motion:reduce){.wipe{display:none}.js .rv{opacity:1;transform:none;transition:none}}
'''

ARROW = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5"/></svg>'
NE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 18 18 6M8 6h10v10"/></svg>'

def nav(cur, dark=False):
    items = [("hd", "Home"), ("hd-company", "Company"), ("hd-contact", "Contact")]
    li = "".join(f'<li><a href="/preview/{h}"{" aria-current=\"page\"" if h == cur else ""}>{t}</a></li>' for h, t in items)
    return (f'<header class="nav{" dark" if dark else ""}" id="nav"><div class="wrap"><a class="brand" href="/preview/hd" aria-label="HD Development home">'
            f'{LOGO_SVG.replace("{id}", "n")}</a><nav aria-label="Main"><ul>{li}</ul></nav></div></header>')

def band(title="Contact Us"):
    return f'''<section class="band" id="contact-band">
  <svg class="plan-bg" data-plan="band" aria-hidden="true"></svg>
  <div class="wrap">
    <span class="mono k rv">HD Development</span>
    <h2 class="rv">{title}</h2>
    <div class="rows rv">
      <a href="mailto:{EMAIL}"><span><span class="mono">Email</span><span class="v">{EMAIL}</span></span>{NE}</a>
      <a href="tel:{TEL}"><span><span class="mono">Phone</span><span class="v">{PHONE}</span></span>{NE}</a>
    </div>
    <div class="foot">{LOGO_SVG.replace("{id}", "f")}<span class="mono">&copy; 2025 by HD Development</span></div>
  </div>
</section>'''

WIPE = f'<div class="wipe" aria-hidden="true">{LOGO_SVG.replace("{id}", "w")}</div>'

# shared script: page wipe, reveals, nav state, and the site-plan line drawings (lots along curving roads)
COMMON_JS = r'''
<script>
(function(){
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, root=document.documentElement;
/* page wipe between the three pages */
var wipe=document.querySelector('.wipe');
if(root.classList.contains('wipe-in')&&wipe){requestAnimationFrame(function(){requestAnimationFrame(function(){wipe.classList.add('out');setTimeout(function(){root.classList.remove('wipe-in');wipe.classList.remove('out')},1000)})})}
document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a||reduce||e.metaKey||e.ctrlKey||e.shiftKey||a.target)return;
  var u=new URL(a.href,location.href);if(u.origin!==location.origin||!/^\/preview\/hd/.test(u.pathname)||u.pathname===location.pathname)return;
  e.preventDefault();try{sessionStorage.setItem('hd-wipe','1')}catch(_){}wipe.classList.add('go');setTimeout(function(){location.href=a.href},560)});
addEventListener('pageshow',function(e){if(e.persisted&&wipe){wipe.classList.remove('go');root.classList.remove('wipe-in')}});
/* reveal on scroll */
var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
/* site plan: two curving roads with a cul-de-sac and lots on both sides, drawn as thin white lines */
var NS='http://www.w3.org/2000/svg';
window.hdPlan=function(svg,opt){opt=opt||{};svg.setAttribute('viewBox','0 0 1600 1000');svg.setAttribute('preserveAspectRatio','xMidYMid slice');
  var g=document.createElementNS(NS,'g');svg.appendChild(g);
  var roads=['M-80 640 C 320 560 620 800 980 660 S 1460 380 1700 450','M760 735 C 780 820 800 880 840 930','M1180 560 C 1240 470 1270 360 1260 200 S 1300 40 1360 -60'];
  var lots=[];
  roads.forEach(function(d,ri){
    var p=document.createElementNS(NS,'path');p.setAttribute('d',d);p.setAttribute('class','road');g.appendChild(p);
    var L=p.getTotalLength(),step=ri?54:62,depth=ri?95:120,half=19;
    for(var s=40;s<L-30;s+=step){var a=p.getPointAtLength(s),b=p.getPointAtLength(Math.min(L,s+1)),dx=b.x-a.x,dy=b.y-a.y,m=Math.hypot(dx,dy)||1;dx/=m;dy/=m;var nx=-dy,ny=dx;
      [1,-1].forEach(function(side){if(ri===1&&side===-1&&s<60)return;var w=step*.5-3,o=half+6,pts=[[-w,o],[w,o],[w,o+depth],[-w,o+depth]].map(function(q){return [a.x+dx*q[0]+nx*q[1]*side,a.y+dy*q[0]+ny*q[1]*side]});
        var poly=document.createElementNS(NS,'polygon');poly.setAttribute('points',pts.map(function(q){return q[0].toFixed(1)+','+q[1].toFixed(1)}).join(' '));poly.setAttribute('class','lot');g.appendChild(poly);lots.push(poly)})}
  });
  var end=document.createElementNS(NS,'circle');end.setAttribute('cx',840);end.setAttribute('cy',950);end.setAttribute('r',46);end.setAttribute('class','road');g.appendChild(end);
  g.querySelectorAll('.road').forEach(function(r){var L=r.getTotalLength?r.getTotalLength():300;r.style.strokeDasharray=L;r.style.strokeDashoffset=reduce?0:L});
  lots.forEach(function(l,i){l.style.transitionDelay=(reduce?0:(.6+i*.012))+'s'});
  return {draw:function(){g.classList.add('drawn');g.querySelectorAll('.road').forEach(function(r){r.style.strokeDashoffset=0})}};
};
var css=document.createElement('style');css.textContent='.road{fill:none;stroke:rgba(255,255,255,.34);stroke-width:2;transition:stroke-dashoffset 2.4s cubic-bezier(.3,.6,.2,1)}.lot{fill:none;stroke:rgba(255,255,255,.16);stroke-width:1.2;opacity:0;transition:opacity .6s}.drawn .lot{opacity:1}';document.head.appendChild(css);
var bandSvg=document.querySelector('[data-plan="band"]');
if(bandSvg){var bp=hdPlan(bandSvg);var bo=new IntersectionObserver(function(es){if(es[0].isIntersecting){bp.draw();bo.disconnect()}},{threshold:.15});bo.observe(bandSvg)}
/* nav gets a background once the page scrolls */
var nav=document.getElementById('nav');function ns(){nav.classList.toggle('solid',scrollY>30)}ns();addEventListener('scroll',ns,{passive:true});
})();
</script>'''

# ---------------- Home: the HD draws itself, then the camera flies through the hole of the D ----------------
HOME_CSS = '''
.intro{position:relative;height:330vh}
.stage{position:sticky;top:0;height:100vh;height:100svh;overflow:hidden}
.scene{position:absolute;inset:0;background:radial-gradient(120% 90% at 70% 30%,#12423f 0%,#0c3536 38%,#071a24 100%);color:#fff;display:flex;align-items:flex-end}
.scene .plan{position:absolute;inset:0;width:100%;height:100%;transform-origin:62% 45%;will-change:transform}
.scene .copy{position:relative;width:min(1240px,100%);margin-inline:auto;padding:0 max(22px,env(safe-area-inset-left)) calc(9vh + env(safe-area-inset-bottom))}
.scene h1{font:850 clamp(2.2rem,10.4vw,9.6rem)/.86 var(--display);font-stretch:118%;letter-spacing:-.045em;margin:18px 0 28px}
@media (max-width:520px){.scene h1{font-size:12.2vw;font-stretch:100%}}
.scene h1 .ln{display:block;overflow:hidden;padding-bottom:.04em}
.scene h1 .ln span{display:block;transform:translateY(105%);transition:transform 1s cubic-bezier(.2,.75,.15,1)}
.scene h1 .ln:nth-child(2) span{transition-delay:.08s}.scene h1 .ln:nth-child(3) span{transition-delay:.16s;color:var(--mint)}
.scene .k,.scene p,.scene .btn{opacity:0;transform:translateY(18px);transition:opacity .8s .25s,transform .8s .25s cubic-bezier(.2,.75,.15,1)}
.scene p{max-width:46ch;font-size:clamp(1rem,1.5vw,1.18rem);color:rgba(255,255,255,.78);margin:0 0 30px}
.scene .btn{transition-delay:.35s}
.scene.on h1 .ln span{transform:none}
.scene.on .k,.scene.on p,.scene.on .btn{opacity:1;transform:none}
.scene .k{color:var(--mint)}
.front{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.front .paper{fill:var(--paper)}
.front .lines{fill:url(#gridpat)}
.front .outline{fill:none;stroke:var(--navy);stroke-width:1.6;stroke-linejoin:round}
.front .fill{opacity:0;transition:opacity 1s .1s}
.front .letters path{opacity:0;transform:translateY(14px);transition:opacity .6s,transform .7s cubic-bezier(.2,.75,.15,1)}
.front .dim{fill:none;stroke:var(--navy);stroke-width:1;opacity:.55}
.front .dimtxt{font:500 10px var(--mono);letter-spacing:.22em;fill:var(--navy);opacity:0;transition:opacity .8s}
.drawn .fill{opacity:1}
.drawn .letters path{opacity:1;transform:none}
.drawn .dimtxt{opacity:.6}
.shine{fill:url(#shine);opacity:0}
.drawn .shine{animation:shine 1.4s .5s cubic-bezier(.4,0,.2,1)}
@keyframes shine{0%{opacity:1;transform:translateX(-700px)}100%{opacity:1;transform:translateX(700px)}}
.hint{position:absolute;left:50%;bottom:calc(26px + env(safe-area-inset-bottom));transform:translateX(-50%);display:grid;justify-items:center;gap:10px;color:var(--navy);opacity:0;transition:opacity .8s}
.hint i{width:1px;height:38px;background:linear-gradient(var(--navy),transparent);animation:drip 1.8s infinite}
@keyframes drip{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}
.ready .hint{opacity:.7}
@media (prefers-reduced-motion:reduce){.intro{height:auto}.stage{position:relative;height:auto;min-height:100svh}.front{display:none}.scene{position:relative;min-height:100svh;padding-top:120px}.scene h1 .ln span,.scene .k,.scene p,.scene .btn{transform:none;opacity:1}.hint{display:none}}
'''

def home():
    dims = ('<g class="dims">'
            '<path class="dim d1" d="M241 196H813M241 186v20M813 186v20"/>'
            '<path class="dim d2" d="M203 234V627M193 234h20M193 627h20"/>'
            '<path class="dim d3" d="M626 431m-10 0h20m-10-10v20"/>'
            '<circle class="dim d4" cx="626" cy="431" r="128" stroke-dasharray="4 7"/>'
            '<text class="dimtxt" x="527" y="182" text-anchor="middle">ENTITLEMENTS — SITE WORK</text>'
            '<text class="dimtxt" x="0" y="0" text-anchor="middle" transform="translate(186 430) rotate(-90)">ON-TIME · UP TO SPEC</text>'
            '<text class="dimtxt" x="822" y="770" text-anchor="end">HD-01</text></g>')
    front = f'''<svg class="front" id="front" aria-hidden="true">
  <defs>
    <pattern id="gridpat" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="rgba(15,41,62,.09)" stroke-width="1"/></pattern>
    <linearGradient id="gh" x1="241" x2="813" gradientUnits="userSpaceOnUse"><stop offset=".36" stop-color="#0f293e"/><stop offset=".56" stop-color="#0c3536"/></linearGradient>
    <linearGradient id="shine" x1="0" x2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="hdclip"><path fill-rule="evenodd" clip-rule="evenodd" d="{HD}"/></clipPath>
  </defs>
  <g id="cam">
    <path class="paper" fill-rule="evenodd" d="M-60000 -60000H60000V60000H-60000Z{COUNTER}"/>
    <path class="lines" fill-rule="evenodd" d="M-60000 -60000H60000V60000H-60000Z{COUNTER}"/>
    <g id="cover"><path class="paper" d="{COUNTER}"/><path class="lines" d="{COUNTER}"/></g>
    {dims}
    <path class="fill" fill="url(#gh)" fill-rule="evenodd" d="{HD}"/>
    <rect class="shine" x="241" y="234" width="572" height="393" clip-path="url(#hdclip)"/>
    <path class="outline" id="outline" fill-rule="evenodd" d="{HD}"/>
    <g class="letters" fill="#0c3536">{"".join(f'<path fill-rule="evenodd" d="{d}" style="transition-delay:{n*45}ms"/>' for n, d in enumerate(GLYPHS))}</g>
  </g>
</svg>'''
    body = f'''{nav("hd")}
<main>
<section class="intro" id="intro" aria-label="HD Development">
  <div class="stage">
    <div class="scene" id="scene">
      <svg class="plan" id="plan" aria-hidden="true"></svg>
      <div class="copy">
        <span class="mono k">HD Development</span>
        <h1><span class="ln"><span>Trusted</span></span><span class="ln"><span>Development</span></span><span class="ln"><span>Partner</span></span></h1>
        <p>{BLURB}</p>
        <a class="btn light" href="/preview/hd-contact">Contact Us {ARROW}</a>
      </div>
    </div>
    {front}
    <div class="hint"><span class="mono">Scroll</span><i></i></div>
  </div>
</section>
{band()}
</main>
{WIPE}'''
    js = r'''<script>
(function(){
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,root=document.documentElement;
var front=document.getElementById('front'),cam=document.getElementById('cam'),cover=document.getElementById('cover'),scene=document.getElementById('scene'),intro=document.getElementById('intro'),nav=document.getElementById('nav');
var plan=hdPlan(document.getElementById('plan')),planEl=document.getElementById('plan'),drawnPlan=false;
var LC=[527,431],CC=[626,431],LW=572,LH=393,CW=178,CH=242;  /* logo (H+D) centre/size, the D's hole centre/size */
var vw,vh,k,smax;
function size(){vw=innerWidth;vh=innerHeight;k=Math.min(.74*vw/LW,.42*vh/LH);front.setAttribute('viewBox',(-vw/2/k)+' '+(-vh/2/k)+' '+(vw/k)+' '+(vh/k));smax=2.4*Math.max(vw/(CW*k),vh/(CH*k))}
size();addEventListener('resize',function(){size();frame()});
/* 1. the logo draws itself */
var ol=document.getElementById('outline'),L=ol.getTotalLength();
var dims=front.querySelectorAll('.dim');
if(reduce){scene.classList.add('on');plan.draw();return}
ol.style.strokeDasharray=L;ol.style.strokeDashoffset=L;
dims.forEach(function(d){var l=d.getTotalLength();d.style.strokeDasharray=d.classList.contains('d4')?'':l;if(!d.classList.contains('d4'))d.style.strokeDashoffset=l;d.style.transition='stroke-dashoffset 1.4s cubic-bezier(.3,.6,.2,1)'});
ol.getBoundingClientRect();
ol.style.transition='stroke-dashoffset 2s cubic-bezier(.45,.1,.2,1)';
requestAnimationFrame(function(){ol.style.strokeDashoffset=0;dims.forEach(function(d){d.style.strokeDashoffset=0})});
setTimeout(function(){front.classList.add('drawn')},1700);
setTimeout(function(){root.classList.add('ready')},2600);
/* 2. scrolling flies through the hole of the D into the next scene */
function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
function cl(x){return x<0?0:x>1?1:x}
var on=false,last=-1;
function frame(){
  var r=intro.getBoundingClientRect(),run=intro.offsetHeight-vh,p=cl(-r.top/run);
  if(p===last)return;last=p;
  var open=cl(p/.08);cover.style.opacity=1-open;
  var z=ease(cl((p-.04)/.62)),s=Math.exp(Math.log(smax)*z);
  var cx=LC[0]+(CC[0]-LC[0])*cl(z*3),cy=LC[1]+(CC[1]-LC[1])*cl(z*3);
  cam.setAttribute('transform','scale('+s+') translate('+(-cx)+' '+(-cy)+')');
  front.style.visibility=z>=.999?'hidden':'visible';
  planEl.style.transform='scale('+(1.35-.35*z)+')';
  if(p>.02&&!drawnPlan){drawnPlan=true;plan.draw()}
  var want=z>.9;if(want!==on){on=want;scene.classList.toggle('on',on)}
  nav.classList.toggle('dark',z>.55&&r.bottom>vh*.5);
  document.querySelector('.hint').style.opacity=p>.02?0:'';
}
var raf=0;function tick(){raf=0;frame()}
addEventListener('scroll',function(){if(!raf)raf=requestAnimationFrame(tick)},{passive:true});
frame();
})();
</script>'''
    return (HEAD.replace("{title}", "HD Development: Trusted Development Partner") + HOME_CSS + "</style>\n</head>\n<body>\n"
            + body + COMMON_JS + js + "\n</body>\n</html>\n")

# ---------------- Company ----------------
COMPANY_CSS = '''
.co{position:relative;min-height:100svh;padding:calc(130px + env(safe-area-inset-top)) 0 110px;overflow:hidden}
.co .wrap{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(28px,5vw,80px);align-items:center}
.co h1{font:850 clamp(3.4rem,9vw,8.4rem)/.86 var(--display);font-stretch:118%;letter-spacing:-.045em;margin:18px 0 30px}
.co h1 em{font-style:normal;color:var(--green)}
.co h2{font:700 clamp(1.3rem,2.4vw,1.9rem)/1.15 var(--display);letter-spacing:-.015em;margin:0 0 16px}
.co p{max-width:48ch;color:var(--mut);font-size:clamp(1rem,1.4vw,1.15rem);margin:0 0 32px}
.co .k{color:var(--green)}
.sheet{position:relative;aspect-ratio:13/10;max-width:100%}
.sheet .ph{position:absolute;inset:0;overflow:hidden;border-radius:4px;clip-path:inset(0 0 100% 0);transition:clip-path 1.5s .25s cubic-bezier(.7,0,.2,1)}
.sheet .ph img{width:100%;height:100%;object-fit:cover;transform:scale(1.18);transition:transform 2.4s .25s cubic-bezier(.2,.7,.2,1)}
.sheet .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(12,53,54,0) 40%,rgba(12,53,54,.45))}
.sheet.in .ph{clip-path:inset(0 0 0 0)}
.sheet.in .ph img{transform:scale(1.02)}
.sheet .tk{position:absolute;width:22px;height:22px;border-color:var(--navy);border-style:solid;opacity:.6}
.sheet .tk.a{left:-12px;top:-12px;border-width:1px 0 0 1px}.sheet .tk.b{right:-12px;top:-12px;border-width:1px 1px 0 0}
.sheet .tk.c{left:-12px;bottom:-12px;border-width:0 0 1px 1px}.sheet .tk.d{right:-12px;bottom:-12px;border-width:0 1px 1px 0}
.sheet .tag{position:absolute;left:18px;bottom:16px;color:#fff;display:flex;gap:14px;align-items:center}
.sheet .tag .mark{width:54px;filter:brightness(0) invert(1)}
.sheet .ruler{position:absolute;left:0;right:0;top:-34px;height:12px;border-bottom:1px solid var(--line2);background:repeating-linear-gradient(90deg,var(--line2) 0 1px,transparent 1px 22px) bottom/100% 7px no-repeat}
@media (max-width:860px){.co .wrap{grid-template-columns:1fr}.sheet{margin-top:30px}}
@media (prefers-reduced-motion:reduce){.sheet .ph{clip-path:none;transition:none}.sheet .ph img{transform:none;transition:none}}
'''

def company():
    body = f'''{nav("hd-company")}
<main>
<section class="co grid-bg">
  <div class="wrap">
    <div>
      <span class="mono k rv">Company</span>
      <h1 class="rv">Work <em>With</em> Us.</h1>
      <h2 class="rv">Trusted Development Partner</h2>
      <p class="rv">{BLURB}</p>
      <a class="btn rv" href="/preview/hd-contact">Contact Us {ARROW}</a>
    </div>
    <div class="sheet rv" id="sheet">
      <div class="ruler"></div>
      <div class="ph"><img src="/preview/hd-img/blueprints.webp" alt="Rolled construction blueprints on a desk" width="1300" height="800"></div>
      <i class="tk a"></i><i class="tk b"></i><i class="tk c"></i><i class="tk d"></i>
      <div class="tag">{LOGO_SVG.replace("{id}", "t")}</div>
    </div>
  </div>
</section>
{band()}
</main>
{WIPE}'''
    return (HEAD.replace("{title}", "Company | HD Development") + COMPANY_CSS + "</style>\n</head>\n<body>\n" + body + COMMON_JS + "\n</body>\n</html>\n")

# ---------------- Contact ----------------
CONTACT_CSS = '''
.ct{min-height:100svh;padding:calc(130px + env(safe-area-inset-top)) 0 110px}
.ct h1{font:850 clamp(3.2rem,9vw,8.4rem)/.86 var(--display);font-stretch:118%;letter-spacing:-.045em;margin:18px 0 56px}
.ct h1 em{font-style:normal;color:var(--green)}
.ct .k{color:var(--green)}
.ct .cols{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:clamp(28px,5vw,72px);align-items:start}
form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 20px;background:#fff;border:1px solid var(--line2);border-radius:6px;padding:clamp(20px,3.4vw,40px);position:relative}
form .full{grid-column:1/-1}
label{display:grid;gap:8px;font:500 11px var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}
input,textarea{width:100%;font:16px var(--body);color:var(--ink);background:var(--paper);border:1px solid var(--line2);border-radius:4px;padding:13px 14px;transition:border-color .2s,background .2s,box-shadow .2s}
textarea{min-height:140px;resize:vertical}
input:focus,textarea:focus{outline:none;border-color:var(--green);background:#fff;box-shadow:0 0 0 4px rgba(12,53,54,.1)}
form .btn{justify-self:start}
form .note{font-size:13px;color:var(--mut);align-self:center}
form .sent{grid-column:1/-1;display:none;color:var(--green);font-weight:600}
form.done .sent{display:block}
.details{border-top:1px solid var(--line2)}
.details h2{font:700 1.5rem var(--display);margin:22px 0 18px;letter-spacing:-.01em}
.details a{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:20px 0;border-bottom:1px solid var(--line2);text-decoration:none;min-width:0}
.details a span{display:grid;gap:6px;min-width:0}
.details .v{font:600 clamp(1.05rem,1.8vw,1.35rem) var(--display);overflow-wrap:anywhere}
.details .mono{color:var(--mut)}
.details svg{width:22px;flex:none;transition:transform .3s}
.details a:hover svg{transform:translate(4px,-4px)}
.details .mark{width:150px;margin-top:40px;opacity:.9}
@media (max-width:860px){.ct .cols{grid-template-columns:1fr}}
@media (max-width:520px){form{grid-template-columns:1fr}}
'''

def contact():
    f = [("first", "First name*", "text", True, "given-name"), ("last", "Last name*", "text", True, "family-name"),
         ("email", "Email*", "email", True, "email"), ("phone", "Phone", "tel", False, "tel"),
         ("company", "Company name", "text", False, "organization"), ("project", "Project Name &amp; Location", "text", False, "off")]
    fields = "".join(f'<label>{t}<input name="{n}" type="{ty}"{" required" if rq else ""} autocomplete="{ac}"></label>' for n, t, ty, rq, ac in f)
    body = f'''{nav("hd-contact")}
<main>
<section class="ct grid-bg">
  <div class="wrap">
    <span class="mono k rv">Contact</span>
    <h1 class="rv">Connect <em>With</em> Us</h1>
    <div class="cols">
      <form class="rv" id="form" novalidate>
        {fields}
        <label class="full">Message<textarea name="message"></textarea></label>
        <button class="btn" type="submit">Submit {ARROW}</button>
        <p class="sent">Your email app has opened with the message. Press send there.</p>
      </form>
      <div class="details rv">
        <h2>Contact Details</h2>
        <a href="mailto:{EMAIL}"><span><span class="mono">Email</span><span class="v">{EMAIL}</span></span>{NE}</a>
        <a href="tel:{TEL}"><span><span class="mono">Phone</span><span class="v">{PHONE}</span></span>{NE}</a>
        {LOGO_SVG.replace("{id}", "d")}
      </div>
    </div>
  </div>
</section>
{band("Let’s build it.")}
</main>
{WIPE}
<script>
document.getElementById('form').addEventListener('submit',function(e){{e.preventDefault();var f=e.target;
  for(var i=0;i<f.elements.length;i++){{var el=f.elements[i];if(el.required&&!el.value.trim()){{el.focus();el.reportValidity&&el.reportValidity();return}}if(el.type==='email'&&el.value&&!el.checkValidity()){{el.reportValidity();return}}}}
  var g=function(n){{return (f.elements[n].value||'').trim()}};
  var body=['Name: '+g('first')+' '+g('last'),'Email: '+g('email'),'Phone: '+(g('phone')||'-'),'Company: '+(g('company')||'-'),'Project: '+(g('project')||'-'),'',g('message')].join('\\n');
  location.href='mailto:{EMAIL}?subject='+encodeURIComponent('New inquiry from '+g('first')+' '+g('last'))+'&body='+encodeURIComponent(body);
  f.classList.add('done')}});
</script>'''
    return (HEAD.replace("{title}", "Contact | HD Development") + CONTACT_CSS + "</style>\n</head>\n<body>\n" + body + COMMON_JS + "\n</body>\n</html>\n")

for name, fn in [("hd", home), ("hd-company", company), ("hd-contact", contact)]:
    (OUT / f"{name}.html").write_text(fn())
    print("wrote", OUT / f"{name}.html")
