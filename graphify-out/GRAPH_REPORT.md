# Graph Report - Pacioli-App  (2026-06-25)

## Corpus Check
- 85 files · ~34,180 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 496 nodes · 1022 edges · 18 communities (16 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d57fd103`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard UI Components|Dashboard UI Components]]
- [[_COMMUNITY_Account Data Models|Account Data Models]]
- [[_COMMUNITY_Account Data Access Layer|Account Data Access Layer]]
- [[_COMMUNITY_Account API Routes|Account API Routes]]
- [[_COMMUNITY_Category Reporting Logic|Category Reporting Logic]]
- [[_COMMUNITY_Inbox Management API|Inbox Management API]]
- [[_COMMUNITY_Ledger Reporting Schemas|Ledger Reporting Schemas]]
- [[_COMMUNITY_Frontend UI Infrastructure|Frontend UI Infrastructure]]
- [[_COMMUNITY_Connector API Management|Connector API Management]]
- [[_COMMUNITY_Project Configuration|Project Configuration]]
- [[_COMMUNITY_Inbox Data Access|Inbox Data Access]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Account Business Logic|Account Business Logic]]
- [[_COMMUNITY_Account Database Repository|Account Database Repository]]
- [[_COMMUNITY_Application Entry Point|Application Entry Point]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 23 edges
2. `TransactionCandidate` - 19 edges
3. `accounts` - 17 edges
4. `formatCurrency()` - 16 edges
5. `compilerOptions` - 16 edges
6. `AccountEntity` - 15 edges
7. `CandidateId` - 15 edges
8. `db` - 14 edges
9. `compilerOptions` - 14 edges
10. `postings` - 13 edges

## Surprising Connections (you probably didn't know these)
- `FormattedTransaction` --references--> `Transaction`  [EXTRACTED]
  api/modules/transactions/transactions.controller.ts → src/shared-types/transaction.ts
- `main()` --calls--> `addAccount()`  [INFERRED]
  migrate-journal.js → src/lib/api.ts
- `AccountFormView()` --calls--> `generateHledgerPath()`  [INFERRED]
  src/components/settings/AccountsView.tsx → src/shared-types/utils.ts
- `DashboardView()` --calls--> `formatCurrency()`  [EXTRACTED]
  src/components/DashboardView.tsx → src/lib/utils.ts
- `MonthlyFlowView()` --calls--> `formatCurrency()`  [EXTRACTED]
  src/components/dashboard/MonthlyFlowView.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (18 total, 2 thin omitted)

### Community 0 - "Dashboard UI Components"
Cohesion: 0.06
Nodes (51): DashboardView(), EMPTY_ACCOUNTS, EMPTY_TRANSACTIONS, MONTHS, CategoryPostingRow, MonthlyFlowCategoryView(), MonthlyFlowCategoryViewProps, MonthlyFlowView() (+43 more)

### Community 2 - "Account Data Access Layer"
Cohesion: 0.13
Nodes (8): AccountsController, createAccountSchema, updateAccountSchema, AppError, BadRequestError, NotFoundError, ValidationError, AccountEntitySchema

### Community 3 - "Account API Routes"
Cohesion: 0.22
Nodes (8): AccountsRepository, AccountsService, getAccountTypeFromPath(), postings, transactions, AccountEntity, AccountType, AccountId

### Community 4 - "Category Reporting Logic"
Cohesion: 0.09
Nodes (23): accountsRouter, AccountResponse, app, app, logger, onRequest, server, envSchema (+15 more)

### Community 5 - "Inbox Management API"
Cohesion: 0.06
Nodes (33): sourceRecords, approvePayloadSchema, DBTransactionCandidate, InboxRepository, InboxService, AccountTypeSchema, AccountIdSchema, CandidateId (+25 more)

### Community 6 - "Ledger Reporting Schemas"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, baseUrl, jsx, lib, module, moduleResolution, noEmit (+11 more)

### Community 7 - "Frontend UI Infrastructure"
Cohesion: 0.11
Nodes (19): devDependencies, autoprefixer, drizzle-kit, postcss, supertest, tailwindcss, tailwindcss-animate, @tailwindcss/vite (+11 more)

### Community 9 - "Connector API Management"
Cohesion: 0.14
Nodes (7): ConnectorsController, updateConnectorSchema, ConnectorRecord, ConnectorsRepository, connectorsRouter, ConnectorsService, connectors

### Community 10 - "Project Configuration"
Cohesion: 0.05
Nodes (41): dependencies, chokidar, class-variance-authority, clsx, concurrently, dotenv, drizzle-orm, @fontsource-variable/geist (+33 more)

### Community 11 - "Inbox Data Access"
Cohesion: 0.12
Nodes (16): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+8 more)

### Community 13 - "Account Business Logic"
Cohesion: 0.13
Nodes (15): ReportsController, reportsRouter, ReportsService, AccountMock, AccountMockSchema, CategoryFlowMock, CategoryFlowMockSchema, DashboardData (+7 more)

### Community 14 - "Account Database Repository"
Cohesion: 0.05
Nodes (41): buildWhereClause(), DbClient, DBPosting, generateReport(), getAccountBalances(), getAccountRegisterInMemory(), getAllTransactions(), getBalance() (+33 more)

### Community 20 - "Application Entry Point"
Cohesion: 0.27
Nodes (5): InboxView(), AppContent(), getPageTitle(), queryClient, TransactionsView()

### Community 25 - "Community 25"
Cohesion: 0.14
Nodes (11): CategoriesController, createCategorySchema, updateCategorySchema, CategoriesRepository, categoriesRouter, CategoriesService, accounts, renameAccountInJournal() (+3 more)

## Knowledge Gaps
- **155 isolated node(s):** `envSchema`, `parsed`, `DbClient`, `DBPosting`, `preferences` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateHledgerPath()` connect `Inbox Management API` to `Dashboard UI Components`?**
  _High betweenness centrality (0.223) - this node is a cross-community bridge._
- **Why does `AccountFormView()` connect `Dashboard UI Components` to `Inbox Management API`?**
  _High betweenness centrality (0.222) - this node is a cross-community bridge._
- **What connects `envSchema`, `parsed`, `DbClient` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06296296296296296 - nodes in this community are weakly interconnected._
- **Should `Account Data Access Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._
- **Should `Category Reporting Logic` be split into smaller, more focused modules?**
  _Cohesion score 0.09146341463414634 - nodes in this community are weakly interconnected._
- **Should `Inbox Management API` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._