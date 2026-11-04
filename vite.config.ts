import { defineConfig } from 'vite';
import pkg from './package.json';
const version=pkg.version;
// Link previews need absolute URLs. SITE_URL wins (for a custom domain); on Vercel the
// production domain comes from its build environment. Without either, paths stay relative.
const host=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
const siteUrl=(process.env.SITE_URL||(host?'https://'+host:'')).replace(/\/$/,'');
export default defineConfig({ base: './',define:{__APP_VERSION__:JSON.stringify(version)}, build: { chunkSizeWarningLimit: 1600 }, server: { port: 5173, strictPort: true },
  plugins:[{name:'share-urls',transformIndexHtml:html=>html.replaceAll('%SITE_URL%/',siteUrl?siteUrl+'/':'./')}] });
