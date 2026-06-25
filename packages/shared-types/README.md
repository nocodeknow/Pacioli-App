# @finance-platform/shared-types

This package houses all shared TypeScript types, interfaces, discriminated unions, and Zod schemas used across the frontend (`apps/web`), backend (`apps/api`), and core packages.

## Guidelines

* **Locked Decisions**: All common domain structures (Transaction, Candidate, Account, Category, Person) must be defined here first.
* **No Duplication**: Types must never be duplicated or defined locally in other directories if they cross module boundaries.
* **Discriminated Unions**: Prefer discriminated unions over boolean flags to model states.
* **Zod Schemas**: Used for runtime data validation at boundaries, inferring TypeScript types directly from the Zod schemas.
