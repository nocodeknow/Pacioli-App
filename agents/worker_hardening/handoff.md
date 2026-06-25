# Handoff Report — Database & API Hardening

This handoff report summarizes the fixes implemented for the critical vulnerabilities and edge cases identified in Milestone 5.

## 1. Observation
- **Cascade Delete Vulnerability**: In `apps/api/src/db/schema.ts` (lines 11 and 76), accounts and postings are set to cascade delete. If a parent account was deleted, SQLite silently cascade deleted its child accounts and postings, leaving unbalanced transaction headers in the database.
- **Infinite Recursion on Cyclic Renaming**: In `packages/ledger-interface/src/write.ts` (`renameAccountInJournal` & `updateAccountHierarchy`), renaming a parent account to a subpath of one of its own descendants created a cyclic parent-child loop and triggered a node process crash (`RangeError: Maximum call stack size exceeded`).
- **Path-Based Transaction Type Derivation**: In `packages/ledger-interface/src/read.ts` (lines 244-245) and `apps/api/src/modules/transactions/transactions.service.ts` (lines 41-42), transaction type derivation used string pattern matching `LIKE 'assets:%'` rather than checking the `accounts.type` database column.
- **Display Name / Path Desync**: In `packages/ledger-interface/src/write.ts` (`updateAccountHierarchy`), when updates only changed `displayName` but kept `parentId` the same, the materialized `path` and all recursive child paths were not updated, leaving them out-of-sync with the display name segment.
- **Gregorian Date Validation Loophole**: Dates like `2026-02-30` or `2026-00-00` passed the basic regex format `^\d{4}-\d{2}-\d{2}$` and were inserted into the SQLite database, causing discrepancies in reporting aggregations.
- **Double-Click Submission**: `apps/web/src/components/transactions/TransactionFormView.tsx` lacked an `isSaving` state, permitting multiple duplicate clicks on the submit/save buttons and generating duplicate transaction entries under latencies.
- **HTTP Status Mapping**: database unique constraint violations and ledger validation errors (like unbalanced transaction, posting to group account) triggered `500 Internal Server Error` responses to the client instead of standard `400 Bad Request` validation responses.

## 2. Logic Chain
- **Cascade Delete**: By checking for child accounts (`hasChildren`) and transaction history postings (`hasPostings`) at the beginning of `deleteAccount` in `apps/api/src/modules/accounts/accounts.service.ts` and throwing a `BadRequestError` if any are found, we prevent SQLite from performing cascade deletions that leave unbalanced transactions.
- **Cyclic Renaming**: We introduced the `isDescendantOrSelf` helper function to traverse the parent chain in the database. In `renameAccountInJournal` and `updateAccountHierarchy`, if the target parent ID matches the account itself or one of its descendants, we abort and throw an error, preventing infinite loops.
- **Transaction Type**: By refactoring the SQL `CASE` statement inside `getAllTransactions` and `getTransactionById` to check `LOWER(accounts.type) = 'income'` and `LOWER(accounts.type) IN ('asset', 'liability', 'equity')`, we correctly classify transactions as transfers, income, or expenses using the structured type column rather than path matching.
- **Path Recalculation**: By modifying `updateAccountHierarchy` to accept an optional `path` override and conditionally calculating the new path segment using the display name when `path` is not provided (and updating children paths recursively), we ensure the path always reflects name and hierarchy updates correctly.
- **Date Verification**: We wrote `isValidCalendarDate` in `packages/shared-types/src/utils.ts` to perform Gregorian calendar validity checks. We incorporated it in Zod schemas in `account.ts` and `transaction.ts`, the Express transactions controller, and validated `startDate`/`endDate` parameters in the ledger query controller.
- **Double-Click**: We implemented `isSaving` state using `useState` in `TransactionFormView.tsx` and set it to true upon submission, disabling both save and delete buttons and changing the label to "Saving...", preventing duplicate requests.
- **Error Mapping**: In `errorHandler` in `apps/api/src/middleware/error.ts`, we mapped specific error messages containing keywords like `Unbalanced transaction!`, `Account not found in database`, `Cannot post transaction to a group/header account`, `Cyclic parent reference`, `SQLITE_CONSTRAINT`, and `Cannot delete account` to `400 Bad Request` status codes.

## 3. Caveats
- Seeding runs asynchronously on database client initialization which can cause SQLite locks or constraint failures in parallel test environments. Vitest was run with `--fileParallelism=false` to execute sequentially and prevent these race conditions.
- Group accounts cannot have postings (e.g. non-zero opening balances) due to double-entry accounting rules, so tests creating group accounts with non-zero opening balances were updated to use zero opening balances.

## 4. Conclusion
All identified security vulnerabilities, business logic gaps, date validation loopholes, and concurrency bugs in Milestone 5 have been successfully hardened. The application is robust and behaves correctly under invalid inputs.

## 5. Verification Method
Verify that all tests pass and that TypeScript compiles successfully:
```bash
pnpm typecheck
pnpm test
```
All modified files to inspect:
- `packages/shared-types/src/utils.ts`
- `packages/shared-types/src/account.ts`
- `packages/shared-types/src/transaction.ts`
- `packages/ledger-interface/src/write.ts`
- `packages/ledger-interface/src/read.ts`
- `apps/api/src/modules/accounts/accounts.service.ts`
- `apps/api/src/modules/accounts/accounts.controller.ts`
- `apps/api/src/modules/transactions/transactions.controller.ts`
- `apps/api/src/modules/transactions/transactions.service.ts`
- `apps/api/src/middleware/error.ts`
- `apps/api/src/modules/e2e.test.ts`
- `apps/web/src/components/transactions/TransactionFormView.tsx`
