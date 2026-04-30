# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static personal portfolio/CV site for Sergey Tolsi Tolmachev. No build step, no package manager, no framework — pure HTML/CSS/JS. Deployed to GitHub Pages (tol.si) automatically on push to `master`.

## Local preview

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` directly in a browser.

## Deployment

Push to `master` → GitHub Actions deploys to GitHub Pages automatically (`.github/workflows/static.yml`).

## Architecture

Single page: `index.html` is the entire site. `assets/styles.css` is the main stylesheet (large, Webflow-generated).

**Vendor JS in `assets/`:** jQuery 3.5.1, GSAP + ScrollTrigger + Draggable, jQuery UI.

**Inline JS in `index.html` handles:**
- Page load animation — shows "ㄒㄖㄥ丂丨" cover, fades to `.main_wrapper` after ~2.3s
- Page transition on internal link clicks (`.transition-trigger` + GSAP, exit ~1.75s)
- Scroll-driven background color gradient: orange `rgb(218,93,35)` → off-white `rgb(245,244,238)` keyed to `.section-info-list` offset
- Auto-updating copyright year via `.footer-copyright-year`

**All styles live in `assets/styles.css`** — no inline `<style>` blocks in `index.html`. Bump the `?v=N` cache-bust param on the `<link>` tag whenever CSS changes.

**Nav component** is fully commented out in `index.html`.

**Content sections** (all in `index.html`):
- `.section-info-intro` — bio paragraph
- `.section-info-list` (first) — disciplines + contact links (CV PDF link at top)
- `.section-info-list` (second) — art projects, personal projects, public talks

CV PDF: `assets/_Tolmachev_CV_08_2025.pdf` — update filename and link when replacing.

## Running tests

```bash
# Kill only the port used by this project's test server — do NOT kill agent-browser or Chrome,
# as other projects on this machine may be running their own agent-browser tests in parallel.
lsof -ti tcp:8899 | xargs kill -9 2>/dev/null
npm test
```

The test suite (`tests/site.test.ts`) uses Vitest + agent-browser. Port 8899 is this project's HTTP server port.

Each test run uses a unique `--session tolsi-website-e2e-{random-uid}` so it gets an isolated browser tab and doesn't collide with other concurrent agent-browser sessions on the same machine.
