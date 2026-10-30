import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { RESERVED_HANDLES } from '../config';
import { signIn, signInErrorMessage } from '../lib/firebase';
import { isValidHandle, toHandle } from '../lib/handles';
import { DEFAULT_TEMA, useTema, type Tema } from '../lib/themes';
import { claimHandle, hrefFor, isHandleTaken, type Profile } from '../lib/users';
import { ThemePicker } from './ThemePicker';

type Props =
  | { mode: 'cargando' }
  | { mode: 'portada' }
  | { mode: 'crear'; user: User }
  | { mode: 'no-existe'; handle: string; user: User | null | undefined; mine: Profile | null | undefined };

/** Las pantallas que no son una discoteca: la portada, crear la tuya, o un link que no existe. */
export function Welcome(props: Props) {
  useEffect(() => {
    document.title = 'Discoteca';
  }, []);

  return (
    <div className="room">
      <header className="topbar topbar--center">
        <div className="plaque">
          <span className="plaque__screw" />
          <h1>Discoteca</h1>
          <span className="plaque__screw" />
        </div>
      </header>
      <main className="welcome">
        {props.mode === 'cargando' && <p className="welcome__loading">Cargando…</p>}
        {props.mode === 'portada' && <Portada />}
        {props.mode === 'crear' && <Crear user={props.user} />}
        {props.mode === 'no-existe' && <NoExiste {...props} />}
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dialog__card welcome__card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function useLogin() {
  const [error, setError] = useState<string | null>(null);
  const login = async () => {
    setError(null);
    try {
      await signIn();
    } catch (e) {
      setError(signInErrorMessage(e));
    }
  };
  return { login, error };
}

function Portada() {
  const { login, error } = useLogin();
  return (
    <Card title="Tu discoteca de CDs, con tus discos de Spotify">
      <p className="dialog__hint">
        Pegás el link de un álbum y aparece en el mueble, con su lomo, sus temas y su año. Entrá con Google para armar
        la tuya; cualquiera con el link la puede mirar.
      </p>
      <div className="dialog__actions">
        <button type="button" className="btn" onClick={login}>
          Entrar con Google
        </button>
      </div>
      {error && <p className="dialog__error">{error}</p>}
    </Card>
  );
}

function Crear({ user }: { user: User }) {
  const reserved = Object.keys(RESERVED_HANDLES).find((h) => RESERVED_HANDLES[h] === user.uid);
  const firstName = user.displayName?.split(' ')[0] ?? '';
  const [nombre, setNombre] = useState(firstName);
  const [handle, setHandle] = useState(reserved ?? toHandle(firstName));
  const [handleTouched, setHandleTouched] = useState(!!reserved);
  const [tema, setTema] = useState<Tema>(DEFAULT_TEMA);
  useTema(tema);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const url = `${window.location.origin}${window.location.pathname}${hrefFor(handle || '…')}`;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const finalHandle = handle.replace(/-+$/, '');
    if (!nombre.trim()) return setError('Poné un nombre para la placa');
    if (!isValidHandle(finalHandle)) return setError('El link necesita al menos 2 letras o números');
    setSaving(true);
    setError(null);
    try {
      if (await isHandleTaken(finalHandle)) throw new Error('tomado');
      // Al crearse el perfil, App te lleva sola a la discoteca nueva.
      await claimHandle(user.uid, finalHandle, nombre.trim(), { tema });
    } catch (e) {
      setError(
        (e as Error).message === 'tomado' || (e as { code?: string }).code === 'permission-denied'
          ? `“${finalHandle}” ya es de otra persona. Probá con otro.`
          : 'No pude crear la discoteca. Probá de nuevo.',
      );
      setSaving(false);
    }
  };

  return (
    <Card title="Armá tu discoteca">
      <p className="dialog__hint">Entraste como {user.email}. Elegí cómo se va a llamar; el link no se puede cambiar después.</p>
      <form className="welcome__form" onSubmit={onSubmit}>
        <label>
          Nombre en la placa
          <input
            value={nombre}
            maxLength={40}
            placeholder="Mana"
            onChange={(e) => {
              setNombre(e.target.value);
              if (!handleTouched) setHandle(toHandle(e.target.value));
            }}
          />
        </label>
        <label>
          Link
          <input
            value={handle}
            maxLength={24}
            placeholder="mana"
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => {
              setHandleTouched(true);
              setHandle(toHandle(e.target.value));
            }}
          />
          <span className="welcome__url">{url}</span>
        </label>
        <div className="welcome__field">
          Colores
          <ThemePicker value={tema} onChange={setTema} />
          <span className="welcome__url">Los podés cambiar cuando quieras desde el menú ⋯</span>
        </div>
        {error && <p className="dialog__error">{error}</p>}
        <div className="dialog__actions">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Creando…' : 'Crear mi discoteca'}
          </button>
        </div>
      </form>
    </Card>
  );
}

function NoExiste({ handle, user, mine }: Extract<Props, { mode: 'no-existe' }>) {
  return (
    <Card title={`No hay ninguna discoteca “${handle}”`}>
      <p className="dialog__hint">Puede que el link esté mal escrito.</p>
      <div className="dialog__actions">
        {mine ? (
          <a className="btn" href={hrefFor(mine.handle)}>
            Ir a mi discoteca
          </a>
        ) : (
          <a className="btn" href="#/">
            {user ? 'Armar la mía' : 'Armar una'}
          </a>
        )}
      </div>
    </Card>
  );
}
