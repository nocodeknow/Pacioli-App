# Journals Storage

This folder holds the Hledger plain-text journals.

## Files

* **main.journal** *(to be created in a future milestone)*: The crown jewel of the system. This file acts as the single source of truth for all transactions, postings, accounts, and derived balances.

## Rules

* **Single Source of Truth**: The Hledger journal is authoritative. If PostgreSQL databases and the journal disagree on balances or postings, the journal wins.
* **No Cache Postings**: No transactions or postings are cached inside the application DB. All reports and balances must be compiled dynamically from this journal file.
