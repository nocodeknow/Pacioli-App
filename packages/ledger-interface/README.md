# @finance-platform/ledger-interface

The ledger-interface package serves as the **only** package allowed to interact with Hledger or access/write to the plain-text journal file (`storage/journals/main.journal`).

## Domain Boundaries

* **No direct DB persistence**: This package does not interface with the application DB directly; it deals solely with Hledger journal reading/writing.
* **Accounting Validation**: Ensures that every transaction to be written is balanced (postings sum to zero) before appending to the journal file.
* **Public Interface**:
  * `createTransaction(tx: Transaction): Promise<void>`
  * `updateTransaction(id: TransactionId, tx: Transaction): Promise<void>`
  * `deleteTransaction(id: TransactionId): Promise<void>`
  * `getBalance(account: AccountName): Promise<Amount>`
  * `getNetWorth(): Promise<Amount>`
  * `getAccountBalances(): Promise<AccountBalance[]>`
  * `generateReport(query: ReportQuery): Promise<Report>`
