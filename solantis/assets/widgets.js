/* Analytics widgets shared by the homepage preview and the analytics page. Demo data only. */
(() => {
const { reduce, $, $$, clamp, lerp, loop } = SOL;

// Where the analytics tools live. Change this when the platform gets its own domain.
const ANALYTICS_BASE = '../';

const ICONS = {
  cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  str: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
  vol: '<path d="M2 12h3l3-8 4 16 3-8h7"/>',
  corr: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/>',
  pat: '<path d="M3 18l4-8 4 5 4-10 6 13"/>',
  sr: '<path d="M3 7h18M3 17h18"/><path d="M5 15l4-6 4 4 4-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8"/>'
};
const TOOLS = [
  ['cal', 'Economic Calendar', 'High-impact releases, forecasts and actuals — filtered by currency and impact.', 'Fundamentals', 'economic-calendar.html'],
  ['news', 'Market News', 'Curated forex, crypto and gold headlines, filtered by asset and date.', 'Fundamentals', 'market-news.html'],
  ['trend', 'Trend Bias', 'Directional bias across multiple timeframes, scored in one number.', 'Technical', 'trend-bias.html'],
  ['str', 'Currency Strength', 'All eight majors ranked by momentum, updated live.', 'Technical', 'currency-strength.html'],
  ['gauge', 'Aggregate Signal', 'Consensus of 16 indicators with ADX trend strength.', 'Signals', 'aggregate-signal.html'],
  ['vol', 'Volatility Scanner', 'Find the pairs that are actually moving — and the ones that aren\'t.', 'Technical', 'volatility-scanner.html'],
  ['corr', 'Correlation Matrix', 'Avoid doubling risk. See which pairs move together.', 'Risk', 'correlation-matrix.html'],
  ['pat', 'Pattern Recognition', 'Candlestick and chart patterns detected automatically.', 'Signals', 'pattern-recognition.html'],
  ['sr', 'Support / Resistance', 'Key levels and pivots for every major pair.', 'Technical', 'support-resistance.html'],
  ['clock', 'Trading Sessions', 'Sydney, Tokyo, London, New York — and their overlaps.', 'Timing', 'trading-sessions.html'],
  ['calc', 'Position Size Calculator', 'Exact lot size from risk, stop-loss and account size.', 'Risk', 'position-size-calculator.html'],
  ['trophy', 'Trading Challenges', 'Recurring competitions with a live leaderboard ranked by % gain.', 'Engagement', 'challenges.html']
];
const icon = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

/* compact tool list (homepage) */
$$('[data-tool-list]').forEach(el => {
  el.innerHTML = TOOLS.map(([k, n]) => `<li>${icon(k)}<span>${n}</span></li>`).join('');
});

/* full tool grid with category filter (analytics page) */
$$('[data-tool-grid]').forEach(grid => {
  grid.innerHTML = TOOLS.map(([k, n, d, cat, file]) => `
    <a class="tool card" data-cat="${cat}" href="${ANALYTICS_BASE}${file}" target="_blank" rel="noopener">
      <div class="tool-top"><span class="tool-ic">${icon(k)}</span><span class="tool-cat">${cat}</span></div>
      <div><h3>${n}</h3><p>${d}</p></div>
      <span class="tool-go">Open tool <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 12 12 4M6 4h6v6"/></svg></span>
    </a>`).join('');
  const bar = $('[data-tool-filter]');
  if (!bar) return;
  const cats = ['All', ...new Set(TOOLS.map(t => t[3]))];
  bar.innerHTML = cats.map((c, i) => `<button class="${i ? '' : 'on'}" data-c="${c}">${c}</button>`).join('');
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', bar).forEach(x => x.classList.toggle('on', x === b));
    $$('.tool', grid).forEach(t => t.classList.toggle('off', b.dataset.c !== 'All' && t.dataset.cat !== b.dataset.c));
  });
});

