# Dashboards — Project Memory

Static site of dashboards that draw data from home, served by Vercel from `main` with no build
step.

`README.md` is the cover for visitors, laid out like every moilolon repo: *What this is*, *How
it works*, *Getting started* and the shared footer, with no folder tree, long code or roadmap.
The details below are for Claude.

## Structure

- `index.html` is the summary: a card per dashboard and the alerts.
- `styles.css` (themes, light and dark), `common.js` (menu, settings, formats, charts, the
  `STORES` list and `storeLink`) and `i18n.js` (every text, by key, in English and Spanish) are
  shared by every page.
- Each dashboard is a folder with its `index.html`, its script and its JSON, loading
  `../styles.css`, `../i18n.js` and `../common.js`. Charts are hand-written SVG, no libraries.
- **Adding a dashboard:** its folder, its entry in `MENU` (`common.js`), its texts in both
  languages (`i18n.js`), its card in `index.html` and its row in the README table.
- `?embed=1` hides the menu; `lang` (`en`, `es`), `theme` (`cool`, `warm`), `mode` (`auto`,
  `light`, `dark`) and `width` (`narrow`, `full`) fix that frame's settings without saving them.
- Language and mode are also kept in the domain cookies `moilolon-lang` and `moilolon-theme`,
  which win over the saved settings; automatic mode removes `moilolon-theme`.

## The data: `groceries/prices.json`

One entry per offer (a product at a store), keyed `<store>:<article code>`, so renaming a
product keeps its history. Fields: `name` (the catalogue product; offers with the same name are
one card), `store`, `unit` (`ud` or `kg`), `category`, `active` (`false` when it leaves the
catalogue: no longer drawn, history kept), and the optional `article`, `image` and `ref`
(reference price and its unit). `prices` holds `[date, price]` points, one per change; a price
holds until the next point.

- Offers of a product are compared by reference price when all give it in the same unit, by
  pack price otherwise. The basket is each product at its cheapest store.
- Each line links to the article at its store, built in `storeLink`; Gadis has no address by
  code, so its link comes from `article`. A new store is a line in `STORES`, a case in
  `storeLink` and its colour in `styles.css`.
- **Public repo:** only what the stores already show (name, code, photo, prices) plus the
  catalogue name, unit and category. Anything else stays in the private repo.

## Git

- **Commits:** English, imperative, sentence case, one line of at most 72 characters with no
  prefix and no trailing period (`Add the groceries price chart`). A body only when the why is
  not obvious: a blank line, then lines wrapped at 72. No `Co-Authored-By` or other attribution.
- **Data commits are not ours:** `Prices: N changes` commits come from n8n, which writes
  `groceries/prices.json`. Never edit that file by hand.
- **Branches:** `<type>/<short-description>`, lowercase kebab-case, off `main`. Types: `feature`,
  `bugfix`, `docs`, `style`, `refactor`, `chore`.
- **Pull requests:** title like a commit; body with *What changes*, *Why* and *How to check it*.
  Merged by squash, with the PR title and body as the commit.
