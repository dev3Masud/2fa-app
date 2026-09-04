# Security Policy

The security of **2FA Vault** and the privacy of your authentication secrets is our highest priority.

---

## Supported Versions

We release security updates and bug fixes for the latest release on the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |

---

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please **DO NOT** open a public issue or discussion. Public disclosure puts all users at risk.

Instead, report vulnerabilities privately:
1. **GitHub Security Advisory**: Go to the **Security** tab of this repository and click **"Report a vulnerability"** to submit a private advisory.
2. Alternatively, contact the repository maintainer directly via GitHub profile.

### What to include in your report:
* Type of vulnerability (e.g. crypto flaw, authentication bypass, XSS, injection, dependency vulnerability).
* Step-by-step instructions to reproduce the issue.
* Proof-of-concept (PoC) code or script if possible.
* Impact of the issue and potential remediation steps.

### Response Timeline
* **Initial Acknowledgement**: Within 48 hours.
* **Triage & Assessment**: Within 5 business days.
* **Fix & Release**: Coordinated disclosure once a patch is verified and deployed.

---

## Security Architecture & Guarantees

2FA Vault is built with defense-in-depth principles:

* **Zero-Knowledge Encryption**: Secrets are encrypted at rest with AES-256-GCM using a 32-byte key derived from the master password (PBKDF2 with SHA-256, 310,000 iterations).
* **Supabase Isolation**: The database only stores encrypted ciphertexts, IVs, and authentication tags. Even with full database access, secrets cannot be decrypted without the user's master password.
* **Session Security**: Session tokens are signed using HS256, transmitted exclusively over HTTPS (`SameSite=Strict`, `HttpOnly`, `Secure` cookies). Vault key is bound to the session and AES-256-GCM-wrapped using an HKDF-derived key.
* **CSRF Protection**: Double-submit-cookie CSRF tokens are required on every state-changing request. Tokens are tied to the session and validated with constant-time comparison.
* **Rate Limiting**: Express rate limiting mitigates brute-force authentication attacks on all `/api/login` endpoints, plus per-endpoint throttling on write operations.
* **HTTP Hardening**: Helmet sets security headers (`Content-Security-Policy`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`).
* **Input Validation**: All UUIDs are format-validated, request bodies are size-limited (2 MB), and user-supplied strings are sanitized against control characters and oversized payloads.
* **Information Leak Prevention**: Internal error messages and Supabase errors are not exposed to clients; admin user existence is not disclosed via the public `/api/mode` endpoint.
* **Constant-Time Login**: A dummy bcrypt comparison is performed for unknown usernames to equalize login response times.
