import { globalStyle } from '@vanilla-extract/css';
import { vars } from './theme.css';

globalStyle('.plotwrap', {
  position: 'sticky',
  top: '66px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
});

globalStyle('.plotpanel', {
  background: vars.panel,
  border: `1px solid ${vars.line}`,
  padding: '14px',
});

globalStyle('.plotpanel .head', {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '10px',
});

globalStyle('.plotpanel .head h3', {
  fontSize: '12.5px',
  fontWeight: 600,
});

globalStyle('.plotpanel .head .note', {
  fontSize: '11px',
  color: vars.ink3,
});

globalStyle('.plotpanel svg', {
  width: '100%',
  height: 'auto',
  display: 'block',
});

globalStyle('.axlab', {
  fontFamily: vars.mono,
  fontSize: '9.5px',
  fill: vars.ink3,
  letterSpacing: '.04em',
});

globalStyle('.axtitle', {
  fontFamily: vars.mono,
  fontSize: '10px',
  fill: vars.ink2,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
});

globalStyle('.gridln', {
  stroke: vars.line,
  strokeWidth: 1,
});

globalStyle('.gridln.dash', {
  strokeDasharray: '2 3',
  stroke: vars.line2,
});

globalStyle('.baseln', {
  stroke: vars.neg,
  strokeWidth: 1.2,
  strokeDasharray: '4 3',
});

globalStyle('.baslab', {
  fontFamily: vars.mono,
  fontSize: '9.5px',
  fill: vars.neg,
  letterSpacing: '.04em',
});

globalStyle('.dot', {
  fill: vars.accent,
  stroke: '#fff',
  strokeWidth: 1.5,
  cursor: 'pointer',
  transition: 'r .12s',
});

globalStyle('.dot.sel', {
  fill: vars.ink,
});

globalStyle('.dot.lead', {
  fill: vars.accent,
});

globalStyle('.dot.below', {
  fill: vars.ink4,
  opacity: 0.6,
});

globalStyle('.dotlab', {
  fontFamily: 'system-ui,sans-serif',
  fontSize: '10px',
  fill: vars.ink2,
  fontWeight: 500,
  pointerEvents: 'none',
});

globalStyle('.dotlab.sel', {
  fill: vars.ink,
  fontWeight: 700,
});

globalStyle('.dotlab.dim', {
  fill: vars.ink4,
});

globalStyle('.plotlegend', {
  marginTop: '10px',
  paddingTop: '10px',
  borderTop: `1px solid ${vars.line}`,
  display: 'flex',
  gap: '14px',
  fontSize: '11px',
  color: vars.ink3,
  flexWrap: 'wrap',
});

globalStyle('.plotlegend span', {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
});

globalStyle('.plotlegend .sw', {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: vars.accent,
});

globalStyle('.plotlegend .sw.below', {
  background: vars.ink4,
  opacity: 0.6,
});
