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
});

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
    });

    it(`all text elements in layout at ${vp.label}`, () => {
      const hiddenCount = Number(abEval(CHECK_HIDDEN_JS));
      expect(hiddenCount, `${hiddenCount} elements have zero size or are hidden`).toBe(0);
    });
  }
});
