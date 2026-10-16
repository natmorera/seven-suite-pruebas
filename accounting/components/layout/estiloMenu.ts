// Estilo de una fila del menú lateral (abierto o colapsado, activa o no)
import { type CSSProperties } from 'react';
import { C, FONT } from '../ui/tokens';

export const filaMenu = (isActive: boolean, isCollapsed: boolean): CSSProperties => ({
  display:'flex', alignItems:'center', gap: isCollapsed ? 0 : 10,
  height:32, paddingRight: isCollapsed ? 0 : 16,
  justifyContent: isCollapsed ? 'center' : 'flex-start',
  color: isActive ? C.brand : '#ECECEC',
  background: 'transparent',
  textDecoration:'none', border:'none', cursor:'pointer',
  borderRadius:4,
  borderLeft: isActive && !isCollapsed ? `3px solid ${C.brand}` : '3px solid transparent',
  paddingLeft: isActive && !isCollapsed ? 13 : isCollapsed ? 0 : 16,
  margin: isCollapsed ? '1px auto' : '1px 4px',
  width: isCollapsed ? 32 : 'calc(100% - 8px)',
  fontSize:12, fontWeight: isActive ? 600 : 400, fontFamily:FONT,
  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
  flexShrink:0,
});
