# @finance-platform/automation

This package owns data collection (connectors), source records ingestion, normalizing raw payload structures, and candidate generation.

## Domain Boundaries

* **No Hledger Knowledge**: This package knows nothing about Hledger, ledger paths, accounts' accounting semantics, or reporting.
* **Flow**:
  1. **Connectors** (e.g. Google Sheets Connector in V1) fetch external data.
  2. RAW data is saved as **Source Records** in the app DB.
  3. Parsers analyze the raw data and perform normalization.
  4. The normalizer generates a **Transaction Candidate** contract payload.
  5. The staging candidates are loaded into the **Inbox** stage via the shared contracts.
* **Rules**:
  * Auto-categorization is prohibited.
  * Connectors are dumb; they do not perform semantic adjustments, only mapping structure to candidates.
