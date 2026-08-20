import type {
  ApplicationField,
  Candidate,
  ConditionStatus,
  CreateSessionResponse,
  FieldMap,
  IncomeBand,
  Language,
  Profile,
  ProgramDetail,
  ProgramVerdict,
  QuickReply,
  SessionSnapshot,
  SseAnswerData,
  SseDoneData,
  SseSidebarData,
  Track,
} from '../api/types';
import { ApiRequestError } from '../api/client';
import { MOCK_PROGRAMS, findMockProgram, localize, type MockProgram } from './fixtures';

/**
 * Mock implementations of what Spring (+ its FastAPI polling) would do.
 * Not a network-level mock (no MSW/service worker) — api/*.ts calls these
 * directly when VITE_USE_MOCK_API=true, sharing the exact same return types
 * as the real fetch path, so swapping the flag is the only thing a real
 * backend integration needs to change.
 */

// ---- in-memory "Redis" ----------------------------------------------------

interface MockSessionRecord {
  sessionId: string;
  token: string;
  track: Track;
  language: Language;
  profile: Profile;
  candidates: Candidate[];
  view: SessionSnapshot['view'];
  messages: SessionSnapshot['messages'];
  msgSeq: number;
  latestApplicationId: string | null;
  locked: boolean;
}

interface MockApplicationRecord {
  applicationId: string;
  sessionId: string;
  formId: string;
  programIds: string[];
  fields: FieldMap;
}

const sessions = new Map<string, MockSessionRecord>();
const tokenToSession = new Map<string, string>();
const verdictCache = new Map<string, ProgramVerdict>();
const applications = new Map<string, MockApplicationRecord>();

let seqCounter = 1000;
function nextId(prefix: string) {
  seqCounter += 1;
  return `${prefix}_${seqCounter.toString(36)}`;
}

