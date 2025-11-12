import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  base: '/clipengine/',
  build: {
    rollupOptions: {
      // Ensure JSON files are included
      external: [],
    },
  },
  plugins: [
    {
      name: 'copy-scenes',
      closeBundle() {
        const scenesDir = resolve(__dirname, 'scenes');
        const distScenesDir = resolve(__dirname, 'dist/scenes');
        
        // Create dist/scenes directory
        mkdirSync(distScenesDir, { recursive: true });
        
        // Copy all JSON files from scenes to dist/scenes
        const files = readdirSync(scenesDir);
        files.forEach(file => {
          if (file.endsWith('.json')) {
            copyFileSync(
              resolve(scenesDir, file),
              resolve(distScenesDir, file)
            );
          }
        });
        console.log('Scene files copied to dist/scenes');
      }
    }
  ],
});
