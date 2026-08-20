import { z } from 'zod';
import type { TFunction } from 'i18next';

/** Minimal onboarding profile used by the track-free session contract. */

const regionSchema = (t: TFunction) =>
  z.object({
    sido: z.string().min(1, t('validation.required')),
    sigungu: z.string().min(1, t('validation.required')),
  });

export function createProfileSchema(t: TFunction) {
  return z.object({
    visaStatus: z.string().min(1, t('validation.required')),
    region: regionSchema(t),
    hasChildren: z.string().optional(),
  }).superRefine((values, ctx) => {
    if (values.visaStatus === 'F-6' && !values.hasChildren) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['hasChildren'], message: t('validation.required') });
    }
  });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;
