# 2FA Vault 🔒

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Demo-2fa--app--five.vercel.app-6366f1?logo=vercel)](https://2fa-app-five.vercel.app)
[![Node Version](https://img.shields.io/badge/node-24.x-green.svg)](package.json)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Security Policy](https://img.shields.io/badge/Security-AES--256--GCM-red.svg)](SECURITY.md)

A modern, self-hosted, zero-knowledge 2FA (TOTP/HOTP) authenticator vault built with Node.js + Express + React + Supabase. Your master password is the only key capable of decrypting your secrets.

---

## ✨ Features

- **Zero-Knowledge Encryption** — Secrets encrypted client/server-side using PBKDF2 (310,000 iterations) + AES-256-GCM before reaching the database.
- **Custom Groups & Categories** — Organize accounts into custom groups (e.g. Work, Personal, Crypto) with inline creation and collapse/expand sections.
- **Icon Library & Brand Detection** — Built-in logo picker with 70+ popular service logos and automatic brand detection from issuer names.
- **2-Step Safe Deletion** — Safeguard against accidental deletion with a two-step confirmation modal and `SUDO DELETE` command verification.
- **Live TOTP & Countdown Timer** — Epoch-synchronized precision countdown with automated rollover code generation.
- **Flexible Algorithm Support** — Full support for both TOTP (RFC 6238) and HOTP (RFC 4226) with SHA1, SHA256, SHA512, and 6/7/8 digit codes.
- **Fast Search & Instant Filter** — Instant fuzzy filtering by account label, issuer, or category with `/` keyboard shortcut.
- **QR Code Scanner** — Client-side instant camera/image QR scanning, drag-and-drop screenshots, and `otpauth://` URI parsing.
- **Vercel Analytics & Speed Insights** — Integrated web vitals and real-time usage performance analytics.
- **Database Storage in Supabase Postgres** — Encrypted at rest; service role authorization ensures no public table exposure.
- **Single-Node Stack** — Express API + React SPA seamlessly unified in a single repository.

## Security hardening (built-in)

- **Helmet** sets secure HTTP headers (CSP, HSTS, frame options, etc.)
- **Rate limiting** on login: 5 failed attempts per 15 minutes per IP
- **Body size limit** of 2 MB on all requests
- **2 MB cap** on QR image data URIs
- **UUID format validation** on account IDs
- **HKDF** for the session-key derivation
- **Async PBKDF2** (non-blocking event loop)
- **bcrypt** (cost 12) for password storage
- **AES-256-GCM** with random 12-byte IVs for all secrets
- **HttpOnly + Secure + SameSite=Strict** session cookies

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  React + Vite SPA   (built to /dist)                 │
│  Served by Express as static files in production    │
└──────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│  Express server (server/index.js)                    │
│  ├─ /api/login         (rate-limited)                │
│  ├─ /api/logout                                      │
│  ├─ /api/accounts     (GET / POST / DELETE /:id)     │
│  ├─ /api/totp/:id                                    │
│  ├─ /api/qr-parse                                    │
│  └─ /api/mode                                        │
└──────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────┐
│  Supabase Postgres (RLS enabled)                     │
│  ├─ users     (bcrypt hash, wrapped vault key)       │
│  └─ accounts  (encrypted TOTP secrets + metadata)    │
└──────────────────────────────────────────────────────┘
```

## Security model

1. On first login, the `ADMIN_USER` / `ADMIN_PASS` create a user row in Supabase:
   - Password is bcrypt-hashed and stored
   - A random 32-byte vault key is generated
   - PBKDF2(password) → KEK → wraps vault key → stored alongside user row
2. On every login, the wrapped vault key is unwrapped and re-wrapped
3. The unwrapped vault key is AES-encrypted with HKDF(`SESSION_SECRET`) and embedded in the JWT session cookie
4. Each authenticated request decrypts the vault key from the JWT to encrypt/decrypt account secrets
5. All account secrets are AES-256-GCM encrypted with random 12-byte IVs before storage
6. **Supabase RLS is enabled** — only the service-role key (used in the Express server) can read/write

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

### 4. Local development

```bash
git clone <this-repo>
cd 2fa-app
npm install

cp .env.example .env
# Edit .env and fill in:
#   SESSION_SECRET        (openssl rand -hex 32)
#   ADMIN_USER            (your username)
#   ADMIN_PASS            (your password, 16+ chars)
#   SUPABASE_URL          (from step 3)
#   SUPABASE_SERVICE_ROLE_KEY  (from step 3)

npm run dev
```

This runs **two processes concurrently**:
- Vite dev server on `http://localhost:3000` (with HMR for the React app)
- Express API server on `http://localhost:3001` (with `--watch` for auto-reload)

Vite proxies `/api/*` requests to the Express server, so you only ever visit `localhost:3000` in your browser.

### 5. Production build

```bash
npm run build   # builds React app to dist/
npm start       # starts Express server with NODE_ENV=production
```

In production, Express serves the built React app from `dist/` and handles all `/api/*` routes on a single port (default 3001, configurable with `PORT`).

### 6. Deploy anywhere

The Express server is a standard Node.js app — deploy to any host that runs Node:

- **Render / Railway / Fly.io**: point at this repo, set env vars, build command `npm run build`, start command `npm start`
- **A VPS**: clone, `npm install`, `npm run build`, `npm start` behind a reverse proxy (nginx/Caddy)
- **Docker**: see the example below

#### Docker (example)

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
```

### 7. Sign in

Visit your deployed URL, sign in with `ADMIN_USER` / `ADMIN_PASS` — the first login creates your user row in Supabase and initializes the vault.

## Project structure

```
server/                    # Express backend
  index.js                 # App entry point (helmet, rate limit, routes, static)
  routes/
    login.js               # POST /api/login
    logout.js              # POST /api/logout
    accounts.js            # GET/POST/DELETE /api/accounts(/:id)
    totp.js                # GET /api/totp/:id
    qr-parse.js            # POST /api/qr-parse
    mode.js                # GET /api/mode
  lib/
    crypto.js              # PBKDF2 + AES-GCM primitives
    supabase.js            # Supabase client + queries
    users.js               # User bootstrap + auth + vault unlock
    auth.js                # JWT + cookie + session vault-key wrap

src/                       # React frontend
  App.jsx
  main.jsx
  pages/Login.jsx
  pages/Dashboard.jsx
  components/AccountCard.jsx
  components/AddAccount.jsx
  components/Countdown.jsx
  lib/api.js
  styles.css

supabase-schema.sql        # Run this in Supabase SQL editor
.env.example               # Copy to .env
vite.config.js             # Vite dev config (proxies /api to :3001)
```

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `SESSION_SECRET` | ✅ | 32+ random chars. `openssl rand -hex 32` |
| `ADMIN_USER` | ✅ | Single admin username |
| `ADMIN_PASS` | ✅ | 16+ characters |
| `SUPABASE_URL` | ✅ | From Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key (NOT anon) |
| `PORT` | optional | Default 3001 |

The app **refuses to start** if any required var is missing or `ADMIN_PASS < 16` chars.

## Trade-offs (intentional)

- **Lost password = lost vault.** The wrapped key cannot be recovered. The data in Supabase is ciphertext that only your password can decrypt.
- **Single-user.** `ADMIN_USER` is the only account. Multi-user would need different table layout.
- **`ADMIN_PASS` is also the encryption key.** Changing it requires re-creating the vault (delete all account rows, then sign in with the new password — but the old ciphertext is unrecoverable).

## 🤝 Community & Contributing

Contributions, issues, and feature requests are welcome!
* Read our [Contributing Guide](CONTRIBUTING.md) to get started.
* Review the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.
* For security disclosures, please consult our [Security Policy](SECURITY.md).
* See [CHANGELOG.md](CHANGELOG.md) for recent release notes and changes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.