/* aggregate signal gauge */
$$('[data-gauge]').forEach(el => {
  const big = el.hasAttribute('data-big');
  el.innerHTML = `
    <svg viewBox="0 0 200 120" class="gauge-svg">
      <defs><linearGradient id="gg${big ? 'b' : 's'}" x1="0" x2="1"><stop offset="0" stop-color="#ef6f6c"/><stop offset=".5" stop-color="#8ea3ae"/><stop offset="1" stop-color="#4fd6a8"/></linearGradient></defs>
      <path d="M20 105a80 80 0 0 1 160 0" fill="none" stroke="rgba(230,233,235,.07)" stroke-width="14" stroke-linecap="round"/>
      <path d="M20 105a80 80 0 0 1 160 0" fill="none" stroke="url(#gg${big ? 'b' : 's'})" stroke-width="14" stroke-linecap="round" stroke-dasharray="3 5" opacity=".9"/>
      <g class="needle"><line x1="100" y1="105" x2="100" y2="38" stroke="#e6e9eb" stroke-width="3" stroke-linecap="round"/></g>
      <circle cx="100" cy="105" r="7" fill="#67c2c2"/>
    </svg>
    <div class="gauge-read"><b data-verdict>Strong Buy</b><small data-adx>ADX 31 · trending</small></div>`;
  const needle = $('.needle', el), verdict = $('[data-verdict]', el), adx = $('[data-adx]', el);
  const counts = big ? $$('[data-count]') : [];
  let target = 0.72, cur = 0;
  const pick = () => {
    target = clamp(target + (Math.random() - .45) * .5, -.9, .95);
    verdict.textContent = target > .5 ? 'Strong Buy' : target > .15 ? 'Buy' : target > -.15 ? 'Neutral' : target > -.5 ? 'Sell' : 'Strong Sell';
    verdict.style.color = target > .15 ? 'var(--up)' : target < -.15 ? 'var(--down)' : 'var(--ink)';
    adx.textContent = `ADX ${Math.round(18 + Math.abs(target) * 22)} · ${Math.abs(target) > .3 ? 'trending' : 'ranging'}`;
    if (counts.length) {
      const buy = Math.round(8 + target * 7), sell = Math.round(clamp(4 - target * 6, 0, 16 - buy)), neu = 16 - buy - sell;
      counts.forEach(c => c.textContent = { buy, sell, neu }[c.dataset.count]);
      $$('.ind-dot').forEach((d, i) => d.className = 'ind-dot ' + (i < buy ? 'b' : i < buy + neu ? 'n' : 's'));
    }
  };
  pick(); setInterval(pick, 3200);
  loop(el, t => { cur = lerp(cur, target, .06); needle.style.transform = `rotate(${cur * 80 + Math.sin(t * 3) * 1.2}deg)`; });
});

/* currency strength bars (re-ranked live) */
$$('[data-strength]').forEach(el => {
  const cur = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'NZD', 'CAD'];
  const v = { USD: 7.8, EUR: 6.1, GBP: 5.6, JPY: 2.9, CHF: 4.4, AUD: 3.8, NZD: 3.1, CAD: 4.9 };
  const max = +el.dataset.strength || 8;
  el.innerHTML = cur.map(c => `<div class="sb" data-c="${c}"><span>${c}</span><i><em></em></i><b></b></div>`).join('');
  const rows = Object.fromEntries($$('.sb', el).map(r => [r.dataset.c, r]));
  const render = () => {
    const order = [...cur].sort((a, b) => v[b] - v[a]).slice(0, max);
    cur.forEach(c => {
      const r = rows[c], i = order.indexOf(c);
      r.style.display = i < 0 ? 'none' : '';
      if (i < 0) return;
      r.style.transform = `translateY(${i * 100}%)`;
      $('em', r).style.width = (v[c] * 10) + '%';
      $('em', r).style.background = v[c] >= 5 ? 'linear-gradient(90deg,var(--teal),var(--up))' : v[c] >= 3.5 ? 'linear-gradient(90deg,var(--blue),var(--teal))' : 'linear-gradient(90deg,#7a4c55,var(--down))';
      $('b', r).textContent = v[c].toFixed(1);
    });
    el.style.height = `calc(${order.length} * var(--sbh))`;
  };
  render();
  setInterval(() => { cur.forEach(c => v[c] = clamp(v[c] + (Math.random() - .5) * .9, .5, 9.8)); render(); }, 2200);
});

/* trend bias across timeframes */
$$('[data-trend]').forEach(el => {
  const tfs = ['M15', 'H1', 'H4', 'D1'];
  el.innerHTML = tfs.map(t => `<div class="tb"><small>${t}</small><span class="tb-arr">↑</span></div>`).join('');
  const cells = $$('.tb', el);
  const set = () => cells.forEach(c => {
    const r = Math.random(), up = r > .25, flat = r > .15 && r <= .25;
    const a = $('.tb-arr', c);
    a.textContent = flat ? '→' : up ? '↑' : '↓';
    c.className = 'tb ' + (flat ? 'n' : up ? 'u' : 'd');
  });
  set(); setInterval(set, 2600);
});

/* economic calendar countdown */
$$('[data-countdown]').forEach(el => {
  let s = +el.dataset.countdown;
  const f = n => String(n).padStart(2, '0');
  const tick = () => { s = s > 0 ? s - 1 : 9999; const d = s / 86400 | 0; el.textContent = `${d ? d + 'd ' : ''}${f((s % 86400) / 3600 | 0)}:${f((s % 3600) / 60 | 0)}:${f(s % 60)}`; };
  tick(); setInterval(tick, 1000);
});

/* count-up numbers */
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  cio.unobserve(e.target);
  const el = e.target, to = +el.dataset.countup, t0 = performance.now();
  const step = t => { const p = reduce ? 1 : clamp((t - t0) / 1400, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), { threshold: .6 });
$$('[data-countup]').forEach(el => cio.observe(el));
})();
