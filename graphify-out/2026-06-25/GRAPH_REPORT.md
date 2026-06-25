# Graph Report - Pacioli-App  (2026-06-25)

## Corpus Check
- 87 files · ~33,050 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 444 nodes · 761 edges · 24 communities (21 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dashboard UI Components|Dashboard UI Components]]
- [[_COMMUNITY_Account Data Models|Account Data Models]]
- [[_COMMUNITY_Account Data Access Layer|Account Data Access Layer]]
- [[_COMMUNITY_Account API Routes|Account API Routes]]
- [[_COMMUNITY_Category Reporting Logic|Category Reporting Logic]]
- [[_COMMUNITY_Inbox Management API|Inbox Management API]]
- [[_COMMUNITY_Ledger Reporting Schemas|Ledger Reporting Schemas]]
- [[_COMMUNITY_Frontend UI Infrastructure|Frontend UI Infrastructure]]
- [[_COMMUNITY_Transaction API Management|Transaction API Management]]
- [[_COMMUNITY_Connector API Management|Connector API Management]]
- [[_COMMUNITY_Project Configuration|Project Configuration]]
- [[_COMMUNITY_Inbox Data Access|Inbox Data Access]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Account Business Logic|Account Business Logic]]
- [[_COMMUNITY_Account Database Repository|Account Database Repository]]
- [[_COMMUNITY_Category Database Repository|Category Database Repository]]
- [[_COMMUNITY_Community 25|Community 25]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 24 edges
2. `formatCurrency()` - 16 edges
3. `db` - 14 edges
4. `InboxService` - 13 edges
5. `InboxController` - 12 edges
6. `compilerOptions` - 12 edges
7. `AccountsService` - 11 edges
8. `InboxRepository` - 11 edges
9. `queryKeys` - 11 edges
10. `AccountsRepository` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AccountFormView()` --calls--> `generateHledgerPath()`  [INFERRED]
  apps/web/src/components/settings/AccountsView.tsx → packages/shared-types/src/utils.ts
- `DashboardView()` --calls--> `formatCurrency()`  [EXTRACTED]
  apps/web/src/components/DashboardView.tsx → apps/web/src/lib/utils.ts
- `MonthlyFlowView()` --calls--> `formatCurrency()`  [EXTRACTED]
  apps/web/src/components/dashboard/MonthlyFlowView.tsx → apps/web/src/lib/utils.ts
- `AccountsListView()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/settings/AccountsView.tsx → apps/web/src/lib/utils.ts
- `CategoriesListView()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/components/settings/CategoriesView.tsx → apps/web/src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (24 total, 3 thin omitted)

### Community 0 - "Dashboard UI Components"
Cohesion: 0.06
Nodes (56): DashboardView(), EMPTY_ACCOUNTS, EMPTY_TRANSACTIONS, MONTHS, CategoryPostingRow, MonthlyFlowCategoryView(), MonthlyFlowCategoryViewProps, MonthlyFlowView() (+48 more)

### Community 1 - "Account Data Models"
Cohesion: 0.06
Nodes (38): AccountEntity, AccountEntitySchema, AccountType, AccountTypeSchema, AccountId, AccountIdSchema, CandidateId, CandidateIdSchema (+30 more)

### Community 2 - "Account Data Access Layer"
Cohesion: 0.12
Nodes (14): createAccountSchema, updateAccountSchema, AccountResponse, client, db, seedDatabase(), AppError, BadRequestError (+6 more)

### Community 3 - "Account API Routes"
Cohesion: 0.20
Nodes (4): AccountsService, getAccountTypeFromPath(), CategoriesService, renameAccountInJournal()

### Community 4 - "Category Reporting Logic"
Cohesion: 0.09
Nodes (25): buildWhereClause(), DbClient, DBPosting, generateReport(), getAccountBalances(), getAccountRegisterInMemory(), getBalance(), getNetWorth() (+17 more)

### Community 5 - "Inbox Management API"
Cohesion: 0.10
Nodes (4): approvePayloadSchema, InboxController, inboxRouter, InboxService

### Community 6 - "Ledger Reporting Schemas"
Cohesion: 0.15
Nodes (12): AccountBalance, AccountBalanceSchema, AccountLedgerResponse, AccountLedgerResponseSchema, FinancialReport, FinancialReportRow, FinancialReportRowSchema, FinancialReportSchema (+4 more)

### Community 7 - "Frontend UI Infrastructure"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 8 - "Transaction API Management"
Cohesion: 0.12
Nodes (9): toTransactionId(), getJournalSha256(), createTransactionSchema, FormattedTransaction, formatTransactionResponse(), postingSchema, TransactionsController, transactionsRouter (+1 more)

### Community 9 - "Connector API Management"
Cohesion: 0.15
Nodes (6): ConnectorsController, updateConnectorSchema, ConnectorRecord, ConnectorsRepository, connectorsRouter, ConnectorsService

### Community 10 - "Project Configuration"
Cohesion: 0.12
Nodes (15): description, devDependencies, typescript, engines, node, pnpm, name, pnpm (+7 more)

### Community 12 - "TypeScript Configuration"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution (+5 more)

### Community 13 - "Account Business Logic"
Cohesion: 0.15
Nodes (12): AccountMock, AccountMockSchema, CategoryFlowMock, CategoryFlowMockSchema, DashboardData, DashboardDataSchema, MonthlyFlowMock, MonthlyFlowMockSchema (+4 more)

### Community 25 - "Community 25"
Cohesion: 0.07
Nodes (15): AccountsController, accountsRouter, app, CategoriesController, createCategorySchema, updateCategorySchema, categoriesRouter, envSchema (+7 more)

## Knowledge Gaps
- **134 isolated node(s):** `app`, `envSchema`, `parsed`, `client`, `createAccountSchema` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateHledgerPath()` connect `Account Data Models` to `Dashboard UI Components`?**
  _High betweenness centrality (0.265) - this node is a cross-community bridge._
- **Why does `AccountFormView()` connect `Dashboard UI Components` to `Account Data Models`?**
  _High betweenness centrality (0.263) - this node is a cross-community bridge._
- **Why does `AccountsController` connect `Community 25` to `Account Data Models`, `Account Data Access Layer`?**
  _High betweenness centrality (0.194) - this node is a cross-community bridge._
- **What connects `app`, `envSchema`, `parsed` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dashboard UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.05877742946708464 - nodes in this community are weakly interconnected._
- **Should `Account Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.05782312925170068 - nodes in this community are weakly interconnected._
- **Should `Account Data Access Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.1166429587482219 - nodes in this community are weakly interconnected._