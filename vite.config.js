import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base = nome del repo: l'app è servita da https://steelfenix23.github.io/workout/
export default defineConfig({
  base: '/workout/',
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: false },
});
