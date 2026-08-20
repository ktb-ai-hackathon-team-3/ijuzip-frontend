import type {
  Application, ApplicationField, Candidate, CreateSessionResponse, Language, Message,
  Profile, ProgramDetail, ProgramVerdict, SessionSnapshot, SidebarView, Track,
} from './types';

export interface BackendResult {
  recordId: string;
  nameKo?: string;
  nameLocal?: string;
  status?: string;
  amountDescKo?: string;
  amountDescLocal?: string;
  reasonKo?: string;
  reasonLocal?: string;
  checks?: Array<{ field: string; fieldLabelKo: string; fieldLabelLocal?: string; required?: string; actual?: string; result: string }>;
  sourceSnippet?: string;
  sourceUrl?: string;
  lawReference?: string;
  requiredDocuments?: string[];
  requiredDocumentsLocal?: string[];
  lastVerified?: string;
  deadlineDesc?: string;
  deadlineDescLocal?: string;
  applicationOrgKo?: string;
  applicationOrgLocal?: string;
  formId?: string;
  formCheckbox?: string;
}

interface BackendProfile {
  lang: string;
  region: { sido: string; sigungu?: string };
  visaStatus: string;
  children?: Array<{ ageMonths?: number; nationality?: string }>;
  householdSize?: number | null;
  incomeBand?: string | null;
  employment?: { employed?: boolean | null } | null;
  childBirthDate?: string | null;
  injuryDate?: string | null;
}

/**
 * `IncomeBand` codes are uppercase on this side (`M_0_100`) and lowercase on
 * Spring's (`m_0_100`). Both onboarding and the detail-modal recheck send this
 * value, so the conversion lives in one place — they drifted apart once already,
 * with recheck sending the uppercase code straight through.
 */
export function incomeBandToBackend(code: string | null | undefined) {
  return code ? code.toLowerCase() : null;
}

export function trackFromBackend(track: string): Track {
  return track.toLowerCase() === 'labor_injury' ? 'LABOR_INJURY' : 'BIRTH_CARE';
}

export function toBackendSessionRequest(req: { language: Language; profile: Omit<Profile, 'track' | 'language'>; hasChildren: boolean | null }) {
  return {
    profile: {
      lang: req.language,
      region: req.profile.region,
      visaStatus: req.profile.visaStatus,
      spouseIsKorean: null,
      children: req.hasChildren ? [{}] : [],
      registered: null,
      residencyMonths: null,
      householdSize: req.profile.householdSize,
      incomeBand: incomeBandToBackend(req.profile.incomeBand),
      employment: null,
      healthInsurance: null,
      // The dates the user actually typed. `children[].ageMonths` is derived
      // from `childBirthDate` and cannot be inverted, and `injuryDate` was not
      // sent at all — so after a refresh both form fields came back empty.
      childBirthDate: null,
      injuryDate: null,
    },
  };
}

function statusToCandidate(status?: string): Candidate['conditionStatus'] {
  if (status === 'not_eligible' || status === 'blocked') return 'BLOCKED';
  if (status === 'eligible' || status === 'likely') return 'LIKELY';
  return 'NEED_INFO';
}

export function resultsToCandidates(results: BackendResult[]): Candidate[] {
  return results.map((result, index) => ({
    programId: result.recordId,
    name: local(result.nameKo ?? result.recordId, result.nameLocal),
    baseScore: Math.max(0.5, 0.95 - index * 0.04),
    conditionStatus: statusToCandidate(result.status),
    missingSlots: (result.checks ?? []).filter((check) => check.result === 'unknown').map((check) => check.field),
  }));
}

export function skeletonToCandidates(
  raw: { candidates?: Array<{ recordId: string; status?: string; nameKo?: string; nameLocal?: string }> }
): Candidate[] {
  return resultsToCandidates((raw.candidates ?? []).map((item) => ({
    recordId: item.recordId, status: item.status, nameKo: item.nameKo, nameLocal: item.nameLocal,
  })));
}

