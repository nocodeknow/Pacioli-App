# Pacioli-App Developer Agent Instructions & Rules

These instructions and rules must be read, understood, and strictly followed by any agent modifying or maintaining this codebase.

---

## 🔒 1. Production Database Integrity & Backups
The Cloudflare-hosted production database (`pacioli-db` on D1) is the user's primary database. Data integrity is the absolute highest priority.

*   **Pre-Migration Backup (MANDATORY)**: Before applying any database schema migration or running seed scripts on production, you **MUST** export a backup of the current production D1 database:
    ```bash
    npx wrangler d1 export pacioli-db --remote --output=backup/d1-backup-<YYYY-MM-DD-HHMMSS>.sql
    ```
    Verify the backup file is successfully written to the `backup/` directory before proceeding.
*   **Sequential Migration Application**:
    1. Define changes in `api/db/schema.ts`.
    2. Generate SQL migrations using `pnpm db:generate`.
    3. Apply locally first: `pnpm db:migrate:local`.
    4. Run local verification/test suite.
    5. Backup remote DB (as detailed above).
    6. Apply remote D1 migration: `pnpm db:migrate:prod`.

---

## 💻 2. Local Development & Compilation
Do not use legacy Node servers for development. The application runs on Cloudflare Pages Functions.

*   **Vite Watcher**: Compile code continuously during local edits:
    ```bash
    pnpm dev:build-watch
    ```
*   **Wrangler Simulator**: Simulate Cloudflare environment and bind local D1:
    ```bash
    pnpm dev
    ```
*   **Both commands must run concurrently in separate terminals** for local testing.

---

## 🏛️ 3. Architectural Constraints & Code Quality

*   **Serverless Constraints**: All backend API code (`api/` and `functions/`) executes in a Cloudflare Worker context. Do NOT use Node-specific modules (e.g. `process.env`, `fs`, `path`, or loggers like `pino` with stream output). Use Web APIs and Cloudflare Bindings.
*   **Leaf-Only Selection**: To prevent posting errors, only leaf accounts (i.e. where `isGroup = false`) may be selectable for transactions. Parent account folders (e.g. `Expenses`, `Assets`, `Bank & cash`) are grouping headers and must be filtered out from all transaction UI selection elements.
*   **Keep Graph Updated**: After modifying code files, run:
    ```bash
    graphify update .
    ```
    to keep the AST knowledge graph updated.
