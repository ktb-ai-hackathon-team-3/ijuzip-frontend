import { describe, expect, it } from 'vitest';
import {
  applicationFromBackend, buildCreateSessionResponse, programDetailFromBackend,
  snapshotFromBackend, toBackendSessionRequest,
} from './backendAdapters';

describe('backend v0.6 adapters', () => {
  it('converts onboarding values to the Spring profile contract', () => {
    const request = toBackendSessionRequest({
      language: 'vi', track: 'BIRTH_CARE',
      profile: {
        visaStatus: 'F-6', region: { sido: '경기도', sigungu: '안산시' }, gender: null,
        birthYear: null, childBirthDate: new Date().toISOString().slice(0, 10), childNationality: 'KR',
        householdSize: 3, incomeBand: 'M_200_300', employmentStatus: null, injuryDate: null,
      },
    });
    expect(request.track).toBe('birth_care');
    expect(request.profile.lang).toBe('vi');
    expect(request.profile.incomeBand).toBe('m_200_300');
    expect(request.profile.children[0]).toMatchObject({ ageMonths: 0, nationality: 'KR' });
  });

  /**
   * `children[].ageMonths` is derived from the birth date and cannot be
   * inverted, and `injuryDate` was not sent at all — so both form fields came
   * back empty after a refresh and the user had to retype them.
   */
  it('round-trips the dates the user actually typed', () => {
    const request = toBackendSessionRequest({
      language: 'vi', track: 'BIRTH_CARE',
      profile: {
        visaStatus: 'F-6', region: { sido: '경기도', sigungu: '안산시' }, gender: null,
        birthYear: null, childBirthDate: '2026-07-01', childNationality: 'KR',
        householdSize: 3, incomeBand: 'M_200_300', employmentStatus: null, injuryDate: null,
      },
    });
    expect(request.profile.childBirthDate).toBe('2026-07-01');

    const snapshot = snapshotFromBackend({
      track: 'birth_care',
      profile: {
        lang: 'vi', region: { sido: '경기도', sigungu: '안산시' }, visaStatus: 'F-6',
        children: [{ ageMonths: 1, nationality: 'KR' }], childBirthDate: '2026-07-01',
      },
      assessment: { status: 'done', results: [] },
    });
    expect(snapshot.profile.childBirthDate).toBe('2026-07-01');
  });

  it('sends the injury date on the labor-injury track', () => {
    const request = toBackendSessionRequest({
      language: 'vi', track: 'LABOR_INJURY',
      profile: {
        visaStatus: 'E-9', region: { sido: '경기도', sigungu: '안산시' }, gender: null,
        birthYear: null, childBirthDate: null, childNationality: null,
        householdSize: 2, incomeBand: null, employmentStatus: 'EMPLOYED', injuryDate: '2026-06-15',
      },
    });
    expect(request.profile.injuryDate).toBe('2026-06-15');
    expect(request.profile.childBirthDate).toBeNull();

    const snapshot = snapshotFromBackend({
      track: 'labor_injury',
      profile: {
        lang: 'vi', region: { sido: '경기도', sigungu: '안산시' }, visaStatus: 'E-9',
        children: [], injuryDate: '2026-06-15', employment: { employed: true },
      },
      assessment: { status: 'done', results: [] },
    });
    expect(snapshot.profile.injuryDate).toBe('2026-06-15');
  });

  it('combines session, skeleton and assessment events', () => {
    const response = buildCreateSessionResponse(
      { sessionId: 's_1', token: 'token', expiresIn: 86400 },
      { candidates: [{ recordId: 'first-meet-voucher', status: 'pending' }], funnel: { total: 8, afterTrack: 5, afterFilter: 4 } as any },
      [{ recordId: 'first-meet-voucher', status: 'need_check', checks: [{ field: 'registered', fieldLabelKo: '등록', result: 'unknown' }] }],
      'vi', 'BIRTH_CARE',
    );
    expect(response.funnel.returned).toBe(1);
    expect(response.candidates[0]).toMatchObject({ programId: 'first-meet-voucher', conditionStatus: 'NEED_INFO' });
    expect(response.candidates[0].missingSlots).toEqual(['registered']);
    expect(response.greeting.user).toContain('Dựa trên');
  });

  it('converts Redis session snapshots and messages', () => {
    const snapshot = snapshotFromBackend({
      track: 'birth_care',
      profile: { lang: 'vi', region: { sido: '경기도', sigungu: '안산시' }, visaStatus: 'F-6', children: [{ ageMonths: 1, nationality: 'KR' }] },
      assessment: { status: 'pending', results: [{ recordId: 'child-allowance', status: 'eligible' }] },
      view: { ranking: [{ recordId: 'child-allowance', score: 0.9 }], viewFilter: {}, visibleCount: 1 },
      messages: [{ seq: 2, role: 'assistant', textKo: '답변', textLocal: 'Trả lời', createdAt: '2026-08-19T00:00:00Z', intent: 'question', citedRecords: ['child-allowance'] }],
      lastSeq: 2,
    });
    expect(snapshot.track).toBe('BIRTH_CARE');
    expect(snapshot.view.ranking[0].programId).toBe('child-allowance');
    expect(snapshot.messages[0]).toMatchObject({ role: 'assistant', citedPrograms: ['child-allowance'] });
    expect(snapshot.assessmentStatus).toBe('pending');
  });

  it('maps program and application field names without leaking backend shapes into UI', () => {
    const detail = programDetailFromBackend({ recordId: 'p1', nameKo: '아동수당', nameLocal: 'Trợ cấp', reasonKo: '설명', sourceUrl: 'https://example.com' });
    expect(detail.name.user).toBe('Trợ cấp');

    const app = applicationFromBackend({
      applicationId: 'a1', formId: 'f1', formTitleKo: '신청서',
      checkedRecords: [{ recordId: 'p1', formCheckbox: 'svc_1' }],
      fields: { childBirthDate: { value: '2026-01-01', source: 'system', prefilled: true }, registrationNo: { value: null, source: 'user_input', prefilled: false } },
      fieldLabels: { childBirthDate: { ko: '생년월일', local: 'Ngày sinh' }, registrationNo: { ko: '등록번호', local: 'Số đăng ký' } },
      missingRequired: ['registrationNo'],
    });
    expect(app.checkedPrograms[0].programId).toBe('p1');
    expect(app.fields.childBirthDate.sourceSlot).toBe('childBirthDate');
    expect(app.fields.registrationNo.status).toBe('PROTECTED');
  });
});
