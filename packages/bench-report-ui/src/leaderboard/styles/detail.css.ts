import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle('.detailcard', {
  background: vars.panel,
  border: `1px solid ${vars.line}`,
  padding: '14px 16px',
});

globalStyle('.detail h4', {
  fontSize: '12.5px',
  fontWeight: 600,
  letterSpacing: '-.01em',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '2px',
});

globalStyle('.detail .did', {
  fontFamily: vars.mono,
  fontSize: '11px',
  color: vars.ink3,
  marginBottom: '12px',
});

globalStyle('.detailgrid', {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6px 20px',
});

globalStyle('.drow', {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '12px',
  padding: '5px 0',
  borderBottom: '1px dotted #e5e5e5',
});

globalStyle('.drow .k', {
  color: vars.ink3,
});

globalStyle('.drow .v', {
  fontFamily: vars.mono,
  fontVariantNumeric: 'tabular-nums',
  color: vars.ink,
  fontWeight: 500,
});

globalStyle('.drow .v.positive', {
  color: vars.pos,
});

globalStyle('.drow .v.negative', {
  color: vars.neg,
});

globalStyle('.dsec', {
  gridColumn: 'span 2',
  fontFamily: vars.mono,
  fontSize: '10px',
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: vars.accent,
  paddingTop: '10px',
  marginTop: '6px',
  borderTop: `1px solid ${vars.line}`,
});

globalStyle('.dsec:first-of-type', {
  paddingTop: 0,
  marginTop: 0,
  borderTop: 0,
});
