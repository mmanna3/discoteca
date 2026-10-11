import { useCallback, useEffect, useMemo, useState } from 'react';
import { hueKey } from './colors';
import type { Album, SortMode } from './types';

const STORAGE_KEY = 'discoteca:v1';
const SORT_KEY = 'discoteca:orden';

function isAlbum(value: unknown): value is Album {
  const a = value as Album;
  return (
    !!a &&
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.artist === 'string' &&
    typeof a.coverUrl === 'string' &&
    Array.isArray(a.tracks) &&
    !!a.palette &&
    typeof a.palette.edge === 'string'
  );
}

export function parseCollection(value: unknown): Album[] | null {
  const list = Array.isArray(value) ? value : (value as { discos?: unknown })?.discos;
  if (!Array.isArray(list) || !list.every(isAlbum)) return null;
  return list;
}

function load(): Album[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return (raw && parseCollection(JSON.parse(raw))) || [];
  } catch {
    return [];
  }
}

/** "The Beatles" se guarda en la B, como en cualquier disquería. */
export function artistSortKey(artist: string): string {
  return artist.replace(/^the\s+/i, '').toLocaleLowerCase('es');
}

export function sortAlbums(albums: Album[], mode: SortMode): Album[] {
  const list = [...albums];
  switch (mode) {
    case 'artista':
      return list.sort(
        (a, b) =>
          artistSortKey(a.artist).localeCompare(artistSortKey(b.artist), 'es') ||
          a.title.localeCompare(b.title, 'es'),
      );
    case 'recientes':
      return list.sort((a, b) => b.addedAt - a.addedAt);
    case 'color':
      return list.sort((a, b) => hueKey(a.palette.edge) - hueKey(b.palette.edge));
  }
}

export function useCollection() {
  const [albums, setAlbums] = useState<Album[]>(load);
  const [sort, setSort] = useState<SortMode>(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      return saved === 'recientes' || saved === 'color' ? saved : 'artista';
    } catch {
      return 'artista';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
    } catch {
      // Sin almacenamiento (modo privado, etc.): la colección vive mientras dure la pestaña.
    }
  }, [albums]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, sort);
    } catch {
      /* idem */
    }
  }, [sort]);

  const sorted = useMemo(() => sortAlbums(albums, sort), [albums, sort]);

  const add = useCallback((album: Album) => {
    setAlbums((prev) => [...prev.filter((a) => a.id !== album.id), album]);
  }, []);

  const remove = useCallback((id: string) => {
    setAlbums((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const update = useCallback((id: string, patch: Partial<Album>) => {
    setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  /** Suma los discos importados; si un disco ya estaba, gana la versión importada. */
  const importMany = useCallback((incoming: Album[]) => {
    setAlbums((prev) => {
      const ids = new Set(incoming.map((a) => a.id));
      return [...prev.filter((a) => !ids.has(a.id)), ...incoming];
    });
  }, []);

  return { albums: sorted, count: albums.length, sort, setSort, add, remove, update, importMany };
}
