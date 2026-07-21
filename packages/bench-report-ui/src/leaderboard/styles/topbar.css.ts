import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle('.top', {
  borderBottom: `1px solid ${vars.line}`,
  background: vars.panel,
  position: 'sticky',
  top: 0,
  zIndex: 10,
});

globalStyle('.top .inner', {
  maxWidth: '1440px',
  margin: '0 auto',
  padding: '10px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: '24px',
});

globalStyle('.brand', {
  fontWeight: 700,
  fontSize: '14px',
  letterSpacing: '-.02em',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

globalStyle('.brand::before', {
  content: '""',
  width: '6px',
  height: '6px',
  background: vars.accent,
  borderRadius: '1px',
});

globalStyle('.brand span', {
  color: vars.ink3,
  fontWeight: 400,
});

globalStyle('.nav', {
  display: 'flex',
  gap: '2px',
  marginLeft: '8px',
});

globalStyle('.nav a', {
  padding: '6px 10px',
  fontSize: '12.5px',
  color: vars.ink3,
  textDecoration: 'none',
  borderRadius: '5px',
});

globalStyle('.nav a.on', {
  color: vars.ink,
  background: vars.hover,
  fontWeight: 500,
});

globalStyle('.nav a:hover', {
  color: vars.ink,
});

globalStyle('.top .r', {
  marginLeft: 'auto',
  display: 'flex',
  gap: '14px',
  fontSize: '11.5px',
  color: vars.ink3,
  alignItems: 'center',
});

globalStyle('.top .r kbd', {
  fontFamily: vars.mono,
  fontSize: '10.5px',
  border: `1px solid ${vars.line2}`,
  borderRadius: '3px',
  padding: '1px 5px',
  background: vars.bg,
  color: vars.ink2,
});

globalStyle('.page', {
  maxWidth: '1440px',
  margin: '0 auto',
  padding: '20px 24px 60px',
});

globalStyle('.mstrip', {
  display: 'flex',
  alignItems: 'baseline',
  gap: '18px',
  padding: '6px 0 18px',
  flexWrap: 'wrap',
});

globalStyle('.mstrip h1', {
  fontSize: '20px',
  fontWeight: 600,
  letterSpacing: '-.02em',
});

globalStyle('.mstrip .sub', {
  color: vars.ink3,
  fontSize: '13px',
});

globalStyle('.mstrip .kvs', {
  marginLeft: 'auto',
  display: 'flex',
  gap: 0,
  fontSize: '11.5px',
  color: vars.ink3,
  border: `1px solid ${vars.line}`,
  background: vars.panel,
  overflow: 'hidden',
});

globalStyle('.mstrip .kvs span', {
  padding: '6px 12px',
  borderRight: `1px solid ${vars.line}`,
  whiteSpace: 'nowrap',
});

globalStyle('.mstrip .kvs span:last-child', {
  borderRight: 0,
});

globalStyle('.mstrip .kvs b', {
  color: vars.ink,
  fontWeight: 500,
  marginLeft: '6px',
  fontFamily: vars.mono,
  fontVariantNumeric: 'tabular-nums',
});

globalStyle('.foot', {
  marginTop: '20px',
  padding: '14px 0',
  fontSize: '11.5px',
  color: vars.ink3,
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: '12px',
});

globalStyle('.foot a', {
  color: vars.accent,
  textDecoration: 'none',
});

globalStyle('.foot a:hover', {
  textDecoration: 'underline',
});
