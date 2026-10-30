import { useEffect } from 'react';

/** Los colores de la discoteca: el mueble y la pared de atrás. Ver `:root[data-tema]` en styles.css. */
export const TEMAS = [
  { id: 'clasica', label: 'Clásica', wall: '#1c120c', wood: '#7b4a28', woodHi: '#b27747' },
  { id: 'rosa', label: 'Rosa', wall: '#351322', wood: '#c85d8d', woodHi: '#f5a9c8' },
  { id: 'azul', label: 'Azul', wall: '#0a1330', wood: '#29457f', woodHi: '#4d72bd' },
  { id: 'verde', label: 'Verde', wall: '#0e1f16', wood: '#41724f', woodHi: '#6fab7f' },
  { id: 'amarillo', label: 'Amarillo', wall: '#2a2006', wood: '#c19626', woodHi: '#f4d260' },
] as const;

export type Tema = (typeof TEMAS)[number]['id'];

export const DEFAULT_TEMA: Tema = 'clasica';

export const isTema = (value: unknown): value is Tema => TEMAS.some((t) => t.id === value);

/** Pinta toda la página (también el fondo del body) con el tema. */
export function useTema(tema: Tema | null | undefined) {
  useEffect(() => {
    const root = document.documentElement;
    if (tema && tema !== DEFAULT_TEMA) root.dataset.tema = tema;
    else delete root.dataset.tema;
    return () => {
      delete root.dataset.tema;
    };
  }, [tema]);
}
