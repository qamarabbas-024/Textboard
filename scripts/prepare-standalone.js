const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursiveSync(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const root = path.join(__dirname, '..');
const frontendDir = path.join(root, 'frontend');
const standaloneDir = path.join(frontendDir, '.next', 'standalone');

console.log('⚡ [Build]: Syncing standalone frontend assets for desktop packaging...');

// 1. Sync Frontend Standalone Static Assets
const staticSrc = path.join(frontendDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  copyRecursiveSync(staticSrc, staticDest);
  console.log('✓ Injected .next/static into frontend standalone.');
}

const publicSrc = path.join(frontendDir, 'public');
const publicDest = path.join(standaloneDir, 'public');
if (fs.existsSync(publicSrc)) {
  copyRecursiveSync(publicSrc, publicDest);
  console.log('✓ Injected public assets into frontend standalone.');
}

console.log('🚀 [Build]: Assets successfully synced.');
