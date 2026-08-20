/**
 * Domain types mirroring API 계약서 v0.5 §5 (shared domain objects).
 * No field here should exist unless the contract defines it — Pydantic on the
 * FastAPI side uses `extra="forbid"`, so the frontend must not invent fields.
 */

export type Track = 'BIRTH_CARE' | 'LABOR_INJURY';

/** §13 미결: 최종 언어 코드 세트는 미확정. 계약이 확정되면 이 유니온만 바꾸면 된다. */
export type Language = 'ko' | 'vi' | 'km' | 'en';

export type Gender = 'F' | 'M';

export type IncomeBand = 'M_0_100' | 'M_100_150' | 'M_150_200' | 'M_200_300' | 'M_300_PLUS';

export type EmploymentStatus = 'EMPLOYED' | 'UNEMPLOYED' | 'SELF_EMPLOYED';

export interface Region {
  sido: string;
  sigungu: string;
}

/** §5.1 — 온보딩에서 확정, 세션 내내 불변. 대화로 바뀌지 않는다. */
export interface Profile {
  track: Track;
  language: Language;
  visaStatus: string;
  region: Region;
  gender: Gender | null;
  birthYear: number | null;
  childBirthDate: string | null;
  childNationality: string | null;
  householdSize: number | null;
  incomeBand: IncomeBand | null;
  employmentStatus: EmploymentStatus | null;
  injuryDate: string | null;
}

/** PROTECTED — 신청서 단계에서만 입력하며 AI 경로에 실리지 않는다. */
export interface Identity {
  name: string;
}

export type ConditionStatus = 'LIKELY' | 'NEED_INFO' | 'BLOCKED';

/** AI 대화 턴마다 상태가 다시 계산되는 사이드바 후보. */
export interface Candidate {
  programId: string;
  /**
   * Display name. Spring sends this on both the `skeleton` and `results`
   * events; the sidebar used to drop it and re-fetch one `GET /programs/{id}`
   * per visible row just to get the name back.
   */
  name: LocalizedText;
  baseScore: number;
  conditionStatus: ConditionStatus;
  missingSlots: string[];
}

export interface RankingEntry {
  programId: string;
  score: number;
}

export interface ViewFilter {
  benefitType?: string;
  level?: string;
  [key: string]: string | undefined;
}

export type SortBy = 'relevance';

/** 후보와 함께 한 턴 단위로 교체되는 사이드바 표시 상태. */
export interface SidebarView {
  ranking: RankingEntry[];
  viewFilter: ViewFilter;
  sortBy: SortBy;
  visibleCount: number;
}

export type MessageRole = 'user' | 'assistant' | 'system';

/** 이중 언어 텍스트 — AI 응답은 항상 이 타입, 사용자 발화는 순수 string. */
export interface LocalizedText {
  ko: string;
  user: string;
}

export type ChatIntent = 'QUESTION' | 'FILTER' | 'BOTH';

export interface QuickReply {
  value: string;
  label: LocalizedText;
}

export interface UserMessage {
  seq: number;
  role: 'user';
  text: string;
  createdAt: string;
}

export interface AssistantMessage {
  seq: number;
  role: 'assistant';
  text: LocalizedText;
  createdAt: string;
  intent: ChatIntent;
  citedPrograms: string[];
}

export interface SystemMessage {
  seq: number;
  role: 'system';
  text: LocalizedText;
  createdAt: string;
  errorCode: string;
}

export type Message = UserMessage | AssistantMessage | SystemMessage;

export type VerdictStatus = 'ELIGIBLE' | 'NEEDS_CHECK' | 'NOT_ELIGIBLE';

export interface UnmetCondition {
  condition: LocalizedText;
  userValue: string;
  status: 'MET' | 'UNMET' | 'UNKNOWN';
}

export type ApplicationChannel = 'VISIT' | 'ONLINE' | 'MAIL';

