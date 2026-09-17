import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootIndex = path.resolve('index.html');

// Clean HTML template for Vite build input — ensures no stale asset bundles are re-processed
const cleanTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CamHost.space — Unlimited Private Cloud Storage · Powered by Telegram</title>
  <meta name="description" content="CamHost.space is an open-source unlimited private cloud storage platform powered by Telegram. Upload files from your browser — we handle the rest." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="icon" type="image/png" href="/logo.png" />
  <script>
    try {
      var t = localStorage.getItem('ch-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
`;

fs.writeFileSync(rootIndex, cleanTemplate);

try {
  // Clear old dist directory before building to prevent any stale bundles
  const distDir = path.resolve('dist');
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  console.log('Running clean Vite build...');
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
  // Clear old bundles in root assets
  for (const f of fs.readdirSync(rootAssets)) {
    if (f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.map')) {
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
