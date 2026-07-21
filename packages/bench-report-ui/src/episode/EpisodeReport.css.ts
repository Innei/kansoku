import { style } from '@vanilla-extract/css';

export const root = style({
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: '#1a1a1a',
  background: '#ffffff',
  padding: '24px',
});

export const header = style({
  fontSize: '20px',
  fontWeight: 600,
  marginBottom: '12px',
});
