// The «Groceries» dashboard: what each product of the catalogue costs at each store and
// how its prices change. It reads prices.json, which keeps one entry per offer (a
// product at a store) and one point every time its price changes.
// The texts, the formats, the menu and the charts come from ../i18n.js and ../common.js.
//
// prices.json:
//   { "updated": "2026-11-12",
//     "products": { "mercadona:4706": {
//        "name": "Aceite de oliva", "store": "Mercadona", "unit": "ud",
//        "category": "Aceite, especias y salsas", "active": true,
//        "article": "Aceite de oliva virgen extra Hacendado", "image": "https://…",
//        "ref": [5.25, "l"],
//        "prices": [["2026-11-12", 5.25], ...] } } }
//
// "article", "image" and "ref" may be missing: the card then shows what there is.

const state = { days: 90, store: '', category: '', text: '', several: false, cheapest: '', sort: 'gap' };
let data = { updated: '', products: {}, list: [], groups: [] };

const today = () => data.updated;
const categoryOf = (p) => p.category || t('groceries.noCategory');
const unitOf = (p) => t(p.unit === 'kg' ? 'unit.kg' : 'unit.ud');
const LINK_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

// The period starts on the chosen date or, if the history is shorter, where it starts.
function periodStart() {
  const first = data.list.reduce((min, p) => (p.prices[0][0] < min ? p.prices[0][0] : min), today());
  if (!state.days) return first;
  const from = minusDays(today(), state.days);
  return from > first ? from : first;
}

// The products that pass the filters. A product keeps all its offers, also when the
// filter is a store: the comparison is the point of the card.
function visible() {
  const text = state.text.trim().toLowerCase();
  return data.groups
    .filter((p) => !state.store || p.offers.some((o) => o.store === state.store))
    .filter((p) => !state.category || (p.category || '-') === state.category)
    .filter((p) => !state.several || new Set(p.offers.map((o) => o.store)).size > 1)
    .filter((p) => !state.cheapest || cheapestOffer(p, today()).store === state.cheapest)
    .filter((p) => !text || p.name.toLowerCase().includes(text) || p.offers.some((o) => (o.article || '').toLowerCase().includes(text)));
}

// What the page needs of a product: its offers from the cheapest one, how far apart the
// stores are and how its best price has moved in the period.
function summarise(p, from) {
  const offers = [...p.offers].sort((a, b) => comparable(a, today()) - comparable(b, today()));
  const best = offers[0];
  const least = comparable(best, today());
  const most = comparable(offers.at(-1), today());
  return {
    p, offers, best, least,
    gap: least ? (most - least) / least : 0,
    now: priceOn(best, today()),
    before: productPrice(p, from, today()),
  };
}

function split(count) {
  return `<div class="split">${STORES.map((s) => `<span><span class="dot ${s.cls}"></span>${s.name} ${count(s.name)}</span>`).join('')}</div>`;
}

function renderStats(rows, from) {
  const offers = rows.flatMap((r) => r.offers);
  const now = rows.reduce((sum, r) => sum + r.now, 0);
  const before = rows.reduce((sum, r) => sum + r.before, 0);
  // What the same basket would cost with every product at its dearest store.
  const dearest = rows.reduce((sum, r) => sum + r.now * (1 + r.gap), 0);
  const compared = rows.filter((r) => r.offers.length > 1);
  const up = offers.filter((o) => priceOn(o, today()) > priceOn(o, from));
  const down = offers.filter((o) => priceOn(o, today()) < priceOn(o, from));
  const since = t('groceries.since', { date: shortDate.format(day(from)) });
  const at = (list, store) => list.filter((o) => o.store === store).length;
  const stats = [
    [t('groceries.basketCost'), money.format(now), t('groceries.basketDetail'),
      split((s) => money.format(rows.filter((r) => r.best.store === s).reduce((sum, r) => sum + r.now, 0)))],
    [t('groceries.basketChange'), now === before ? t('groceries.noChange') : (now > before ? '▲ ' : '▼ ') + money.format(Math.abs(now - before)),
      `${now === before || !before ? '' : percent.format((now - before) / before) + ' '}${since}`, ''],
    [t('groceries.saving'), money.format(dearest - now), t('groceries.savingDetail', { percent: dearest ? percent.format((now - dearest) / dearest) : '' }), ''],
    [t('groceries.cheapestAt'), String(compared.length), t('groceries.cheapestDetail'),
      split((s) => compared.filter((r) => r.best.store === s).length)],
    [t('groceries.changes'), `▲ ${up.length} · ▼ ${down.length}`, since, split((s) => `▲ ${at(up, s)} ▼ ${at(down, s)}`)],
    [t('groceries.products'), String(rows.length), t('groceries.offersCount', { n: offers.length }), split((s) => at(offers, s))],
  ];
  $('stats').innerHTML = stats.map(([label, value, detail, parts]) => `<div class="card stat"><div class="label">${label}</div><div class="value">${value}</div><div class="detail">${detail}</div>${parts}</div>`).join('');
}

