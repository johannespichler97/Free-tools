/* ============================================================
   MARKET ANALYTICS – Economic Calendar
   Finnhub API: https://finnhub.io/docs/api/economic-calendar
   ============================================================ */

const API_KEY = 'd4fevfpr01qkcvvhv6h0d4fevfpr01qkcvvhv6hg';
const API_BASE = 'https://finnhub.io/api/v1';

// ── Country → currency mapping for flag display ───────────────
const CURRENCY_META = {
  USD: { flag: 'us', name: 'United States' },
  EUR: { flag: 'eu', name: 'Eurozone' },
  GBP: { flag: 'gb', name: 'United Kingdom' },
  JPY: { flag: 'jp', name: 'Japan' },
  CHF: { flag: 'ch', name: 'Switzerland' },
  CAD: { flag: 'ca', name: 'Canada' },
  AUD: { flag: 'au', name: 'Australia' },
  NZD: { flag: 'nz', name: 'New Zealand' },
  CNY: { flag: 'cn', name: 'China' },
  SEK: { flag: 'se', name: 'Sweden' },
  NOK: { flag: 'no', name: 'Norway' },
  MXN: { flag: 'mx', name: 'Mexico' },
  XAU: { flag: 'xau', name: 'Gold' },
};

// Keywords that are relevant for Gold traders
const GOLD_KEYWORDS = [
  'inflation', 'cpi', 'pce', 'fed', 'federal reserve', 'interest rate',
  'fomc', 'nfp', 'non-farm', 'unemployment', 'gdp', 'treasury',
  'dollar', 'dollar index', 'dxy', 'consumer price', 'ppi',
  'retail sales', 'ism', 'pmI'
];

// State
let allEvents = [];
let activeFilters = {
  impacts: new Set([1, 2, 3]),
  currencies: new Set(['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'XAU']),
  from: null,
  to: null,
};

// ── Date helpers ──────────────────────────────────────────────
function toYMD(date) {
  return date.toISOString().split('T')[0];
}

function getDateRange(range) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ranges = {
    yesterday: () => {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return { from: toYMD(d), to: toYMD(d) };
    },
    today: () => ({ from: toYMD(today), to: toYMD(today) }),
    tomorrow: () => {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      return { from: toYMD(d), to: toYMD(d) };
    },
    this_week: () => {
      const day = today.getDay();
      const mon = new Date(today);
      mon.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);
      return { from: toYMD(mon), to: toYMD(fri) };
    },
    next_week: () => {
      const day = today.getDay();
      const nextMon = new Date(today);
      nextMon.setDate(today.getDate() + (day === 0 ? 1 : 8 - day));
      const nextFri = new Date(nextMon);
      nextFri.setDate(nextMon.getDate() + 4);
      return { from: toYMD(nextMon), to: toYMD(nextFri) };
    },
  };

  return ranges[range] ? ranges[range]() : ranges.today();
}

function formatTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function isUpcoming(dateStr) {
  if (!dateStr) return false;
  const eventTime = new Date(dateStr);
  const now = new Date();
  const diff = eventTime - now;
  return diff > 0 && diff < 3600000; // within next 60 min
}

