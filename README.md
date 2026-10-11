# Discoteca

Una discoteca de CDs (el mueble) para tus álbumes de Spotify.

```bash
npm install
npm run dev     # http://localhost:5173
npm test
```

- **Guardar un disco:** copiá el link del álbum en Spotify (Compartir → Copiar link) y pegalo en cualquier lugar de la página, o usá "+ Guardar disco".
- **Datos del disco:** el artista, los temas y los colores salen de la página pública del reproductor embebido de Spotify, sin login. Esa página no tiene CORS, así que se lee del lado del servidor: en local con un middleware de Vite (`/api/album`) y en producción con un Cloudflare Worker (`worker/`). Si no responde, se usa oEmbed (título y tapa) y se pide el artista a mano.
- **Año y sello:** MusicBrainz por el link de Spotify (match exacto); si no, por artista + título limpio; si no, iTunes. Se consultan directo desde el navegador. Los discos sin estos datos se completan solos en segundo plano.
- **Lomos:** generados (franja izquierda de la tapa estirada, o el color que Spotify calcula para el disco) o **escaneos reales** de ediciones en CD de Cover Art Archive, recortados a mano en "Cambiar lomo".
- **Persistencia:** Firestore (`discotecas/{uid}/discos`), con caché offline. Lectura pública; solo el dueño (`OWNER_UID` en `src/config.ts` y `firestore.rules`) puede editar, entrando con Google. Con `OWNER_UID` vacío, todo queda en el `localStorage` del navegador.

## Deploy

- **Sitio:** GitHub Pages en `mmanna3.github.io/discoteca`, con `.github/workflows/pages.yml` en cada push a `main` (Settings → Pages → Source: GitHub Actions).
- **Proxy de Spotify:** `npm run deploy:worker`. La URL del Worker va en `.env.production` como `VITE_ALBUM_API`.
- **Reglas de Firestore:** `npm run deploy:rules`.
