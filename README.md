# 2FA Vault

A self-hosted 2FA (TOTP/HOTP) manager that runs entirely on Netlify. No third-party services, no env-var secrets — your password is the master key.

**Live:** https://2fa-netlify-app.netlify.app

## Features

- Zero-knowledge: secrets are encrypted with a key derived from your password (PBKDF2 + AES-256-GCM)
- QR upload, `otpauth://` paste, or manual entry
- Live TOTP codes with countdown
- TOTP and HOTP support (SHA1/256/512, 6/7/8 digits)
- Single-user (intentional design choice)

## Architecture

- **Frontend:** React + Vite (static SPA)
- **Backend:** Netlify Functions (Node, esbuild)
- **Storage:** Netlify Blobs (encrypted at rest)
- **Crypto:** PBKDF2 (310k iterations, SHA-256) → vault key → AES-256-GCM per secret

## Security model

1. On first login, your password creates the vault: PBKDF2 → KEK → wraps a random 32-byte vault key → bcrypt hash stored for verification
2. On every login, the wrapped vault key is unwrapped and re-wrapped (protects against offline attacks on stale blobs)
3. The unwrapped vault key is AES-encrypted with a key derived from `SESSION_SECRET` and embedded in the JWT session cookie
4. Each authenticated request decrypts the vault key from the JWT to encrypt/decrypt account secrets
5. All account secrets are AES-256-GCM encrypted with random 12-byte IVs before storage

**No env vars hold secrets.** `SESSION_SECRET` is the only required env var (it protects the session JWT and the in-cookie vault key wrapping).

## Setup

### 1. Netlify env var

Set in Netlify dashboard → Site settings → Environment variables:

```
SESSION_SECRET=<64 hex characters, e.g. from: openssl rand -hex 32>
```

That's the only required variable. The vault initializes itself on first login.

### 2. Deploy

Pushes to `main` auto-deploy. The site at `2fa-netlify-app.netlify.app` will update within ~1 minute.

### 3. First login

1. Visit the site
2. Enter a password (8+ characters) — **this becomes the master key**
3. Vault is created, JWT issued, redirect to dashboard
4. Add accounts via QR upload, URI paste, or manual entry

## Local development

```bash
npm install
export SESSION_SECRET=$(openssl rand -hex 32)
npx netlify dev
```

The app runs at `http://localhost:8888` with functions proxied from `/api/*`.

## Project structure

```
netlify.toml              # Build + function config + SPA redirect
netlify/functions/
  login.js                # Auth + auto-init vault
  logout.js
  accounts.js             # GET/POST/DELETE accounts
  totp.js                 # Generate current code
  qr-parse.js             # Parse QR image or otpauth URI
  lib/crypto.js           # PBKDF2 + AES-GCM primitives
  lib/store.js            # Netlify Blobs wrappers
  lib/auth.js             # JWT + cookie + session vault-key wrap
src/
  App.jsx
  main.jsx
  pages/Login.jsx
  pages/Dashboard.jsx
  components/AccountCard.jsx
  components/AddAccount.jsx
  components/Countdown.jsx
  lib/api.js
  styles.css
```

## Trade-offs (intentional)

- **Lost password = lost vault.** The wrapped key cannot be recovered. Back up by exporting periodically (future feature).
- **Single-user only.** Multi-user would need per-user key wrapping.
- **Blobs pricing.** Free tier: 1GB storage, 10M requests/month — plenty for a personal vault.

## Future ideas

- Encrypted export/import
- Password change endpoint
- Search/filter accounts
- Folder/tag organization
- Auto-refresh TOTP codes in dashboard
