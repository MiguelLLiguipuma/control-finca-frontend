import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

export function conteoOfflinePlugin(): Plugin {
  let base = '/';
  return {
    name: 'conteo-offline',
    apply: 'build',
    enforce: 'post',
    configResolved(config) { base = config.base; },
    generateBundle(_options, bundle) {
      if (!base.startsWith('/') || base.startsWith('//')) this.error('El modo offline requiere una base local absoluta.');
      const files = Object.keys(bundle).filter(file => file === 'index.html' || /\.(js|css|woff2?|ttf|svg|png|webp)$/.test(file)).sort();
      if (!files.includes('index.html')) this.error('Falta index.html para preparar la app offline.');
      const template = readFileSync(new URL('./conteo-worker.js', import.meta.url), 'utf8');
      const hash = createHash('sha256').update(template);
      for (const file of files) {
        const output = bundle[file];
        hash.update(output.type === 'chunk' ? output.code : output.source);
      }
      this.emitFile({ type: 'asset', fileName: 'conteo-sw.js', source: template
        .replace('__CACHE_NAME__', JSON.stringify(`conteo-app-${hash.digest('hex').slice(0, 16)}`))
        .replace('__PRECACHE_URLS__', JSON.stringify(files.map(file => base + file)))
        .replace('__BASE_PATH__', JSON.stringify(base)) });
    },
  };
}
