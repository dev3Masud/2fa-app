# Contributing to 2FA Vault

First off, thank you for considering contributing to **2FA Vault**! 🎉

This document provides guidelines and instructions for contributing to this project. Following these guidelines helps maintain a clean, secure, and productive codebase for everyone.

---

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior.

---

## How Can I Contribute?

### 1. Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When opening an issue, include:
* A clear, descriptive title.
* Steps to reproduce the behavior.
* Expected vs actual behavior.
* Browser, OS version, and Node.js version.
* Screenshots or console logs if applicable (⚠️ **never expose your secrets or master keys!**).

### 2. Suggesting Enhancements

Feature requests and improvements are welcome! Please open an issue outlining:
* The problem your enhancement solves.
* A clear and concise description of your proposed solution.
* Alternative approaches considered.

### 3. Pull Requests

1. **Fork the repo** and create your branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run development server**:
   ```bash
   npm run dev
   ```
4. **Make your changes** cleanly:
   * Keep changes focused on a single topic.
   * Do not commit secrets, `.env` files, or production keys.
5. **Run tests & verification**:
   ```bash
   npm run lint
   npm run build
   ```
6. **Commit with descriptive messages**:
   * Use conventional commit format: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `refactor: ...`.
7. **Push to your fork** and submit a Pull Request.

---

## Development Setup

### Prerequisites
* **Node.js** 20.x or 24.x
* **npm** 10+
* A free [Supabase](https://supabase.com) project for PostgreSQL database storage.

### Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```
Fill in the required variables:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_USER=your_admin_username
ADMIN_PASS=your_strong_master_password_at_least_16_chars
SESSION_SECRET=a_random_64_char_hex_string
PORT=3001
```

Run database migrations:
* Copy the schema from `supabase-schema.sql` and run it in the Supabase SQL Editor.

### Starting the App
```bash
npm run dev
```
* Client runs on: `http://localhost:5173`
* Server runs on: `http://localhost:3001` (Vite proxies `/api` to Express)

---

## Security Considerations

Because this project manages sensitive Two-Factor Authentication secrets:
* Zero-knowledge architecture must be preserved: secrets are encrypted with the user's master key before storage.
* Never log plaintext TOTP secrets, passwords, or decrypted data in console or server logs.
* For security vulnerabilities, please refer to our [Security Policy](SECURITY.md).
