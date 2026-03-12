# ETL Platform — Developer Setup Guide

> **Last Updated**: March 2026  
> **Stack**: Django 5 · React 18 · PostgreSQL 16 · Redis 7 · Celery · Nginx · Docker

---

## Prerequisites

| Tool | Min Version | Check |
|------|-------------|-------|
| Docker | 24+ | `docker --version` |
| Docker Compose | v2+ | `docker compose version` |
| Git | 2.30+ | `git --version` |

---

## Quick Start

```bash
# 1. Clone the repository
git clone git@github.com:<your-org>/ETL.git
cd ETL

# 2. Copy environment file
cp .env.example .env

# 3. Build and start all containers
docker compose up -d --build

# 4. Verify all 8 containers are running
docker compose ps
```

Wait ~30 seconds for all services to initialise. The backend auto-runs:
- Database migrations
- OAuth2 client setup
- Celery Beat schedule setup (file sense scan every 30s)
- UAT data seeding (users, sample data)

---

## Services & Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Port 80)                       │
│        Reverse Proxy — routes /api/ and /admin/          │
├────────────────────────┬────────────────────────────────┤
│   React Frontend       │   Django Backend               │
│   (Vite, Port 3000)    │   (API + Admin, Port 8000)     │
├────────────────────────┴────────────────────────────────┤
│   PostgreSQL 16  │  Redis 7  │  Mailpit (Dev Email)     │
│   (Port 5433)    │  (6379)   │  (SMTP 1025, UI 8025)    │
├─────────────────────────────────────────────────────────┤
│   Celery Worker (4 threads)  │  Celery Beat (Scheduler) │
└─────────────────────────────────────────────────────────┘
```

| Container | Image | Internal Port | External Port |
|-----------|-------|---------------|---------------|
| `etl-nginx` | nginx:alpine | 80 | **80** |
| `etl-backend` | python:3.12-slim | 8000 | 8000 |
| `etl-frontend` | node:20-alpine | 3000 | 3000 |
| `etl-db` | postgres:16-alpine | 5432 | 5433 |
| `etl-redis` | redis:7-alpine | 6379 | 6379 |
| `etl-mailpit` | axllent/mailpit | 8025 / 1025 | 8025 / 1025 |
| `etl-celery-worker` | python:3.12-slim | — | — |
| `etl-celery-beat` | python:3.12-slim | — | — |

---

## Changing URLs & Ports

All ports are configurable via `.env`. Edit and restart:

```bash
# .env
BACKEND_PORT=8000          # Django API
FRONTEND_PORT=3000         # React dev server
DB_EXTERNAL_PORT=5433      # PostgreSQL (external access)
REDIS_PORT=6379            # Redis
MAILPIT_UI_PORT=8025       # Mailpit web UI
MAIL_PORT=1025             # Mailpit SMTP
```

### Changing the Main Access Port (Nginx)

The port format is `"YOUR_PC:INSIDE_DOCKER"`.  
The **left number** is what you type in your browser. The **right number** stays the same (it's the port inside the container).

Edit `docker-compose.yml` under the `nginx` service:

```yaml
ports:
  - "80:80"          # Default → open browser at http://localhost
  - "8080:80"        # Example → open browser at http://localhost:8080
  - "3001:80"        # Example → open browser at http://localhost:3001
```

> **Simple Rule**: Only change the number on the **left** side of the colon.  
> For example, if port 80 is already used by another app on your PC, change it to `"8080:80"` and access the app at `http://localhost:8080`.

### Changing the Server Name / Domain

Edit `nginx/default.conf` line 11:

```nginx
server_name localhost;                    # Local development
server_name 192.168.1.100;               # LAN IP address
server_name etl.mycompany.com;           # Production domain
server_name 10.0.0.50 etl.internal.my;   # Multiple names
```

Also update these two settings in `.env`:

**`ALLOWED_HOSTS`** — A list of domain names or IPs that the backend will accept requests from.  
Think of it as a **guest list**: if someone tries to access your app from an address not in this list, Django will reject it.

**`CORS_ALLOWED_ORIGINS`** — Same idea, but specifically for the **browser's frontend**.  
The browser checks this before allowing the React app to talk to the Django API. Must include `http://` or `https://`.

```bash
# Example 1: Working on your laptop only
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost

# Example 2: Colleagues access via office network IP
ALLOWED_HOSTS=localhost,192.168.1.100
CORS_ALLOWED_ORIGINS=http://localhost,http://192.168.1.100

# Example 3: Deployed to a company domain
ALLOWED_HOSTS=etl.mycompany.com,localhost
CORS_ALLOWED_ORIGINS=http://etl.mycompany.com,http://localhost

# Example 4: Custom port (e.g. Nginx on 8080)
ALLOWED_HOSTS=localhost,192.168.1.100
CORS_ALLOWED_ORIGINS=http://localhost:8080,http://192.168.1.100:8080
```

> **Tip**: The `ALLOWED_HOSTS` values are just names/IPs (no `http://`).  
> The `CORS_ALLOWED_ORIGINS` values must start with `http://` or `https://`.

### After Any Port/URL Changes

```bash
docker compose down
docker compose up -d --build
```

---

## Access Points

