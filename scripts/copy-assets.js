const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

// assets: copy everything except styles.css (already minified separately)
const assetsDir = path.join(ROOT, 'assets');
fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });
for (const entry of fs.readdirSync(assetsDir, { withFileTypes: true })) {
  if (entry.name === 'styles.css') continue;
  const s = path.join(assetsDir, entry.name);
  const d = path.join(DIST, 'assets', entry.name);
  if (entry.isDirectory()) {
    copyDir(s, d);
  } else {
    copyFile(s, d);
  }
}
