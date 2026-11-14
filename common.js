// What every dashboard shares: the settings, the language, the menu, the formats and
// the charts. Each page declares on <body> where the site root is (data-root) and which
// menu entry it is (data-page), and loads i18n.js before this file.

// ---------------------------------------------------------------- Settings

const SETTINGS = {
  lang: ['en', 'es'],
  theme: ['cool', 'warm'],
  mode: ['auto', 'light', 'dark'],
  menu: ['top', 'side'],
  width: ['narrow', 'full'],
};
const LANGUAGE_NAMES = { en: 'English', es: 'Español' };
const DEFAULTS = {
  lang: (navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en',
  theme: 'cool', mode: 'auto', menu: 'side', width: 'full',
};
const SWATCHES = { cool: ['#f5f6f8', '#e2e5ea', '#7d8594', '#10141c', '#2a78d6'], warm: ['#f6f6f4', '#e4e3de', '#86857e', '#14140f', '#2a78d6'] };

// Keeps only the settings that exist and hold one of their values.
function validSettings(values) {
  const valid = {};
  for (const [key, options] of Object.entries(SETTINGS)) {
    if (options.includes(values[key])) valid[key] = values[key];
  }
  return valid;
}

// Language and mode are shared with the other sites under moilolon.com through two
// cookies of the whole domain: moilolon-lang (en, es) and moilolon-theme (light, dark),
// which is the mode here. A cookie wins over what was saved for this site alone. The
// automatic mode has no cookie: choosing it removes moilolon-theme.
const SHARED = /(^|\.)moilolon\.com$/.test(location.hostname);

function sharedSettings() {
  const read = (name) => (document.cookie.match(new RegExp(`(?:^|; )moilolon-${name}=([^;]*)`)) || [])[1];
  return validSettings({ lang: read('lang'), mode: read('theme') });
}

function shareSetting(key, value) {
  const cookies = { lang: 'lang', mode: 'theme' };
  if (!SHARED || !cookies[key]) return;
  const keep = value !== 'auto';
  document.cookie = `moilolon-${cookies[key]}=${keep ? value : ''}; domain=.moilolon.com; path=/; max-age=${keep ? 31536000 : 0}; samesite=lax; secure`;
}

function storedSettings() {
  let saved = {};
  try { saved = validSettings(JSON.parse(localStorage.getItem('settings') || '{}')); } catch (error) { /* no storage */ }
  try { return { ...saved, ...sharedSettings() }; } catch (error) { return saved; }
}

// A page opened with ?embed=1 (inside Home Assistant, for instance) hides the menu, and
// the same address can fix settings for that frame: ?embed=1&lang=es&mode=dark. Both
// last while the frame is open, so the links between pages keep them. ?embed=0 undoes it.
function embedOptions() {
  const params = new URLSearchParams(location.search);
  if (!params.has('embed')) {
    try { return JSON.parse(sessionStorage.getItem('embed') || 'null') || { embed: false, settings: {} }; } catch (error) { return { embed: false, settings: {} }; }
  }
  const options = { embed: params.get('embed') !== '0', settings: validSettings(Object.fromEntries(params)) };
  try { sessionStorage.setItem('embed', JSON.stringify(options)); } catch (error) { /* no storage: it holds for this page only */ }
  return options;
}

const EMBED = embedOptions();

function readSettings() {
  return { ...DEFAULTS, ...storedSettings(), ...(EMBED.embed ? EMBED.settings : {}) };
}

function applySettings(settings) {
  const root = document.documentElement;
  for (const key of Object.keys(SETTINGS)) root.dataset[key] = settings[key];
  root.dataset.embed = String(EMBED.embed);
  root.lang = settings.lang;
}

function saveSetting(key, value) {
  const settings = { ...storedSettings(), [key]: value };
  try { localStorage.setItem('settings', JSON.stringify(settings)); } catch (error) { /* no storage: it holds for this visit only */ }
  shareSetting(key, value);
  // Every text and format depends on the language: the simplest is to load again.
  if (key === 'lang') { location.reload(); return; }
  applySettings(readSettings());
  window.dispatchEvent(new Event('resize'));
}

// Applied as early as possible, so the page does not flash in another theme.
applySettings(readSettings());

// ---------------------------------------------------------------- Visits and speed

// Vercel Web Analytics and Speed Insights, loaded only on the published site. Both are
// enabled per project in Vercel; until then their scripts are simply not found.
if (location.hostname === 'dashboard.moilolon.com') {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  for (const src of ['/_vercel/insights/script.js', '/_vercel/speed-insights/script.js']) {
    const script = document.createElement('script');
    script.defer = true;
    script.src = src;
    document.head.appendChild(script);
  }
}

// ---------------------------------------------------------------- Language

const LANG = readSettings().lang;
const LOCALE = LANG === 'es' ? 'es-ES' : 'en-GB';

// The text of a key in the current language, with its {placeholders} filled in.
function t(key, values = {}) {
  const text = STRINGS[LANG][key] ?? STRINGS.en[key] ?? key;
  if (typeof text === 'function') return text(values);
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in values ? values[name] : match));
}

