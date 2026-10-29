import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { countryName } from '../sources/countries';
import { hueKey } from './colors';
import { db } from './firebase';
import type { Album, SortMode } from './types';

/** Colección de la versión 1 (solo en este navegador). Se sube a Firestore la primera vez que entrás. */
const STORAGE_KEY = 'discoteca:v1';
const MIGRATED_KEY = 'discoteca:subida-a-firestore';
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
/** Los discos sin país van al final, en su propio grupo. */
const byCountry = (a: Album, b: Album) =>
  Number(!a.country) - Number(!b.country) ||
  (countryName(a.country) ?? '').localeCompare(countryName(b.country) ?? '', 'es');
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
    case 'pais':
      return list.sort((a, b) => byCountry(a, b) || byArtist(a, b) || byYear(a, b) || byTitle(a, b));
    case 'genero':
      return list.sort((a, b) => byGenre(a, b) || byArtist(a, b) || byYear(a, b) || byTitle(a, b));
    case 'recientes':
      return list.sort((a, b) => b.addedAt - a.addedAt);
    case 'color':
      return list.sort((a, b) => hueKey(a.palette.edge) - hueKey(b.palette.edge));
  }
}

export type CollectionStatus = 'cargando' | 'lista' | 'error';

interface CollectionOptions {
  /** De quién es la discoteca que se está viendo. */
  ownerUid: string;
  canEdit: boolean;
  onMigrated?: (count: number) => void;
}

/** La discoteca de `ownerUid`, en Firestore (con caché local). */
export function useCollection({ ownerUid, canEdit, onMigrated }: CollectionOptions) {
  /** discotecas/{uid}/discos/{id de Spotify}: lectura pública, escritura solo del dueño. */
  const discos = useMemo(() => collection(db, 'discotecas', ownerUid, 'discos'), [ownerUid]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [status, setStatus] = useState<CollectionStatus>('cargando');
  const [sort, setSort] = useState<SortMode>(() => {
    try {
      const saved = localStorage.getItem(SORT_KEY);
      const modes: SortMode[] = ['anio', 'genero', 'pais', 'recientes', 'color'];
      return modes.find((m) => m === saved) ?? 'artista';
    } catch {
      return 'artista';
    }
  });

  useEffect(() => {
    setAlbums([]);
    setStatus('cargando');
    return onSnapshot(
      discos,
      (snap) => {
        setAlbums(snap.docs.map((d) => d.data() as Album).filter(isAlbum));
        setStatus('lista');
      },
      () => setStatus('error'),
    );
  }, [discos]);

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, sort);
    } catch {
      /* idem */
    }
  }, [sort]);

  const sorted = useMemo(() => sortAlbums(albums, sort), [albums, sort]);

  const add = useCallback((album: Album) => void setDoc(doc(discos, album.id), album), [discos]);
  const remove = useCallback((id: string) => void deleteDoc(doc(discos, id)), [discos]);
  const update = useCallback(
    (id: string, patch: Partial<Album>) => void updateDoc(doc(discos, id), patch),
    [discos],
  );

  /** Suma los discos importados; si un disco ya estaba, gana la versión importada. */
  const importMany = useCallback(async (incoming: Album[]) => {
    // Firestore acepta hasta 500 escrituras por lote.
    for (let i = 0; i < incoming.length; i += 400) {
      const batch = writeBatch(db);
      for (const album of incoming.slice(i, i + 400)) batch.set(doc(discos, album.id), album);
      await batch.commit();
    }
  }, [discos]);

  // La primera vez que el dueño entra, sube la colección que tenía guardada en este navegador
  // (de cuando la discoteca vivía solo en el localStorage). El localStorage no se borra: queda como copia.
  const migrating = useRef(false);
  useEffect(() => {
    if (!canEdit || status !== 'lista' || migrating.current) return;
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
