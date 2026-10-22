'use client';
import { useState } from 'react';
import { C, radius } from '@/components/ui/primitives';
import { IcInfo } from '@/components/ui/icons';

export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.n700, display: 'flex', padding: 2 }}
        aria-label="Más información"
      >
        <IcInfo className="w-[14px] h-[14px]" />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 280, zIndex: 40,
          background: C.n900, color: '#fff', fontSize: 11.5, lineHeight: 1.5, padding: '10px 12px',
          borderRadius: radius.md, boxShadow: '0 8px 24px rgba(0,0,0,.2)',
        }}>
          {text}
        </div>
      )}
    </span>
  );
}
