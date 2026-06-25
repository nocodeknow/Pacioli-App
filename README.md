# Pacioli-App

Pacioli is a modern, high-performance **Personal Finance Automation Platform** designed to run fully serverless on the Cloudflare edge. Built with a focus on data integrity, double-entry ledger bookkeeping, and responsive mobile-first user experiences.

---

## 🛠️ Technology Stack

- **Frontend**: React (v19) + Vite + Tailwind CSS (v4) + Radix UI + Framer Motion
- **Backend API**: Hono (Serverless Worker framework)
- **Database**: Cloudflare D1 (Serverless SQLite)
- **ORM & Migrations**: Drizzle ORM + Drizzle Kit
- **Hosting / Compute**: Cloudflare Pages + Pages Functions (Edge worker environment)

---

## 📁 Project Structure

```text
pacioli-app/
├── api/                  # Hono API Backend
│   ├── config/           # App environments & setups
│   ├── db/               # Drizzle schemas, repositories & context clients
│   ├── errors/           # Centralized API error handlers
│   └── modules/          # Business logic routes (Accounts, Categories, Transactions, Reports)
├── src/                  # React Frontend App
│   ├── components/       # Reusable components and views (Settings, Dashboard)
│   └── shared-types/     # Shared TS types between React and Hono
├── functions/            # Cloudflare Pages Functions entry points
│   └── api/[[route]].ts  # Maps Hono backend into Cloudflare Pages gateway
├── drizzle/              # Auto-generated SQL migration scripts
├── scripts/              # Local migration scripts, database initializers & seeding
├── wrangler.toml         # Cloudflare Pages/D1 bindings config
└── package.json          # Node scripts & dependencies
```

---

## 💻 Local Development

Because the platform targets the Cloudflare Serverless runtime, local development emulates the edge environment:

1. **Start the Compiler / Builder**:
   In your first terminal tab, start Vite to watch and compile changes:
   ```bash
   pnpm dev:build-watch
   ```

2. **Start the Cloudflare Local Emulator (Wrangler)**:
   In a second terminal tab, launch the Wrangler simulator to run the backend functions and mock D1:
   ```bash
   pnpm dev
   ```

Open your browser and navigate to `http://localhost:8788`.

---

## 🗄️ Database Management & Migrations

Drizzle manages D1 schemas. 

* **Generate new migrations** (run this after modifying `api/db/schema.ts`):
  ```bash
  pnpm db:generate
  ```
* **Apply migrations to local SQLite emulator**:
  ```bash
  pnpm db:migrate:local
  ```
* **Apply migrations to Cloudflare D1 production database**:
  ```bash
  pnpm db:migrate:prod
  ```
* **Initialize and seed local database**:
  ```bash
  pnpm db:init
  pnpm db:seed:local
  ```

---

## 🚀 Production Deployment (Hybrid Approach)

To ensure maximum data integrity, code deployments and D1 schema updates are coordinated manually via Wrangler CLI:

1. **Commit and push** all code changes to GitHub.
2. **Back up your production D1 database**:
   ```bash
   npx wrangler d1 export pacioli-db --remote --output=backup/d1-backup-$(date +%F-%H%M%S).sql
   ```
3. **Apply schema migrations** to the remote production D1 database:
   ```bash
   pnpm db:migrate:prod
   ```
4. **Build production assets**:
   ```bash
   pnpm build
   ```
5. **Deploy build outputs** to Cloudflare Pages:
   ```bash
   pnpm wrangler pages deploy dist
   ```

---

## 🔒 Agent Customization Guidelines

Custom rules for autonomous agents working on this workspace are located in `.agents/AGENTS.md`. Future agents should review these rules first.
