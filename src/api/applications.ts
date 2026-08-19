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

function filenameFromContentDisposition(headerValue: string | null): string {
  if (!headerValue) return 'application.pdf';
  const match = /filename="?([^"]+)"?/.exec(headerValue);
  return match ? decodeURIComponent(match[1]) : 'application.pdf';
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
