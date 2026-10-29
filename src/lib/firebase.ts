import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { firebaseConfig } from '../config';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Caché local persistente: la discoteca aparece al instante y funciona sin conexión.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
});

export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signOutUser = () => signOut(auth);

/** `null` si no hace falta avisar nada (por ejemplo, cerraste el popup). */
export function signInErrorMessage(error: unknown): string | null {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/unauthorized-domain') return 'Este dominio no está autorizado en Firebase Authentication';
  if (code === 'auth/operation-not-allowed') return 'Falta habilitar el acceso con Google en Firebase';
  return 'No pude iniciar sesión';
}

/** `undefined` mientras Firebase resuelve la sesión guardada. */
export function useUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}
