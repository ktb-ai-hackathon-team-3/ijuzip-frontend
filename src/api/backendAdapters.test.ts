import { describe, expect, it } from 'vitest';
import {
  applicationFromBackend, buildCreateSessionResponse, programDetailFromBackend,
  snapshotFromBackend, toBackendSessionRequest,
} from './backendAdapters';

describe('backend v0.6 adapters', () => {
  it('converts onboarding values to the Spring profile contract', () => {
    const request = toBackendSessionRequest({
      language: 'vi', hasChildren: true,
      profile: {
        visaStatus: 'F-6', region: { sido: '경기도', sigungu: '안산시' }, gender: null,
        birthYear: null, childBirthDate: new Date().toISOString().slice(0, 10), childNationality: 'KR',
        householdSize: 3, incomeBand: 'M_200_300', employmentStatus: null, injuryDate: null,
      },
    });
    expect(request).not.toHaveProperty('track');
    expect(request.profile.lang).toBe('vi');
    expect(request.profile.incomeBand).toBe('m_200_300');
    expect(request.profile.children).toEqual([{}]);
  });

  /**
   * `children[].ageMonths` is derived from the birth date and cannot be
   * inverted, and `injuryDate` was not sent at all — so both form fields came
   * back empty after a refresh and the user had to retype them.
   */
  it('does not send removed detail fields', () => {
    const request = toBackendSessionRequest({
      language: 'vi', hasChildren: false,
      profile: {
        visaStatus: 'F-6', region: { sido: '경기도', sigungu: '안산시' }, gender: null,
        birthYear: null, childBirthDate: '2026-07-01', childNationality: 'KR',
        householdSize: 3, incomeBand: 'M_200_300', employmentStatus: null, injuryDate: null,
      },
    });
    expect(request.profile.childBirthDate).toBeNull();
    expect(request.profile.children).toEqual([]);
  });

  it('restores a track-free backend snapshot', () => {
    const snapshot = snapshotFromBackend({
      profile: {
        lang: 'vi', region: { sido: '경기도', sigungu: '안산시' }, visaStatus: 'E-9',
        children: [], injuryDate: '2026-06-15', employment: { employed: true },
      },
      assessment: { status: 'done', results: [] },
    });
    expect(snapshot.profile.visaStatus).toBe('E-9');
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
      fields: { childBirthDate: { value: '2026-01-01', source: 'system', prefilled: true }, applicantRegNo: { value: null, source: 'user_input', prefilled: false } },
      fieldLabels: { childBirthDate: { ko: '생년월일', local: 'Ngày sinh' }, applicantRegNo: { ko: '등록번호', local: 'Số đăng ký' } },
      // The server decides this — `map.json` owns it. Guessing from key names
      // here got 10 of the form's 13 protected fields wrong.
      protectedFields: ['applicantRegNo'],
      missingRequired: ['applicantRegNo'],
      formPreviewImages: ['https://assets.example.com/images/f1/01.png'],
    });
    expect(app.checkedPrograms[0].programId).toBe('p1');
    expect(app.fields.childBirthDate.sourceSlot).toBe('childBirthDate');
    expect(app.fields.applicantRegNo.status).toBe('PROTECTED');
    expect(app.previewImages).toEqual(['https://assets.example.com/images/f1/01.png']);
  });

  it('does not invent PROTECTED status when the server did not say so', () => {
    const app = applicationFromBackend({
      applicationId: 'a1', formId: 'f1', formTitleKo: '신청서',
      fields: { bankName: { value: null, source: 'unconfirmed', prefilled: false } },
      fieldLabels: {}, protectedFields: [], missingRequired: [],
    });

    expect(app.fields.bankName.status).toBe('UNVERIFIED');
    expect(app.previewImages).toEqual([]);
  });
});
