import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Album } from '../lib/types';
import { Spine } from './Spine';

interface Props {
  albums: Album[];
  loading?: boolean;
  openId: string | null;
  newId: string | null;
  /** Disco resaltado por la ruleta de "Toca toca, la suerte es loca". */
  highlightId?: string | null;
  /** Si está, separa los discos en secciones (p. ej. por género) con un cartón separador. */
  sectionOf?: (album: Album) => string;
  onOpen: (id: string) => void;
  /** Ausente en modo lectura. */
  onAdd?: () => void;
}

const MIN_SHELVES = 3;
const GAP = 1;
/** Los separadores son un poco más anchos que un lomo, para que se lea el nombre. */
const DIVIDER_FACTOR = 1.6;

/** Proporción real de una caja de CD vista de lomo: 10 × 125 mm. Un poco más ancho para que se lea. */
function spineSize(width: number) {
  return width < 640 ? { w: 19, h: 200 } : { w: 23, h: 250 };
}

type Item = { kind: 'album'; album: Album } | { kind: 'divider'; label: string };

function buildItems(albums: Album[], sectionOf?: (album: Album) => string): Item[] {
  if (!sectionOf) return albums.map((album) => ({ kind: 'album', album }));
  const items: Item[] = [];
  let current: string | null = null;
  for (const album of albums) {
    const section = sectionOf(album);
    if (section !== current) {
      items.push({ kind: 'divider', label: section });
      current = section;
    }
    items.push({ kind: 'album', album });
  }
  return items;
}

/** Reparte los ítems en estantes según el ancho disponible. */
function packShelves(items: Item[], available: number, spineW: number): Item[][] {
  const widthOf = (item: Item) => (item.kind === 'divider' ? spineW * DIVIDER_FACTOR : spineW) + GAP;
  const shelves: Item[][] = [[]];
  let used = 0;
  for (const item of items) {
    const shelf = shelves[shelves.length - 1];
    if (used + widthOf(item) <= available + GAP || shelf.length === 0) {
      shelf.push(item);
      used += widthOf(item);
      continue;
    }
    // No entra: empieza otro estante. Un separador nunca queda solo al final: se muda con su sección.
    const next: Item[] = [];
    const last = shelf[shelf.length - 1];
    if (last.kind === 'divider' && shelf.length > 1) next.push(shelf.pop()!);
    next.push(item);
    shelves.push(next);
    used = next.reduce((sum, it) => sum + widthOf(it), 0);
  }
  return shelves.filter((s) => s.length > 0);
}

export function Cabinet({ albums, loading = false, openId, newId, highlightId, sectionOf, onOpen, onAdd }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [innerWidth, setInnerWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setInnerWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const size = spineSize(typeof window === 'undefined' ? 1024 : window.innerWidth);
  const shelfPadding = 2 * (size.w < 20 ? 10 : 16);
  const shelves = packShelves(buildItems(albums, sectionOf), innerWidth - shelfPadding, size.w);
  while (shelves.length < MIN_SHELVES) shelves.push([]);

  const style = {
    '--spine-w': `${size.w}px`,
    '--spine-h': `${size.h}px`,
    '--divider-w': `${size.w * DIVIDER_FACTOR}px`,
    '--gap': `${GAP}px`,
  } as CSSProperties;

  return (
    <div className="cabinet" style={style}>
      <div className="cabinet__crown" />
      <div className="cabinet__body" ref={ref}>
        {innerWidth > 0 &&
          shelves.map((shelf, i) => (
            <div className="shelf" key={i}>
              <div className="shelf__slots">
                {shelf.map((item) =>
                  item.kind === 'divider' ? (
                    <div key={`divider-${item.label}`} className="divider" title={item.label}>
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    <button
                      key={item.album.id}
                      type="button"
                      className={[
                        'slot',
                        item.album.id === openId && 'slot--out',
                        item.album.id === newId && 'slot--new',
                        item.album.id === highlightId && 'slot--lit',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={item.album.artist ? `${item.album.artist} — ${item.album.title}` : item.album.title}
                      aria-label={item.album.artist ? `${item.album.artist}, ${item.album.title}` : item.album.title}
                      onClick={() => onOpen(item.album.id)}
                    >
                      <Spine album={item.album} />
                    </button>
                  ),
                )}
                {albums.length === 0 && !loading && i === 0 &&
                  (onAdd ? (
                    <button type="button" className="shelf__empty" onClick={onAdd}>
                      <span>La discoteca está vacía.</span>
                      <span>Pegá el link de un álbum de Spotify para guardar el primero.</span>
                    </button>
                  ) : (
                    <div className="shelf__empty">
                      <span>La discoteca está vacía.</span>
                    </div>
                  ))}
              </div>
              <div className="shelf__board" />
            </div>
          ))}
      </div>
      <div className="cabinet__plinth" />
    </div>
  );
}
