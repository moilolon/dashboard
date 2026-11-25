# Dashboards — Project Memory

Static site of dashboards that draw data from home, served by Vercel from `main` with no build
step. What each part does is in `README.md`.

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
