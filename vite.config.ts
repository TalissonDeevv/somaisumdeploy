import { defineConfig } from 'vite';
import pkg from './package.json';
const version=pkg.version;
export default defineConfig({ base: './',define:{__APP_VERSION__:JSON.stringify(version)}, build: { chunkSizeWarningLimit: 1600 }, server: { port: 5173, strictPort: true } });
