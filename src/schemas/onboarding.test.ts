import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { createProfileSchema } from './onboarding';

describe('track-free onboarding schema', () => {
  const schema = createProfileSchema(i18n.t);

  it('requires visa and both region fields', () => {
    expect(schema.safeParse({ visaStatus: '', region: { sido: '', sigungu: '' }, hasChildren: '' }).success).toBe(false);
  });

  it('requires child presence only for the marriage visa', () => {
    expect(schema.safeParse({ visaStatus: 'F-6', region: { sido: '경기도', sigungu: '안산시' }, hasChildren: '' }).success).toBe(false);
    expect(schema.safeParse({ visaStatus: 'F-6', region: { sido: '경기도', sigungu: '안산시' }, hasChildren: 'yes' }).success).toBe(true);
  });

  it('accepts other visas without child information', () => {
    expect(schema.safeParse({ visaStatus: 'E-9', region: { sido: '서울특별시', sigungu: '영등포구' }, hasChildren: '' }).success).toBe(true);
  });
});
