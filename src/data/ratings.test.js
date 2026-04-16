import { describe, it, expect } from 'vitest';
import { RM, RS, LBL, RATING_LABELS, MOODYS_MAP, normMo, normSp } from './ratings';

describe('Rating Maps', () => {
  it('RM hat 10 Moody\'s Stufen (Aaa bis Baa3)', () => {
    expect(Object.keys(RM)).toHaveLength(10);
    expect(RM.Aaa).toBe(1);
    expect(RM.Baa3).toBe(10);
  });

  it('RS hat 10 S&P Stufen (AAA bis BBB-)', () => {
    expect(Object.keys(RS)).toHaveLength(10);
    expect(RS.AAA).toBe(1);
    expect(RS['BBB-']).toBe(10);
  });

  it('LBL ist invers zu RS', () => {
    Object.entries(RS).forEach(([label, num]) => {
      expect(LBL[num]).toBe(label);
    });
  });

  it('RATING_LABELS hat 10 Labels in korrekter Reihenfolge', () => {
    expect(RATING_LABELS).toHaveLength(10);
    expect(RATING_LABELS[0]).toBe('AAA');
    expect(RATING_LABELS[9]).toBe('BBB-');
  });

  it('MOODYS_MAP konvertiert S&P zu Moody\'s', () => {
    expect(MOODYS_MAP['AAA']).toBe('Aaa');
    expect(MOODYS_MAP['A']).toBe('A2');
    expect(MOODYS_MAP['BBB-']).toBe('Baa3');
  });
});

describe('normMo — Moody\'s Normalisierung', () => {
  it('laesst gueltige Moody\'s Ratings unveraendert', () => {
    expect(normMo('Aaa')).toBe('Aaa');
    expect(normMo('A1')).toBe('A1');
    expect(normMo('Baa3')).toBe('Baa3');
  });

  it('gibt null/undefined unveraendert zurueck', () => {
    expect(normMo(null)).toBeNull();
    expect(normMo(undefined)).toBeUndefined();
  });
});

describe('normSp — S&P Normalisierung', () => {
  it('laesst gueltige S&P Ratings unveraendert', () => {
    expect(normSp('AAA')).toBe('AAA');
    expect(normSp('A+')).toBe('A+');
    expect(normSp('BBB-')).toBe('BBB-');
  });

  it('gibt null/undefined unveraendert zurueck', () => {
    expect(normSp(null)).toBeNull();
    expect(normSp(undefined)).toBeUndefined();
  });
});
