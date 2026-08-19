import { describe, it, expect } from 'vitest';
import i18n from '../i18n';
import { createProfileSchema } from './onboarding';

describe('onboarding schema — single profile form, track derived from which signal section is filled', () => {
  it('rejects a submission missing the base required fields', () => {
    const schema = createProfileSchema(i18n.t);
    const result = schema.safeParse({
      visaStatus: '',
      region: { sido: '', sigungu: '' },
      childBirthDate: '2026-06-01',
      childNationality: 'KR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a submission where neither track-signal section (child birth date / injury date) is filled', () => {
    const schema = createProfileSchema(i18n.t);
    const result = schema.safeParse({
      visaStatus: 'F-6',
      region: { sido: '경기도', sigungu: '안산시' },
    });
    expect(result.success).toBe(false);
  });

  it('accepts a birth-care submission: childBirthDate filled requires childNationality too', () => {
    const schema = createProfileSchema(i18n.t);
    const missingNationality = schema.safeParse({
      visaStatus: 'F-6',
      region: { sido: '경기도', sigungu: '안산시' },
      childBirthDate: '2026-06-01',
    });
    expect(missingNationality.success).toBe(false);

    const complete = schema.safeParse({
      visaStatus: 'F-6',
      region: { sido: '경기도', sigungu: '안산시' },
      childBirthDate: '2026-06-01',
      childNationality: 'KR',
      householdSize: '',
      incomeBand: '',
    });
    expect(complete.success).toBe(true);
  });

  it('accepts a labor-injury submission: injuryDate filled requires employmentStatus too', () => {
    const schema = createProfileSchema(i18n.t);
    const missingEmployment = schema.safeParse({
      visaStatus: 'E-9',
      region: { sido: '서울특별시', sigungu: '영등포구' },
      injuryDate: '2026-05-01',
    });
    expect(missingEmployment.success).toBe(false);

    const complete = schema.safeParse({
      visaStatus: 'E-9',
      region: { sido: '서울특별시', sigungu: '영등포구' },
      injuryDate: '2026-05-01',
      employmentStatus: 'EMPLOYED',
    });
    expect(complete.success).toBe(true);
  });
});
