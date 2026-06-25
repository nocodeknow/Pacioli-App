# Packages Directory

This directory contains shared packages and libraries utilized by applications (`apps/web` and `apps/api`) across the monorepo workspace.

## Packages

* **[shared-types](./shared-types/)**: Defines shared TypeScript interfaces and Zod schemas (e.g., Transaction Candidate schemas) that serve as contracts between modules.
* **[ledger-interface](./ledger-interface/)**: The single gateway responsible for constructing Hledger commands, parsing journal files, writing postings, and returning balances.
* **[automation](./automation/)**: Encapsulates data acquisition logic (connectors), source record databases, parser utilities, normalizers, and the candidate generation flow.
* **[shared-ui](./shared-ui/)**: Exposes common React components, design system configurations (Tailwind CSS variables), and reusable utility hooks.
