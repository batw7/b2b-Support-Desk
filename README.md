# Nevers Support

NestJS API + Angular UI helpdesk app. PostgreSQL 16, Docker or local development.

## Requirements

- Node.js 20+
- PostgreSQL 16+ (if not using Docker)
- Docker Desktop (optional)

## Local quick start

```powershell
cd backend
Copy-Item .env.example .env
npm install
npm run start:dev

cd ..\frontend
npm install
npm start
```

- API: http://localhost:3000/api  
- UI: http://localhost:4200  

The first owner account is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.

## Docker

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

- UI: http://localhost:8080  
- API: http://localhost:3000/api  

## Environment files

| File | Purpose |
|------|---------|
| `backend/.env.example` | Local NestJS development |
| `.env.example` | Docker Compose |

Do not commit real `.env` files to the repository.