export function buildCreateSessionResponse(
  session: { sessionId: string; token: string; expiresIn: number },
  skeleton: { candidates?: Array<{ recordId: string; status?: string }>; funnel?: CreateSessionResponse['funnel'] },
  results: BackendResult[] | null,
  language: Language,
  track?: Track,
): CreateSessionResponse {
  const greetingKo = track
    ? (track === 'BIRTH_CARE'
      ? '입력하신 정보를 바탕으로 받을 수 있는 출산·돌봄 제도를 찾아봤어요.'
      : '입력하신 정보를 바탕으로 도움받을 수 있는 근로·산재 제도를 찾아봤어요.')
    : '입력하신 정보를 바탕으로 회원님에게 맞는 복지 제도를 찾아봤어요.';
  const greetingUserByLanguage: Record<Language, Record<Track, string>> = {
    ko: {
      BIRTH_CARE: '입력하신 정보를 바탕으로 받을 수 있는 출산·돌봄 제도를 찾아봤어요.',
      LABOR_INJURY: '입력하신 정보를 바탕으로 도움받을 수 있는 근로·산재 제도를 찾아봤어요.',
    },
    vi: {
      BIRTH_CARE: 'Dựa trên thông tin bạn cung cấp, tôi đã tìm các chương trình hỗ trợ sinh con và chăm sóc trẻ phù hợp.',
      LABOR_INJURY: 'Dựa trên thông tin bạn cung cấp, tôi đã tìm các chương trình hỗ trợ việc làm và tai nạn lao động phù hợp.',
    },
    km: {
      BIRTH_CARE: 'ផ្អែកលើព័ត៌មានដែលអ្នកបានផ្តល់ ខ្ញុំបានស្វែងរកកម្មវិធីជំនួយសម្រាប់ការសម្រាលកូន និងការថែទាំកុមារ។',
      LABOR_INJURY: 'ផ្អែកលើព័ត៌មានដែលអ្នកបានផ្តល់ ខ្ញុំបានស្វែងរកកម្មវិធីជំនួយសម្រាប់ការងារ និងគ្រោះថ្នាក់ការងារ។',
    },
    en: {
      BIRTH_CARE: 'Based on your information, I found birth and childcare support programs that may fit your situation.',
      LABOR_INJURY: 'Based on your information, I found employment and workplace-injury support programs that may fit your situation.',
    },
  };
  const generalGreeting: Record<Language, string> = {
    ko: greetingKo,
    vi: 'Dựa trên thông tin bạn cung cấp, tôi đã tìm các chương trình phúc lợi phù hợp với bạn.',
    km: 'ផ្អែកលើព័ត៌មានដែលអ្នកបានផ្តល់ ខ្ញុំបានស្វែងរកកម្មវិធីសុខុមាលភាពដែលសមស្របសម្រាប់អ្នក។',
    en: 'Based on your information, I found welfare programs that may fit your situation.',
  };
  const greetingUser = track ? greetingUserByLanguage[language][track] : generalGreeting[language];
  return {
    ...session,
    greeting: { ko: greetingKo, user: greetingUser },
    candidates: results ? resultsToCandidates(results) : skeletonToCandidates(skeleton),
    funnel: {
      total: skeleton.funnel?.total ?? 0,
      afterTrack: skeleton.funnel?.afterTrack ?? 0,
      afterFilter: skeleton.funnel?.afterFilter ?? 0,
      returned: skeleton.funnel?.returned ?? skeleton.candidates?.length ?? 0,
    },
  };
}

function profileFromBackend(raw: BackendProfile, track: Track): Profile {
  return {
    track,
    language: raw.lang as Language,
    visaStatus: raw.visaStatus,
    region: { sido: raw.region.sido, sigungu: raw.region.sigungu ?? '' },
    gender: null,
    birthYear: null,
    childBirthDate: raw.childBirthDate ?? null,
    childNationality: raw.children?.[0]?.nationality ?? null,
    householdSize: raw.householdSize ?? null,
    incomeBand: raw.incomeBand ? raw.incomeBand.toUpperCase() as Profile['incomeBand'] : null,
    employmentStatus: raw.employment?.employed == null ? null : raw.employment.employed ? 'EMPLOYED' : 'UNEMPLOYED',
    injuryDate: raw.injuryDate ?? null,
  };
}

function viewFromBackend(raw: any): SidebarView {
  return {
    ranking: (raw?.ranking ?? []).map((item: any) => ({ programId: item.recordId, score: item.score ?? 0 })),
    viewFilter: raw?.viewFilter ?? {},
    sortBy: 'relevance',
    visibleCount: raw?.visibleCount ?? 5,
  };
}

function messageFromBackend(raw: any): Message {
  if (raw.role === 'user') return { seq: raw.seq, role: 'user', text: raw.textLocal ?? '', createdAt: raw.createdAt };
  if (raw.role === 'system') return {
    seq: raw.seq, role: 'system', text: { ko: raw.textKo ?? '', user: raw.textLocal ?? raw.textKo ?? '' },
    createdAt: raw.createdAt, errorCode: raw.errorCode ?? 'UNKNOWN_ERROR',
  };
  return {
    seq: raw.seq, role: 'assistant', text: { ko: raw.textKo ?? '', user: raw.textLocal ?? raw.textKo ?? '' },
    createdAt: raw.createdAt, intent: String(raw.intent ?? 'question').toUpperCase() as 'QUESTION' | 'FILTER' | 'BOTH',
    citedPrograms: raw.citedRecords ?? [],
  };
}

export function snapshotFromBackend(raw: any): SessionSnapshot {
  const track = raw.track ? trackFromBackend(raw.track) : 'BIRTH_CARE';
  const results: BackendResult[] = raw.assessment?.results ?? [];
  const candidates = resultsToCandidates(results);
  const view = viewFromBackend(raw.view);
  if (view.ranking.length === 0) view.ranking = candidates.map((c) => ({ programId: c.programId, score: c.baseScore }));
  return {
    profile: profileFromBackend(raw.profile, track), track, candidates, view,
    messages: (raw.messages ?? []).map(messageFromBackend), lastSeq: raw.lastSeq ?? 0,
    latestApplicationId: raw.latestApplicationId ?? null,
    assessmentStatus: raw.assessment?.status,
  };
}

