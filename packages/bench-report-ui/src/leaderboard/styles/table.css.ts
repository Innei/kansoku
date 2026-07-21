import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle('.shell', {
  border: `1px solid ${vars.line}`,
});

globalStyle('.shell > * + *', {
  marginTop: '10px',
});

globalStyle('.shell > :first-child', {
  borderTop: 0,
});

globalStyle('.fbar, .panel, .plotpanel, .detailcard', {
  borderLeft: 0,
  borderRight: 0,
});

globalStyle('.fbar', {
  display: 'flex',
  gap: '6px',
  padding: '10px',
  border: `1px solid ${vars.line}`,
  background: vars.panel,
  alignItems: 'center',
  flexWrap: 'wrap',
});

globalStyle('.fg', {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '11.5px',
  color: vars.ink3,
  paddingRight: '10px',
  borderRight: `1px solid ${vars.line}`,
});

globalStyle('.fg:last-of-type', {
  borderRight: 0,
});

globalStyle('.pill', {
  fontSize: '11.5px',
  padding: '4px 9px',
  borderRadius: '5px',
  border: `1px solid ${vars.line2}`,
  background: vars.panel,
  color: vars.ink2,
  cursor: 'pointer',
  userSelect: 'none',
  fontFamily: 'inherit',
});

globalStyle('.pill.on', {
  background: vars.ink,
  color: '#fff',
  borderColor: vars.ink,
});

globalStyle('.pill:hover:not(.on)', {
  background: vars.hover,
});

globalStyle('.fbar .r', {
  marginLeft: 'auto',
  display: 'flex',
  gap: '6px',
});

globalStyle('.search', {
  border: `1px solid ${vars.line2}`,
  borderRadius: '5px',
  padding: '4px 9px',
  fontSize: '11.5px',
  background: vars.bg,
  color: vars.ink,
  fontFamily: 'inherit',
  width: '200px',
});

globalStyle('.grid', {
  display: 'grid',
  gridTemplateColumns: '1fr 440px',
  gap: '10px',
  alignItems: 'start',
});

globalStyle('.grid', {
  '@media': {
    '(max-width:1180px)': { gridTemplateColumns: '1fr' },
  },
});

globalStyle('.plotwrap', {
  '@media': {
    '(max-width:1180px)': { position: 'static' },
  },
});

globalStyle('.panel', {
  background: vars.panel,
  border: `1px solid ${vars.line}`,
  overflow: 'hidden',
});

globalStyle('.panelhead', {
  padding: '11px 14px',
  borderBottom: `1px solid ${vars.line}`,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
});

globalStyle('.panelhead h3', {
  fontSize: '12.5px',
  fontWeight: 600,
  letterSpacing: '-.005em',
});

globalStyle('.panelhead .desc', {
  fontSize: '11.5px',
  color: vars.ink3,
});

globalStyle('.panelhead .r', {
  marginLeft: 'auto',
  fontSize: '11px',
  color: vars.ink3,
  fontFamily: vars.mono,
});

globalStyle('.tblwrap', {
  overflowX: 'auto',
});

globalStyle('.tbl', {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
});

globalStyle('.tbl thead th', {
  position: 'sticky',
  top: '53px',
  background: vars.panel,
  zIndex: 5,
  fontWeight: 500,
  fontSize: '10.5px',
  letterSpacing: '.06em',
  textTransform: 'uppercase',
  color: vars.ink3,
  textAlign: 'right',
  padding: '9px 12px',
  borderBottom: `1px solid ${vars.line2}`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
});

globalStyle('.tbl thead th:first-child', {
  width: '42px',
  textAlign: 'center',
});

globalStyle('.tbl thead th:nth-child(2)', {
  textAlign: 'left',
});

globalStyle('.tbl thead th.sorted', {
  color: vars.ink,
});

globalStyle('.tbl thead th.sorted::after', {
  content: '" ↓"',
  color: vars.accent,
});

globalStyle('.tbl tbody td', {
  padding: '0 12px',
  borderBottom: `1px solid ${vars.line}`,
  height: '44px',
  textAlign: 'right',
  verticalAlign: 'middle',
});

globalStyle('.tbl tbody td:first-child', {
  textAlign: 'center',
  color: vars.ink4,
  fontFamily: vars.mono,
  fontSize: '12px',
  fontWeight: 500,
});

globalStyle('.tbl tbody td:nth-child(2)', {
  textAlign: 'left',
});

globalStyle('.tbl tbody tr', {
  cursor: 'pointer',
});

globalStyle('.tbl tbody tr:hover', {
  background: vars.hover,
});

globalStyle('.tbl tbody tr.sel', {
  background: vars.sel,
});

globalStyle('.tbl tbody tr.sel td:first-child', {
  color: vars.accent,
  fontWeight: 700,
});

globalStyle('.mname', {
  fontWeight: 600,
  fontSize: '13.5px',
  letterSpacing: '-.01em',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
});

globalStyle('.mvend', {
  display: 'inline-block',
  fontSize: '10.5px',
  color: vars.ink3,
  fontFamily: vars.mono,
  background: vars.bg,
  padding: '1px 6px',
  borderRadius: '3px',
  border: `1px solid ${vars.line}`,
  fontWeight: 400,
});

globalStyle('.total', {
  fontFamily: vars.mono,
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 600,
  fontSize: '13.5px',
  color: vars.ink,
});

globalStyle('.delta', {
  display: 'inline-block',
  fontFamily: vars.mono,
  fontSize: '10.5px',
  padding: '1px 5px',
  borderRadius: '3px',
  marginLeft: '6px',
});

globalStyle('.delta.pos', {
  color: vars.pos,
  background: '#f0fdfa',
});

globalStyle('.delta.neg', {
  color: vars.neg,
  background: '#fef2f2',
});

globalStyle('.bar', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  minWidth: '120px',
  justifyContent: 'flex-end',
});

globalStyle('.bartrack', {
  width: '60px',
  height: '4px',
  background: vars.line,
  borderRadius: '2px',
  overflow: 'hidden',
  position: 'relative',
});

globalStyle('.bartrack i', {
  display: 'block',
  height: '100%',
  background: vars.accent,
});

globalStyle('.bartrack.e i', {
  background: vars.ink2,
});

globalStyle('.bartrack.muted i', {
  background: vars.ink4,
});

globalStyle('.btag', {
  fontFamily: vars.mono,
  fontSize: '9.5px',
  color: vars.ink3,
  border: `1px solid ${vars.line2}`,
  borderRadius: '3px',
  padding: '1px 5px',
  background: vars.bg,
});

globalStyle('tr.base', {
  background: '#fafafa',
});

globalStyle('tr.base .mname', {
  fontWeight: 500,
  color: vars.ink2,
  fontSize: '12.5px',
});

globalStyle('tr.base td:first-child', {
  color: vars.ink4,
});

globalStyle('tr.base .total', {
  color: vars.ink3,
});

globalStyle('tr.passline td', {
  height: 0,
  padding: 0,
  borderTop: `1px dashed ${vars.neg}`,
  borderBottom: 0,
  position: 'relative',
});

globalStyle('tr.passline td::after', {
  content: 'attr(data-label)',
  position: 'absolute',
  right: '12px',
  top: '-9px',
  background: vars.panel,
  padding: '0 8px',
  fontFamily: vars.mono,
  fontSize: '9.5px',
  letterSpacing: '.08em',
  color: vars.neg,
});
