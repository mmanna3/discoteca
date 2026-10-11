import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddDisc } from './components/AddDisc';
import { Cabinet } from './components/Cabinet';
import { CaseViewer } from './components/CaseViewer';
import { parseCollection, useCollection } from './lib/collection';
import { useMetadataBackfill } from './lib/metadata';
import { looksLikeSpotify } from './lib/spotify';
import type { Album, SortMode } from './lib/types';

const SORTS: { value: SortMode; label: string }[] = [
  { value: 'artista', label: 'Artista' },
  { value: 'anio', label: 'Año' },
  { value: 'recientes', label: 'Recientes' },
  { value: 'color', label: 'Color' },
];

export function App() {
  const { albums, count, sort, setSort, add, remove, update, importMany } = useCollection();
  useMetadataBackfill(albums, update);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ value: string } | null>(null);
  const [newId, setNewId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const openIndex = albums.findIndex((a) => a.id === openId);
  const openAlbum = openIndex >= 0 ? albums[openIndex] : null;
  const existingIds = useMemo(() => new Set(albums.map((a) => a.id)), [albums]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 3200);
  }, []);

  // Pegar un link de Spotify en cualquier parte de la página abre "Guardar un disco".
  useEffect(() => {
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
  }, [adding]);

  useEffect(() => {
    document.body.classList.toggle('locked', !!openAlbum || !!adding);
  }, [openAlbum, adding]);

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
      importMany(parsed);
      showToast(`Importé ${parsed.length} ${parsed.length === 1 ? 'disco' : 'discos'}`);
    } catch {
      showToast('Ese archivo no parece una copia de la discoteca');
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
          <button type="button" className="btn" onClick={() => setAdding({ value: '' })}>
            + Guardar disco
          </button>
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
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      fileRef.current?.click();
                    }}
                  >
                    Importar copia…
                  </button>
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

      <main>
        <Cabinet
          albums={albums}
          openId={openAlbum?.id ?? null}
          newId={newId}
          onOpen={setOpenId}
          onAdd={() => setAdding({ value: '' })}
        />
        <p className="footnote">
          Tip: copiá el link de un álbum en Spotify y pegalo (⌘V) en cualquier lugar de la página.
        </p>
      </main>

      {openAlbum && (
        <CaseViewer
          album={openAlbum}
          position={`${openIndex + 1} de ${albums.length}`}
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

      {adding && (
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
