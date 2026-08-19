import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * PROTECTED field form (§7.9 PATCH /applications/{appId}/fields).
 * Field *keys* are dynamic — they come from the application's `fields` map,
 * not from a fixed shape — because different forms (birth-integrated vs
 * labor-injury) protect different keys. Built as a factory so every
 * protected key gets a translated "required" message.
 */
export function createProtectedFieldsSchema(t: TFunction, protectedKeys: string[]) {
  const shape: Record<string, z.ZodString> = {};
  for (const key of protectedKeys) {
    shape[key] = z.string().min(1, t('validation.required'));
  }
  return z.object(shape);
}

export type ProtectedFieldsValues = Record<string, string>;
