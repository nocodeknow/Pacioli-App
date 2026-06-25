# @finance-platform/api

The backend API server for the personal finance automation platform.

## Technology Stack

* Node.js
* TypeScript
* Express (or equivalent lightweight framework)
* PostgreSQL / Supabase Client

## Purpose

Orchestrates all transactional operations and settings management. Features:
* Serving REST endpoints for frontend client operations.
* Validating payloads using Zod schemas matching shared contracts.
* Communicating with PostgreSQL (via Supabase) for metadata, configuration, staging inbox candidates, and connector logs.
* Importing and interacting with `@finance-platform/ledger-interface` to write to the Hledger journal files.
* Direct direct calls to `hledger` CLI are prohibited; all accounting queries must go through `@finance-platform/ledger-interface`.
