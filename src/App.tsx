import { useEffect } from 'react';
import { Welcome } from './components/Welcome';
import { Discoteca } from './Discoteca';
import { useUser } from './lib/firebase';
import { hrefFor, useOwner, useProfile, useRoute } from './lib/users';

/**
 * `#/mana` muestra la discoteca de mana. La portada (`#/`) te lleva a la tuya si ya tenés una,
 * te ofrece crearla si entraste por primera vez, o te invita a entrar con Google.
 */
export function App() {
  const user = useUser();
  const mine = useProfile(user === undefined ? undefined : (user?.uid ?? null));
  const handle = useRoute();
  const ownerUid = useOwner(handle);
  const owner = useProfile(ownerUid);

  useEffect(() => {
    if (!handle && mine) window.location.replace(hrefFor(mine.handle));
  }, [handle, mine]);

  if (handle) {
    if (ownerUid === undefined) return <Welcome mode="cargando" />;
    if (ownerUid === null) return <Welcome mode="no-existe" handle={handle} user={user} mine={mine} />;
    return <Discoteca key={ownerUid} ownerUid={ownerUid} owner={owner ?? null} user={user} mine={mine} />;
  }
  if (user === null) return <Welcome mode="portada" />;
  if (user === undefined || mine !== null) return <Welcome mode="cargando" />;
  return <Welcome mode="crear" user={user} />;
}
