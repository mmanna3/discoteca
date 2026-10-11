import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Album } from '../lib/types';
import { Spine } from './Spine';

interface Props {
  albums: Album[];
  openId: string | null;
  newId: string | null;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

const MIN_SHELVES = 3;
const GAP = 1;

/** Proporción real de una caja de CD vista de lomo: 10 × 125 mm. Un poco más ancho para que se lea. */
function spineSize(width: number) {
  return width < 640 ? { w: 19, h: 200 } : { w: 23, h: 250 };
}

export function Cabinet({ albums, openId, newId, onOpen, onAdd }: Props) {
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
  const perShelf = Math.max(1, Math.floor((innerWidth - shelfPadding + GAP) / (size.w + GAP)));

  const shelves: Album[][] = [];
  for (let i = 0; i < albums.length; i += perShelf) shelves.push(albums.slice(i, i + perShelf));
  while (shelves.length < MIN_SHELVES) shelves.push([]);

  const style = { '--spine-w': `${size.w}px`, '--spine-h': `${size.h}px`, '--gap': `${GAP}px` } as CSSProperties;

  return (
    <div className="cabinet" style={style}>
      <div className="cabinet__crown" />
      <div className="cabinet__body" ref={ref}>
        {innerWidth > 0 &&
          shelves.map((shelf, i) => (
            <div className="shelf" key={i}>
              <div className="shelf__slots">
                {shelf.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    className={`slot${album.id === openId ? ' slot--out' : ''}${album.id === newId ? ' slot--new' : ''}`}
                    title={album.artist ? `${album.artist} — ${album.title}` : album.title}
                    aria-label={album.artist ? `${album.artist}, ${album.title}` : album.title}
                    onClick={() => onOpen(album.id)}
                  >
                    <Spine album={album} />
                  </button>
                ))}
                {albums.length === 0 && i === 0 && (
                  <button type="button" className="shelf__empty" onClick={onAdd}>
                    <span>La discoteca está vacía.</span>
                    <span>Pegá el link de un álbum de Spotify para guardar el primero.</span>
                  </button>
                )}
              </div>
              <div className="shelf__board" />
            </div>
          ))}
      </div>
      <div className="cabinet__plinth" />
    </div>
  );
}
