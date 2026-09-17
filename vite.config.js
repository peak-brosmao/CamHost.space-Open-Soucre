import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        if (command === 'serve') {
          return html.replace(
            /<script type="module" crossorigin src="\/assets\/[^"]+"><\/script>/,
            '<script type="module" src="/src/main.jsx"></script>'
          );
        }
        return html;
      },
    },
  ],
  server: {
    port: 3000,
    open: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
}));