| Service | URL | Notes |
|---------|-----|-------|
| **Application** | `http://localhost` | Main app (via Nginx) |
| **Django Admin** | `http://localhost/admin/` | Unfold admin panel |
| **Backend API** | `http://localhost/api/` | REST API |
| **Mailpit UI** | `http://localhost:8025` | Dev email viewer |
| **PostgreSQL** | `localhost:5433` | Direct DB access |

---

## UAT Credentials

Auto-seeded on first boot. All users can log in at `http://localhost`.

| Role | Username | Email | Password |
|------|----------|-------|----------|
| **Super Admin** | `superadmin` | superadmin@etlplatform.local | `SuperAdmin@123` |
| **Admin** | `admin` | admin@etlplatform.local | `Admin@12345` |
| **Manager** | `manager` | manager@etlplatform.local | `Manager@123` |
| **Analyst** | `analyst` | analyst@etlplatform.local | `Analyst@123` |
| **Operator 1** | `operator1` | operator1@etlplatform.local | `Operator@123` |
| **Operator 2** | `operator2` | operator2@etlplatform.local | `Operator@123` |
| **Viewer** | `viewer` | viewer@etlplatform.local | `Viewer@1234` |
| **Auditor** | `auditor` | auditor@etlplatform.local | `Auditor@123` |

### Django Admin Access

Navigate to `http://localhost/admin/` and log in with `superadmin` or `admin`.

---

## File Processing Directories

| Directory | Container Path | Host Path | Purpose |
|-----------|---------------|-----------|---------|
| **trfm_inbound** | `/data/trfm_inbound` | `./trfm_inbound/` | Drop source files here for processing |
| **trfm_outbound** | `/data/trfm_outbound` | `./trfm_outbound/` | Transformed output files appear here |

Shared across: `etl-backend`, `etl-celery-worker`, `etl-celery-beat`.

### File Sense Pipeline (Auto-Scheduled)

The `file_sense_scan` task is **automatically registered** on startup (every 30 seconds).

1. Place a file in `./trfm_inbound/` matching a package's file pattern (e.g. `MBB*.csv`)
2. Celery Beat's `file_sense_scan` task detects and matches it to an active package
3. Celery Worker processes the file (applies field mappings: direct, conditional, constant)
4. Output written to `./trfm_outbound/`
5. Inbound file saved to PostgreSQL, then deleted from disk
6. Run log recorded with status (success/failed) and run type (instant/scheduled/adhoc)

### Run Logs & Ad-hoc Run

- **Audit Log (📋)**: Click the clipboard icon in the actions column to view the last 7 days of run logs for a package
- **Ad-hoc Run (🚀)**: Click the rocket icon to manually trigger file processing (emergency override)
- **Run Badge**: The circle in the "Runs" column shows total runs (green = all success, red badge = failures)

---

## Common Commands

```bash
# Start all services
docker compose up -d --build

# Stop all services
docker compose down

# View logs (all / specific)
docker compose logs -f
docker compose logs -f backend

# Restart a single service
docker compose restart backend

# Run Django management commands
docker exec etl-backend python manage.py migrate
docker exec etl-backend python manage.py createsuperuser
docker exec etl-backend python manage.py seed_uat
docker exec etl-backend python manage.py collectstatic --noinput

# Run tests
docker exec etl-backend python manage.py test apps.transformation -v2

# Access Django shell
docker exec -it etl-backend python manage.py shell

# Access PostgreSQL
docker exec -it etl-db psql -U etl_user -d etl_platform

# Check Celery registered tasks
docker exec etl-celery-worker celery -A config inspect registered

# Reset everything (wipes database)
docker compose down -v
docker compose up -d --build
```

---

## Project Structure

```
ETL/
├── backend/                  # Django application
│   ├── apps/
│   │   ├── accounts/         # Authentication & user management
│   │   ├── dashboard/        # Dashboard API
│   │   └── transformation/   # Core ETL: packages, mappings, file processing
│   ├── config/               # Django settings, URLs, Celery config
│   └── manage.py
├── frontend/                 # React application (Vite)
│   ├── src/
│   │   ├── pages/            # Route pages (transformation, dashboard)
│   │   ├── services/         # API client (axios)
│   │   └── theme/            # Bloomberg dark theme
│   └── vite.config.js
├── nginx/                    # Nginx reverse proxy config
│   └── default.conf
├── trfm_inbound/             # Source files for processing
├── trfm_outbound/            # Processed output files
├── docker-compose.yml        # Container orchestration
├── Dockerfile.backend        # Python 3.12 image
├── Dockerfile.frontend       # Node 20 image
├── .env.example              # Environment template
└── dev_README.md             # ← This file
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **502 Bad Gateway** | `docker compose down && docker compose up -d --build` |
| **Database connection refused** | Wait for healthcheck: `docker compose ps` (check db is healthy) |
| **Frontend not loading** | Check `etl-frontend` logs: `docker compose logs frontend` |
| **Celery tasks not running** | Verify worker: `docker exec etl-celery-worker celery -A config inspect active` |
| **File sense not picking up files** | Auto-scheduled on boot. Restart: `docker restart etl-celery-beat etl-celery-worker` |
| **Port conflict** | Change ports in `.env` and restart |
| **Permission denied on trfm dirs** | `chmod 777 ./trfm_inbound ./trfm_outbound` |
