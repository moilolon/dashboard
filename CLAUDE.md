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
- `assets/draw-images.ps1` (`powershell -NoProfile -File assets/draw-images.ps1`) draws, from
  shapes, the README cover (`cover.png`), the icon (`icon.png`, also the project's icon in
  Orca) and the GitHub social preview (`social-preview.png`, uploaded by hand in Settings); redraw it when what it shows changes.
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

## Checks

`.github/workflows/checks.yml` (job `checks`) runs on every pull request and every push to
`main`: the scripts parse (`node --check`) and `groceries/prices.json` has the shape above
(`.github/scripts/validate-prices.mjs`: the key, a store in `STORES`, the unit, `ref`, and dated
prices in order and not after `updated`). n8n's commits skip review, so on `main` a failure also
comes to Moisés on Telegram from the `notify` job (secret `TELEGRAM_BOT_TOKEN` and variable
`TELEGRAM_CHAT_MOISES` of the `telegram` environment, as in asustor-flashstor-6). A
change to the data's shape changes the validator in the same PR.

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
- **`gh`:** always as `GH_TOKEN=$(gh auth token --user moilolon) gh …`, command by command. gh's
  active account is the work one, which must not act on this repo; do not switch it. `git`
  already uses `moilolon` through the `includeIf` of `C:/Developer/PERSONAL/`.
