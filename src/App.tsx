import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddDisc } from './components/AddDisc';
import { Cabinet } from './components/Cabinet';
import { CaseViewer } from './components/CaseViewer';
import { LuckyDialog } from './components/LuckyDialog';
import { OWNER_UID } from './config';
import { parseCollection, useCollection } from './lib/collection';
import { signIn, signOutUser, useUser } from './lib/firebase';
import { loadLuckyFilters, saveLuckyFilters, type LuckyFilters } from './lib/lucky';
import { useMetadataBackfill } from './lib/metadata';
import { looksLikeSpotify } from './lib/spotify';
import { countryName } from './sources/countries';
import type { Album, SortMode } from './lib/types';

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'artista', label: 'Artista' },
  { value: 'anio', label: 'Año' },
  { value: 'genero', label: 'Género' },
  { value: 'pais', label: 'País' },
  { value: 'recientes', label: 'Recientes' },
  { value: 'color', label: 'Color' },
];

const sectionByGenre = (album: Album) => album.genre ?? 'Sin género';
const sectionByCountry = (album: Album) => countryName(album.country) ?? 'Sin país';
const SECTIONS: Partial<Record<SortMode, (album: Album) => string>> = { genero: sectionByGenre, pais: sectionByCountry };

function signInErrorMessage(error: unknown): string | null {
  const code = (error as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return null;
  if (code === 'auth/unauthorized-domain') return 'Este dominio no está autorizado en Firebase Authentication';
  if (code === 'auth/operation-not-allowed') return 'Falta habilitar el acceso con Google en Firebase';
  return 'No pude iniciar sesión';
}

export function App() {
  const user = useUser();
  // Sin OWNER_UID configurado la discoteca vive en este navegador y se puede editar sin cuenta.
  const canEdit = !OWNER_UID || (!!user && user.uid === OWNER_UID);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 3600);
  }, []);
  const onMigrated = useCallback(
    (n: number) => showToast(`Subí a la nube los ${n} ${n === 1 ? 'disco' : 'discos'} de este navegador`),
    [showToast],
  );

  const { albums, count, status, sort, setSort, add, remove, update, importMany } = useCollection({ canEdit, onMigrated });
  useMetadataBackfill(albums, update, canEdit);

  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ value: string } | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openIndex = albums.findIndex((a) => a.id === openId);
  const openAlbum = openIndex >= 0 ? albums[openIndex] : null;
  const existingIds = useMemo(() => new Set(albums.map((a) => a.id)), [albums]);
  const knownCountries = useMemo(
    () => [...new Set(albums.map((a) => a.country).filter((c): c is string => !!c))],
    [albums],
  );
  const knownGenres = useMemo(
    () => [...new Set(albums.map((a) => a.genre).filter((g): g is string => !!g))],
    [albums],
  );

  // "Toca toca, la suerte es loca": elegís filtros, una ruleta recorre los lomos que los cumplen,
  // se va frenando y abre el elegido.
  const [luckyOpen, setLuckyOpen] = useState(false);
  const [luckyFilters, setLuckyFilters] = useState<LuckyFilters>(loadLuckyFilters);
  const [litId, setLitId] = useState<string | null>(null);
  const rolling = useRef(false);
  const lastLucky = useRef<string | null>(null);
  const randomFrom = (pool: Album[], exclude: string | null) => {
    const candidates = pool.length > 1 ? pool.filter((a) => a.id !== exclude) : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };
  const tocaToca = (pool: Album[], filters: LuckyFilters) => {
    setLuckyOpen(false);
    setLuckyFilters(filters);
    saveLuckyFilters(filters);
    if (pool.length === 0 || rolling.current) return;
    const chosen = randomFrom(pool, lastLucky.current);
    lastLucky.current = chosen.id;
    if (pool.length < 3 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpenId(chosen.id);
      return;
    }
    rolling.current = true;
    setOpenId(null);
    const steps = 12;
    let at = 0;
    let previous: string | null = null;
    for (let i = 0; i < steps; i++) {
      at += 45 + i * i * 1.6;
      const id: string = i === steps - 1 ? chosen.id : randomFrom(pool, previous).id;
      previous = id;
      window.setTimeout(() => setLitId(id), at);
    }
    window.setTimeout(() => {
      setLitId(null);
      rolling.current = false;
      setOpenId(chosen.id);
    }, at + 450);
  };

  // Pegar un link de Spotify en cualquier parte de la página abre "Guardar un disco".
  useEffect(() => {
    if (!canEdit) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (adding || target?.closest('input, textarea')) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (looksLikeSpotify(text)) {
        e.preventDefault();
        setOpenId(null);
        setAdding({ value: text });
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [adding, canEdit]);

  useEffect(() => {
    document.body.classList.toggle('locked', !!openAlbum || !!adding || luckyOpen);
  }, [openAlbum, adding, luckyOpen]);

  const step = (delta: number) => {
    if (albums.length === 0 || openIndex < 0) return;
    setOpenId(albums[(openIndex + delta + albums.length) % albums.length].id);
  };

  const onSave = (album: Album) => {
    add(album);
    setAdding(null);
    setNewId(album.id);
    window.setTimeout(() => setNewId((id) => (id === album.id ? null : id)), 1200);
    showToast(`Guardaste “${album.title}”`);
  };

  const login = async () => {
    setMenuOpen(false);
    try {
      await signIn();
    } catch (error) {
      const message = signInErrorMessage(error);
      if (message) showToast(message);
    }
  };

  const exportCollection = () => {
    const data = JSON.stringify({ version: 1, exportado: new Date().toISOString(), discos: albums }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `discoteca-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMenuOpen(false);
  };

  const importCollection = async (file: File) => {
    try {
      const parsed = parseCollection(JSON.parse(await file.text()));
      if (!parsed) throw new Error();
      await importMany(parsed);
      showToast(`Importé ${parsed.length} ${parsed.length === 1 ? 'disco' : 'discos'}`);
    } catch {
      showToast('No pude importar ese archivo');
    }
  };

  return (
    <div className="room">
      <header className="topbar">
        <div className="plaque">
          <span className="plaque__screw" />
          <h1>Discoteca</h1>
          <span className="plaque__screw" />
        </div>
        <div className="topbar__tools">
          <span className="topbar__count">
            {count} {count === 1 ? 'disco' : 'discos'}
          </span>
          <div className="segmented" role="group" aria-label="Ordenar">
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                className={sort === s.value ? 'is-active' : ''}
                aria-pressed={sort === s.value}
                onClick={() => setSort(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--luck" onClick={() => setLuckyOpen(true)} disabled={count === 0}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="8" cy="8" r="1.6" fill="currentColor" />
              <circle cx="16" cy="8" r="1.6" fill="currentColor" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              <circle cx="8" cy="16" r="1.6" fill="currentColor" />
              <circle cx="16" cy="16" r="1.6" fill="currentColor" />
            </svg>
            Toca toca, la suerte es loca
          </button>
          {canEdit && (
            <button type="button" className="btn" onClick={() => setAdding({ value: '' })}>
              + Guardar disco
            </button>
          )}
          {user === null && (
            <button type="button" className="btn btn--ghost" onClick={login}>
              Entrar
            </button>
          )}
          <div className="menu">
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              aria-label="Más opciones"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              ⋯
            </button>
            {menuOpen && (
              <>
                <div className="menu__scrim" onClick={() => setMenuOpen(false)} />
                <div className="menu__list">
                  <button type="button" onClick={exportCollection} disabled={count === 0}>
                    Exportar copia (JSON)
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        fileRef.current?.click();
                      }}
                    >
                      Importar copia…
                    </button>
                  )}
                  {user && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        void signOutUser();
                      }}
                    >
                      Salir <span className="menu__hint">{user.email}</span>
                    </button>
                  )}
                </div>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importCollection(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </header>

      {!OWNER_UID && user && (
        <div className="notice">
          Para guardar la discoteca en Firebase, configurá este UID como dueño en <code>src/config.ts</code> y{' '}
          <code>firestore.rules</code>: <code className="notice__uid">{user.uid}</code>
        </div>
      )}
      {OWNER_UID && user && !canEdit && (
        <div className="notice">Entraste como {user.email}. Esta discoteca no es tuya: la ves en modo lectura.</div>
      )}
      {status === 'error' && <div className="notice notice--error">No pude leer la discoteca de la base de datos.</div>}

      <main>
        <Cabinet
          albums={albums}
          loading={status === 'cargando'}
          openId={openAlbum?.id ?? null}
          newId={newId}
          highlightId={litId}
          sectionOf={SECTIONS[sort]}
          onOpen={setOpenId}
          onAdd={canEdit ? () => setAdding({ value: '' }) : undefined}
        />
        {canEdit && (
          <p className="footnote">
            Tip: copiá el link de un álbum en Spotify y pegalo (⌘V) en cualquier lugar de la página.
          </p>
        )}
      </main>

      {openAlbum && (
        <CaseViewer
          album={openAlbum}
          position={`${openIndex + 1} de ${albums.length}`}
          readOnly={!canEdit}
          knownGenres={knownGenres}
          knownCountries={knownCountries}
          onClose={() => setOpenId(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onUpdate={(patch) => update(openAlbum.id, patch)}
          onRemove={() => {
            remove(openAlbum.id);
            setOpenId(null);
            showToast(`Sacaste “${openAlbum.title}”`);
          }}
        />
      )}

      {luckyOpen && (
        <LuckyDialog albums={albums} initial={luckyFilters} onSpin={tocaToca} onClose={() => setLuckyOpen(false)} />
      )}

      {adding && canEdit && (
        <AddDisc
          initialValue={adding.value}
          existingIds={existingIds}
          onSave={onSave}
          onShow={(id) => {
            setAdding(null);
            setOpenId(id);
          }}
          onClose={() => setAdding(null)}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
