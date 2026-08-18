# Textboard

A local-first multipurpose data dashboard application.

## Architecture & Structure

- `/frontend`: Next.js 14 (React 18, Tailwind CSS, TypeScript)
- `/backend`: NestJS, Prisma ORM, TypeScript
- `/docs`: Architecture, schemas, and design documentation
- `docker-compose.yml`: Local PostgreSQL and Redis infrastructure

---

## Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) and Docker Compose

### 2. Environment Setup
Copy the example environment files:
```bash
# Root & Backend
cp .env.example .env
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 3. Start Local Infrastructure
Spin up PostgreSQL and Redis:
```bash
docker compose up -d
```

### 4. Backend Setup
Install dependencies, apply database migrations, and run the NestJS API:
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```
The backend will be available at `http://localhost:3001` (Health check: `http://localhost:3001/health`).

### 5. Frontend Setup
In a new terminal, install dependencies and run the Next.js frontend:
```bash
cd frontend
npm install
npm run dev
```
The frontend will be available at `http://localhost:3000`.

---

## Security & Privacy Note
- **Local PIN Lock**: The optional PIN lock is a local UI convenience lock only, browser-controlled, and does not protect server APIs or stored data.

---

## Health Check Verification
When both services and docker containers are running, navigating to `http://localhost:3000` will display `connected` indicating that the Next.js frontend successfully reached the NestJS `/health` endpoint.
