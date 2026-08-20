import { describe, it, expect } from 'vitest';
import {
  mockBuildCandidates,
  mockCreateApplication,
  mockCreateSession,
  mockGetApplication,
  mockPatchFields,
  mockSendMessage,
} from './handlers';
import type { Profile } from '../api/types';

const birthCareProfile: Omit<Profile, 'track' | 'language'> = {
  visaStatus: 'F-6',
  region: { sido: '경기도', sigungu: '안산시' },
  gender: null,
  birthYear: null,
  childBirthDate: new Date().toISOString().slice(0, 10), // newborn — passes every age gate
  childNationality: 'KR',
  householdSize: null,
  incomeBand: null,
  employmentStatus: null,
  injuryDate: null,
};

describe('mockBuildCandidates — §8.1 candidate scoring', () => {
  it('marks a program LIKELY when every known condition passes', () => {
    const { candidates } = mockBuildCandidates('BIRTH_CARE', { ...birthCareProfile, track: 'BIRTH_CARE', language: 'ko' });
    const voucher = candidates.find((c) => c.programId === 'mohw-first-meeting-voucher');
    expect(voucher?.conditionStatus).toBe('LIKELY');
  });

  it('marks a program NEED_INFO when a gating slot (incomeBand) was skipped at onboarding', () => {
    const { candidates } = mockBuildCandidates('BIRTH_CARE', { ...birthCareProfile, track: 'BIRTH_CARE', language: 'ko' });
    const grant = candidates.find((c) => c.programId === 'mohw-childbirth-benefit');
    expect(grant?.conditionStatus).toBe('NEED_INFO');
    expect(grant?.missingSlots).toContain('incomeBand');
  });

  it('marks a program BLOCKED when a hard condition (visaStatus) fails', () => {
    const { candidates } = mockBuildCandidates('BIRTH_CARE', {
      ...birthCareProfile,
      visaStatus: 'D-2', // not in mohw-first-meeting-voucher's allowed list
      track: 'BIRTH_CARE',
      language: 'ko',
    });
    const voucher = candidates.find((c) => c.programId === 'mohw-first-meeting-voucher');
    expect(voucher?.conditionStatus).toBe('BLOCKED');
  });

  it('§ principle 5: LABOR_INJURY programs ignore visaStatus entirely (visaStatus: null in the KB)', () => {
    const { candidates } = mockBuildCandidates('LABOR_INJURY', {
      ...birthCareProfile,
      visaStatus: 'OTHER',
      employmentStatus: 'EMPLOYED',
      track: 'LABOR_INJURY',
      language: 'ko',
    });
    expect(candidates.every((c) => c.conditionStatus !== 'BLOCKED')).toBe(true);
  });
});

describe('mockSendMessage — §4 sidebar event rule', () => {
  it('QUESTION intent never fires onSidebar (list must not reorder on a plain question)', async () => {
    const session = await mockCreateSession({ language: 'ko', track: 'BIRTH_CARE', profile: birthCareProfile });
    let sidebarCalled = false;
    let answered = false;
    await mockSendMessage(session.sessionId, session.token, '첫만남이용권이 뭐예요?', {
      onAnswer: () => { answered = true; },
      onSidebar: () => { sidebarCalled = true; },
      onDone: () => {},
      onError: () => {},
    });
    expect(answered).toBe(true);
    expect(sidebarCalled).toBe(false);
  });

  it('FILTER intent (cash keyword) fires onSidebar exactly once with a benefitType filter', async () => {
    const session = await mockCreateSession({ language: 'ko', track: 'BIRTH_CARE', profile: birthCareProfile });
    let sidebarPayload: unknown = null;
    await mockSendMessage(session.sessionId, session.token, '현금으로 받을 수 있는 것만 보여줘', {
      onAnswer: () => {},
      onSidebar: (data) => { sidebarPayload = data; },
      onDone: () => {},
      onError: () => {},
    });
    expect(sidebarPayload).not.toBeNull();
    expect((sidebarPayload as { viewFilter: { benefitType?: string } }).viewFilter.benefitType).toBe('CASH');
  });

  it('rejects a second turn while one is in flight (§7.3 concurrency lock, mirrors server 429)', async () => {
    const session = await mockCreateSession({ language: 'ko', track: 'BIRTH_CARE', profile: birthCareProfile });
    const first = mockSendMessage(session.sessionId, session.token, '첫 번째 메시지', {
      onAnswer: () => {},
      onSidebar: () => {},
      onDone: () => {},
      onError: () => {},
    });
    await expect(
      mockSendMessage(session.sessionId, session.token, '두 번째 메시지', {
        onAnswer: () => {},
        onSidebar: () => {},
        onDone: () => {},
        onError: () => {},
      })
    ).rejects.toMatchObject({ code: 'TURN_IN_PROGRESS' });
    await first;
  });
});

describe('mockCreateApplication — §7.7 N programs → one form', () => {
  it('creates an application when every selected program shares a formId', async () => {
    const session = await mockCreateSession({ language: 'ko', track: 'BIRTH_CARE', profile: birthCareProfile });
    const app = await mockCreateApplication(session.sessionId, session.token, [
      'mohw-first-meeting-voucher',
      'mohw-parent-allowance',
    ]);
    expect(app.formId).toBe('birth-integrated-v1');
    expect(app.checkedPrograms).toHaveLength(2);
  });

  it('rejects mixed formIds with a 400-shaped error', async () => {
    const session = await mockCreateSession({ language: 'ko', track: 'BIRTH_CARE', profile: birthCareProfile });
    await expect(
      mockCreateApplication(session.sessionId, session.token, ['mohw-first-meeting-voucher', 'moel-injury-treatment'])
    ).rejects.toMatchObject({ code: 'FORM_ID_MISMATCH', status: 400 });
  });
});

describe('PROTECTED fields — § principle 4 masking', () => {
  it('masks PROTECTED field values as soon as they are saved', async () => {
    const session = await mockCreateSession({ language: 'ko', track: 'BIRTH_CARE', profile: birthCareProfile });
    const app = await mockCreateApplication(session.sessionId, session.token, ['mohw-first-meeting-voucher']);
    const patched = await mockPatchFields(app.applicationId, session.token, { applicantName: 'Nguyễn Thị Lan' });
    expect(patched.fields.applicantName.value).not.toBe('Nguyễn Thị Lan');
    expect(patched.fields.applicantName.value).toMatch(/^Ng\*+$/);
  });

  it('GET application also returns masked PROTECTED values, never plaintext', async () => {
    const session = await mockCreateSession({ language: 'ko', track: 'BIRTH_CARE', profile: birthCareProfile });
    const app = await mockCreateApplication(session.sessionId, session.token, ['mohw-first-meeting-voucher']);
    await mockPatchFields(app.applicationId, session.token, { applicantName: 'Nguyễn Thị Lan' });
    const fetched = await mockGetApplication(app.applicationId, session.token);
    expect(fetched.fields.applicantName.value).not.toBe('Nguyễn Thị Lan');
  });
});