// Fills in the texts written in the HTML: data-i18n for the content, data-i18n-label
// for aria-label and data-i18n-placeholder for the placeholder.
function applyTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-label]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nLabel)); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder)); });
}

// ---------------------------------------------------------------- Menu

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  basket: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
  brand: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

// A new dashboard is an entry here, its folder and its card on the summary.
const MENU = [
  { group: 'menu.general', entries: [{ id: 'summary', title: 'menu.summary', path: '', icon: 'home' }] },
  { group: 'menu.shopping', entries: [{ id: 'groceries', title: 'menu.groceries', path: 'groceries/', icon: 'basket' }] },
];

function renderMenu() {
  const root = document.body.dataset.root || '';
  const page = document.body.dataset.page || '';
  const menu = document.getElementById('menu');
  if (!menu) return;

  // Embedded there is no menu: the other pages get a link back to the summary.
  if (EMBED.embed) {
    if (page !== 'summary') document.querySelector('.page').insertAdjacentHTML('afterbegin', `<a class="back" href="${root || './'}">${icon('back')}${t('summary.back')}</a>`);
    return;
  }

  menu.className = 'menu';
  // The name of the site is the switcher shared with the other sites under moilolon.com.
  // Its script comes from there; until it loads, or if it does not, the link shows.
  const nav = document.createElement('script');
  nav.defer = true;
  nav.src = 'https://moilolon.com/nav.js';
  document.head.appendChild(nav);

  menu.innerHTML = `<div class="brand">${icon('brand')}<moilolon-nav current="dashboard"><a href="${root || './'}">Dashboards</a></moilolon-nav></div>`
    + MENU.map((g) => `<div class="group">${t(g.group)}</div>` + g.entries.map((e) => `<a class="item${e.id === page ? ' current' : ''}" href="${root}${e.path || './'}">${icon(e.icon)}${t(e.title)}</a>`).join('')).join('')
    + `<div class="bottom">
        <a class="item" href="https://github.com/moilolon/dashboard">${icon('code')}${t('menu.code')}</a>
        <button class="item" id="settings-button" aria-expanded="false">${icon('settings')}${t('menu.settings')}</button>
        <div class="settings" id="settings" hidden></div>
      </div>`;

  const panel = document.getElementById('settings');
  const button = document.getElementById('settings-button');
  const renderSettings = () => {
    const settings = readSettings();
    panel.innerHTML = Object.entries(SETTINGS).map(([key, options]) => `<div class="label">${t(`settings.${key}`)}</div><div class="button-group">${options.map((value) => {
      const swatch = key === 'theme' ? `<span class="swatch">${SWATCHES[value].map((c) => `<i style="background:${c}"></i>`).join('')}</span>` : '';
      const text = key === 'lang' ? LANGUAGE_NAMES[value] : t(`settings.${value}`);
      return `<button data-key="${key}" data-value="${value}" class="${settings[key] === value ? 'current' : ''}">${swatch}${text}</button>`;
    }).join('')}</div>`).join('');
  };
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) renderSettings();
  });
  panel.addEventListener('click', (event) => {
    event.stopPropagation();
    const b = event.target.closest('button[data-key]');
    if (!b) return;
    saveSetting(b.dataset.key, b.dataset.value);
    renderSettings();
  });
  document.addEventListener('click', () => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); });
}

document.addEventListener('DOMContentLoaded', renderMenu);

// ---------------------------------------------------------------- Formats

const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR' });
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const longDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: '2-digit' });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' });

const day = (text) => new Date(text + 'T12:00:00');
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (id) => document.getElementById(id);

function minusDays(date, days) {
  const d = day(date);
  d.setDate(d.getDate() - days);
  return iso(d);
}

function ago(date) {
  const days = Math.round((day(iso(new Date())) - day(date)) / 86400000);
  if (days <= 0) return t('time.today');
  if (days === 1) return t('time.yesterday');
  return t('time.daysAgo', { n: days });
}

// A rise or a fall, always with an arrow and a figure besides the colour.
function change(before, now, relativeOnly = false) {
  if (before == null || now == null || before === now) return '';
  const up = now > before;
  const relative = before ? percent.format((now - before) / before) : '';
  const text = relativeOnly && relative ? relative : `${money.format(now - before)}${relative ? ' · ' + relative : ''}`;
  return `<span class="change ${up ? 'up' : 'down'}"><span class="arrow">${up ? '▲' : '▼'}</span>${text}</span>`;
}

