export interface Track {
  title: string;
  artist: string;
  durationMs: number;
}

export type SpineStyle = 'arte' | 'color';

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
  addedAt: number;
}

export type SortMode = 'artista' | 'recientes' | 'color';
