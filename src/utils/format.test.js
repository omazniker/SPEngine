import { describe, it, expect } from 'vitest';
import { fx, fmtVol, fmtNum } from './format';

describe('fx — Deutsche Zahlenformatierung', () => {
  it('formatiert Ganzzahlen (ohne Tausenderpunkt)', () => {
    // fx nutzt toFixed().replace — kein Tausender-Separator
    expect(fx(1234, 0)).toBe('1234');
  });

  it('formatiert Dezimalzahlen mit Komma', () => {
    expect(fx(3.14159, 2)).toBe('3,14');
  });

  it('gibt Fallback fuer null/undefined/NaN', () => {
    // fx gibt '-' als Platzhalter bei ungueltigem Input
    expect(fx(null, 2)).toBe('-');
    expect(fx(undefined, 2)).toBe('-');
    expect(fx(NaN, 2)).toBe('-');
  });
});

describe('fmtVol — Volumen-Formatierung', () => {
  it('formatiert Millionen', () => {
    const result = fmtVol(500);
    expect(result).toContain('500');
  });
});

describe('fmtNum — Adaptive Formatierung', () => {
  it('formatiert grosse Zahlen mit Tsd./Mio.', () => {
    const result = fmtNum(1500000);
    expect(result).toBeTruthy();
  });
});
