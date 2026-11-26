// Checks groceries/prices.json against the shape the dashboard reads (CLAUDE.md, "The data").
// n8n writes the file straight to main and Vercel serves main as it is, so a broken file
// would reach the site unseen. Prints one line per error and exits 1 if there is any; with
// --out <file> it also writes them there, for the Telegram message.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'groceries/prices.json';
const UNITS = ['ud', 'kg'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The stores the site knows: the names in STORES (common.js).
function stores() {
  const line = readFileSync('common.js', 'utf8').split('\n').find((l) => l.startsWith('const STORES = '));
  return [...(line ?? '').matchAll(/name: '([^']+)'/g)].map((m) => m[1]);
}

const isDate = (s) => typeof s === 'string' && DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const isText = (s) => typeof s === 'string' && s.trim() !== '';
const isPrice = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function validate(data, known) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return ['the file is not a JSON object'];
  if (!isDate(data.updated)) errors.push(`updated: ${JSON.stringify(data.updated)} is not a YYYY-MM-DD date`);
  const products = data.products;
  if (!products || typeof products !== 'object' || Array.isArray(products)) return [...errors, 'products: not an object'];
  if (!Object.keys(products).length) errors.push('products: empty');

  for (const [id, p] of Object.entries(products)) {
    const err = (msg) => errors.push(`${id}: ${msg}`);
    if (!p || typeof p !== 'object' || Array.isArray(p)) {
      err('not an object');
      continue;
    }
    const [prefix, code] = id.split(':');
    if (!code || !/^[a-z]+$/.test(prefix) || !/^[A-Za-z0-9._-]+$/.test(code)) err('the key is not <store>:<article code>');
    if (!known.includes(p.store)) err(`store ${JSON.stringify(p.store)} is not in STORES (${known.join(', ')})`);
    else if (prefix !== p.store.toLowerCase()) err(`the key's store "${prefix}" is not ${p.store}`);
    if (!isText(p.name)) err('name is missing');
    if (!isText(p.category)) err('category is missing');
    if (!UNITS.includes(p.unit)) err(`unit ${JSON.stringify(p.unit)} is not ${UNITS.join(' or ')}`);
    if ('active' in p && typeof p.active !== 'boolean') err('active is not true or false');
    for (const f of ['article', 'image']) if (f in p && !isText(p[f])) err(`${f} is not a text`);
    if ('image' in p && isText(p.image) && !p.image.startsWith('https://')) err('image is not an https address');
    if ('ref' in p && !(Array.isArray(p.ref) && p.ref.length === 2 && isPrice(p.ref[0]) && isText(p.ref[1]))) err('ref is not [price, unit]');
    if (!Array.isArray(p.prices)) {
      err('prices is not a list');
      continue;
    }
    if (!p.prices.length && p.active !== false) err('an active offer with no prices');
    p.prices.forEach((point, i) => {
      if (!Array.isArray(point) || point.length !== 2 || !isDate(point[0]) || !isPrice(point[1])) {
        err(`prices[${i}] is not [YYYY-MM-DD, price above 0]: ${JSON.stringify(point)}`);
        return;
      }
      const before = p.prices[i - 1];
      if (i && Array.isArray(before) && before[0] >= point[0]) err(`prices[${i}] ${point[0]} does not come after ${before[0]}`);
      if (isDate(data.updated) && point[0] > data.updated) err(`prices[${i}] ${point[0]} is after updated (${data.updated})`);
    });
  }
  return errors;
}

if (process.argv[1]?.endsWith('validate-prices.mjs')) {
  let errors;
  try {
    errors = validate(JSON.parse(readFileSync(FILE, 'utf8')), stores());
  } catch (e) {
    errors = [`${FILE} does not parse: ${e.message}`];
  }
  const out = process.argv.indexOf('--out');
  if (out !== -1) writeFileSync(process.argv[out + 1], errors.join('\n'));
  if (errors.length) {
    for (const e of errors) console.log(`::error file=${FILE}::${e}`);
    process.exit(1);
  }
  console.log(`${FILE}: ok`);
}
