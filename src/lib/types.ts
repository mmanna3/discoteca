export interface Track {
  title: string;
  artist: string;
  durationMs: number;
}

export type SpineStyle = 'arte' | 'color' | 'escaneo';

/** Recorte de un escaneo real de lomo (Cover Art Archive). */
export interface ScannedSpine {
  /** Imagen en alta (1200px) para la caja; `thumb` (500px) para el estante. */
  image: string;
  thumb: string;
  /** Ancho / alto de la imagen ya rotada. */
  aspect: number;
  rotate: 0 | 90 | 180 | 270;
  /** Rectángulo del lomo, en fracciones (0–1) de la imagen ya rotada. */
  crop: { x: number; y: number; w: number; h: number };
  /** Datos de la edición física escaneada. */
  release: {
    id: string;
    country: string | null;
    date: string | null;
    format: string | null;
    label: string | null;
    catalogNumber: string | null;
  };
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  tracks: Track[];
  palette: {
    /** Color de fondo según Spotify (o promedio de la tapa si no lo tenemos). */
    base: string;
    text: string;
    /** Color promedio del borde izquierdo de la tapa: el que "dobla" hacia el lomo. */
    edge: string;
    edgeText: string;
  };
  spine: SpineStyle;
  scan?: ScannedSpine;
  addedAt: number;

  /** Metadatos de MusicBrainz / iTunes. `metaFetchedAt` ausente = todavía no se buscaron. */
  year?: number | null;
  releaseDate?: string | null;
  label?: string | null;
  releaseGroupId?: string | null;
  metaSource?: string | null;
  metaFetchedAt?: number;

  /** Familia de género ("Rock", "Cantautor"…). Si la elegiste a mano, no se vuelve a pisar. */
  genre?: string | null;
  genreSource?: 'manual' | 'musicbrainz' | 'itunes' | null;
  /** Ausente = todavía no se buscó. */
  genreFetchedAt?: number;
}

export type SortMode = 'artista' | 'anio' | 'genero' | 'recientes' | 'color';
