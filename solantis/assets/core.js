(() => {
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/* run a draw loop only while its element is on screen */
function loop(el, fn) {
  let vis = false, raf = 0, t0 = performance.now();
  const tick = t => { fn((t - t0) / 1000); if (vis) raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => {
    vis = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (vis) raf = requestAnimationFrame(tick);
  }).observe(el);
  if (reduce) requestAnimationFrame(() => fn(2));
}
function fitCanvas(c) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const r = c.getBoundingClientRect();
  c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
  const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

/* ---------- intro ---------- */
const intro = $('#intro');
const start = () => { if (intro) intro.classList.add('done'); document.body.classList.add('ready'); };
if (reduce) start(); else setTimeout(start, intro ? 950 : 60);

/* ---------- nav ---------- */
const nav = $('#nav'); let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('scrolled', y > 20);
  nav.classList.toggle('hide', y > 500 && y > lastY && !document.body.classList.contains('menu-open'));
  lastY = y;
}, { passive: true });
$('#burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
$$('.mobile a').forEach((a, i) => { a.style.transitionDelay = (0.15 + i * 0.035) + 's'; a.addEventListener('click', () => document.body.classList.remove('menu-open')); });

/* ---------- split headings into masked words ---------- */
$$('.split').forEach(el => {
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('span'); i.textContent = part;
          w.append(i); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
  };
  walk(el);
  $$('.w > span', el).forEach((s, i) => s.style.transitionDelay = (i * 0.06) + 's');
});

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
$$('.rv,.split').forEach(el => io.observe(el));

/* ---------- benefit cards: spotlight + tilt ---------- */
$$('.card').forEach(card => {
  card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    card.style.setProperty('--mx', x + 'px'); card.style.setProperty('--my', y + 'px');
    if (!reduce && matchMedia('(pointer:fine)').matches) card.style.transform = `perspective(1000px) rotateX(${(y / r.height - .5) * -4}deg) rotateY(${(x / r.width - .5) * 5}deg)`;
  });
  card.addEventListener('pointerleave', () => card.style.transform = '');
});

/* easy start: switches flip in sequence */
/* ---------- CTA aurora + magnetic button ---------- */
(() => {
  const c = $('#aurora'); let S = fitCanvas(c);
  addEventListener('resize', () => S = fitCanvas(c));
  loop(c, t => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (let b = 0; b < 3; b++) {
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const x = i / 60 * w;
        const y = h * (.55 + b * .06) + Math.sin(i * .18 + t * (.4 + b * .15) + b) * h * .08 + Math.sin(i * .07 - t * .3) * h * .1;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      const g = ctx.createLinearGradient(0, h * .3, 0, h);
      const col = ['103,194,194', '53,162,220', '143,240,230'][b];
      g.addColorStop(0, `rgba(${col},.16)`); g.addColorStop(.5, `rgba(${col},.03)`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  });
  const mag = $('#magnet');
  if (!reduce && matchMedia('(pointer:fine)').matches) {
    const zone = mag.closest('section');
    zone.addEventListener('pointermove', e => { const r = mag.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy); if (d < 180) mag.style.transform = `translate(${dx * .3}px,${dy * .3}px)`; else mag.style.transform = ''; });
    zone.addEventListener('pointerleave', () => mag.style.transform = '');
  }
})();

window.SOL = { reduce, $, $$, clamp, lerp, fmt, loop, fitCanvas };
})();
