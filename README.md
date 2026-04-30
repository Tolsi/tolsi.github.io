# tol.si

Personal site for [Sergey Tolsi Tolmachev](https://tol.si) — static HTML/CSS/JS, deployed via GitHub Pages.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Tests

Browser tests with [Vitest](https://vitest.dev) + [agent-browser](https://github.com/vercel-labs/agent-browser) CLI.

**Requirements:** Node.js, `agent-browser` installed globally (`npm i -g agent-browser && agent-browser install`).

```bash
npm install
npm test
```

Tests cover: canonical URL, intro animation (main_wrapper opacity 0→1), page-cover fadeout, intro text presence, footer copyright year.