function renderBasket(rows, from) {
  const series = basketSeries(rows.map((r) => r.p), from, today());
  lineChart($('basket'), series, { title: t('groceries.basketCost') });
  $('basket-table').innerHTML = `<table><thead><tr><th>${t('groceries.colFrom')}</th><th class="num">${t('groceries.colBasket')}</th><th class="num">${t('groceries.colChange')}</th></tr></thead><tbody>${series.map((s, i) => `<tr><td>${longDate.format(day(s.date))}</td><td class="num">${money.format(s.value)}</td><td class="num">${i ? change(series[i - 1].value, s.value) : ''}</td></tr>`).reverse().join('')}</tbody></table>`;
}

// The Monday of the week of a date.
function monday(date) {
  const d = day(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

function renderWeeks(rows, from) {
  const weeks = new Map();
  for (let w = monday(from); w <= today(); w = minusDays(w, -7)) weeks.set(w, { label: dayMonth.format(day(w)), values: {} });
  rows.forEach((r) => r.offers.forEach((o) => o.prices.forEach(([d], i) => {
    if (!i || d <= from) return;
    const group = weeks.get(monday(d));
    if (group) group.values[o.store] = (group.values[o.store] || 0) + 1;
  })));
  const groups = [...weeks.values()];
  barChart($('weeks'), groups, STORES, { title: t('groceries.changesPerWeek'), empty: t('groceries.noChangesPeriod') });
  $('weeks-table').innerHTML = `<table><thead><tr><th>${t('groceries.colWeekOf')}</th>${STORES.map((s) => `<th class="num">${s.name}</th>`).join('')}</tr></thead><tbody>${groups.map((g) => `<tr><td>${g.label}</td>${STORES.map((s) => `<td class="num">${g.values[s.name] || 0}</td>`).join('')}</tr>`).reverse().join('')}</tbody></table>`;
}

// A line per offer: the store, the article, its price and how much dearer it is than
// the cheapest one. With a page at the store, the whole line is the link to it.
function offerLine(o, r) {
  const price = priceOn(o, today());
  const ref = Array.isArray(o.ref) && o.ref[0] > 0 && o.ref[1] ? `${money.format(o.ref[0])}/${esc(o.ref[1])}` : '';
  const dearer = r.least ? (comparable(o, today()) - r.least) / r.least : 0;
  const gap = r.offers.length < 2 ? ''
    : dearer < 0.0005 ? `<span class="gap least">${t('groceries.cheapest')}</span>`
    : `<span class="gap">${percent.format(dearer)}</span>`;
  const link = storeLink(o);
  const body = `<span class="store"><span class="dot ${STORE_CLASS[o.store] || ''}"></span>${esc(o.store)}${link ? LINK_ICON : ''}</span>
      <span class="price">${money.format(price)}</span>
      <span class="article">${[esc(o.article || ''), ref].filter(Boolean).join(' · ') || '—'}</span>
      ${gap || '<span></span>'}`;
  return link
    ? `<li><a class="offer" href="${esc(link)}" target="_blank" rel="noopener noreferrer" title="${esc(t('groceries.openAt', { store: o.store }))}">${body}</a></li>`
    : `<li><span class="offer">${body}</span></li>`;
}

const SORTS = {
  gap: (a, b) => b.gap - a.gap,
  change: (a, b) => Math.abs(b.now - b.before) / (b.before || 1) - Math.abs(a.now - a.before) / (a.before || 1),
  price: (a, b) => a.now - b.now,
  name: () => 0,
};

function renderProducts(rows, from) {
  if (!rows.length) { $('products').innerHTML = `<p class="empty">${t('groceries.noMatch')}</p>`; return; }
  const sorted = [...rows].sort((a, b) => SORTS[state.sort](a, b) || a.p.name.localeCompare(b.p.name, 'es'));
  $('products').innerHTML = sorted.map((r) => {
    const image = r.offers.map((o) => o.image).find((url) => /^https:\/\//.test(url || ''));
    const photo = image
      ? `<img class="photo" src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
      : '<span class="photo none"></span>';
    return `<article class="card product" data-name="${esc(r.p.name)}" tabindex="0">
      <div class="top">
        ${photo}
        <div class="about">
          <div class="name">${esc(r.p.name)}</div>
          <div class="minor">${esc(categoryOf(r.p))}</div>
          <div class="best">${money.format(r.now)}<span class="minor">/${esc(unitOf(r.p))}${r.offers.length > 1 ? ' · ' + esc(r.best.store) : ''}</span></div>
        </div>
        <div class="side">${r.best.prices.some(([d], i) => i && d > from) ? sparkline(r.best, from, today()) : ''}${change(r.before, r.now, true)}</div>
      </div>
      <ul class="offers">${r.offers.map((o) => offerLine(o, r)).join('')}</ul>
    </article>`;
  }).join('');
}

function openDetail(name) {
  const p = data.groups.find((g) => g.name === name);
  if (!p) return;
  const r = summarise(p, periodStart());
  $('detail-name').textContent = p.name;
  $('detail-sub').textContent = [categoryOf(p), t(p.unit === 'kg' ? 'groceries.perKilo' : 'groceries.perUnit'), p.byRef ? t('groceries.byRef') : ''].filter(Boolean).join(' · ');
  $('detail-offers').innerHTML = r.offers.map((o) => offerLine(o, r)).join('');
  const points = r.offers
    .flatMap((o) => o.prices.map(([d, price], i) => ({ o, d, price, before: i ? o.prices[i - 1][1] : null })))
    .sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : a.o.store.localeCompare(b.o.store, 'es')));
  $('detail-table').innerHTML = `<table><thead><tr><th>${t('groceries.colFrom')}</th><th>${t('groceries.colStore')}</th><th class="num">${t('groceries.colPrice')}</th><th class="num">${t('groceries.colChange')}</th></tr></thead><tbody>${points.map((x) => `<tr><td>${longDate.format(day(x.d))}</td><td><span class="tag"><span class="dot ${STORE_CLASS[x.o.store] || ''}"></span>${esc(x.o.store)}</span></td><td class="num">${money.format(x.price)}</td><td class="num">${x.before == null ? '' : change(x.before, x.price)}</td></tr>`).join('')}</tbody></table>`;
  $('detail').showModal();
  const lines = r.offers.map((o) => ({ name: o.store, cls: STORE_CLASS[o.store] || '', series: o.prices.map(([date, value]) => ({ date, value })) }));
  linesChart($('detail-chart'), lines, { title: t('groceries.priceOf', { name: p.name }), height: 190, to: today() });
}

function render() {
  const from = periodStart();
  const rows = visible().map((p) => summarise(p, from));
  renderStats(rows, from);
  renderBasket(rows, from);
  renderWeeks(rows, from);
  renderProducts(rows, from);
}

function buttonGroup(id, key, attribute, convert = (v) => v) {
  $(id).addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    state[key] = convert(button.dataset[attribute]);
    $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('current', b === button));
    render();
  });
}

async function start() {
  applyTexts();
  try {
    data = await loadPrices('../');
  } catch (error) {
    $('products').innerHTML = `<p class="empty">${t('groceries.loadError')}</p>`;
    return;
  }
  $('updated').textContent = t('groceries.updated', { when: ago(today()), date: longDate.format(day(today())) });
  // The stores come from the list of common.js: a new one is a line there.
  $('store').insertAdjacentHTML('beforeend', STORES.map((s) => `<button data-store="${s.name}"><span class="dot ${s.cls}"></span>${s.name}</button>`).join(''));
  $('cheapest').insertAdjacentHTML('beforeend', STORES.map((s) => `<option value="${s.name}">${t('groceries.cheapestIn', { store: s.name })}</option>`).join(''));
  $('weeks-legend').innerHTML = STORES.map((s) => `<span><span class="dot ${s.cls}"></span>${s.name}</span>`).join('');
  // The option without a category has an empty value and its text in the current language.
  const categories = [...new Set(data.groups.map((p) => p.category || ''))].sort((a, b) => a.localeCompare(b, 'es'));
  $('category').insertAdjacentHTML('beforeend', categories.map((c) => `<option value="${esc(c || '-')}">${esc(c || t('groceries.noCategory'))}</option>`).join(''));

  buttonGroup('period', 'days', 'days', Number);
  buttonGroup('store', 'store', 'store');
  $('category').addEventListener('change', () => { state.category = $('category').value; render(); });
  $('cheapest').addEventListener('change', () => { state.cheapest = $('cheapest').value; render(); });
  $('sort').addEventListener('change', () => { state.sort = $('sort').value; render(); });
  $('several').addEventListener('change', () => { state.several = $('several').checked; render(); });
  $('search').addEventListener('input', () => { state.text = $('search').value; render(); });
  $('close').addEventListener('click', () => $('detail').close());
  // A card opens the detail of its product, except on a line that is a link to a store.
  $('products').addEventListener('click', (event) => {
    if (event.target.closest('a')) return;
    const card = event.target.closest('.product');
    if (card) openDetail(card.dataset.name);
  });
  $('products').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !event.target.classList.contains('product')) return;
    openDetail(event.target.dataset.name);
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('button[data-table]');
    if (!link) return;
    const table = $(link.dataset.table);
    table.hidden = !table.hidden;
    link.textContent = t(table.hidden ? 'groceries.showTable' : 'groceries.hideTable');
  });
  let wait;
  window.addEventListener('resize', () => { clearTimeout(wait); wait = setTimeout(render, 150); });
  render();

  // The summary links to an offer with ?p=<key>: it opens the product it belongs to.
  const requested = data.products[new URLSearchParams(location.search).get('p')];
  if (requested) openDetail(requested.name);
}

start();
