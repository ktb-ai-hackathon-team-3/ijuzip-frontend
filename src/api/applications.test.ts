import { describe, expect, it } from 'vitest';

import { filenameFromContentDisposition } from './applications';

/**
 * The header strings here are copied from what the backend actually emits
 * (`ContentDisposition.attachment().filename(name, UTF_8)`), not invented.
 * The two repositories ship separately, so this is where the contract is kept
 * honest from our side.
 */
describe('filenameFromContentDisposition', () => {
  const SPRING_HEADER =
    'attachment; filename="_____ ____ ___.pdf"; ' +
    "filename*=UTF-8''%EC%B6%9C%EC%82%B0%EC%84%9C%EB%B9%84%EC%8A%A4%20" +
    '%ED%86%B5%ED%95%A9%EC%B2%98%EB%A6%AC%20%EC%8B%A0%EC%B2%AD%EC%84%9C.pdf';

  it('takes the Korean name from filename*, not the underscored ASCII fallback', () => {
    expect(filenameFromContentDisposition(SPRING_HEADER)).toBe('출산서비스 통합처리 신청서.pdf');
  });

  it('accepts the charset token case-insensitively', () => {
    expect(filenameFromContentDisposition("attachment; filename*=utf-8''%ED%95%9C.pdf")).toBe(
      '한.pdf',
    );
  });

  it('falls back to filename= when there is no extended form', () => {
    expect(filenameFromContentDisposition('attachment; filename="report.pdf"')).toBe('report.pdf');
  });

  /** Without the `;` guard the capture ran on into `; filename*=…`. */
  it('does not swallow the extended parameter after an unquoted filename', () => {
    expect(
      filenameFromContentDisposition("attachment; filename=plain.pdf; filename*=UTF-8''%ED%95%9C.pdf"),
    ).toBe('한.pdf');
  });

  /** A literal `%` in the name makes decodeURIComponent throw. */
  it('survives malformed percent-encoding by using the ASCII form', () => {
    expect(filenameFromContentDisposition('attachment; filename="ok.pdf"; filename*=UTF-8\'\'%ZZ')).toBe(
      'ok.pdf',
    );
  });

  it('has a name to fall back on when the header is missing', () => {
    expect(filenameFromContentDisposition(null)).toBe('application.pdf');
  });
});
