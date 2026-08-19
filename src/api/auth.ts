export { onSessionExpired } from './client';

/**
 * §2 of apicontract.md: opaque bearer token, kept in sessionStorage only
 * (never localStorage, never the URL). sessionStore owns persistence;
 * this module only re-exports the 401 subscription so components don't
 * need to know it lives in client.ts.
 */
