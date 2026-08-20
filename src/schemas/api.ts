import { z } from 'zod';

/**
 * Runtime validation for responses crossing the Spring boundary.
 * Mirrors api/types.ts — keep both in sync when the contract changes.
 * Only top-level network responses are validated here; deeply nested
 * shapes are trusted once their parent has been parsed.
 */

export const localizedTextSchema = z.object({
  ko: z.string(),
  user: z.string(),
});

export const regionSchema = z.object({
  sido: z.string(),
  sigungu: z.string(),
});

export const profileSchema = z.object({
  track: z.enum(['BIRTH_CARE', 'LABOR_INJURY']),
  language: z.enum(['ko', 'vi', 'km', 'en']),
  visaStatus: z.string(),
  region: regionSchema,
  gender: z.enum(['F', 'M']).nullable(),
  birthYear: z.number().nullable(),
  childBirthDate: z.string().nullable(),
  childNationality: z.string().nullable(),
  householdSize: z.number().nullable(),
  incomeBand: z.enum(['M_0_100', 'M_100_150', 'M_150_200', 'M_200_300', 'M_300_PLUS']).nullable(),
  employmentStatus: z.enum(['EMPLOYED', 'UNEMPLOYED', 'SELF_EMPLOYED']).nullable(),
  injuryDate: z.string().nullable(),
});

export const candidateSchema = z.object({
  programId: z.string(),
  name: localizedTextSchema,
  baseScore: z.number(),
  conditionStatus: z.enum(['LIKELY', 'NEED_INFO', 'BLOCKED']),
  missingSlots: z.array(z.string()),
});

export const funnelSchema = z.object({
  total: z.number(),
  afterTrack: z.number(),
  afterFilter: z.number(),
  returned: z.number(),
});

export const createSessionResponseSchema = z.object({
  sessionId: z.string(),
  token: z.string(),
  expiresIn: z.number(),
  greeting: localizedTextSchema,
  candidates: z.array(candidateSchema),
  funnel: funnelSchema,
});

export const rankingEntrySchema = z.object({
  programId: z.string(),
  score: z.number(),
});

export const sidebarViewSchema = z.object({
  ranking: z.array(rankingEntrySchema),
  viewFilter: z.record(z.string(), z.string().optional()),
  sortBy: z.literal('relevance'),
  visibleCount: z.number(),
});

const baseMessageSchema = z.object({ seq: z.number(), createdAt: z.string() });

export const messageSchema = z.union([
  baseMessageSchema.extend({ role: z.literal('user'), text: z.string() }),
  baseMessageSchema.extend({
    role: z.literal('assistant'),
    text: localizedTextSchema,
    intent: z.enum(['QUESTION', 'FILTER', 'BOTH']),
    citedPrograms: z.array(z.string()),
  }),
  baseMessageSchema.extend({
    role: z.literal('system'),
    text: localizedTextSchema,
    errorCode: z.string(),
  }),
]);

export const sessionSnapshotSchema = z.object({
  profile: profileSchema,
  track: z.enum(['BIRTH_CARE', 'LABOR_INJURY']),
  candidates: z.array(candidateSchema),
  view: sidebarViewSchema,
  messages: z.array(messageSchema),
  lastSeq: z.number(),
  latestApplicationId: z.string().nullable(),
});

export const programVerdictSchema = z.object({
  programId: z.string(),
  verdict: z.enum(['ELIGIBLE', 'NEEDS_CHECK', 'NOT_ELIGIBLE']),
  confidence: z.number(),
  reason: localizedTextSchema,
  unmetConditions: z.array(
    z.object({
      condition: localizedTextSchema,
      userValue: z.string(),
      status: z.enum(['MET', 'UNMET', 'UNKNOWN']),
    })
  ),
  benefit: localizedTextSchema,
  evidence: z.object({
    sourceSnippet: z.string(),
    sourceUrl: z.string(),
    lastVerified: z.string(),
  }),
  applicationChannel: z.enum(['VISIT', 'ONLINE', 'MAIL']),
  applicationOrg: z.string(),
  formId: z.string(),
  formCheckbox: z.string(),
  deadline: z.string(),
  judgedAt: z.string(),
});

export const programDetailSchema = z.object({
  name: localizedTextSchema,
  summary: localizedTextSchema,
  benefit: localizedTextSchema,
  conditionsText: z.array(localizedTextSchema),
  evidence: z.object({
    sourceSnippet: z.string(),
    sourceUrl: z.string(),
    lastVerified: z.string(),
  }),
  applicationChannel: z.enum(['VISIT', 'ONLINE', 'MAIL']),
  applicationOrg: localizedTextSchema,
  requiredDocuments: z.array(localizedTextSchema),
  deadline: z.string(),
});

export const applicationFieldSchema = z.object({
  value: z.string().nullable(),
  status: z.enum(['FILLED', 'UNVERIFIED', 'MISSING', 'PROTECTED', 'PROTECTED_PREFILLED']),
  sourceSlot: z.string().optional(),
  note: localizedTextSchema.optional(),
});

export const applicationSchema = z.object({
  applicationId: z.string(),
  formId: z.string(),
  formTitle: localizedTextSchema,
  checkedPrograms: z.array(z.object({ programId: z.string(), formCheckbox: z.string() })),
  fields: z.record(z.string(), applicationFieldSchema),
  fieldLabels: z.record(z.string(), localizedTextSchema),
});

export const patchFieldsResponseSchema = z.object({
  fields: z.record(z.string(), applicationFieldSchema),
  readyForPdf: z.boolean(),
  missingRequired: z.array(z.string()),
});

export const candidatesResponseSchema = z.object({
  candidates: z.array(candidateSchema),
  view: sidebarViewSchema,
});

export const sseTokenDataSchema = z.object({ text: z.string() });
export const sseAnswerDataSchema = z.object({
  text: localizedTextSchema,
  citedPrograms: z.array(z.string()),
});
export const sseSidebarDataSchema = z.object({
  ranking: z.array(rankingEntrySchema),
  viewFilter: z.record(z.string(), z.string().optional()),
  visibleCount: z.number(),
  candidates: z.array(candidateSchema),
});
export const sseDoneDataSchema = z.object({
  quickReplies: z.array(
    z.object({ value: z.string(), label: localizedTextSchema })
  ),
});
export const sseErrorDataSchema = z.object({ code: z.string(), message: z.string() });
