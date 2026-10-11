# Discoteca

Una discoteca de CDs (el mueble) para tus álbumes de Spotify.

```bash
npm install
npm run dev     # http://localhost:5173
npm test
```

- **Guardar un disco:** copiá el link del álbum en Spotify (Compartir → Copiar link) y pegalo en cualquier lugar de la página, o usá "+ Guardar disco".
- **Datos:** salen de la página pública del reproductor embebido de Spotify (`/api/album`), sin login. Si esa API no responde, se usa oEmbed (título y tapa) y se pide el artista a mano.
- **Año y sello:** `/api/metadata` busca en MusicBrainz por el link de Spotify (match exacto); si no, por artista + título limpio; si no, en iTunes. Los discos guardados sin estos datos se completan solos en segundo plano.
- **Lomos:** generados (franja izquierda de la tapa estirada, o el color que Spotify calcula para el disco) o **escaneos reales** de ediciones en CD de Cover Art Archive (`/api/spines`), recortados a mano en "Cambiar lomo".
- **Persistencia:** `localStorage` del navegador. Usá ⋯ → Exportar/Importar para tener una copia.

## Deploy

Pensado para Vercel: `api/*.ts` son las funciones serverless y el resto es estático (Vite). En desarrollo, el mismo handler corre como middleware de Vite.
