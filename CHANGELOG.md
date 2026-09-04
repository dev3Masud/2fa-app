# Changelog

All notable changes to **2FA Vault** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.2] - 2026-09-04

### Fixed
* **CSRF false-positive "CSRF token missing or invalid" on Vercel deployments.** The `2fa_csrf` cookie was set with `SameSite=Strict` and was silently dropped by some browsers / Vercel preview-URL redirects right after login, leaving the client with no token to echo back. Three layers of defense are now in place:
  * The CSRF cookie now uses `SameSite=Lax` (CSRF protection still holds — the security property is that the header is not auto-sent cross-site, not the cookie itself).
  * `Secure` is now also added whenever `VERCEL=1`, since Vercel does not set `NODE_ENV=production` by default.
  * The client now caches the CSRF token in memory (primed from the login response body) and, on any 403 CSRF error, transparently calls the new `GET /api/csrf` endpoint to re-issue a fresh token and retries the original request once.

### Added
* `GET /api/csrf` — issues a fresh `2fa_csrf` cookie + returns the token in the JSON body. Requires an authenticated session but is exempt from the CSRF check (no chicken-and-egg).
* **Drag-to-reorder for both custom groups and 2FA accounts inside a group.** Drag the grip handle (visible on hover) on any group header or account row to rearrange; the new order is persisted to the database immediately and also cached in `localStorage` so it survives a reload. Powered by a small dependency-free `useDragReorder` hook with native HTML5 drag-and-drop.
  * `PATCH /api/accounts/reorder` and `PATCH /api/groups/reorder` accept a full ordered `orderedIds` array, validate ownership, then assign evenly-spaced `double precision` positions in a single batch.
  * `public.accounts` and `public.groups` gain a `position double precision` column; new listings order by `position` then `created_at`. The SQL migration is idempotent (`add column if not exists`) so existing databases upgrade in place.
* New tests in `tests/auth.test.js` covering `SameSite=Lax`, Vercel-only (`VERCEL=1`, no `NODE_ENV`) cookie hardening, and the session-cookie attributes.
* New `tests/reorder.test.js` covering the pure `reorderArray` helper (no mutation, no-op on same id, custom `getId`) and the server-side `reorderAccountsByUser` / `reorderGroupsByUser` validation paths.

---

## [2.0.1] - 2026-09-04

### Security
* **CSRF protection**: Double-submit-cookie pattern now required for every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`). Token is constant-time compared and tied to the session.
* **CORS**: Optional `ALLOWED_ORIGINS` env var. By default only same-origin requests are accepted; cross-origin browser requests are rejected.
* **Rate limiting**: Per-endpoint write throttling (`/api/accounts`, `/api/qr-parse`, `/api/groups`) in addition to the existing login limiter.
* **Constant-time login**: Dummy `bcrypt.compare` is now performed for unknown usernames to equalize response time and prevent user enumeration.
* **Information leak fix**: `/api/mode` no longer discloses whether a user row has been created.
* **HSTS** is now set in production (1 year, `includeSubDomains`, `preload`).
* **Input validation**: Strict per-field validation for `/api/qr-parse` (URI cap, secret character class), `/api/totp` (counter range & type), and group IDs (slug format). All control characters and oversized payloads are stripped.
* **Logo URL sanitization**: Custom logos must be a known brand key, an `https://` URL, or a `data:image/*` URI under 64 KB.
* **Error messages**: Supabase / internal errors are logged server-side but never returned to clients.
* **`X-Powered-By` header removed** via `app.disable('x-powered-by')` and Helmet's `hidePoweredBy`.
* **Static file cache headers**: hashed assets get 1-year immutable cache, `index.html` is forced no-cache.
* **Request timeouts**: Frontend now aborts requests after 15s to avoid stuck UI states.

### Fixed
* `App.jsx`: the auth probe previously treated any non-401 response as authenticated; this is now strict.
* `Dashboard.jsx`: `handleRenameGroup` now propagates the new logo to the server; code-refresh tick no longer races on multiple in-flight refreshes.
* `groupsStorage.js`: `deleteGroup` no longer passes a client-supplied `oldName`; the server resolves the canonical name from the DB.
* `parseOtpAuth` now strictly validates the otpauth URL protocol, host, and base32 character set.

### Added
* `tests/crypto.test.js` and `tests/auth.test.js` — node:test suite covering the crypto primitives and CSRF middleware.
* `npm test` script.

---

## [2.0.0] - 2026-09-04

### Added
* **Custom Groups & Categories**: Create, rename, delete custom groups and organize 2FA accounts dynamically.
* **Inline Group Management**: Direct "+ Create New Group" modal trigger within both Add and Edit modals.
* **Redesigned 2-Step Deletion**: Glassmorphic confirmation modal with monospace command input (`SUDO DELETE`), live validation ring, and clean SVG icons.
* **Brand Icon Library**: Built-in picker supporting 70+ popular service logos with auto-detection from issuer names.
* **Vercel Analytics & Speed Insights**: Integrated real-time monitoring and web vitals tracking.
* **Precision Countdown Timer**: Epoch-synchronized countdown indicators with auto-refresh on code rollover.
* **HOTP & TOTP Support**: RFC 6238 and RFC 4226 support with configurable digits (6, 7, 8) and periods (15s to 60s).
* **SVG Favicon**: Scalable vector brand favicon with security shield and keyhole glyph.
* **Community Health Standards**: Added `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue templates, and PR template.

### Fixed
* Fixed group persistence bug where accounts defaulted to `General` and could not be changed or cleared.
* Fixed stale form states in `EditAccountModal` upon reopening.
* Fixed server serializer to properly preserve user-selected groups.
* Removed hardcoded fallback defaults that overwrote client metadata.

### Security
* PBKDF2 iteration hardening (310,000 iterations).
* AES-256-GCM zero-knowledge encryption for TOTP secrets.
* HttpOnly, Secure, SameSite=Strict cookie session management.
* Strict rate limiting on authentication routes.

---

## [1.0.0] - 2026-08-15

### Added
* Initial release of 2FA Vault.
* Node.js + Express backend with Supabase Postgres storage.
* React single-page frontend.
* QR code scanning and manual entry.
* Single-user authentication model.
