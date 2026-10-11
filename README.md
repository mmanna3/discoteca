# Discoteca

Una discoteca de CDs (el mueble) para tus álbumes de Spotify.

```bash
npm install
npm run dev     # http://localhost:5173
npm test
```

- **Guardar un disco:** copiá el link del álbum en Spotify (Compartir → Copiar link) y pegalo en cualquier lugar de la página, o usá "+ Guardar disco".
- **Datos:** salen de la página pública del reproductor embebido de Spotify (`/api/album`), sin login. Si esa API no responde, se usa oEmbed (título y tapa) y se pide el artista a mano.
- **Lomos:** se generan con la franja izquierda de la tapa estirada, o con el color que Spotify calcula para el disco.
- **Persistencia:** `localStorage` del navegador. Usá ⋯ → Exportar/Importar para tener una copia.

## Deploy

Pensado para Vercel: `api/album.ts` es la función serverless y el resto es estático (Vite). En desarrollo, el mismo handler corre como middleware de Vite.
