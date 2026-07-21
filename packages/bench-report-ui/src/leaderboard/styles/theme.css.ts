import { createGlobalTheme, globalStyle } from '@vanilla-extract/css';

export const vars = createGlobalTheme(':root', {
  bg: '#fafafa',
  panel: '#fff',
  ink: '#0a0a0a',
  ink2: '#404040',
  ink3: '#737373',
  ink4: '#a3a3a3',
  line: '#e5e5e5',
  line2: '#d4d4d4',
  hover: '#f5f5f5',
  sel: '#eff6ff',
  accent: '#2563eb',
  pos: '#0f766e',
  neg: '#dc2626',
  mono: 'ui-monospace,"SF Mono","Menlo","JetBrains Mono",Consolas,monospace',
});

globalStyle('*', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
});

globalStyle('html', {
  WebkitFontSmoothing: 'antialiased',
  textRendering: 'optimizeLegibility',
});

globalStyle('body', {
  background: vars.bg,
  color: vars.ink,
  fontFamily:
    'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB",sans-serif',
  fontSize: '13px',
  lineHeight: 1.45,
  letterSpacing: '-.005em',
});

globalStyle('.mono, .num', {
  fontFamily: vars.mono,
  fontVariantNumeric: 'tabular-nums lining-nums',
  letterSpacing: 0,
});

globalStyle('.muted', {
  color: vars.ink4,
});
