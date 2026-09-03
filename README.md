# 2FA Vault

A self-hosted 2FA (TOTP/HOTP) manager that runs on Netlify with Supabase for storage. Zero-knowledge encryption: your password is the master key.

**Live:** https://2fa-netlify-app.netlify.app

## Features

- Username + password auth (mandatory `ADMIN_USER` / `ADMIN_PASS` env vars)
- Zero-knowledge: secrets encrypted with a key derived from your password (PBKDF2 + AES-256-GCM)
- Stored in **Supabase Postgres** (encrypted at rest by your key, not theirs)
- QR upload, `otpauth://` paste, or manual entry
- Live TOTP codes with countdown
- TOTP and HOTP support (SHA1/256/512, 6/7/8 digits)
- Single-user design

## Architecture

- **Frontend:** React + Vite (static SPA)
- **Backend:** Netlify Functions (Node, esbuild)
- **Storage:** Supabase Postgres (rows are encrypted client-side with vault key)
- **Crypto:** PBKDF2 (310k iterations, SHA-256) → vault key → AES-256-GCM per secret

## Security model

1. On first login, the `ADMIN_USER` / `ADMIN_PASS` create a user row in Supabase:
   - Password is bcrypt-hashed and stored
   - A random 32-byte vault key is generated
   - PBKDF2(password) → KEK → wraps vault key → stored alongside user row
2. On every login, the wrapped vault key is unwrapped and re-wrapped (protects against offline attacks on stale data)
3. The unwrapped vault key is AES-encrypted with a key derived from `SESSION_SECRET` and embedded in the JWT session cookie
4. Each authenticated request decrypts the vault key from the JWT to encrypt/decrypt account secrets
5. All account secrets are AES-256-GCM encrypted with random 12-byte IVs before storage
6. **Supabase RLS is enabled** — only the service-role key (used in Functions) can read/write; the anon key cannot

## Setup

### 1. Create a free Supabase project

1. Sign up at https://supabase.com (free tier is plenty)
2. Create a new project (any name/region)
3. Wait for it to provision (~1 minute)

### 2. Run the SQL schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of [`supabase-schema.sql`](./supabase-schema.sql) and paste it
4. Click **Run** — this creates the `users` and `accounts` tables with RLS enabled

### 3. Get your Supabase credentials

1. In Supabase, go to **Project Settings** → **API**
2. Copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **service_role** key (NOT the anon key) → this is your `SUPABASE_SERVICE_ROLE_KEY`
   - ⚠️ The service_role key bypasses RLS. Never expose it to the frontend.

### 4. Set Netlify environment variables

In Netlify dashboard → **Site settings** → **Environment variables**, add:

```
SESSION_SECRET=<openssl rand -hex 32>
ADMIN_USER=<your chosen username>
ADMIN_PASS=<your chosen password, 8+ chars>
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
```

**All five are required** — the app will refuse to serve requests if any are missing.

### 5. Deploy

```bash
git push origin main
```

Netlify auto-builds and deploys. Visit the site, sign in with `ADMIN_USER` / `ADMIN_PASS` — the first login creates your user row in Supabase and initializes the vault.

## Local development

```bash
npm install
cp .env.example .env
# fill in SESSION_SECRET, ADMIN_USER, ADMIN_PASS, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npx netlify dev
```

The app runs at `http://localhost:8888` with functions proxied from `/api/*`.

## Project structure

```
netlify.toml              # Build + function config + SPA redirect
netlify/functions/
  login.js                # Auth + bootstrap user
  logout.js
  accounts.js             # GET/POST/DELETE accounts
  totp.js                 # Generate current code
  qr-parse.js             # Parse QR image or otpauth URI
  lib/crypto.js           # PBKDF2 + AES-GCM primitives
  lib/supabase.js         # Supabase client + queries
  lib/users.js            # User bootstrap + auth + vault unlock
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
supabase-schema.sql       # Run this in Supabase SQL editor
.env.example              # Copy to .env
```

## Trade-offs (intentional)

- **Lost password = lost vault.** The wrapped key cannot be recovered. The data in Supabase is ciphertext that only your password can decrypt.
- **Single-user.** `ADMIN_USER` is the only account. Multi-user would need different table layout.
- **`ADMIN_PASS` is also the encryption key.** Changing it requires re-creating the vault (delete all account rows, then sign in with the new password — but the old ciphertext is unrecoverable).

## Future ideas

- Encrypted export/import
- Auto-refresh TOTP codes in dashboard
- Multiple users
- Search/filter accounts
