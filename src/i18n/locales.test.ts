import { describe, expect, it } from 'vitest';
import ko from './locales/ko.json';
import vi from './locales/vi.json';
import km from './locales/km.json';
import en from './locales/en.json';
import { VISA_OPTIONS } from './optionData';

function leafPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe('locale completeness', () => {
  it('keeps every user-facing translation key in all four languages', () => {
    const expected = leafPaths(ko).sort();
    for (const locale of [vi, km, en]) expect(leafPaths(locale).sort()).toEqual(expected);
  });

  it('provides a localized description for every visa option', () => {
    for (const locale of [ko, vi, km, en] as any[]) {
      for (const visa of VISA_OPTIONS) {
        expect(locale.onboarding.visaHelp.visas[visa.code]).toBeTruthy();
      }
    }
  });
});
