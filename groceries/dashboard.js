// The «Groceries» dashboard: how the prices of the products in the catalogue change.
// It reads prices.json, which keeps one point per product every time its price changes.
// The texts, the formats, the menu and the charts come from ../i18n.js and ../common.js.
//
// prices.json:
//   { "updated": "2026-11-12",
//     "products": { "mercadona:4706": {
//        "name": "Aceite de oliva", "store": "Mercadona", "unit": "ud",
//        "category": "Aceite, especias y salsas", "active": true,
//        "prices": [["2026-11-12", 5.25], ...] } } }

const state = { days: 90, store: '', category: '', text: '' };
let data = { updated: '', products: {}, list: [] };

const today = () => data.updated;
const categoryOf = (p) => p.category || t('groceries.noCategory');

// The period starts on the chosen date or, if the history is shorter, where it starts.
function periodStart() {
  const first = data.list.reduce((min, p) => (p.prices[0][0] < min ? p.prices[0][0] : min), today());
  if (!state.days) return first;
  const from = minusDays(today(), state.days);
  return from > first ? from : first;
}

function visible() {
  const text = state.text.trim().toLowerCase();
  return data.list
    .filter((p) => !state.store || p.store === state.store)
    .filter((p) => !state.category || (p.category || '-') === state.category)
    .filter((p) => !text || p.name.toLowerCase().includes(text));
}

const startPrice = (p, from) => priceAt(p, from) ?? p.prices[0][1];
const currentPrice = (p) => p.prices.at(-1)[1];

function split(products, count) {
  return `<div class="split">${STORES.map((s) => `<span><span class="dot ${s.cls}"></span>${s.name} ${count(products.filter((p) => p.store === s.name))}</span>`).join('')}</div>`;
}

function renderStats(products, from) {
  const sum = (list, price) => list.reduce((s, p) => s + price(p), 0);
  const now = sum(products, currentPrice);
  const before = sum(products, (p) => startPrice(p, from));
  const up = (list) => list.filter((p) => currentPrice(p) > startPrice(p, from));
  const down = (list) => list.filter((p) => currentPrice(p) < startPrice(p, from));
  const same = (list) => list.filter((p) => currentPrice(p) === startPrice(p, from));
  const since = t('groceries.since', { date: shortDate.format(day(from)) });
  const stats = [
    [t('groceries.basketCost'), money.format(now), t('groceries.basketDetail'), (l) => money.format(sum(l, currentPrice))],
    [t('groceries.basketChange'), now === before ? t('groceries.noChange') : (now > before ? '▲ ' : '▼ ') + money.format(Math.abs(now - before)), `${now === before || !before ? '' : percent.format((now - before) / before) + ' '}${since}`, (l) => money.format(sum(l, currentPrice) - sum(l, (p) => startPrice(p, from)))],
    [t('groceries.up'), `▲ ${up(products).length}`, since, (l) => up(l).length],
    [t('groceries.down'), `▼ ${down(products).length}`, since, (l) => down(l).length],
    [t('groceries.unchanged'), String(same(products).length), since, (l) => same(l).length],
    [t('groceries.products'), String(products.length), t('groceries.withPrice'), (l) => l.length],
  ];
  $('stats').innerHTML = stats.map(([label, value, detail, count]) => `<div class="card stat"><div class="label">${label}</div><div class="value">${value}</div><div class="detail">${detail}</div>${split(products, count)}</div>`).join('');
}

function renderBasket(products, from) {
  const series = basketSeries(products, from, today());
  const store = STORES.find((s) => s.name === state.store);
  $('basket-legend').innerHTML = store
    ? `<span><span class="dot ${store.cls}"></span>${store.name}</span>`
    : `<span><span class="dash"></span>${t('groceries.allStores')}</span>`;
  lineChart($('basket'), series, { title: t('groceries.basketCost'), cls: store ? store.cls : '' });
  $('basket-table').innerHTML = `<table><thead><tr><th>${t('groceries.colFrom')}</th><th class="num">${t('groceries.colBasket')}</th><th class="num">${t('groceries.colChange')}</th></tr></thead><tbody>${series.map((s, i) => `<tr><td>${longDate.format(day(s.date))}</td><td class="num">${money.format(s.value)}</td><td class="num">${i ? change(series[i - 1].value, s.value) : ''}</td></tr>`).reverse().join('')}</tbody></table>`;
}

