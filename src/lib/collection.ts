import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OWNER_UID } from '../config';
import { hueKey } from './colors';
import { db } from './firebase';
import type { Album, SortMode } from './types';

/** Colección de la versión 1 (solo en este navegador). Se sube a Firestore la primera vez que entrás. */
const STORAGE_KEY = 'discoteca:v1';
const MIGRATED_KEY = 'discoteca:subida-a-firestore';
const SORT_KEY = 'discoteca:orden';

/** discotecas/{uid}/discos/{id de Spotify}: lectura pública, escritura solo del dueño. */
const discos = OWNER_UID ? collection(db, 'discotecas', OWNER_UID, 'discos') : null;

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

function loadLocal(): Album[] {
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

/** Los discos sin año conocido van al final. */
const byYear = (a: Album, b: Album) => (a.year ?? 9999) - (b.year ?? 9999);
const byArtist = (a: Album, b: Album) => artistSortKey(a.artist).localeCompare(artistSortKey(b.artist), 'es');
const byTitle = (a: Album, b: Album) => a.title.localeCompare(b.title, 'es');
/** Los discos sin género van al final, en su propio grupo. */
const byGenre = (a: Album, b: Album) =>
  Number(!a.genre) - Number(!b.genre) || (a.genre ?? '').localeCompare(b.genre ?? '', 'es');

export function sortAlbums(albums: Album[], mode: SortMode): Album[] {
  const list = [...albums];
  switch (mode) {
    case 'artista':
      // Como en una discoteca de verdad: por artista y, dentro de cada uno, en orden cronológico.
      return list.sort((a, b) => byArtist(a, b) || byYear(a, b) || byTitle(a, b));
    case 'anio':
      return list.sort((a, b) => byYear(a, b) || byArtist(a, b) || byTitle(a, b));
    case 'genero':
      return list.sort((a, b) => byGenre(a, b) || byArtist(a, b) || byYear(a, b) || byTitle(a, b));
    case 'recientes':
      return list.sort((a, b) => b.addedAt - a.addedAt);
    case 'color':
      return list.sort((a, b) => hueKey(a.palette.edge) - hueKey(b.palette.edge));
  }
}

export type CollectionStatus = 'cargando' | 'lista' | 'error';

/**
 * La discoteca vive en Firestore (con caché local). Mientras OWNER_UID no esté configurado,
 * funciona como antes: solo en el localStorage de este navegador.
 */
export function useCollection({ canEdit, onMigrated }: { canEdit: boolean; onMigrated?: (count: number) => void }) {
  const [albums, setAlbums] = useState<Album[]>(() => (discos ? [] : loadLocal()));
  const [status, setStatus] = useState<CollectionStatus>(discos ? 'cargando' : 'lista');
  const [sort, setSort] = useState<SortMode>(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      return saved === 'anio' || saved === 'genero' || saved === 'recientes' || saved === 'color' ? saved : 'artista';
    } catch {
      return 'artista';
    }
  });

  useEffect(() => {
    if (!discos) return;
    return onSnapshot(
      discos,
      (snap) => {
        setAlbums(snap.docs.map((d) => d.data() as Album).filter(isAlbum));
        setStatus('lista');
      },
      () => setStatus('error'),
    );
  }, []);

  // Modo local: persistimos en el navegador.
  useEffect(() => {
    if (discos) return;
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
    if (discos) void setDoc(doc(discos, album.id), album);
    else setAlbums((prev) => [...prev.filter((a) => a.id !== album.id), album]);
  }, []);

  const remove = useCallback((id: string) => {
    if (discos) void deleteDoc(doc(discos, id));
    else setAlbums((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const update = useCallback((id: string, patch: Partial<Album>) => {
    if (discos) void updateDoc(doc(discos, id), patch);
    else setAlbums((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }, []);

  /** Suma los discos importados; si un disco ya estaba, gana la versión importada. */
  const importMany = useCallback(async (incoming: Album[]) => {
    if (!discos) {
      setAlbums((prev) => {
        const ids = new Set(incoming.map((a) => a.id));
        return [...prev.filter((a) => !ids.has(a.id)), ...incoming];
      });
      return;
    }
    // Firestore acepta hasta 500 escrituras por lote.
    for (let i = 0; i < incoming.length; i += 400) {
      const batch = writeBatch(db);
      for (const album of incoming.slice(i, i + 400)) batch.set(doc(discos, album.id), album);
      await batch.commit();
    }
  }, []);

  // La primera vez que el dueño entra, sube la colección que tenía guardada en este navegador.
  // El localStorage no se borra: queda como copia.
  const migrating = useRef(false);
  useEffect(() => {
    if (!discos || !canEdit || status !== 'lista' || migrating.current) return;
    let local: Album[];
    try {
      if (localStorage.getItem(MIGRATED_KEY)) return;
      local = loadLocal();
    } catch {
      return;
    }
    const known = new Set(albums.map((a) => a.id));
    const missing = local.filter((a) => !known.has(a.id));
    migrating.current = true;
    void importMany(missing)
      .then(() => {
        try {
          localStorage.setItem(MIGRATED_KEY, new Date().toISOString());
        } catch {
          /* idem */
        }
        if (missing.length) onMigrated?.(missing.length);
      })
      .finally(() => {
        migrating.current = false;
      });
  }, [canEdit, status, albums, importMany, onMigrated]);

  return { albums: sorted, count: albums.length, status, sort, setSort, add, remove, update, importMany };
}
