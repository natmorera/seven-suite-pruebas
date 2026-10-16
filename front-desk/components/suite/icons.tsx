import type { CSSProperties } from 'react';

// Íconos del sistema de Accounting: 14×14, stroke="currentColor"
// (el color lo pone el contenedor). Tamaño con width/height o con style.
type P = { size?: number; style?: CSSProperties };

const svg = (size: number, style?: CSSProperties) => ({
  width: size, height: size, fill: 'none', stroke: 'currentColor',
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  'aria-hidden': true, style: { flexShrink: 0, ...style },
});

/** Logo de Seven (blanco) para el badge del menú */
export const Logo = () => (
  <svg width="20" height="18" viewBox="0 0 20 18" fill="none" aria-hidden>
    <path d="M0.5 0H13.77C14.16 0 14.4 0.43 14.21 0.78C10.58 7.37 8.37 14.42 7.61 17.58C7.55 17.81 7.35 17.97 7.12 17.97H0.5C0.22 17.97 0 17.74 0 17.46V0.52C0 0.23 0.22 0 0.5 0Z" fill="white"/>
    <path d="M20 17.49V2.65C20 2.13 19.35 1.95 19.11 2.42C16.51 7.55 14.47 14.02 13.58 17.36C13.49 17.68 13.73 18 14.06 18H19.5C19.78 18 20 17.77 20 17.49Z" fill="white"/>
  </svg>
);

export const IcChevronDown = ({ size = 12, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14"><path d="M11.62 5.22L7.82 9.02C7.37 9.47 6.63 9.47 6.18 9.02L2.38 5.22"/></svg>
);
export const IcChevronRight = ({ size = 12, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14"><path d="M5.22 11.62L9.02 7.82C9.47 7.37 9.47 6.63 9.02 6.18L5.22 2.38"/></svg>
);
export const IcCollapse = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14"><path d="M8.75 2.33L4.08 7L8.75 11.67"/></svg>
);
export const IcGlobe = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14"><circle cx="7" cy="7" r="5.83"/><path d="M1.17 7h11.66M7 1.17C5.54 3.09 4.67 5 4.67 7s.87 3.91 2.33 5.83M7 1.17C8.46 3.09 9.33 5 9.33 7s-.87 3.91-2.33 5.83"/></svg>
);
export const IcBell = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 16 16"><path d="M8.01 1.94C5.81 1.94 4.01 3.73 4.01 5.94V7.87C4.01 8.27 3.84 8.89 3.63 9.24L2.87 10.51C2.39 11.3 2.72 12.17 3.59 12.47C6.46 13.43 9.56 13.43 12.43 12.47C13.24 12.2 13.59 11.25 13.15 10.51L12.39 9.24C12.19 8.89 12.01 8.27 12.01 7.87V5.94C12.01 3.74 10.21 1.94 8.01 1.94Z"/><path d="M10.01 12.75C10.01 13.85 9.11 14.75 8.01 14.75C7.46 14.75 6.95 14.52 6.59 14.16C6.23 13.8 6.01 13.29 6.01 12.75"/></svg>
);
export const IcLogout = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 16 16"><path d="M5.93 5.04C6.14 2.64 7.37 1.66 10.07 1.66H10.16C13.14 1.66 14.33 2.85 14.33 5.83V10.18C14.33 13.16 13.14 14.35 10.16 14.35H10.07C7.39 14.35 6.16 13.39 5.94 11.03"/><path d="M10 8H2.41"/><path d="M3.9 5.77L1.67 8L3.9 10.23"/></svg>
);
export const IcModulos = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14" strokeWidth={1.3}><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><rect x="8" y="8" width="4.5" height="4.5" rx="1"/></svg>
);
export const IcConfig = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 16 16"><circle cx="8" cy="8" r="2"/><path d="M1.33 8.59V7.41C1.33 6.72 1.9 6.15 2.6 6.15C3.81 6.15 4.3 5.29 3.69 4.25C3.35 3.65 3.55 2.87 4.16 2.52L5.31 1.86C5.84 1.55 6.52 1.73 6.83 2.26L6.91 2.39C7.51 3.43 8.49 3.43 9.1 2.39L9.17 2.26C9.49 1.73 10.17 1.55 10.69 1.86L11.85 2.52C12.45 2.87 12.66 3.65 12.31 4.25C11.71 5.29 12.2 6.15 13.41 6.15C14.1 6.15 14.67 6.71 14.67 7.41V8.59C14.67 9.28 14.11 9.85 13.41 9.85C12.2 9.85 11.71 10.71 12.31 11.75C12.66 12.36 12.45 13.13 11.85 13.48L10.69 14.14C10.17 14.45 9.49 14.27 9.17 13.74L9.1 13.61C8.5 12.57 7.51 12.57 6.91 13.61L6.83 13.74C6.52 14.27 5.84 14.45 5.31 14.14L4.16 13.48C3.55 13.13 3.35 12.35 3.69 11.75C4.3 10.71 3.81 9.85 2.6 9.85C1.9 9.85 1.33 9.28 1.33 8.59Z"/></svg>
);
export const IcSearch = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14"><circle cx="6.42" cy="6.42" r="4.67"/><path d="M12.83 12.83L9.97 9.97"/></svg>
);
export const IcWarning = ({ size = 12, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14"><path d="M6.13 2.18L1.38 10.21C1.01 10.85 1.46 11.67 2.25 11.67H11.75C12.54 11.67 12.99 10.85 12.62 10.21L7.87 2.18C7.49 1.54 6.51 1.54 6.13 2.18Z"/><path d="M7 5.83V7.58M7 9.33H7.01"/></svg>
);
export const IcClose = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14"><path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"/></svg>
);
export const IcCheck = ({ size = 10, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14" strokeWidth={2.5}><path d="M2.33 7L5.25 9.92L11.67 4.08"/></svg>
);
export const IcPlus = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14" strokeWidth={1.5}><path d="M7 2.5v9M2.5 7h9"/></svg>
);
export const IcDownload = ({ size = 14, style }: P) => (
  <svg {...svg(size, style)} viewBox="0 0 14 14" strokeWidth={1.5}><path d="M7 1v8M4 6l3 3 3-3M2 10v1.5A1.5 1.5 0 003.5 13h7A1.5 1.5 0 0012 11.5V10"/></svg>
);
