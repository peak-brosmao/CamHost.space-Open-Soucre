import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootIndex = path.resolve('index.html');
let originalHtml = fs.readFileSync(rootIndex, 'utf8');

// Ensure root index.html points to /src/main.jsx during Vite build
if (!originalHtml.includes('/src/main.jsx')) {
  originalHtml = originalHtml.replace(
    /<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/,
    '<script type="module" src="/src/main.jsx"></script>'
  );
}
fs.writeFileSync(rootIndex, originalHtml);

try {
  console.log('Running Vite build...');
  execSync('npx vite build', { stdio: 'inherit' });

  // Copy built dist/index.html to root index.html for direct static hosting (Hostinger Git deploy)
  const builtHtml = fs.readFileSync(path.resolve('dist/index.html'), 'utf8');
  fs.writeFileSync(rootIndex, builtHtml);

  // Sync dist/assets to root assets/
  const distAssets = path.resolve('dist/assets');
  const rootAssets = path.resolve('assets');
  if (!fs.existsSync(rootAssets)) {
    fs.mkdirSync(rootAssets, { recursive: true });
  }
  // Clear old js bundles in root assets
  for (const f of fs.readdirSync(rootAssets)) {
    if (f.endsWith('.js') || f.endsWith('.css')) {
      fs.unlinkSync(path.join(rootAssets, f));
    }
  }
  for (const f of fs.readdirSync(distAssets)) {
    fs.copyFileSync(path.join(distAssets, f), path.join(rootAssets, f));
  }
  console.log('Production assets synced to root successfully.');
} catch (err) {
  console.error('Build error:', err);
  process.exit(1);
}