/** §5.5 — 항목 선택(사이드바 탭) 시 1건만 판정. */
export interface ProgramVerdict {
  programId: string;
  verdict: VerdictStatus;
  confidence: number;
  reason: LocalizedText;
  unmetConditions: UnmetCondition[];
  benefit: LocalizedText;
  evidence: {
    sourceSnippet: string;
    sourceUrl: string;
    lastVerified: string;
  };
  applicationChannel: ApplicationChannel;
  applicationOrg: string;
  formId: string;
  formCheckbox: string;
  deadline: string;
  judgedAt: string;
}

/** §7.6 `GET /programs/{pid}` 응답 — 제도 상세 화면. */
export interface ProgramDetail {
  name: LocalizedText;
  summary: LocalizedText;
  benefit: LocalizedText;
  conditionsText: LocalizedText[];
  evidence: {
    sourceSnippet: string;
    sourceUrl: string;
    lastVerified: string;
  };
  applicationChannel: ApplicationChannel;
  applicationOrg: LocalizedText;
  requiredDocuments: LocalizedText[];
  deadline: string;
}

export type ApplicationFieldStatus =
  | 'FILLED'
  | 'UNVERIFIED'
  | 'MISSING'
  | 'PROTECTED'
  | 'PROTECTED_PREFILLED';

export type ApplicationFieldType = 'text' | 'checkbox' | 'date';

export interface ApplicationField {
  value: string | null;
  status: ApplicationFieldStatus;
  sourceSlot?: string;
  note?: LocalizedText;
}

export type FieldMap = Record<string, ApplicationField>;
export type FieldLabelMap = Record<string, LocalizedText>;

/** §5.7 FormMap — 서식 좌표 맵. 프론트는 `type`만 폼 렌더링에 쓴다. */
export interface FormFieldSpec {
  key: string;
  label: string;
  type: ApplicationFieldType;
  protected: boolean;
  page: number;
  x: number;
  y: number;
  size: number;
  maxWidth?: number;
}

export interface CheckedProgram {
  programId: string;
  formCheckbox: string;
  /** Display name in the session language. Falls back to the record id. */
  name: LocalizedText;
}

/** §7.7 / §7.8 — 신청서 생성 및 조회 응답. */
export interface Application {
  applicationId: string;
  formId: string;
  formTitle: LocalizedText;
  checkedPrograms: CheckedProgram[];
  fields: FieldMap;
  fieldLabels: FieldLabelMap;
  /** Ordered scanned-form preview pages. One URL per page. */
  previewImages?: string[];
}

export interface Funnel {
  total: number;
  afterTrack: number;
  afterFilter: number;
  returned: number;
}

/** §7.1 `POST /sessions` 응답. */
export interface CreateSessionResponse {
  sessionId: string;
  token: string;
  expiresIn: number;
  greeting: LocalizedText;
  candidates: Candidate[];
  funnel: Funnel;
}

/** §7.2 `GET /sessions/{sid}` 응답 — 새로고침·복귀 복원. */
export interface SessionSnapshot {
  profile: Profile;
  track: Track;
  candidates: Candidate[];
  view: SidebarView;
  messages: Message[];
  lastSeq: number;
  latestApplicationId: string | null;
  /** Backend assessment lifecycle; used to resume polling after a refresh. */
  assessmentStatus?: string;
}

/** §4 SSE 이벤트 페이로드. */
export interface SseTokenData {
  text: string;
}
export interface SseAnswerData {
  text: LocalizedText;
  citedPrograms: string[];
}
export interface SseSidebarData {
  ranking: RankingEntry[];
  viewFilter: ViewFilter;
  visibleCount: number;
  candidates: Candidate[];
}
export interface SseResultsData {
  candidates: Candidate[];
}
export interface SseDoneData {
  quickReplies: QuickReply[];
}
export interface SseErrorData {
  code: string;
  message: string;
}

export interface SendMessagePayload {
  utterance?: string;
  quickReplyValue?: string;
}

export interface ApiError {
  code: string;
  message: string;
  status?: number;
}
