import { FONT } from '../../ui/primitives';

export const TBL = {
  wrap:   { background:'#fff', border:'1px solid #EBEBEB', borderRadius:10, overflow:'hidden' as const },
  table:  { width:'100%', borderCollapse:'collapse' as const, fontSize:11, fontFamily: FONT },
  thead:  { position:'sticky' as const, top:0, zIndex:2 },
  theadTr:{ background:'#fff', borderBottom:'1px solid #E8E8E8' },
  th:     { padding:'7px 12px', textAlign:'left' as const, fontSize:10, fontWeight:500, color:'#888', fontFamily: FONT, whiteSpace:'nowrap' as const },
  trGroup:{ background:'#F7F7F7', borderBottom:'1px solid #EBEBEB' },
  trRow:  { borderBottom:'1px solid #F0F0F0', background:'#fff' },
  tdCode: { padding:'9px 12px', fontSize:11, fontWeight:600, color:'#1A1A1A', fontFamily: FONT },
  tdMain: { padding:'9px 12px', fontSize:11, color:'#0F0F0F', fontFamily: FONT },
  tdSub:  { padding:'9px 12px', fontSize:11, color:'#666', fontFamily: FONT },
  tdAlt:  { padding:'9px 12px', fontSize:11, color:'#999', fontFamily: FONT },
  empty:  { padding:'28px', textAlign:'center' as const, color:'#BCBCBC', fontSize:11, fontFamily: FONT },
};
