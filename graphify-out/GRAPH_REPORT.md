# Graph Report - Pacioli-App  (2026-06-26)

## Corpus Check
- 89 files · ~34,026 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 524 nodes · 942 edges · 34 communities (30 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a8fb38f7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Inbox Transaction Processing|Inbox Transaction Processing]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Project Dependencies|Project Dependencies]]
- [[_COMMUNITY_Category Management|Category Management]]
- [[_COMMUNITY_Account Data Access|Account Data Access]]
- [[_COMMUNITY_Account API Routes|Account API Routes]]
- [[_COMMUNITY_Connector Management|Connector Management]]
- [[_COMMUNITY_API Client Interface|API Client Interface]]
- [[_COMMUNITY_Reporting and Dashboard Data|Reporting and Dashboard Data]]
- [[_COMMUNITY_App TypeScript Configuration|App TypeScript Configuration]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Ledger and Account Logic|Ledger and Account Logic]]
- [[_COMMUNITY_Node TypeScript Configuration|Node TypeScript Configuration]]
- [[_COMMUNITY_Dashboard UI Components|Dashboard UI Components]]
- [[_COMMUNITY_Monthly Flow UI Components|Monthly Flow UI Components]]
- [[_COMMUNITY_Settlement UI View|Settlement UI View]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Main Application Views|Main Application Views]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Entity Management UI|Entity Management UI]]
- [[_COMMUNITY_Account Schema Definitions|Account Schema Definitions]]
- [[_COMMUNITY_Settings and Connectors UI|Settings and Connectors UI]]
- [[_COMMUNITY_Ledger View Components|Ledger View Components]]
- [[_COMMUNITY_Select Input Component|Select Input Component]]
- [[_COMMUNITY_TypeScript Project References|TypeScript Project References]]
- [[_COMMUNITY_Button UI Component|Button UI Component]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]

## God Nodes (most connected - your core abstractions)
1. `TransactionCandidate` - 19 edges
2. `compilerOptions` - 16 edges
3. `AccountEntity` - 15 edges
4. `CandidateId` - 15 edges
5. `accounts` - 14 edges
6. `compilerOptions` - 14 edges
7. `InboxService` - 13 edges
8. `scripts` - 13 edges
9. `cn()` - 13 edges
10. `Category` - 13 edges

## Surprising Connections (you probably didn't know these)
- `FormattedTransaction` --references--> `Transaction`  [EXTRACTED]
  api/modules/transactions/transactions.controller.ts → src/shared-types/transaction.ts
- `MonthlyFlowView()` --calls--> `formatCurrency()`  [INFERRED]
  src/components/dashboard/MonthlyFlowView.tsx → src/lib/utils.ts
- `CustomSelect()` --calls--> `cn()`  [INFERRED]
  src/components/ui/select.tsx → src/lib/utils.ts
- `DashboardView()` --calls--> `formatCurrency()`  [INFERRED]
  src/components/DashboardView.tsx → src/lib/utils.ts
- `MonthlyFlowCategoryView()` --calls--> `cn()`  [INFERRED]
  src/components/dashboard/MonthlyFlowCategoryView.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (34 total, 4 thin omitted)

### Community 0 - "Inbox Transaction Processing"
Cohesion: 0.17
Nodes (9): sourceRecords, transactionCandidates, DBTransactionCandidate, InboxRepository, InboxService, CandidateId, SourceRecordId, TransactionCandidate (+1 more)

### Community 1 - "Community 1"
Cohesion: 0.29
Nodes (9): applyMigrationsToFile(), D1_DIR, main(), MIGRATION_DIR, readSqlFile(), seedFile(), splitSqlStatements(), main() (+1 more)

### Community 2 - "Project Dependencies"
Cohesion: 0.09
Nodes (22): devDependencies, autoprefixer, concurrently, dotenv, drizzle-kit, @hono/node-server, @libsql/client, pino (+14 more)

### Community 3 - "Category Management"
Cohesion: 0.15
Nodes (8): CategoriesController, createCategorySchema, updateCategorySchema, CategoriesRepository, CategoriesService, CategoryId, Category, CategorySchema

### Community 4 - "Account Data Access"
Cohesion: 0.26
Nodes (5): AccountsRepository, AccountsService, getAccountTypeFromPath(), AccountEntity, AccountId

### Community 5 - "Account API Routes"
Cohesion: 0.29
Nodes (5): DatePicker(), DatePickerProps, formatDisplayDate(), MONTHS, WEEKDAYS

