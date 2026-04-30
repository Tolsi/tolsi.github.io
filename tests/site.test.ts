import { execSync } from "child_process";
import { ChildProcess, spawn } from "child_process";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const PORT = 8899;
const BASE_URL = `http://localhost:${PORT}`;
const PROJECT_DIR = new URL("..", import.meta.url).pathname;

let server: ChildProcess;

function ab(args: string): string {
  return execSync(`agent-browser ${args}`, { encoding: "utf8" }).trim();
}

function abEval(js: string): string {
  const escaped = js.replace(/"/g, '\\"');
  const raw = ab(`eval "${escaped}"`);
  return raw.startsWith('"') ? JSON.parse(raw) : raw;
}

// Single-quoted JS to avoid shell escaping issues
const CHECK_OVERLAPS_JS = `
(() => {
  var sels = '.info-list-item-text, .info-list-heading, .info-intro-text, .footer-copyright-text';
  var els = Array.from(document.querySelectorAll(sels)).filter(function(el) {
    var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });
  var overlaps = [];
  for (var i = 0; i < els.length; i++) {
    for (var j = i + 1; j < els.length; j++) {
      var a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
      if (!(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)) {
        overlaps.push(els[i].textContent.trim().slice(0,20) + ' / ' + els[j].textContent.trim().slice(0,20));
      }
    }
  }
  return JSON.stringify(overlaps);
})()`.trim().replace(/\n/g, " ");

const CHECK_HIDDEN_JS = `
(() => {
  var sels = '.info-list-item-text, .info-list-heading, .info-intro-text';
  var els = Array.from(document.querySelectorAll(sels));
  var hidden = els.filter(function(el) {
    var r = el.getBoundingClientRect();
    var s = getComputedStyle(el);
    return r.width === 0 || r.height === 0 || s.display === 'none' || s.visibility === 'hidden';
  });
  return hidden.length;
})()`.trim().replace(/\n/g, " ");

function freshUrl() {
  return `${BASE_URL}/?t=${Date.now()}`;
}

function loadAt(w: number, h: number) {
  ab(`set viewport ${w} ${h}`);
  execSync("sleep 0.5");
  ab(`open ${freshUrl()}`);
  ab("wait --load networkidle");
}

beforeAll(() => {
  server = spawn("python3", ["-m", "http.server", String(PORT)], {
    cwd: PROJECT_DIR,
    stdio: "ignore",
  });
  execSync("sleep 0.5");
  ab(`open ${freshUrl()}`);
  ab("wait --load networkidle");
}, 30000);

afterAll(() => {
  ab("close");
  server.kill();
});

describe("tol.si — core checks", () => {
  it("canonical URL is https://tol.si", () => {
    const href = abEval(
      "document.querySelector('link[rel=canonical]').getAttribute('href')"
    );
    expect(href).toBe("https://tol.si");
  });

  it(".main_wrapper is hidden on load, visible after intro animation (~8s)", async () => {
    ab(`open ${freshUrl()}`);
    ab("wait --load networkidle");
    const opacityOnLoad = abEval(
      "getComputedStyle(document.querySelector('.main_wrapper')).opacity"
    );
    expect(parseFloat(opacityOnLoad)).toBe(0);

    await new Promise((r) => setTimeout(r, 8000));
    const opacityAfter = abEval(
      "getComputedStyle(document.querySelector('.main_wrapper')).opacity"
    );
    expect(parseFloat(opacityAfter)).toBe(1);
  }, 15000);

  it("page-cover heading is viewport-centered during intro", () => {
    ab(`open ${freshUrl()}`);
    ab("wait --load networkidle");
    const raw = abEval(`(() => {
      var el = document.querySelector('.page-cover-heading');
      if (!el) return JSON.stringify({error: 'not found'});
      var r = el.getBoundingClientRect();
      return JSON.stringify({cx: Math.round(r.left + r.width/2), cy: Math.round(r.top + r.height/2), vw: window.innerWidth, vh: window.innerHeight});
    })()`);
    const d = JSON.parse(raw);
    expect(d.error).toBeUndefined();
    expect(Math.abs(d.cx - d.vw / 2)).toBeLessThan(d.vw * 0.1);
    expect(Math.abs(d.cy - d.vh / 2)).toBeLessThan(d.vh * 0.1);
  }, 30000);

  it("page-cover heading is visible on screen during intro", async () => {
    ab(`open ${freshUrl()}`);
    ab("wait --load networkidle");
    // poll up to 8s for cover content to become visible (fades in at ~2300ms)
    let opacity = 0;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      opacity = parseFloat(abEval("getComputedStyle(document.querySelector('.page-cover-content')).opacity"));
      if (opacity > 0) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const raw = abEval(`(() => {
      var el = document.querySelector('.page-cover-heading');
      if (!el) return JSON.stringify({error: 'not found'});
      var content = document.querySelector('.page-cover-content');
      var r = el.getBoundingClientRect();
      return JSON.stringify({
        opacity: parseFloat(getComputedStyle(content).opacity),
        inViewport: r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth,
        width: Math.round(r.width),
        height: Math.round(r.height)
      });
    })()`);
    const d = JSON.parse(raw);
    expect(d.error).toBeUndefined();
    expect(d.opacity, "cover not visible within 8s").toBeGreaterThan(0);
    expect(d.inViewport).toBe(true);
    expect(d.width).toBeGreaterThan(0);
    expect(d.height).toBeGreaterThan(0);
  }, 20000);


  it(".section-info-intro contains text", () => {
    const len = Number(
      abEval("document.querySelector('.section-info-intro').innerText.trim().length")
    );
    expect(len).toBeGreaterThan(0);
  });

  it("footer copyright year matches current year", () => {
    const year = abEval(
      "document.querySelector('.footer-copyright-year').textContent"
    );
    expect(year).toBe(String(new Date().getFullYear()));
  });

  it("page-cover is gone after intro animation (~8s)", async () => {
    await new Promise((r) => setTimeout(r, 8000));
    const result = abEval(
      "(() => { var s = getComputedStyle(document.querySelector('.page-cover')); return s.display + ',' + s.opacity; })()"
    );
    const [display, opacity] = result.split(",");
    expect(display === "none" || parseFloat(opacity) === 0).toBe(true);
  }, 15000);
});

describe("tol.si — layout: text visible and no overlap", () => {
  const viewports = [
    { label: "desktop 1440px", w: 1440, h: 900 },
    { label: "desktop 1280px", w: 1280, h: 800 },
    { label: "desktop 1024px", w: 1024, h: 768 },
    { label: "tablet 768px",   w: 768,  h: 1024 },
    { label: "mobile 390px",   w: 390,  h: 844 },
  ];

  for (const vp of viewports) {
    it(`no text overlap at ${vp.label}`, () => {
      loadAt(vp.w, vp.h);
      const overlaps: string[] = JSON.parse(abEval(CHECK_OVERLAPS_JS));
      expect(overlaps, `overlapping: ${overlaps.join(" | ")}`).toHaveLength(0);
    }, 30000);

    it(`all text elements in layout at ${vp.label}`, () => {
      const hiddenCount = Number(abEval(CHECK_HIDDEN_JS));
      expect(hiddenCount, `${hiddenCount} elements have zero size or are hidden`).toBe(0);
    }, 30000);
  }
});

const DISCIPLINES_BLOCKS_JS = `(() => {
  var blocks = Array.from(document.querySelectorAll('.disciplines-sub-row .info-list-block'));
  if (blocks.length < 2) return JSON.stringify({error: 'not enough blocks: ' + blocks.length});
  var r0 = blocks[0].getBoundingClientRect(), r1 = blocks[1].getBoundingClientRect();
  return JSON.stringify({top0: Math.round(r0.top), left0: Math.round(r0.left), top1: Math.round(r1.top), left1: Math.round(r1.left)});
})()`.trim().replace(/\n/g, " ");

describe("tol.si — disciplines column layout", () => {
  it("disciplines sub-row is 2 columns at 1024px (>=900px)", () => {
    loadAt(1024, 768);
    const d = JSON.parse(abEval(DISCIPLINES_BLOCKS_JS));
    expect(d.error).toBeUndefined();
    expect(Math.abs(d.top0 - d.top1)).toBeLessThan(20);
    expect(d.left1).toBeGreaterThan(d.left0 + 50);
  }, 30000);

  it("at 768px: disciplines 2 sub-cols side-by-side, contacts+music 2 cols below", () => {
    loadAt(768, 1024);
    execSync("sleep 1");
    const raw = abEval(`(() => {
      var firstSection = document.querySelector('.section-info-list');
      var discBlocks = Array.from(document.querySelectorAll('.disciplines-sub-row .info-list-block'));
      var cols = Array.from(firstSection.querySelectorAll('.info-list-wrapper > .info-list-column'));
      if (discBlocks.length < 2) return JSON.stringify({error: 'discBlocks: ' + discBlocks.length});
      if (cols.length < 3) return JSON.stringify({error: 'columns: ' + cols.length});
      var d0 = discBlocks[0].getBoundingClientRect(), d1 = discBlocks[1].getBoundingClientRect();
      var c1 = cols[1].getBoundingClientRect(), c2 = cols[2].getBoundingClientRect();
      return JSON.stringify({
        discTop0: Math.round(d0.top), discTop1: Math.round(d1.top),
        discLeft0: Math.round(d0.left), discLeft1: Math.round(d1.left),
        contTop: Math.round(c1.top), contLeft: Math.round(c1.left),
        musicTop: Math.round(c2.top), musicLeft: Math.round(c2.left)
      });
    })()`);
    const d = JSON.parse(raw);
    expect(d.error).toBeUndefined();
    expect(Math.abs(d.discTop0 - d.discTop1)).toBeLessThan(20);
    expect(d.discLeft1).toBeGreaterThan(d.discLeft0 + 50);
    expect(Math.abs(d.contTop - d.musicTop)).toBeLessThan(20);
    expect(d.musicLeft).toBeGreaterThan(d.contLeft + 50);
    expect(d.contTop).toBeGreaterThan(d.discTop0 + 20);
  }, 30000);

  it("disciplines sub-row is 1 column at 390px (<=479px)", () => {
    loadAt(390, 844);
    execSync("sleep 1");
    const d = JSON.parse(abEval(DISCIPLINES_BLOCKS_JS));
    expect(d.error).toBeUndefined();
    expect(d.top1).toBeGreaterThan(d.top0 + 20);
    expect(Math.abs(d.left0 - d.left1)).toBeLessThan(20);
  }, 30000);
});
