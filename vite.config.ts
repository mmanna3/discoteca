import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAlbumRequest } from './api/album.js';
import { handleMetadataRequest } from './api/metadata.js';
import { handleSpinesRequest } from './api/spines.js';

type Handler = (params: URLSearchParams) => Promise<{ status: number; body: unknown }>;

// En desarrollo (y en `vite preview`) servimos /api/* con los mismos handlers que las funciones serverless.
const routes: Record<string, Handler> = {
  '/api/album': handleAlbumRequest,
  '/api/metadata': handleMetadataRequest,
  '/api/spines': handleSpinesRequest,
};

function mount(middlewares: Connect.Server) {
  for (const [path, handler] of Object.entries(routes)) {
    middlewares.use(path, async (req, res) => {
      const { status, body } = await handler(new URL(req.url ?? '', 'http://localhost').searchParams);
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(body));
    });
  }
}

function apiPlugin(): Plugin {
  return {
    name: 'discoteca-api',
    configureServer: (server) => mount(server.middlewares),
    configurePreviewServer: (server) => mount(server.middlewares),
  };
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
});
