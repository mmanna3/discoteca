import { doc, getDoc, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from './firebase';
import { handleFromHash } from './handles';
import type { Tema } from './themes';

/**
 * Cada discoteca tiene dos documentos, que se crean juntos y no se pueden reasignar:
 * - `usuarios/{handle}` → `{ uid }`: para encontrar la discoteca de `#/mana`.
 * - `perfiles/{uid}` → nombre y ajustes: para saber cuál es la tuya cuando entrás.
 */
export interface Profile {
  handle: string;
  /** Lo que dice la placa: "Discoteca de Mana". */
  nombre: string;
  creadoAt: number;
  /** Cómo se ve la discoteca, para todos los que la miran. Todo opcional. */
  ajustes?: Ajustes;
}

export interface Ajustes {
  tema?: Tema;
}

/** `undefined` mientras carga; `null` si no existe. */
export type Loadable<T> = T | null | undefined;

/** El perfil de un uid, en vivo. */
export function useProfile(uid: string | null | undefined): Loadable<Profile> {
  const [profile, setProfile] = useState<Loadable<Profile>>(undefined);
  useEffect(() => {
    setProfile(uid === null ? null : undefined);
    if (!uid) return;
    return onSnapshot(
      doc(db, 'perfiles', uid),
      { includeMetadataChanges: true },
      (snap) => {
        // Un "no existe" de la caché puede estar viejo, y una escritura pendiente todavía puede
        // ser rechazada: en los dos casos esperamos la respuesta del servidor.
        if (snap.metadata.hasPendingWrites || (!snap.exists() && snap.metadata.fromCache)) return;
        setProfile(snap.exists() ? (snap.data() as Profile) : null);
      },
      () => setProfile(null),
    );
  }, [uid]);
  return profile;
}

/** El uid dueño de `#/handle`. Nunca cambia, así que alcanza con leerlo una vez. */
export function useOwner(handle: string | null): Loadable<string> {
  const [uid, setUid] = useState<Loadable<string>>(undefined);
  useEffect(() => {
    setUid(handle ? undefined : null);
    if (!handle) return;
    let alive = true;
    getDoc(doc(db, 'usuarios', handle))
      .then((snap) => alive && setUid(snap.exists() ? (snap.data().uid as string) : null))
      .catch(() => alive && setUid(null));
    return () => {
      alive = false;
    };
  }, [handle]);
  return uid;
}

export async function isHandleTaken(handle: string): Promise<boolean> {
  return (await getDoc(doc(db, 'usuarios', handle))).exists();
}

/** Reserva el nombre y crea el perfil en una sola escritura. Falla si el nombre ya es de otro. */
export async function claimHandle(uid: string, handle: string, nombre: string, ajustes: Ajustes): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'usuarios', handle), { uid });
  batch.set(doc(db, 'perfiles', uid), { handle, nombre, creadoAt: Date.now(), ajustes } satisfies Profile);
  await batch.commit();
}

export async function saveTema(uid: string, tema: Tema): Promise<void> {
  await updateDoc(doc(db, 'perfiles', uid), { 'ajustes.tema': tema });
}

/** La discoteca que pide la URL (`#/mana`), o `null` en la portada. */
export function useRoute(): string | null {
  const [handle, setHandle] = useState(() => handleFromHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setHandle(handleFromHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return handle;
}

export const hrefFor = (handle: string) => `#/${handle}`;
