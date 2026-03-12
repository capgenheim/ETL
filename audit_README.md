# ETL Platform — Security Audit Report

> **Date**: 13 March 2026  
> **Stack**: Django 5 · OAuth2 · React 18 · Nginx · Docker  
> **Scope**: OAuth2 authentication, API security, Nginx headers, CORS, session management

---

## ✅ What's Already Secure

| Area | What's In Place | Status |
|------|----------------|--------|
| **OAuth2 Token Auth** | All API endpoints require valid Bearer token (`OAuth2Authentication`) | ✅ Secure |
| **Login Rate Limiting** | 5 attempts per minute via `LoginRateThrottle` | ✅ Protected |
| **Account Lockout** | `is_locked` check + `increment_failed_attempts()` on wrong password | ✅ Protected |
| **Token Expiry** | Access: 1 hour, Refresh: 24 hours, `ROTATE_REFRESH_TOKEN: True` | ✅ Secure |
| **Token Revocation** | Old tokens deleted on login, logout properly revokes tokens | ✅ Secure |
| **Password Validators** | Min 10 chars + similarity + common + numeric checks | ✅ Strong |
| **DRF Permissions** | Default `IsAuthenticated` — all endpoints locked by default | ✅ Secure |
| **JSON Only** | `JSONRenderer` only — no browsable API exposed | ✅ Good |
| **CORS** | Restricted to specific origins (`CORS_ALLOWED_ORIGINS`) | ✅ Configured |
| **Nginx Headers** | `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` | ✅ Present |
| **Middleware Order** | SecurityMiddleware → Session → CORS → CSRF → Auth (correct order) | ✅ Correct |
| **IP Logging** | Login captures `last_login_ip` via X-Forwarded-For | ✅ Tracked |
| **Production Hardening** | HSTS, Secure cookies, CSRF cookie secure — activated when `DEBUG=False` | ✅ Ready |
| **Secrets in .env** | `SECRET_KEY`, passwords, OAuth2 credentials in environment variables, not in code | ✅ Good |

---

## ⚠️ Checklist Before Production

### 1. Set `DEBUG=False`

```bash
# .env (production)
DEBUG=False
```

> Currently `DEBUG=True` (fine for development). In production this **must** be `False`.  
> This activates HSTS, secure cookies, and CSRF protection automatically.

### 2. Change `SECRET_KEY`

```bash
# Generate a strong key:
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# .env (production)
SECRET_KEY=your-50-char-random-string-here
```

> The default fallback `django-insecure-dev-key` must never be used in production.

### 3. Change OAuth2 Client Secret

```bash
# .env (production)
OAUTH2_CLIENT_SECRET=a-strong-random-string-at-least-32-chars
```

> Current default `change-me-in-production` is for development only.

### 4. Change All User Passwords

> The seeded UAT passwords (`SuperAdmin@123`, `Operator@123`, etc.) are for testing only.  
> All users must change their passwords before go-live.

### 5. Restrict `ALLOWED_HOSTS`

```bash
# .env (production) — only your domain, no localhost
ALLOWED_HOSTS=etl.yourdomain.com
```

### 6. Enable HTTPS (SSL)

> See `dev_README.md` → "Setting Up SSL / HTTPS" section.  
> In production, always use HTTPS to ensure:
> - Tokens encrypted in transit
> - Session cookies sent over secure connections only
> - HSTS prevents downgrade attacks

### 7. Add `Content-Security-Policy` Header

```nginx
# nginx/default.conf — add inside server block:
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" always;
```

> Prevents XSS by controlling which resources the browser can load.

### 8. Hide Server Version Info

```nginx
# nginx/default.conf — add at the top level (before server block):
server_tokens off;
```

> Prevents attackers from knowing your Nginx version.

---

## 🔒 Risk Summary

| Environment | Risk Level | Notes |
|-------------|-----------|-------|
| **Development** | 🟢 **Low** | Properly configured for local use |
| **Production (as-is)** | 🟡 **Medium** | Must apply items 1–6 above |
| **Production (hardened)** | 🟢 **Low** | After applying all 8 items |

---

## Architecture Security Overview

```
Browser (React)
    │
    │  Bearer Token in Authorization header
    ▼
┌──────────────────────────────┐
│         Nginx (Port 80)      │  ← X-Frame-Options, XSS-Protection, CSP
│    Rate limit by connection  │
├──────────────────────────────┤
│      Django Backend          │
│  ┌────────────────────────┐  │
│  │  OAuth2Authentication  │  │  ← Every API request validated
│  │  IsAuthenticated       │  │  ← No anonymous access
│  │  LoginRateThrottle     │  │  ← 5 attempts/min
│  │  Account Lockout       │  │  ← Auto-lock after failures
│  │  Token Rotation        │  │  ← New token on refresh
│  └────────────────────────┘  │
├──────────────────────────────┤
│  PostgreSQL (encrypted pwd)  │  ← Passwords hashed (PBKDF2)
│  Redis (internal network)    │  ← Not exposed externally
└──────────────────────────────┘
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **OAuth2 Bearer tokens** (not session cookies) | Resistant to CSRF attacks |
| **Login rate limiting** (5/min) | Resistant to brute force |
| **Account lockout** on failed attempts | Prevents password guessing |
| **Token rotation** on refresh | Limits window if token is stolen |
| **Token cleanup** on login/logout | No stale tokens accumulate |
| **JSON-only renderer** | No browsable API for attackers to explore |
| **Secrets in .env** (not code) | Credentials never committed to git |
