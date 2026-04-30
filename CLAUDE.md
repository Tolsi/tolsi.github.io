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

**Inline `<style>` blocks** inside `index.html` override `assets/styles.css` for several things (scrollbar hiding, font smoothing, transition visibility). Edit these carefully — there are multiple inline style blocks scattered through the file.

**Nav component** is fully commented out in `index.html`.

**Content sections** (all in `index.html`):
- `.section-info-intro` — bio paragraph
- `.section-info-list` (first) — disciplines + contact links (CV PDF link at top)
- `.section-info-list` (second) — art projects, personal projects, public talks

CV PDF: `assets/_Tolmachev_CV_08_2025.pdf` — update filename and link when replacing.
