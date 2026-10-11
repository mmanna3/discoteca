import type { CSSProperties } from 'react';
import { EDGE_FRACTION } from '../lib/colors';
import type { Album } from '../lib/types';

interface Props {
  album: Pick<Album, 'artist' | 'title' | 'coverUrl' | 'palette' | 'spine'>;
  className?: string;
}

/**
 * Lomo de caja de CD. Solo usa datos reales del disco:
 * - "arte": estira la franja izquierda de la tapa, como si el arte doblara hacia el lomo.
 * - "color": el color de fondo que Spotify calcula para ese disco.
 */
export function Spine({ album, className = '' }: Props) {
  const arte = album.spine === 'arte';
  const style = {
    '--spine-bg': arte ? album.palette.edge : album.palette.base,
    '--spine-fg': arte ? album.palette.edgeText : album.palette.text,
    '--spine-art': arte ? `url("${album.coverUrl}")` : 'none',
    '--spine-art-size': `${100 / EDGE_FRACTION}% 100%`,
  } as CSSProperties;

  return (
    <div className={`spine spine--${album.spine} ${className}`} style={style} aria-hidden="true">
      <span className="spine__cap spine__cap--top" />
      <span className="spine__label">
        {album.artist && <span className="spine__artist">{album.artist}</span>}
        <span className="spine__title">{album.title}</span>
      </span>
      <span className="spine__cap spine__cap--bottom" />
    </div>
  );
}
