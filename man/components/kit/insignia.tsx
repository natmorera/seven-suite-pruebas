'use client';
// Insignia de estado: misma paleta que StatusBadge de la suite, con el texto a 11 px para que se lea en tablas y tarjetas.
import { C, FONT, radius } from '@/components/suite/tokens';
import { type BadgeColor } from '@/components/suite/ui';

const COLORES: Record<BadgeColor, { bg: string; color: string; border: string }> = {
  green: { bg: 'rgba(76,175,80,.08)', color: '#2E7D32', border: 'rgba(76,175,80,.25)' },
  yellow: { bg: 'rgba(238,179,0,.08)', color: '#7A5C00', border: 'rgba(238,179,0,.25)' },
  red: { bg: 'rgba(244,67,54,.08)', color: '#C62828', border: 'rgba(244,67,54,.25)' },
  blue: { bg: 'rgba(33,150,243,.08)', color: '#1565C0', border: 'rgba(33,150,243,.25)' },
  orange: { bg: 'rgba(255,112,67,.10)', color: '#BF360C', border: 'rgba(255,112,67,.35)' },
  gray: { bg: C.n200, color: C.n700, border: C.n500 },
  brand: { bg: C.brandBg, color: C.brand, border: C.brandBd },
};

export function Insignia({ label, color, title }: { label: string; color: BadgeColor; title?: string }) {
  const s = COLORES[color];
  return (
    <span title={title} style={{ display: 'inline-block', background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 8px',
      borderRadius: radius.pill, fontSize: 11, fontWeight: 500, fontFamily: FONT, whiteSpace: 'nowrap', lineHeight: 1.45 }}>{label}</span>
  );
}