function isPast(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// ── Impact helpers ────────────────────────────────────────────
function getImpact(event) {
  // Finnhub uses 'impact' field: 'high', 'medium', 'low', or numeric
  const raw = event.impact;
  if (!raw) return 1;
  if (typeof raw === 'number') return raw;
  const map = { high: 3, medium: 2, low: 1 };
  return map[raw.toLowerCase()] || 1;
}

function impactLabel(level) {
  const labels = { 3: 'High', 2: 'Medium', 1: 'Low' };
  return labels[level] || 'Low';
}

function impactClass(level) {
  const classes = { 3: 'high', 2: 'medium', 1: 'low' };
  return classes[level] || 'low';
}

// ── Currency detection ────────────────────────────────────────
function detectCurrency(event) {
  if (event.currency) return event.currency.toUpperCase();
  if (event.country) {
    const map = {
      'united states': 'USD', 'us': 'USD',
      'europe': 'EUR', 'euro area': 'EUR', 'eurozone': 'EUR',
      'germany': 'EUR', 'france': 'EUR', 'italy': 'EUR', 'spain': 'EUR',
      'united kingdom': 'GBP', 'uk': 'GBP',
      'japan': 'JPY',
      'switzerland': 'CHF',
      'canada': 'CAD',
      'australia': 'AUD',
      'new zealand': 'NZD',
      'china': 'CNY',
      'sweden': 'SEK',
      'norway': 'NOK',
    };
    return map[event.country.toLowerCase()] || 'USD';
  }
  return 'USD';
}

// ── Flag image URL (using flagcdn.com) ────────────────────────
function flagUrl(currency) {
  if (currency === 'XAU') return null;
  const meta = CURRENCY_META[currency];
  if (!meta) return null;
  return `https://flagcdn.com/w40/${meta.flag}.png`;
}

// ── Value formatting ──────────────────────────────────────────
function formatValue(val, unit) {
  if (val === null || val === undefined || val === '') return '<span class="val-empty">—</span>';
  const num = parseFloat(val);
  if (isNaN(num)) return `<span class="val-neutral">${val}</span>`;

  const suffix = unit || '';
  const formatted = suffix.includes('%')
    ? `${num.toFixed(1)}%`
    : suffix
      ? `${num} ${suffix}`
      : num.toString();

  return `<span class="val-neutral">${formatted}</span>`;
}

function formatActual(actual, forecast, unit) {
  if (actual === null || actual === undefined || actual === '') {
    return '<span class="val-empty">Pending</span>';
  }
  const num = parseFloat(actual);
  const fore = parseFloat(forecast);
  if (isNaN(num)) return `<span class="val-neutral">${actual}</span>`;

  const suffix = unit && unit.includes('%') ? '%' : (unit ? ` ${unit}` : '');
  const formatted = `${num.toFixed(unit && unit.includes('%') ? 1 : 2)}${suffix}`;

  if (!isNaN(fore)) {
    if (num > fore) return `<span class="val-positive">${formatted}</span>`;
    if (num < fore) return `<span class="val-negative">${formatted}</span>`;
  }
  return `<span class="val-neutral">${formatted}</span>`;
}

// ── Filter logic ──────────────────────────────────────────────
function passesFilters(event) {
  const impact = getImpact(event);
  const currency = detectCurrency(event);

  if (!activeFilters.impacts.has(impact)) return false;

  // Check if currency matches OR if it's a gold-relevant USD event
  const currencyMatch = activeFilters.currencies.has(currency);
  const goldSelected = activeFilters.currencies.has('XAU');
  const isGoldRelevant = goldSelected && currency === 'USD' &&
    GOLD_KEYWORDS.some(kw => (event.event || '').toLowerCase().includes(kw));

  return currencyMatch || isGoldRelevant;
}

function applyFilters() {
  const filtered = allEvents.filter(passesFilters);
  renderTable(filtered);
}

// ── Render table ──────────────────────────────────────────────
function renderTable(events) {
  const tbody = document.getElementById('calendarBody');
  const table = document.getElementById('calendarTable');
  const emptyState = document.getElementById('emptyState');

  if (events.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }

  emptyState.style.display = 'none';
  table.style.display = 'table';
  tbody.innerHTML = '';

  // Group events by date
  const grouped = {};
  events.forEach(ev => {
    const dateKey = (ev.time || ev.date || '').split('T')[0];
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(ev);
  });

  const sortedDates = Object.keys(grouped).sort();

  sortedDates.forEach(dateKey => {
    // Day separator
    const sepRow = document.createElement('tr');
    sepRow.className = 'day-separator';
    sepRow.innerHTML = `<td colspan="7">${formatDate(dateKey)}</td>`;
    tbody.appendChild(sepRow);

    // Sort events by time within the day
    const dayEvents = grouped[dateKey].sort((a, b) => {
      const ta = new Date(a.time || a.date || 0);
      const tb = new Date(b.time || b.date || 0);
      return ta - tb;
    });

    dayEvents.forEach(ev => {
      const impact = getImpact(ev);
      const impClass = impactClass(impact);
      const impLabel = impactLabel(impact);
      const currency = detectCurrency(ev);
      const timeStr = formatTime(ev.time || ev.date);
      const upcoming = isUpcoming(ev.time || ev.date);
      const past = isPast(ev.time || ev.date);
      const flag = flagUrl(currency);

      // Impact dots (3 dots, filled up to impact level)
      const dots = [1, 2, 3].map(i =>
        `<span class="impact-dot${i <= impact ? ' filled' : ''}"></span>`
      ).join('');

      // Gold badge for XAU-relevant events
      const isGoldTag = currency === 'USD' &&
        GOLD_KEYWORDS.some(kw => (ev.event || '').toLowerCase().includes(kw));

      const goldTag = (activeFilters.currencies.has('XAU') && isGoldTag)
        ? '<span style="margin-left:6px;font-size:10px;color:var(--gold);background:var(--gold-bg);padding:1px 6px;border-radius:10px;font-weight:700;">GOLD</span>'
        : '';

      const flagHtml = flag
        ? `<img class="currency-flag" src="${flag}" alt="${currency}" loading="lazy" />`
        : `<span style="font-size:16px;">&#129695;</span>`;

      const row = document.createElement('tr');
      row.className = `event-row${upcoming ? ' upcoming-event' : ''}`;
      row.dataset.impact = impact;
      row.dataset.currency = currency;

      row.innerHTML = `
        <td class="cell-time ${past ? 'past' : upcoming ? 'upcoming' : ''}">${timeStr}</td>
        <td>
          <div class="cell-currency">
            ${flagHtml}
            <span class="currency-code">${currency}</span>
          </div>
        </td>
        <td>
          <span class="impact-badge ${impClass}">
            <span class="impact-dots">${dots}</span>
            ${impLabel}
          </span>
        </td>
        <td class="cell-event">
          <div class="event-name">${ev.event || 'N/A'}${goldTag}</div>
          <div class="event-country">${CURRENCY_META[currency]?.name || currency}</div>
        </td>
        <td class="cell-actual">${formatActual(ev.actual, ev.estimate, ev.unit)}</td>
        <td class="cell-forecast">${formatValue(ev.estimate, ev.unit)}</td>
        <td class="cell-previous">${formatValue(ev.prev, ev.unit)}</td>
      `;
      tbody.appendChild(row);
    });
  });
}

// ── API fetch ─────────────────────────────────────────────────
async function fetchCalendar(from, to) {
  const loading = document.getElementById('loading');
  const errorState = document.getElementById('errorState');
  const errorMsg = document.getElementById('errorMsg');
  const table = document.getElementById('calendarTable');
  const emptyState = document.getElementById('emptyState');

  loading.style.display = 'flex';
  errorState.style.display = 'none';
  table.style.display = 'none';
  emptyState.style.display = 'none';

  const range = from && to
    ? { from, to }
    : getDateRange(document.querySelector('.tab-btn.active')?.dataset.range || 'today');

  try {
    const url = `${API_BASE}/calendar/economic?from=${range.from}&to=${range.to}&token=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    allEvents = data.economicCalendar || data || [];

    if (!Array.isArray(allEvents)) {
      throw new Error('Unexpected API response format.');
    }

    loading.style.display = 'none';
    applyFilters();

    // Update last updated time
    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    document.getElementById('lastUpdated').textContent = `Updated ${now}`;

  } catch (err) {
    loading.style.display = 'none';
    errorState.style.display = 'flex';
    errorMsg.textContent = err.message || 'Network error. Please try again.';
    console.error('Economic Calendar Error:', err);
  }
}

// ── Event listeners ───────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const range = getDateRange(btn.dataset.range);
    document.getElementById('dateFrom').value = range.from;
    document.getElementById('dateTo').value = range.to;
    fetchCalendar(range.from, range.to);
  });
});

document.getElementById('applyDate').addEventListener('click', () => {
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  if (from && to) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    fetchCalendar(from, to);
  }
});

document.getElementById('refreshBtn').addEventListener('click', () => {
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  fetchCalendar(from || undefined, to || undefined);
});

// Impact filter clicks
document.querySelectorAll('.impact-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const impact = parseInt(chip.dataset.impact);
    chip.classList.toggle('active');
    const cb = chip.querySelector('input');
    cb.checked = chip.classList.contains('active');
    if (chip.classList.contains('active')) {
      activeFilters.impacts.add(impact);
    } else {
      activeFilters.impacts.delete(impact);
    }
    applyFilters();
  });
});

// Currency filter clicks
document.querySelectorAll('.currency-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const currency = chip.querySelector('input').value;
    chip.classList.toggle('active');
    const cb = chip.querySelector('input');
    cb.checked = chip.classList.contains('active');
    if (chip.classList.contains('active')) {
      activeFilters.currencies.add(currency);
    } else {
      activeFilters.currencies.delete(currency);
    }
    applyFilters();
  });
});

// ── Auto-refresh every 60 seconds ────────────────────────────
setInterval(() => {
  const from = document.getElementById('dateFrom').value;
  const to = document.getElementById('dateTo').value;
  fetchCalendar(from || undefined, to || undefined);
}, 60000);

// ── Init ──────────────────────────────────────────────────────
(function init() {
  const todayRange = getDateRange('today');
  document.getElementById('dateFrom').value = todayRange.from;
  document.getElementById('dateTo').value = todayRange.to;
  fetchCalendar(todayRange.from, todayRange.to);
})();