// ---------------------------------------------------------------- Prices

const STORES = [{ name: 'Mercadona', cls: 's1' }, { name: 'Alcampo', cls: 's2' }];
const STORE_CLASS = Object.fromEntries(STORES.map((s) => [s.name, s.cls]));

// The price of a product on a date: the one of the last point on or before it.
function priceAt(product, date) {
  let price = null;
  for (const [d, p] of product.prices) {
    if (d <= date) price = p; else break;
  }
  return price;
}

async function loadPrices(root) {
  const response = await fetch(`${root}groceries/prices.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error(response.status);
  const data = await response.json();
  data.list = Object.entries(data.products)
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => p.active !== false && p.prices.length)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return data;
}

// The sum of the prices on every date something changed, from a date on.
function basketSeries(products, from, to) {
  const dates = new Set([from, to]);
  products.forEach((p) => p.prices.forEach(([d]) => { if (d > from && d <= to) dates.add(d); }));
  return [...dates].sort().map((d) => ({
    date: d,
    value: products.reduce((sum, p) => sum + (priceAt(p, d) ?? p.prices[0][1]), 0),
  }));
}

// ---------------------------------------------------------------- Charts

// Step line: a value holds until it changes.
function lineChart(box, series, options = {}) {
  box.innerHTML = '';
  if (!series.length) { box.innerHTML = `<p class="empty">${t('chart.noData')}</p>`; return; }
  const width = Math.max(box.clientWidth, 280);
  const height = options.height || 210;
  const m = { top: 10, right: 12, bottom: 22, left: 54 };
  const t0 = day(series[0].date).getTime();
  const t1 = Math.max(day(series[series.length - 1].date).getTime(), t0 + 86400000);
  let min = Math.min(...series.map((s) => s.value));
  let max = Math.max(...series.map((s) => s.value));
  const slack = (max - min || max * 0.02 || 1) * 0.2;
  min = Math.max(0, min - slack); max += slack;
  const x = (time) => m.left + ((time - t0) / (t1 - t0)) * (width - m.left - m.right);
  const y = (v) => m.top + (1 - (v - min) / (max - min)) * (height - m.top - m.bottom);

  let path = '';
  series.forEach((s, i) => {
    const px = x(day(s.date).getTime());
    path += i === 0 ? `M${px},${y(s.value)}` : `H${px}V${y(s.value)}`;
  });
  path += `H${x(t1)}`;

  const cls = options.cls || '';
  const axisY = [0, 0.5, 1].map((f) => min + (max - min) * f).map((v) => `<line class="grid-y" x1="${m.left}" x2="${width - m.right}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.left - 8}" y="${y(v) + 3}" text-anchor="end">${money.format(v)}</text>`).join('');
  const axisX = `<text x="${m.left}" y="${height - 5}">${shortDate.format(new Date(t0))}</text><text x="${width - m.right}" y="${height - 5}" text-anchor="end">${shortDate.format(new Date(t1))}</text>`;
  const marks = series.length > 1 && series.length <= 40 ? series.slice(1, -1).map((s) => `<circle class="mark ${cls}" r="4" cx="${x(day(s.date).getTime())}" cy="${y(s.value)}"/>`).join('') : '';

  box.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(options.title || t('chart.trend'))}">
    <g class="axis">${axisY}${axisX}</g>
    <path class="line ${cls}" d="${path}"/>${marks}
    <line class="cursor" y1="${m.top}" y2="${height - m.bottom}" visibility="hidden"/>
    <rect x="${m.left}" y="${m.top}" width="${width - m.left - m.right}" height="${height - m.top - m.bottom}" fill="transparent"/>
  </svg><div class="tip" hidden></div>`;

  const svg = box.querySelector('svg');
  const cursor = box.querySelector('.cursor');
  const tip = box.querySelector('.tip');
  const move = (event) => {
    const frame = svg.getBoundingClientRect();
    const px = ((event.clientX - frame.left) / frame.width) * width;
    const time = t0 + ((px - m.left) / (width - m.left - m.right)) * (t1 - t0);
    let current = series[0];
    for (const s of series) if (day(s.date).getTime() <= time) current = s;
    const cx = Math.min(Math.max(px, m.left), width - m.right);
    cursor.setAttribute('x1', cx); cursor.setAttribute('x2', cx); cursor.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.textContent = t('chart.since', { value: money.format(current.value), date: shortDate.format(day(current.date)) });
    placeTip(tip, (cx / width) * frame.width, (y(current.value) / height) * frame.height, frame.width);
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerdown', move);
  svg.addEventListener('pointerleave', () => { cursor.setAttribute('visibility', 'hidden'); tip.hidden = true; });
}

// Puts a chart tooltip above a point, centred on it but kept inside the chart: near an
// edge it would stick out, and in a dialog that adds a horizontal scrollbar.
function placeTip(tip, left, top, frameWidth) {
  const half = tip.offsetWidth / 2;
  tip.style.left = `${Math.min(Math.max(left, half), Math.max(frameWidth - half, half))}px`;
  tip.style.top = `${top}px`;
}

// Stacked bars: one per group, with a segment per series.
//   groups: [{ label, values: { Mercadona: 3, Alcampo: 1 } }]
//   series: [{ name: 'Mercadona', cls: 's1' }]
function barChart(box, groups, series, options = {}) {
  box.innerHTML = '';
  const total = (g) => series.reduce((sum, s) => sum + (g.values[s.name] || 0), 0);
  const highest = Math.max(...groups.map(total), 0);
  if (!groups.length || !highest) { box.innerHTML = `<p class="empty">${esc(options.empty || t('chart.noData'))}</p>`; return; }
  const width = Math.max(box.clientWidth, 280);
  const height = options.height || 210;
  const m = { top: 10, right: 12, bottom: 22, left: 30 };
  const ceiling = Math.max(highest, 4);
  const step = (width - m.left - m.right) / groups.length;
  const thickness = Math.min(Math.max(step - 4, 2), 28);
  const y = (v) => m.top + (1 - v / ceiling) * (height - m.top - m.bottom);

  const axisY = [0, 0.5, 1].map((f) => Math.round(ceiling * f)).map((v) => `<line class="grid-y" x1="${m.left}" x2="${width - m.right}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.left - 8}" y="${y(v) + 3}" text-anchor="end">${v}</text>`).join('');
  const axisX = `<text x="${m.left}" y="${height - 5}">${esc(groups[0].label)}</text><text x="${width - m.right}" y="${height - 5}" text-anchor="end">${esc(groups[groups.length - 1].label)}</text>`;
  const bars = groups.map((g, i) => {
    const cx = m.left + step * i + (step - thickness) / 2;
    let base = 0;
    const segments = series.map((s) => {
      const v = g.values[s.name] || 0;
      if (!v) return '';
      const top = y(base + v), bottom = y(base);
      base += v;
      // A 2px gap between stacked segments.
      return `<rect class="bar-${s.cls}" x="${cx}" y="${top + 1}" width="${thickness}" height="${Math.max(bottom - top - 2, 1)}" rx="2"/>`;
    }).join('');
    return `<g data-i="${i}">${segments}<rect x="${m.left + step * i}" y="${m.top}" width="${step}" height="${height - m.top - m.bottom}" fill="transparent"/></g>`;
  }).join('');

  box.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(options.title || t('chart.bars'))}"><g class="axis">${axisY}${axisX}</g>${bars}</svg><div class="tip" hidden></div>`;
  const svg = box.querySelector('svg');
  const tip = box.querySelector('.tip');
  svg.addEventListener('pointermove', (event) => {
    const group = event.target.closest('g[data-i]');
    if (!group) { tip.hidden = true; return; }
    const g = groups[Number(group.dataset.i)];
    const frame = svg.getBoundingClientRect();
    tip.hidden = false;
    tip.textContent = `${g.label}: ${series.map((s) => `${s.name} ${g.values[s.name] || 0}`).join(' · ')}`;
    placeTip(tip, event.clientX - frame.left, event.clientY - frame.top, frame.width);
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
}

// Tiny chart of the price of a product between two dates.
function sparkline(product, from, to) {
  const points = [[from, priceAt(product, from) ?? product.prices[0][1]], ...product.prices.filter(([d]) => d > from && d <= to)];
  if (points.length < 2) return '';
  const t0 = day(from).getTime();
  const t1 = Math.max(day(to).getTime(), t0 + 86400000);
  const values = points.map(([, p]) => p);
  const min = Math.min(...values), max = Math.max(...values);
  const x = (time) => 2 + ((time - t0) / (t1 - t0)) * 80;
  const y = (v) => 19 - ((v - min) / (max - min || 1)) * 16;
  let d = '';
  points.forEach(([date, p], i) => { d += i === 0 ? `M${x(day(date).getTime())},${y(p)}` : `H${x(day(date).getTime())}V${y(p)}`; });
  return `<svg class="spark" viewBox="0 0 84 22" aria-hidden="true"><path d="${d}H82"/></svg>`;
}
