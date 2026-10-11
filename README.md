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

## ¿Ya existía algo parecido?

Investigación del 2026-10-11: tres búsquedas web, a partir de los resúmenes de cada resultado. No se abrió ni probó cada proyecto.

La nostalgia de "ver la colección física en lo digital" ya la tuvo más gente, pero no apareció nada que haga lo mismo que esta discoteca.

**Lo más cercano:**

- **[Spine Music](https://techradar.com/audio/audio-streaming/miss-your-cd-collection-this-wall-mounted-display-for-spotify-and-apple-music-promises-to-bring-back-its-feeling-of-connection-but-its-maker-insists-he-doesnt-want-to-kill-off-physical-media):** la misma idea, pero en hardware. Es un aparato para colgar en la pared, conectado a Spotify, Apple Music y Tidal, que estaba por salir en Kickstarter (lo que se mostró eran renders).
- **[Playbase](https://github.com/allene-norton/Playbase):** web con Spotify donde agregás discos a un estante virtual y los vas pasando. Son vinilos, no lomos de CD, y pide Spotify Premium con login. Parece un proyecto de curso (Flatiron School).
- **[CDs](https://mwm.ai/apps/cds/6752527351)** y **[Disc Shelf](https://apps.apple.com/mx/app/disc-shelf/id6752208616):** apps de iPhone que muestran tu biblioteca como un estante. Disc Shelf usa tu colección de Discogs, no Spotify.
- **[Virtual Shelf](https://infoscience.epfl.ch/record/165011?ln=en):** prototipo de investigación de la EPFL que mostraba una colección como un estante de CDs clásico.
- **Caja de CD en 3D:** AlbumDeck (iPhone/iPad, paga, con Apple Music) y el viejo [JewelCase](https://www.applesfera.com/aplicaciones-os-x-1/jewelcase-21-tus-cd-en-3d-en-itunes) para iTunes.

**Lo que no apareció en ningún lado:**

- **Lomos** generados a partir de la tapa. Una de las búsquedas fue justamente un "generador de lomos" y no apareció ninguno.
- **Lomos reales escaneados** de ediciones físicas, sacados de Cover Art Archive.
- La combinación de **mueble de los 90 + lomos + caja 3D con contratapa + Spotify sin login**, con año, sello y género sacados de fuentes reales.
