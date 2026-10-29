// Configuración pública del proyecto. Nada de esto es secreto: la apiKey web de Firebase es
// pública por diseño y la seguridad la dan las reglas de Firestore (firestore.rules).

export const firebaseConfig = {
  apiKey: 'AIzaSyD-aTipvZL5v6Rk_PkQtwUgCzqLZAK41AQ',
  authDomain: 'discoteca-bd.firebaseapp.com',
  projectId: 'discoteca-bd',
  storageBucket: 'discoteca-bd.firebasestorage.app',
  messagingSenderId: '985229440008',
  appId: '1:985229440008:web:289572b4fc8151183a0dbd',
};

/**
 * Nombres reservados para discotecas que ya existían antes de que hubiera usuarios.
 * Tienen que coincidir con firestore.rules.
 */
export const RESERVED_HANDLES: Record<string, string> = {
  mana: 'rK4orgfeviV2Fx5BMO7XF2g3SSG3',
};
