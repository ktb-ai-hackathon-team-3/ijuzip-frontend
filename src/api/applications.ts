import { apiFetch, apiFetchBlob, USE_MOCK_API } from './client';
import { mockCreateApplication, mockGeneratePdf, mockGetApplication, mockPatchFields } from '../mocks/handlers';
import type { Application, ApplicationField } from './types';
import { applicationFromBackend, patchFromBackend } from './backendAdapters';

/**
 * §7.7 `POST /sessions/{sid}/applications` — N programs → one form.
 * A 400 here means the caller tried to mix programs from different
 * `formId`s; the page must only ever send same-`formId` selections.
 */
export async function createApplication(sid: string, token: string, programIds: string[]): Promise<Application> {
  if (USE_MOCK_API) return mockCreateApplication(sid, token, programIds);
  const data = await apiFetch<unknown>(`/v1/sessions/${sid}/applications`, {
    method: 'POST',
    token,
    body: { recordIds: programIds },
  });
  return applicationFromBackend(data);
}

/** §7.8 `GET /applications/{appId}` — review-screen restore. PROTECTED values come back masked. */
export async function getApplication(appId: string, token: string): Promise<Application> {
  if (USE_MOCK_API) return mockGetApplication(appId, token);
  const data = await apiFetch<unknown>(`/v1/applications/${appId}`, { token });
  return applicationFromBackend(data);
}

export interface PatchFieldsResponse {
  fields: Record<string, ApplicationField>;
  readyForPdf: boolean;
  missingRequired: string[];
}

/**
 * §7.9 `PATCH /applications/{appId}/fields` — the only path PROTECTED
 * values travel on, and it never touches FastAPI (§ principle 4).
 */
export async function patchApplicationFields(
  appId: string,
  token: string,
  fields: Record<string, string>
): Promise<PatchFieldsResponse> {
  if (USE_MOCK_API) return mockPatchFields(appId, token, fields);
  const data = await apiFetch<unknown>(`/v1/applications/${appId}/fields`, {
    method: 'PATCH',
    token,
    body: { fields },
  });
  return patchFromBackend(data);
}

export interface GeneratePdfResult {
  blob: Blob;
  filename: string;
  unverifiedFields: string[];
  /**
   * Fields the backend could not render: the bundled fonts had no glyph for
   * some character, so PDFBox stamped `?` instead of failing the whole render.
   * The paper the user hands over a counter is wrong in a way they cannot see
   * from the download alone, so this has to surface in the UI.
   *
   * Requires `X-Unrenderable-Fields` in the CORS `Access-Control-Expose-Headers`
   * allowlist — without it the browser strips the header and this is always
   * empty even though the server sent it.
   */
  unrenderableFields: string[];
}

function headerList(headers: Headers, name: string): string[] {
  return (headers.get(name) ?? '').split(',').filter(Boolean);
}

const FALLBACK_PDF_NAME = 'application.pdf';

/**
 * Pull the save-as name out of `Content-Disposition`.
 *
 * The Korean name only survives in `filename*=UTF-8''…`. RFC 6266 restricts
 * plain `filename=` to ASCII, so Spring sends an ASCII fallback alongside it
 * with every non-ASCII character replaced by `_` — reading only that yields
 * `_____ ____ ___.pdf` for `출산서비스 통합처리 신청서.pdf`.
 *
 * Browsers apply this precedence themselves, but that does not help us: the
 * endpoint needs an `Authorization` header, so we fetch → blob → `a.download`
 * and **we** are the ones naming the file.
 */
export function filenameFromContentDisposition(headerValue: string | null): string {
  if (!headerValue) return FALLBACK_PDF_NAME;

  const extended = /filename\*=\s*utf-8''([^;]+)/i.exec(headerValue);
  if (extended) {
    try {
      return decodeURIComponent(extended[1]);
    } catch {
      // Malformed percent-encoding: fall through to the ASCII form rather than
      // throwing, which would fail the whole download over a filename.
    }
  }

  // `[^";]` rather than `[^"]`: an unquoted filename must not swallow the
  // `; filename*=…` that follows it.
  const plain = /filename="?([^";]+)"?/.exec(headerValue);
  return plain ? plain[1].trim() : FALLBACK_PDF_NAME;
}

/**
 * §7.10 `POST /applications/{appId}/pdf` — binary PDF response.
 * Never a plain `<a href>` (Authorization header is required); always
 * fetch → blob → `URL.createObjectURL`, revoked by the caller after the
 * download is triggered.
 */
export async function generateApplicationPdf(appId: string, token: string): Promise<GeneratePdfResult> {
  if (USE_MOCK_API) {
    const { blob, unverifiedFields } = await mockGeneratePdf(appId, token);
    return { blob, filename: `application-${appId}.pdf`, unverifiedFields, unrenderableFields: [] };
  }
  const { blob, headers } = await apiFetchBlob(`/v1/applications/${appId}/pdf`, { method: 'POST', token });
  return {
    blob,
    filename: filenameFromContentDisposition(headers.get('Content-Disposition')),
    unverifiedFields: headerList(headers, 'X-Unconfirmed-Fields'),
    unrenderableFields: headerList(headers, 'X-Unrenderable-Fields'),
  };
}
