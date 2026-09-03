# Changelog

All notable changes to **2FA Vault** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
