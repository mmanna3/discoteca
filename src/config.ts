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
 * UID de Firebase Auth del dueño de la discoteca: la única cuenta que puede editarla.
 * Tiene que coincidir con el de firestore.rules. Vacío = todavía no configurado (modo local).
 */
export const OWNER_UID = 'rK4orgfeviV2Fx5BMO7XF2g3SSG3';
