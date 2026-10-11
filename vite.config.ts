import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleAlbumRequest } from './api/album';

// En desarrollo (y en `vite preview`) servimos /api/album con el mismo handler que la función serverless.
const albumApi: Connect.NextHandleFunction = async (req, res) => {
  const { status, body } = await handleAlbumRequest(new URL(req.url ?? '', 'http://localhost').searchParams);
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
};

function albumApiPlugin(): Plugin {
  return {
    name: 'discoteca-album-api',
    configureServer: (server) => void server.middlewares.use('/api/album', albumApi),
    configurePreviewServer: (server) => void server.middlewares.use('/api/album', albumApi),
  };
}

export default defineConfig({
  plugins: [react(), albumApiPlugin()],
});