### Community 6 - "Connector Management"
Cohesion: 0.15
Nodes (6): ConnectorsController, updateConnectorSchema, ConnectorRecord, ConnectorsRepository, connectorsRouter, ConnectorsService

### Community 7 - "API Client Interface"
Cohesion: 0.12
Nodes (6): createTransaction(), fetchAccountLedger(), fetchTransaction(), parseAmount(), queryKeys, updateTransaction()

### Community 8 - "Reporting and Dashboard Data"
Cohesion: 0.14
Nodes (11): app, logger, onRequest, categoriesRouter, envSchema, parsed, inboxRouter, ReportsController (+3 more)

### Community 9 - "App TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, baseUrl, jsx, lib, module, moduleResolution, noEmit (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (10): getJournalSha256(), TransactionId, Transaction, TransactionTypeSchema, createTransactionSchema, FormattedTransaction, formatTransactionResponse(), postingSchema (+2 more)

### Community 11 - "Ledger and Account Logic"
Cohesion: 0.11
Nodes (27): AccountResponse, db, dbContext, accounts, accountsRelations, connectors, postings, postingsRelations (+19 more)

### Community 12 - "Node TypeScript Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, baseUrl, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames, lib, module (+8 more)

### Community 13 - "Dashboard UI Components"
Cohesion: 0.18
Nodes (7): DashboardView(), MonthlyFlowCategoryView(), NetWorthView(), NetWorthViewProps, SettlementView(), SettlementViewProps, formatCurrency()

### Community 14 - "Monthly Flow UI Components"
Cohesion: 0.23
Nodes (7): EMPTY_ACCOUNTS, EMPTY_TRANSACTIONS, MONTHS, CategoryPostingRow, MonthlyFlowCategoryViewProps, MonthlyFlowView(), MonthlyFlowViewProps

### Community 15 - "Settlement UI View"
Cohesion: 0.10
Nodes (18): buildWhereClause(), DbClient, DBPosting, generateReport(), getAccountRegisterInMemory(), getAllTransactions(), AccountBalance, AccountBalanceSchema (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.32
Nodes (7): D1_DIR, JOURNAL_PATH, main(), migrateDatabase(), parseJournalFile(), RawPosting, RawTransaction

### Community 17 - "Main Application Views"
Cohesion: 0.32
Nodes (4): InboxView(), AppContent(), getPageTitle(), queryClient

### Community 18 - "Community 18"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (7): 🔒 Agent Customization Guidelines, 🗄️ Database Management & Migrations, 💻 Local Development, Pacioli-App, 🚀 Production Deployment (Hybrid Approach), 📁 Project Structure, 🛠️ Technology Stack

### Community 20 - "Entity Management UI"
Cohesion: 0.24
Nodes (6): cn(), AccountFormView(), AccountsListView(), CategoriesListView(), CategoryFormView(), PersonFormView()

### Community 22 - "Account Schema Definitions"
Cohesion: 0.05
Nodes (42): AccountsController, createAccountSchema, updateAccountSchema, accountsRouter, approvePayloadSchema, ReportsService, AccountEntitySchema, AccountTypeSchema (+34 more)

### Community 23 - "Settings and Connectors UI"
Cohesion: 0.38
Nodes (3): ConnectorsView(), PreferencesView(), SettingsView()

### Community 24 - "Ledger View Components"
Cohesion: 0.50
Nodes (3): getLocalDateString(), LedgerView(), LedgerViewProps

### Community 25 - "Select Input Component"
Cohesion: 0.40
Nodes (4): CustomSelect(), CustomSelectProps, SelectGroup, SelectOption

### Community 31 - "Community 31"
Cohesion: 0.06
Nodes (35): dependencies, class-variance-authority, clsx, drizzle-orm, @fontsource-variable/geist, framer-motion, hono, lucide-react (+27 more)

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (3): TransactionFormView(), TransactionFormViewProps, TransactionsView()

## Knowledge Gaps
- **166 isolated node(s):** `envSchema`, `parsed`, `DbClient`, `DBPosting`, `preferences` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generateHledgerPath()` connect `Account Schema Definitions` to `Entity Management UI`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `AccountFormView()` connect `Entity Management UI` to `Account Schema Definitions`?**
  _High betweenness centrality (0.166) - this node is a cross-community bridge._
- **Why does `cn()` connect `Entity Management UI` to `Community 33`, `Account API Routes`, `Dashboard UI Components`, `Ledger View Components`, `Select Input Component`, `Button UI Component`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **What connects `envSchema`, `parsed`, `DbClient` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Project Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Connector Management` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Should `API Client Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.12105263157894737 - nodes in this community are weakly interconnected._