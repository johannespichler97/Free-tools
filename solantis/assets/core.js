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
$$('.card,.fcard').forEach(card => {
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
  const c = $('#aurora'); if (!c) return; let S = fitCanvas(c);
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

/* ---------- subpage hero background: flowing price lines ---------- */
(() => {
  const c = $('#pagebg'); if (!c) return;
  let S = fitCanvas(c);
  addEventListener('resize', () => S = fitCanvas(c));
  const lines = Array.from({ length: 9 }, (_, i) => ({ y: .2 + i * .085, sp: .2 + Math.random() * .3, ph: Math.random() * 6, amp: 18 + Math.random() * 40 }));
  loop(c, t => {
    const { ctx, w, h } = S; ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(230,233,235,.035)'; ctx.lineWidth = 1;
    for (let x = (t * 20) % 80; x < w; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    lines.forEach((l, k) => {
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const x = i / 120 * w, u = i / 120;
        const y = h * l.y + Math.sin(u * 7 + t * l.sp + l.ph) * l.amp + Math.sin(u * 23 - t * l.sp * 2 + k) * l.amp * .25 - u * 60;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(53,162,220,0)'); g.addColorStop(.55, `rgba(53,162,220,${.08 + k * .012})`); g.addColorStop(1, `rgba(103,194,194,${.25 + k * .03})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1.3; ctx.stroke();
    });
  });
})();

/* ---------- reusable live line/candle chart: <canvas data-chart="line|candles" data-start="1.0854" data-vol="0.0004"> ---------- */
$$('canvas[data-chart]').forEach(c => {
  let S = fitCanvas(c);
  addEventListener('resize', () => S = fitCanvas(c));
  const kind = c.dataset.chart, vol = +c.dataset.vol || 1, N = +c.dataset.n || 60;
  let p = +c.dataset.start || 100;
  const candles = [];
  for (let i = 0; i < N; i++) { const o = p; let hi = o, lo = o; for (let k = 0; k < 5; k++) { p += (Math.random() - .47) * vol; hi = Math.max(hi, p); lo = Math.min(lo, p); } candles.push({ o, c: p, h: hi, l: lo }); }
  let cur = candles[N - 1], last = 0;
  loop(c, t => {
    const { ctx, w, h } = S;
    if (t - last > (kind === 'line' ? .12 : 1.6)) { last = t; if (kind === 'line') { candles.shift(); const n = candles[candles.length - 1].c + (Math.random() - .48) * vol; candles.push({ o: n, c: n, h: n, l: n }); cur = candles[candles.length - 1]; } else { candles.shift(); cur = { o: cur.c, c: cur.c, h: cur.c, l: cur.c }; candles.push(cur); } }
    if (kind !== 'line') { cur.c += (Math.random() - .48) * vol * .25; cur.h = Math.max(cur.h, cur.c); cur.l = Math.min(cur.l, cur.c); }
    ctx.clearRect(0, 0, w, h);
    let hi = -Infinity, lo = Infinity; candles.forEach(k => { hi = Math.max(hi, k.h); lo = Math.min(lo, k.l); });
    const pad = (hi - lo) * .15 || 1; hi += pad; lo -= pad;
    const Y = v => h - (v - lo) / (hi - lo) * h, cw = w / candles.length;
    ctx.strokeStyle = 'rgba(230,233,235,.05)'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, h * i / 5); ctx.lineTo(w, h * i / 5); ctx.stroke(); }
    if (kind === 'line') {
      ctx.beginPath(); candles.forEach((k, i) => { const x = i * cw; i ? ctx.lineTo(x, Y(k.c)) : ctx.moveTo(x, Y(k.c)); });
      const lg = ctx.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, c.dataset.c1 || '#35a2dc'); lg.addColorStop(1, c.dataset.c2 || '#8ff0e6');
      ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      const fg = ctx.createLinearGradient(0, 0, 0, h); fg.addColorStop(0, 'rgba(103,194,194,.25)'); fg.addColorStop(1, 'rgba(103,194,194,0)');
      ctx.fillStyle = fg; ctx.fill();
    } else {
      candles.forEach((k, i) => {
        const x = i * cw + cw / 2, up = k.c >= k.o;
        ctx.strokeStyle = ctx.fillStyle = up ? '#4fd6a8' : '#ef6f6c';
        ctx.beginPath(); ctx.moveTo(x, Y(k.h)); ctx.lineTo(x, Y(k.l)); ctx.stroke();
        const y1 = Y(Math.max(k.o, k.c)), y2 = Y(Math.min(k.o, k.c));
        ctx.fillRect(x - cw * .3, y1, cw * .6, Math.max(1.5, y2 - y1));
      });
    }
    const ly = Y(cur.c);
    ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(143,240,230,.5)'; ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(w, ly); ctx.stroke(); ctx.setLineDash([]);
    const out = c.dataset.out && document.getElementById(c.dataset.out);
    if (out) out.textContent = fmt(cur.c, +c.dataset.dec || 2);
  });
});

window.SOL = { reduce, $, $$, clamp, lerp, fmt, loop, fitCanvas };
})();
