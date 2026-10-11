import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAlbumRequest } from './src/sources/spotifyEmbed.js';

// En desarrollo, /api/album corre como middleware de Vite con el mismo código que el Cloudflare Worker.
function mount(middlewares: Connect.Server) {
  middlewares.use('/api/album', async (req, res) => {
    const { status, body } = await handleAlbumRequest(new URL(req.url ?? '', 'http://localhost').searchParams);
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  });
}

function albumApiPlugin(): Plugin {
  return {
    name: 'discoteca-album-api',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages sirve el sitio en mmanna3.github.io/discoteca/ (y `vite preview` lo replica).
  base: command === 'build' || isPreview ? '/discoteca/' : '/',
  plugins: [react(), albumApiPlugin()],
  // Firebase (Auth + Firestore con caché offline) pesa ~650 kB sin comprimir; ~250 kB gzip en total.
  build: { chunkSizeWarningLimit: 1000 },
}));