function requireSession(sid: string, token: string | null): MockSessionRecord {
  const session = sessions.get(sid);
  if (!session) throw new ApiRequestError({ code: 'SESSION_NOT_FOUND', message: 'Session not found', status: 404 });
  if (!token || tokenToSession.get(token) !== sid) {
    throw new ApiRequestError({ code: 'SESSION_EXPIRED', message: 'Invalid or expired token', status: 401 });
  }
  return session;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- candidate scoring (mock stand-in for FastAPI /v1/candidates §8.1) ---

const INCOME_BAND_RATIO: Record<IncomeBand, number> = {
  M_0_100: 100,
  M_100_150: 150,
  M_150_200: 200,
  M_200_300: 300,
  M_300_PLUS: 400,
};

function childAgeMonths(childBirthDate: string | null): number | null {
  if (!childBirthDate) return null;
  const birth = new Date(childBirthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function hashScore(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 15) / 100; // 0.00 – 0.14
}

function scoreCandidate(program: MockProgram, profile: Profile, language: Language = 'ko'): Candidate {
  const missingSlots: string[] = [];
  let blocked = false;

  if (program.conditions.visaStatus && !program.conditions.visaStatus.includes(profile.visaStatus)) {
    blocked = true;
  }
  if (
    program.track === 'BIRTH_CARE' &&
    program.conditions.childNationality &&
    profile.childNationality &&
    !program.conditions.childNationality.includes(profile.childNationality)
  ) {
    blocked = true;
  }
  if (program.track === 'BIRTH_CARE' && program.conditions.childAgeMonthsMax !== null) {
    const ageMonths = childAgeMonths(profile.childBirthDate);
    if (ageMonths !== null && ageMonths > program.conditions.childAgeMonthsMax) blocked = true;
  }

  let needInfo = false;
  if (program.conditions.incomeMedianRatioMax !== null) {
    if (!profile.incomeBand) {
      needInfo = true;
      missingSlots.push('incomeBand');
    } else if (INCOME_BAND_RATIO[profile.incomeBand] > program.conditions.incomeMedianRatioMax) {
      blocked = true;
    }
  }

  const conditionStatus: ConditionStatus = blocked ? 'BLOCKED' : needInfo ? 'NEED_INFO' : 'LIKELY';
  const base = conditionStatus === 'LIKELY' ? 0.8 : conditionStatus === 'NEED_INFO' ? 0.55 : 0.2;

  return {
    programId: program.programId,
    name: localize(program.name, language),
    baseScore: Math.min(0.97, base + hashScore(program.programId)),
    conditionStatus,
    missingSlots,
  };
}

export function mockBuildCandidates(track: Track, profile: Profile) {
  const trackPrograms = MOCK_PROGRAMS.filter((p) => p.track === track);
  const candidates = trackPrograms
    .map((program) => scoreCandidate(program, profile, profile.language))
    .sort((a, b) => b.baseScore - a.baseScore);
  const funnel = {
    total: 312,
    afterTrack: trackPrograms.length + 45,
    afterFilter: candidates.filter((c) => c.conditionStatus !== 'BLOCKED').length + trackPrograms.filter((p) => p.track === track).length,
    returned: candidates.length,
  };
  return { candidates, funnel };
}

const GREETINGS: Record<Track, Record<Language, string>> = {
  BIRTH_CARE: {
    ko: '안녕하세요. 임신·출산·육아와 관련해 회원님께 맞는 지원 제도를 찾아드릴게요.',
    vi: 'Xin chào. Tôi sẽ giúp bạn tìm các chương trình hỗ trợ phù hợp liên quan đến mang thai, sinh con và nuôi con.',
    km: 'សួស្តី ខ្ញុំនឹងជួយអ្នករកកម្មវិធីជំនួយសមស្របទាក់ទងនឹងការមានផ្ទៃពោះ ការសម្រាលកូន និងការចិញ្ចឹមកូន។',
    en: 'Hello. I\'ll help you find support programs related to pregnancy, childbirth, and childcare.',
  },
  LABOR_INJURY: {
    ko: '안녕하세요. 산재·근로와 관련해 회원님께 맞는 지원 제도를 찾아드릴게요.',
    vi: 'Xin chào. Tôi sẽ giúp bạn tìm các chương trình hỗ trợ liên quan đến tai nạn lao động và việc làm.',
    km: 'សួស្តី ខ្ញុំនឹងជួយអ្នករកកម្មវិធីជំនួយទាក់ទងនឹងគ្រោះថ្នាក់ការងារនិងការងារ។',
    en: 'Hello. I\'ll help you find support programs related to workplace injuries and employment.',
  },
};

// ---- §7.1 POST /sessions ---------------------------------------------------

export async function mockCreateSession(params: {
  language: Language;
  track: Track;
  profile: Omit<Profile, 'track' | 'language'>;
}): Promise<CreateSessionResponse> {
  await delay(400);
  const sessionId = nextId('sess');
  const token = nextId('tok') + nextId('tok');
  const profile: Profile = { ...params.profile, track: params.track, language: params.language };
  const { candidates, funnel } = mockBuildCandidates(params.track, profile);

  const record: MockSessionRecord = {
    sessionId,
    token,
    track: params.track,
    language: params.language,
    profile,
    candidates,
    view: {
      ranking: candidates.map((c) => ({ programId: c.programId, score: c.baseScore })),
      viewFilter: {},
      sortBy: 'relevance',
      visibleCount: 5,
    },
    messages: [],
    msgSeq: 0,
    latestApplicationId: null,
    locked: false,
  };
  sessions.set(sessionId, record);
  tokenToSession.set(token, sessionId);

  return {
    sessionId,
    token,
    expiresIn: 86400,
    greeting: { ko: GREETINGS[params.track].ko, user: GREETINGS[params.track][params.language] },
    candidates,
    funnel,
  };
}

// ---- §7.2 GET /sessions/{sid} ----------------------------------------------

export async function mockGetSession(sid: string, token: string | null): Promise<SessionSnapshot> {
  await delay(250);
  const session = requireSession(sid, token);
  return {
    profile: session.profile,
    track: session.track,
    candidates: session.candidates,
    view: session.view,
    messages: session.messages.slice(-40),
    lastSeq: session.msgSeq,
    latestApplicationId: session.latestApplicationId,
  };
}

// ---- §7.4 GET /sessions/{sid}/candidates -----------------------------------

export async function mockGetCandidates(sid: string, token: string | null) {
  await delay(200);
  const session = requireSession(sid, token);
  return { candidates: session.candidates, view: session.view };
}

// ---- §7.3 POST /sessions/{sid}/messages (SSE, simulated) ------------------

export interface MockChatHandlers {
  onAnswer: (data: SseAnswerData) => void;
  onSidebar: (data: SseSidebarData) => void;
  onDone: (data: SseDoneData) => void;
  onError: (code: string, message: string) => void;
}

const CASH_KEYWORDS = ['현금', 'cash', 'tiền mặt', 'ប្រាក់សុទ្ធ'];

function quickRepliesFor(session: MockSessionRecord): QuickReply[] {
  const top = session.candidates.filter((c) => c.conditionStatus !== 'BLOCKED').slice(0, 2);
  return top.map((c) => {
    const program = findMockProgram(c.programId)!;
    return { value: `explain:${c.programId}`, label: localize(program.name, session.language) };
  });
}

function findReferencedProgram(utterance: string, track: Track): MockProgram | null {
  if (utterance.startsWith('explain:')) {
    const id = utterance.slice('explain:'.length);
    return findMockProgram(id) ?? null;
  }
  const trackPrograms = MOCK_PROGRAMS.filter((p) => p.track === track);
  const lower = utterance.toLowerCase();
  return trackPrograms.find((p) => Object.values(p.name).some((label) => lower.includes(label.toLowerCase()))) ?? null;
}

const GENERIC_REPLY: Record<Language, string> = {
  ko: '말씀 감사해요. 왼쪽 목록에 있는 제도를 눌러보시면 자세히 안내해드려요. 궁금한 제도 이름을 말씀해주셔도 좋아요.',
  vi: 'Cảm ơn bạn. Bạn có thể nhấn vào một chương trình trong danh sách bên trái để xem chi tiết, hoặc hỏi tôi về tên chương trình bạn quan tâm.',
  km: 'អរគុណសម្រាប់ការចែករំលែក។ អ្នកអាចចុចលើកម្មវិធីមួយក្នុងបញ្ជីខាងឆ្វេងដើម្បីមើលលម្អិត ឬសួរឈ្មោះកម្មវិធីដែលអ្នកចាប់អារម្មណ៍។',
  en: 'Thanks for sharing. You can tap a program in the list on the left to see details, or just tell me the name of a program you\'re curious about.',
};

const CASH_FILTER_REPLY: Record<Language, string> = {
  ko: '현금으로 받을 수 있는 제도만 왼쪽 목록에서 위로 올려드렸어요.',
  vi: 'Tôi đã đưa các chương trình nhận bằng tiền mặt lên đầu danh sách bên trái.',
  km: 'ខ្ញុំបានផ្លាស់ទីកម្មវិធីដែលទទួលបានជាសាច់ប្រាក់ទៅកំពូលបញ្ជីខាងឆ្វេង។',
  en: 'I\'ve moved the programs that pay out in cash to the top of the list on the left.',
};

/** Simulates the SSE event sequence (§4) via timed callbacks instead of a real stream. */
export async function mockSendMessage(
  sid: string,
  token: string | null,
  utterance: string,
  handlers: MockChatHandlers
): Promise<void> {
  const session = requireSession(sid, token);
  if (session.locked) {
    throw new ApiRequestError({ code: 'TURN_IN_PROGRESS', message: 'A turn is already in progress', status: 429 });
  }
  session.locked = true;

  try {
    session.msgSeq += 1;
    session.messages.push({ seq: session.msgSeq, role: 'user', text: utterance, createdAt: new Date().toISOString() });

    await delay(900); // simulated `/v1/chat` latency

    const referenced = findReferencedProgram(utterance, session.track);
    const isCashFilter = CASH_KEYWORDS.some((kw) => utterance.toLowerCase().includes(kw));

    if (referenced) {
      const answerText = { ko: referenced.summary.ko, user: referenced.summary[session.language] };
      session.msgSeq += 1;
      session.messages.push({
        seq: session.msgSeq,
        role: 'assistant',
        text: answerText,
        createdAt: new Date().toISOString(),
        intent: 'QUESTION',
        citedPrograms: [referenced.programId],
      });
      handlers.onAnswer({ text: answerText, citedPrograms: [referenced.programId] });
      // QUESTION → no `sidebar` event, by contract §4.
      handlers.onDone({ quickReplies: quickRepliesFor(session) });
      return;
    }

    if (isCashFilter) {
      const reordered = [...session.candidates].sort((a, b) => {
        const aCash = findMockProgram(a.programId)?.benefitType === 'CASH' ? 1 : 0;
        const bCash = findMockProgram(b.programId)?.benefitType === 'CASH' ? 1 : 0;
        return bCash - aCash || b.baseScore - a.baseScore;
      });
      session.view = {
        ranking: reordered.map((c) => ({ programId: c.programId, score: c.baseScore })),
        viewFilter: { benefitType: 'CASH' },
        sortBy: 'relevance',
        visibleCount: session.view.visibleCount,
      };
      const answerText = { ko: CASH_FILTER_REPLY.ko, user: CASH_FILTER_REPLY[session.language] };
      session.msgSeq += 1;
      session.messages.push({
        seq: session.msgSeq,
        role: 'assistant',
        text: answerText,
        createdAt: new Date().toISOString(),
        intent: 'FILTER',
        citedPrograms: [],
      });
      handlers.onAnswer({ text: answerText, citedPrograms: [] });
      handlers.onSidebar({ ranking: session.view.ranking, viewFilter: session.view.viewFilter, visibleCount: session.view.visibleCount });
      handlers.onDone({ quickReplies: quickRepliesFor(session) });
      return;
    }

    const answerText = { ko: GENERIC_REPLY.ko, user: GENERIC_REPLY[session.language] };
    session.msgSeq += 1;
    session.messages.push({
      seq: session.msgSeq,
      role: 'assistant',
      text: answerText,
      createdAt: new Date().toISOString(),
      intent: 'QUESTION',
      citedPrograms: [],
    });
    handlers.onAnswer({ text: answerText, citedPrograms: [] });
    handlers.onDone({ quickReplies: quickRepliesFor(session) });
  } catch (err) {
    session.msgSeq += 1;
    const errText = { ko: '답변 생성에 실패했습니다. 다시 시도해 주세요.', user: '답변 생성에 실패했습니다. 다시 시도해 주세요.' };
    session.messages.push({ seq: session.msgSeq, role: 'system', text: errText, createdAt: new Date().toISOString(), errorCode: 'AI_TIMEOUT' });
    handlers.onError('AI_TIMEOUT', 'Failed to generate a response');
  } finally {
    session.locked = false;
  }
}

// ---- §7.5 POST /sessions/{sid}/programs/{pid}/verdict ----------------------

export async function mockGetVerdict(
  sid: string,
  token: string | null,
  pid: string,
  extraAnswers?: Record<string, string>
): Promise<ProgramVerdict> {
  const session = requireSession(sid, token);
  const cacheKey = `${sid}:${pid}`;
  const cached = verdictCache.get(cacheKey);
  if (cached) return cached;

  await delay(1400); // simulated Opus verdict latency

  const program = findMockProgram(pid);
  if (!program) throw new ApiRequestError({ code: 'PROGRAM_NOT_FOUND', message: 'Program not found', status: 404 });

  const candidate = session.candidates.find((c) => c.programId === pid);
  const profile = { ...session.profile };
  if (extraAnswers?.incomeBand) profile.incomeBand = extraAnswers.incomeBand as Profile['incomeBand'];
  const rescored = scoreCandidate(program, profile);

  const verdict: ProgramVerdict['verdict'] =
    rescored.conditionStatus === 'BLOCKED' ? 'NOT_ELIGIBLE' : rescored.conditionStatus === 'NEED_INFO' ? 'NEEDS_CHECK' : 'ELIGIBLE';
  let confidence = rescored.conditionStatus === 'LIKELY' ? 0.88 : rescored.conditionStatus === 'NEED_INFO' ? 0.55 : 0.3;
  // §5.5 보수 편향: confidence < 0.7이면 ELIGIBLE을 NEEDS_CHECK로 강등 (Spring 정책, 여기서 동일하게 재현).
  let finalVerdict = verdict;
  if (verdict === 'ELIGIBLE' && confidence < 0.7) finalVerdict = 'NEEDS_CHECK';

  const result: ProgramVerdict = {
    programId: pid,
    verdict: finalVerdict,
    confidence,
    reason: localize(program.conditionsText[0] ?? program.summary, session.language),
    unmetConditions: program.conditionsText.map((c) => ({
      condition: localize(c, session.language),
      userValue: '—',
      status: finalVerdict === 'NOT_ELIGIBLE' ? 'UNMET' : finalVerdict === 'NEEDS_CHECK' ? 'UNKNOWN' : 'MET',
    })),
    benefit: localize(program.benefit, session.language),
    evidence: { sourceSnippet: program.sourceSnippet, sourceUrl: program.sourceUrl, lastVerified: program.lastVerified },
    applicationChannel: program.applicationChannel,
    applicationOrg: program.applicationOrg[session.language] ?? program.applicationOrg.ko,
    formId: program.formId,
    formCheckbox: program.formCheckbox,
    deadline: program.deadline,
    judgedAt: new Date().toISOString(),
  };
  void candidate;
  verdictCache.set(cacheKey, result);
  return result;
}

// ---- §7.6 GET /programs/{pid} ----------------------------------------------

export async function mockGetProgramDetail(pid: string, lang: Language): Promise<ProgramDetail> {
  await delay(300);
  const program = findMockProgram(pid);
  if (!program) throw new ApiRequestError({ code: 'PROGRAM_NOT_FOUND', message: 'Program not found', status: 404 });
  return {
    name: localize(program.name, lang),
    summary: localize(program.summary, lang),
    benefit: localize(program.benefit, lang),
    conditionsText: program.conditionsText.map((c) => localize(c, lang)),
    evidence: { sourceSnippet: program.sourceSnippet, sourceUrl: program.sourceUrl, lastVerified: program.lastVerified },
    applicationChannel: program.applicationChannel,
    applicationOrg: localize(program.applicationOrg, lang),
    requiredDocuments: program.requiredDocuments.map((d) => localize(d, lang)),
    deadline: program.deadline,
  };
}

// ---- §7.7 / §7.8 Applications ----------------------------------------------

const PROTECTED_FIELD_KEYS = ['applicantName', 'applicantRegNo', 'applicantAddress', 'applicantPhone', 'bankName', 'accountNo'];

export async function mockCreateApplication(sid: string, token: string | null, programIds: string[]) {
  await delay(500);
  const session = requireSession(sid, token);
  const programs = programIds.map((id) => {
    const program = findMockProgram(id);
    if (!program) throw new ApiRequestError({ code: 'PROGRAM_NOT_FOUND', message: 'Program not found', status: 404 });
    return program;
  });
  const formIds = new Set(programs.map((p) => p.formId));
  if (formIds.size > 1) {
    throw new ApiRequestError({ code: 'FORM_ID_MISMATCH', message: 'Selected programs use different forms', status: 400 });
  }
  const formId = programs[0].formId;
  const applicationId = nextId('app');

  const fields: FieldMap = {};
  const fieldLabels: Record<string, { ko: string; user: string }> = {};
  for (const key of PROTECTED_FIELD_KEYS) {
    fields[key] = { value: null, status: 'PROTECTED' };
    fieldLabels[key] = PROTECTED_FIELD_LABELS[key][session.language]
      ? { ko: PROTECTED_FIELD_LABELS[key].ko, user: PROTECTED_FIELD_LABELS[key][session.language] }
      : { ko: key, user: key };
  }

  const profile = session.profile;
  const setField = (key: string, value: string | null, sourceSlot: string, label: Record<Language, string>) => {
    fields[key] = value
      ? { value, status: 'FILLED', sourceSlot }
      : { value: null, status: 'MISSING', sourceSlot };
    fieldLabels[key] = { ko: label.ko, user: label[session.language] ?? label.ko };
  };

  if (session.track === 'BIRTH_CARE') {
    setField('childBirthDate', profile.childBirthDate, 'childBirthDate', FIELD_LABELS.childBirthDate);
    setField('childNationality', profile.childNationality, 'childNationality', FIELD_LABELS.childNationality);
  } else {
    setField('employmentStatus', profile.employmentStatus, 'employmentStatus', FIELD_LABELS.employmentStatus);
    setField('injuryDate', profile.injuryDate, 'injuryDate', FIELD_LABELS.injuryDate);
  }
  if (profile.householdSize) {
    fields.householdSize = { value: String(profile.householdSize), status: 'UNVERIFIED', sourceSlot: 'householdSize' };
    fieldLabels.householdSize = { ko: FIELD_LABELS.householdSize.ko, user: FIELD_LABELS.householdSize[session.language] };
  }

  applications.set(applicationId, {
    applicationId,
    sessionId: sid,
    formId,
    programIds,
    fields,
  });
  session.latestApplicationId = applicationId;

  return {
    applicationId,
    formId,
    formTitle: FORM_TITLES[formId] ? localize(FORM_TITLES[formId], session.language) : { ko: formId, user: formId },
    checkedPrograms: programs.map((p) => ({
      programId: p.programId, formCheckbox: p.formCheckbox,
      name: localize(p.name, session.language),
    })),
    fields,
    fieldLabels,
  };
}

const FORM_TITLES: Record<string, Record<Language, string>> = {
  'birth-integrated-v1': {
    ko: '출산서비스 통합처리 신청서',
    vi: 'Đơn đăng ký dịch vụ sinh con tích hợp',
    km: 'ពាក្យសុំសេវាកម្មសម្រាលកូនរួម',
    en: 'Integrated Childbirth Service Application',
  },
  'labor-injury-v1': {
    ko: '산업재해보상 신청서',
    vi: 'Đơn đăng ký bồi thường tai nạn lao động',
    km: 'ពាក្យសុំសំណងគ្រោះថ្នាក់ការងារឧស្សាហកម្ម',
    en: 'Industrial Accident Compensation Application',
  },
};

const PROTECTED_FIELD_LABELS: Record<string, Record<Language, string>> = {
  applicantName: { ko: '신청인 성명', vi: 'Họ và tên người nộp đơn', km: 'ឈ្មោះពេញអ្នកដាក់ពាក្យ', en: 'Applicant\'s full name' },
  applicantRegNo: { ko: '외국인등록번호', vi: 'Số đăng ký người nước ngoài', km: 'លេខចុះបញ្ជីជនបរទេស', en: 'Alien registration number' },
  applicantAddress: { ko: '신청인 주소', vi: 'Địa chỉ người nộp đơn', km: 'អាសយដ្ឋានអ្នកដាក់ពាក្យ', en: 'Applicant\'s address' },
  applicantPhone: { ko: '연락처', vi: 'Số điện thoại', km: 'លេខទូរស័ព្ទ', en: 'Phone number' },
  bankName: { ko: '은행명', vi: 'Tên ngân hàng', km: 'ឈ្មោះធនាគារ', en: 'Bank name' },
  accountNo: { ko: '계좌번호', vi: 'Số tài khoản', km: 'លេខគណនី', en: 'Account number' },
};

const FIELD_LABELS: Record<string, Record<Language, string>> = {
  childBirthDate: { ko: '자녀 출생일', vi: 'Ngày sinh của con', km: 'ថ្ងៃខែឆ្នាំកំណើតកូន', en: 'Child\'s birth date' },
  childNationality: { ko: '자녀 국적', vi: 'Quốc tịch của con', km: 'សញ្ជាតិកូន', en: 'Child\'s nationality' },
  employmentStatus: { ko: '근로 형태', vi: 'Hình thức làm việc', km: 'ប្រភេទការងារ', en: 'Employment type' },
  injuryDate: { ko: '재해 발생일', vi: 'Ngày xảy ra tai nạn', km: 'ថ្ងៃខែឆ្នាំកើតហេតុ', en: 'Date of injury' },
  householdSize: { ko: '가구원 수', vi: 'Số thành viên hộ gia đình', km: 'ចំនួនសមាជិកគ្រួសារ', en: 'Household size' },
};

export async function mockGetApplication(appId: string, token: string | null) {
  await delay(250);
  const app = applications.get(appId);
  if (!app) throw new ApiRequestError({ code: 'APPLICATION_NOT_FOUND', message: 'Application not found', status: 404 });
  const session = requireSession(app.sessionId, token);
  const program = findMockProgram(app.programIds[0]);
  const maskedFields: FieldMap = {};
  for (const [key, field] of Object.entries(app.fields)) {
    maskedFields[key] = isProtectedKey(key) && field.value ? { ...field, value: maskValue(field.value) } : field;
  }
  return {
    applicationId: app.applicationId,
    formId: app.formId,
    formTitle: FORM_TITLES[app.formId] ? localize(FORM_TITLES[app.formId], session.language) : { ko: app.formId, user: app.formId },
    checkedPrograms: app.programIds.map((id) => {
      const program = findMockProgram(id);
      return {
        programId: id, formCheckbox: program?.formCheckbox ?? '',
        name: program ? localize(program.name, session.language) : { ko: id, user: id },
      };
    }),
    fields: maskedFields,
    fieldLabels: buildFieldLabels(app, session.language),
  };
  function buildFieldLabels(a: MockApplicationRecord, lang: Language) {
    const labels: Record<string, { ko: string; user: string }> = {};
    for (const key of Object.keys(a.fields)) {
      const source = PROTECTED_FIELD_LABELS[key] ?? FIELD_LABELS[key];
      labels[key] = source ? { ko: source.ko, user: source[lang] } : { ko: key, user: key };
    }
    return labels;
  }
  void program;
}

function isProtectedKey(key: string) {
  return PROTECTED_FIELD_KEYS.includes(key);
}

function maskValue(value: string): string {
  if (value.length <= 2) return '*'.repeat(value.length);
  return value.slice(0, 2) + '*'.repeat(Math.max(3, value.length - 2));
}

// ---- §7.9 PATCH /applications/{appId}/fields -------------------------------

export async function mockPatchFields(appId: string, token: string | null, patch: Record<string, string>) {
  await delay(350);
  const app = applications.get(appId);
  if (!app) throw new ApiRequestError({ code: 'APPLICATION_NOT_FOUND', message: 'Application not found', status: 404 });
  requireSession(app.sessionId, token);

  for (const [key, value] of Object.entries(patch)) {
    if (!value.trim()) continue;
    app.fields[key] = { value, status: 'FILLED' };
  }

  const missingRequired = Object.entries(app.fields)
    .filter(([, field]: [string, ApplicationField]) => field.status === 'MISSING' || field.status === 'PROTECTED')
    .map(([key]) => key);

  const responseFields: FieldMap = {};
  for (const [key, field] of Object.entries(app.fields)) {
    responseFields[key] = isProtectedKey(key) && field.value ? { ...field, value: maskValue(field.value) } : field;
  }

  return { fields: responseFields, readyForPdf: missingRequired.length === 0, missingRequired };
}

// ---- §7.10 POST /applications/{appId}/pdf ----------------------------------

export async function mockGeneratePdf(appId: string, token: string | null): Promise<{ blob: Blob; unverifiedFields: string[] }> {
  await delay(900);
  const app = applications.get(appId);
  if (!app) throw new ApiRequestError({ code: 'APPLICATION_NOT_FOUND', message: 'Application not found', status: 404 });
  requireSession(app.sessionId, token);

  const unverifiedFields = Object.entries(app.fields)
    .filter(([, field]) => field.status === 'UNVERIFIED')
    .map(([key]) => key);

  const lines = [
    'IJU.zip - Mock Application PDF',
    `Form: ${app.formId}`,
    `Application ID: ${app.applicationId}`,
    '',
    ...Object.entries(app.fields).map(([key, field]) => `${key}: ${field.value ?? '(empty)'} [${field.status}]`),
  ];
  const blob = buildMinimalPdfBlob(lines);

  // §7.9 identity is DEL'd right after PDF render — mock mirrors that by
  // clearing PROTECTED values so a re-download without re-entering fails.
  for (const key of Object.keys(app.fields)) {
    if (isProtectedKey(key)) app.fields[key] = { value: null, status: 'PROTECTED' };
  }

  return { blob, unverifiedFields };
}

function buildMinimalPdfBlob(lines: string[]): Blob {
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  const contentBody = lines
    .map((line, i) => `1 0 0 1 50 ${800 - i * 20} Tm (${escape(line)}) Tj`)
    .join('\n');
  const content = `BT /F1 11 Tf ${contentBody} ET`;

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 841] /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: 'application/pdf' });
}
