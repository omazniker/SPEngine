import { describe, it, expect } from 'vitest';
import {
  RANK_CATS, STRUKTUR_CATS, KUPON_CATS, SEKTOR_CATS,
  MATURITY_BUCKET_LABELS, getMatBucket,
  defaultRatingLimits, defaultRankLimits,
  RATING_LABELS
} from './categories';
import { RATING_LABELS as RL } from './ratings';

describe('Kategorie-Konstanten', () => {
  it('RANK_CATS enthaelt 6 Subordination-Stufen', () => {
    expect(RANK_CATS).toEqual(['SP', 'SU', 'SNP', 'SEC', 'T2', 'AT1']);
  });

  it('STRUKTUR_CATS enthaelt 3 Bond-Strukturen', () => {
    expect(STRUKTUR_CATS).toEqual(['BULLET', 'CALLABLE', 'PERPETUAL']);
  });

  it('KUPON_CATS enthaelt 3 Kupon-Typen', () => {
    expect(KUPON_CATS).toEqual(['FIXED', 'VARIABLE', 'ZERO COUPON']);
  });

  it('SEKTOR_CATS enthaelt 5 Sektoren', () => {
    expect(SEKTOR_CATS).toHaveLength(5);
  });

  it('MATURITY_BUCKET_LABELS hat 11 Buckets', () => {
    expect(MATURITY_BUCKET_LABELS).toHaveLength(11);
    expect(MATURITY_BUCKET_LABELS[0]).toBe('0-1Y');
    expect(MATURITY_BUCKET_LABELS[10]).toBe('10Y+');
  });
});

describe('getMatBucket — Laufzeit-Zuordnung', () => {
  it('ordnet 0.5 Jahre zu 0-1Y', () => {
    expect(getMatBucket(0.5)).toBe('0-1Y');
  });

  it('ordnet 3.5 Jahre zu 3-4Y', () => {
    expect(getMatBucket(3.5)).toBe('3-4Y');
  });

  it('ordnet 15 Jahre zu 10Y+', () => {
    expect(getMatBucket(15)).toBe('10Y+');
  });

  it('ordnet exakt 1 Jahr zu 1-2Y (nicht 0-1Y)', () => {
    expect(getMatBucket(1.0)).toBe('1-2Y');
  });
});

describe('Default Limits', () => {
  it('defaultRatingLimits hat einen Eintrag pro Rating', () => {
    expect(Object.keys(defaultRatingLimits)).toHaveLength(10);
  });

  it('defaultRankLimits hat SP als enabled', () => {
    expect(defaultRankLimits.SP.enabled).toBe(true);
  });

  it('defaultRankLimits hat AT1 als disabled', () => {
    expect(defaultRankLimits.AT1.enabled).toBe(false);
  });
});
