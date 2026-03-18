import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  base: '/js-game-engine/',
  build: {
    rollupOptions: {
      external: [],
    },
  },
  plugins: [
    {
      name: 'copy-scenes',
      closeBundle() {
        const scenesDir = resolve(__dirname, 'scenes');
        const distScenesDir = resolve(__dirname, 'dist/scenes');

        mkdirSync(distScenesDir, { recursive: true });

        const files = readdirSync(scenesDir);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            copyFileSync(resolve(scenesDir, file), resolve(distScenesDir, file));
          }
        });
        console.log('Scene files copied to dist/scenes');
      }
    }
  ],
});