const local = (ko = '', user?: string) => ({ ko, user: user ?? ko });

export function programDetailFromBackend(raw: BackendResult): ProgramDetail {
  return {
    name: local(raw.nameKo, raw.nameLocal),
    summary: local(raw.reasonKo, raw.reasonLocal),
    benefit: local(raw.amountDescKo, raw.amountDescLocal),
    conditionsText: (raw.checks ?? []).map((check) => local(check.fieldLabelKo, check.fieldLabelLocal)),
    evidence: { sourceSnippet: raw.sourceSnippet ?? '', sourceUrl: raw.sourceUrl ?? '', lastVerified: raw.lastVerified ?? '' },
    applicationChannel: 'VISIT', applicationOrg: local(raw.applicationOrgKo ?? '관할 행정기관', raw.applicationOrgLocal),
    requiredDocuments: (raw.requiredDocuments ?? []).map((doc, index) => local(doc, raw.requiredDocumentsLocal?.[index])),
    deadline: raw.deadlineDescLocal ?? raw.deadlineDesc ?? '',
  };
}

export function verdictFromBackend(raw: BackendResult): ProgramVerdict {
  const verdict = raw.status === 'eligible' ? 'ELIGIBLE' : raw.status === 'not_eligible' ? 'NOT_ELIGIBLE' : 'NEEDS_CHECK';
  return {
    programId: raw.recordId, verdict, confidence: verdict === 'NEEDS_CHECK' ? 0.5 : 0.9,
    reason: local(raw.reasonKo, raw.reasonLocal),
    unmetConditions: (raw.checks ?? []).map((check) => ({
      condition: local(check.fieldLabelKo, check.fieldLabelLocal), userValue: check.actual ?? '',
      status: check.result === 'pass' ? 'MET' : check.result === 'fail' ? 'UNMET' : 'UNKNOWN',
    })),
    benefit: local(raw.amountDescKo, raw.amountDescLocal),
    evidence: { sourceSnippet: raw.sourceSnippet ?? '', sourceUrl: raw.sourceUrl ?? '', lastVerified: raw.lastVerified ?? '' },
    applicationChannel: 'VISIT', applicationOrg: '관할 행정기관', formId: raw.formId ?? '',
    formCheckbox: raw.formCheckbox ?? '', deadline: raw.deadlineDesc ?? '', judgedAt: new Date().toISOString(),
  };
}

/**
 * Which fields are PROTECTED is decided by the backend's `map.json`, and the
 * response now carries that list. Guessing it from key names here was wrong for
 * 10 of the 13 protected fields — `registrationNo`, `address` and `phone` are not
 * even keys this form has.
 */
function fieldFromBackend(
  key: string, raw: any, missing: string[], protectedFields: Set<string>
): ApplicationField {
  const source = raw?.source;
  const hasValue = raw?.value != null && String(raw.value).trim() !== '';
  const status: ApplicationField['status'] = raw?.prefilled && protectedFields.has(key) ? 'PROTECTED_PREFILLED'
    : !hasValue && protectedFields.has(key) ? 'PROTECTED'
    : missing.includes(key) ? 'MISSING'
    : source === 'unconfirmed' ? 'UNVERIFIED' : 'FILLED';
  return { value: raw?.value ?? null, status, ...(raw?.prefilled || source === 'system' ? { sourceSlot: key } : {}) };
}

export function applicationFromBackend(raw: any): Application {
  const missing = raw.missingRequired ?? [];
  const protectedFields = new Set<string>(raw.protectedFields ?? []);
  return {
    applicationId: raw.applicationId, formId: raw.formId,
    // The form title and every field label are display-only — the values the
    // user types are what lands on the PDF, and those stay Korean.
    formTitle: local(raw.formTitleKo, raw.formTitleLocal),
    checkedPrograms: (raw.checkedRecords ?? []).map((item: any) => ({
      programId: item.recordId,
      formCheckbox: item.formCheckbox,
      name: local(item.nameKo ?? item.recordId, item.nameLocal),
    })),
    fields: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([key, value]) => [key, fieldFromBackend(key, value, missing, protectedFields)])),
    fieldLabels: Object.fromEntries(Object.entries(raw.fieldLabels ?? {}).map(([key, value]: [string, any]) => [key, local(value.ko, value.local)])),
    // Page-by-page PNGs of the blank official form, already absolute URLs.
    // Empty when the backend has no static-asset host configured.
    previewImages: raw.formPreviewImages ?? [],
  };
}

export function patchFromBackend(raw: any) {
  const missing: string[] = raw.missingRequired ?? [];
  const protectedFields = new Set<string>(raw.protectedFields ?? []);
  return {
    fields: Object.fromEntries(Object.entries(raw.fields ?? {}).map(([key, value]) => [key, fieldFromBackend(key, value, missing, protectedFields)])),
    readyForPdf: Boolean(raw.readyForPdf), missingRequired: missing,
  };
}
