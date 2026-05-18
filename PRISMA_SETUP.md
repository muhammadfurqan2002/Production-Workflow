# 🗄️ Prisma Setup Guide — Node.js + TypeScript

A complete, battle-tested guide for integrating **Prisma v7** with a **Node.js + TypeScript** project using **PostgreSQL**.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Project Initialization](#project-initialization)
- [Install Dependencies](#install-dependencies)
- [TypeScript Configuration](#typescript-configuration)
- [Prisma Setup](#prisma-setup)
- [Prisma v7 — Driver Adapter (Important)](#prisma-v7--driver-adapter-important)
- [Environment Variables](#environment-variables)
- [Database Client](#database-client)
- [Running Migrations](#running-migrations)
- [Prisma Scripts](#prisma-scripts)
- [Common Errors & Fixes](#common-errors--fixes)

---

## Prerequisites

- Node.js **v18+** (v22 recommended)
- PostgreSQL database running locally or remotely
- npm or yarn

---

## Project Initialization

```bash
mkdir my-project
cd my-project
npm init -y
```

---

## Install Dependencies

### Runtime dependencies
```bash
npm install @prisma/client @prisma/adapter-pg pg express
```

### Dev dependencies
```bash
npm install -D prisma typescript ts-node-dev @types/node @types/express @types/pg
```

> **Note:** `@prisma/adapter-pg` and `pg` are **required** for Prisma v7+ (see below).

---

## TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Prisma Setup

### 1. Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` — your database schema
- `.env` — with a `DATABASE_URL` placeholder

### 2. Configure the Schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

> ⚠️ **Prisma v7 Note:** Do **not** add `previewFeatures = ["driverAdapters"]` — it is a stable feature now and will produce a deprecation warning if included.

---

## Prisma v7 — Driver Adapter (Important)

> **Breaking change in Prisma v7:** The built-in query engine was removed.
> You can no longer use `new PrismaClient()` without a **driver adapter**.

### Why?

Prisma v7 shifted to a model where you explicitly provide a database driver. This makes the client lighter and more flexible, but requires a small setup change.

### What Changed

| Prisma v5/v6 | Prisma v7 |
|---|---|
| `new PrismaClient()` works | `new PrismaClient()` **throws** |
| Built-in engine included | Engine removed — adapter required |
| No extra packages needed | Must install `@prisma/adapter-pg` + `pg` |

---

## Environment Variables

Create `.env` in your project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/mydb"
```

Replace `USER`, `PASSWORD`, and `mydb` with your actual values.

---

## Database Client

Create `src/config/db.ts`:

```typescript
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// PrismaPg takes the connection string directly in Prisma v7
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

export default prisma;
```

> **Why import from `.prisma/client`?**
> `@prisma/client` re-exports from `.prisma/client` (the generated output). Importing directly from `.prisma/client` avoids TypeScript resolution issues in some project setups.

### Usage in a route/service

```typescript
import prisma from "../config/db";

// Find all users
const users = await prisma.user.findMany();

// Create a user
const user = await prisma.user.create({
  data: { email: "hello@example.com", name: "John" },
});

// Find one
const found = await prisma.user.findUnique({
  where: { email: "hello@example.com" },
});
```

---

## Running Migrations

### First-time setup (create and apply migration)

```bash
npx prisma migrate dev --name init
```

### After changing the schema

```bash
npx prisma migrate dev --name describe_your_change
```

### Apply migrations in production (no dev prompt)

```bash
npx prisma migrate deploy
```

### Reset the database (⚠️ deletes all data)

```bash
npx prisma migrate reset
```

---

## Prisma Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:reset": "prisma migrate reset"
  }
}
```

| Script | Description |
|---|---|
| `npm run prisma:generate` | Regenerate the Prisma Client after schema changes |
| `npm run prisma:migrate` | Create and apply a new migration |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) |
| `npm run prisma:reset` | Reset and re-seed the database |

---

## Common Errors & Fixes

### ❌ `PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`

**Cause:** You're using Prisma v7 with `new PrismaClient()` (no adapter).

**Fix:**
```bash
npm install @prisma/adapter-pg pg
```
Then update `db.ts` to use the adapter (see [Database Client](#database-client) above).

---

### ❌ `Module '"@prisma/client"' has no exported member 'PrismaClient'`

**Cause:** TypeScript can't resolve the re-export chain from `@prisma/client`.

**Fix:** Import directly from the generated output:
```typescript
// ❌ May fail
import { PrismaClient } from "@prisma/client";

// ✅ Always works
import { PrismaClient } from ".prisma/client";
```

---

### ❌ `Cannot find module 'jsonwebtoken'` / similar

**Cause:** Package is missing from `node_modules`.

**Fix:**
```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

---

### ❌ `ts-node-dev is not recognized`

**Cause:** `ts-node-dev` is not installed or not in PATH.

**Fix:**
```bash
npm install -D ts-node-dev
```

---

### ❌ `EADDRINUSE: address already in use`

**Cause:** A previous server process is still running on the port.

**Fix (Windows PowerShell):**
```powershell
# Find and kill the process on port 3000 (change as needed)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess -Unique) -Force
```

---

### ❌ `warn Preview feature "driverAdapters" is deprecated`

**Cause:** Your schema still has `previewFeatures = ["driverAdapters"]` which is no longer needed in Prisma v7.

**Fix:** Remove it from `schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  # Remove this line ↓
  # previewFeatures = ["driverAdapters"]
}
```

---

## 📁 Final Project Structure

```
my-project/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Auto-generated migration files
├── src/
│   ├── config/
│   │   └── db.ts            # Prisma client instance
│   ├── modules/
│   │   └── user/
│   │       ├── user.route.ts
│   │       ├── user.controller.ts
│   │       └── user.service.ts
│   ├── app.ts               # Express app setup
│   └── server.ts            # Entry point
├── .env                     # Environment variables (gitignored)
├── .env.example             # Template (commit this)
├── tsconfig.json
└── package.json
```

---

## ✅ Quick Start Checklist

- [ ] `npm install @prisma/client @prisma/adapter-pg pg`
- [ ] `npm install -D prisma typescript ts-node-dev`
- [ ] `npx prisma init`
- [ ] Set `DATABASE_URL` in `.env`
- [ ] Define models in `prisma/schema.prisma`
- [ ] `npx prisma migrate dev --name init`
- [ ] `npx prisma generate`
- [ ] Create `src/config/db.ts` with the adapter setup
- [ ] Import and use `prisma` in your services

---

> 💡 **Tip:** Always run `npx prisma generate` after any schema change, before starting the dev server.
