import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * Single onboarding profile form (§5.1 of apicontract.md), covering both
 * tracks at once. There is no explicit track selector (see front_ing.md
 * §2) — the user only fills in whichever of the two track-signal sections
 * (child birth date vs. injury date) matches their situation, and
 * ProfilePage derives `track` from which one carries a value.
 */

const regionSchema = (t: TFunction) =>
  z.object({
    sido: z.string().min(1, t('validation.required')),
    sigungu: z.string().min(1, t('validation.required')),
  });

export function createProfileSchema(t: TFunction) {
  return z
    .object({
      visaStatus: z.string().min(1, t('validation.required')),
      region: regionSchema(t),
      childBirthDate: z.string().optional(),
      childNationality: z.string().optional(),
      employmentStatus: z.string().optional(),
      injuryDate: z.string().optional(),
      householdSize: z.string().optional(),
      incomeBand: z.string().optional(),
    })
    .superRefine((values, ctx) => {
      const hasBirth = !!values.childBirthDate;
      const hasInjury = !!values.injuryDate;

      if (!hasBirth && !hasInjury) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['childBirthDate'], message: t('onboarding.atLeastOne') });
      }
      if (hasBirth && !values.childNationality) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['childNationality'], message: t('validation.required') });
      }
      if (hasInjury && !values.employmentStatus) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['employmentStatus'], message: t('validation.required') });
      }
    });
}

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;
