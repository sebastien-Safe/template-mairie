// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  trailingSlash: 'always',
  // La CSP du site (public/_headers) n'autorise que script-src 'self' :
  // les scripts doivent toujours être servis en fichiers externes, jamais inline.
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
  },
});