// The Monday of the week of a date.
function monday(date) {
  const d = day(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return iso(d);
}

function renderWeeks(products, from) {
  const weeks = new Map();
  for (let w = monday(from); w <= today(); w = minusDays(w, -7)) weeks.set(w, { label: dayMonth.format(day(w)), values: {} });
  products.forEach((p) => p.prices.forEach(([d], i) => {
    if (!i || d <= from) return;
    const group = weeks.get(monday(d));
    if (group) group.values[p.store] = (group.values[p.store] || 0) + 1;
  }));
  const groups = [...weeks.values()];
  barChart($('weeks'), groups, STORES, { title: t('groceries.changesPerWeek'), empty: t('groceries.noChangesPeriod') });
  $('weeks-table').innerHTML = `<table><thead><tr><th>${t('groceries.colWeekOf')}</th>${STORES.map((s) => `<th class="num">${s.name}</th>`).join('')}</tr></thead><tbody>${groups.map((g) => `<tr><td>${g.label}</td>${STORES.map((s) => `<td class="num">${g.values[s.name] || 0}</td>`).join('')}</tr>`).reverse().join('')}</tbody></table>`;
}

function renderProducts(products, from) {
  if (!products.length) { $('products').innerHTML = `<p class="empty">${t('groceries.noMatch')}</p>`; return; }
  const rows = products
    .map((p) => {
      const before = startPrice(p, from), now = currentPrice(p);
      return { p, before, now, relative: before ? Math.abs(now - before) / before : 0 };
    })
    .sort((a, b) => b.relative - a.relative || a.p.name.localeCompare(b.p.name, 'es'));
  $('products').innerHTML = `<table><thead><tr><th>#</th><th>${t('groceries.colProduct')}</th><th>${t('groceries.colStore')}</th><th>${t('groceries.colLastChange')}</th><th>${t('groceries.colTrend')}</th><th class="num">${t('groceries.colChange')}</th><th class="num">${t('groceries.colPrice')}</th></tr></thead><tbody>${rows.map((r, i) => {
    const last = r.p.prices.length > 1 ? shortDate.format(day(r.p.prices.at(-1)[0])) : '—';
    return `<tr class="row" data-id="${esc(r.p.id)}">
      <td class="rank">${i + 1}</td>
      <td><div class="name">${esc(r.p.name)}</div><div class="minor">${esc(categoryOf(r.p))}</div></td>
      <td><span class="tag"><span class="dot ${STORE_CLASS[r.p.store] || ''}"></span>${esc(r.p.store)}</span></td>
      <td>${last}</td>
      <td>${sparkline(r.p, from, today())}</td>
      <td class="num">${change(r.before, r.now) || '<span class="minor">—</span>'}</td>
      <td class="num">${money.format(r.now)}<span class="minor">/${esc(t(r.p.unit === 'kg' ? 'unit.kg' : 'unit.ud'))}</span></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

function openDetail(id) {
  const p = data.products[id];
  if (!p || !p.prices.length) return;
  $('detail-name').textContent = p.name;
  $('detail-sub').textContent = `${p.store} · ${categoryOf(p)} · ${t(p.unit === 'kg' ? 'groceries.perKilo' : 'groceries.perUnit')}`;
  $('detail-table').innerHTML = `<table><thead><tr><th>${t('groceries.colFrom')}</th><th class="num">${t('groceries.colPrice')}</th><th class="num">${t('groceries.colChange')}</th></tr></thead><tbody>${p.prices.map(([d, price], i) => `<tr><td>${longDate.format(day(d))}</td><td class="num">${money.format(price)}</td><td class="num">${i ? change(p.prices[i - 1][1], price) : ''}</td></tr>`).reverse().join('')}</tbody></table>`;
  $('detail').showModal();
  const series = p.prices.map(([date, value]) => ({ date, value }));
  if (today() > series.at(-1).date) series.push({ date: today(), value: series.at(-1).value });
  lineChart($('detail-chart'), series, { title: t('groceries.priceOf', { name: p.name }), height: 190, cls: STORE_CLASS[p.store] || '' });
}

function render() {
  const products = visible();
  const from = periodStart();
  renderStats(products, from);
  renderBasket(products, from);
  renderWeeks(products, from);
  renderProducts(products, from);
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
  // The option without a category has an empty value and its text in the current language.
  const categories = [...new Set(data.list.map((p) => p.category || ''))].sort((a, b) => a.localeCompare(b, 'es'));
  $('category').insertAdjacentHTML('beforeend', categories.map((c) => `<option value="${esc(c || '-')}">${esc(c || t('groceries.noCategory'))}</option>`).join(''));

  buttonGroup('period', 'days', 'days', Number);
  buttonGroup('store', 'store', 'store');
  $('category').addEventListener('change', () => { state.category = $('category').value; render(); });
  $('search').addEventListener('input', () => { state.text = $('search').value; render(); });
  $('close').addEventListener('click', () => $('detail').close());
  document.addEventListener('click', (event) => {
    const row = event.target.closest('tr.row');
    if (row) openDetail(row.dataset.id);
    const link = event.target.closest('button[data-table]');
    if (link) {
      const table = $(link.dataset.table);
      table.hidden = !table.hidden;
      link.textContent = t(table.hidden ? 'groceries.showTable' : 'groceries.hideTable');
    }
  });
  let wait;
  window.addEventListener('resize', () => { clearTimeout(wait); wait = setTimeout(render, 150); });
  render();

  // The summary links to a product with ?p=<key>.
  const requested = new URLSearchParams(location.search).get('p');
  if (requested) openDetail(requested);
}

start();
