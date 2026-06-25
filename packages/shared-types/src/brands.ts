import { z } from 'zod';

export const AccountIdSchema = z.string().brand<'AccountId'>();
export type AccountId = z.infer<typeof AccountIdSchema>;

export const CategoryIdSchema = z.string().brand<'CategoryId'>();
export type CategoryId = z.infer<typeof CategoryIdSchema>;

export const TransactionIdSchema = z.string().uuid().brand<'TransactionId'>();
export type TransactionId = z.infer<typeof TransactionIdSchema>;

export const TransactionLineIdSchema = z.string().uuid().brand<'TransactionLineId'>();
export type TransactionLineId = z.infer<typeof TransactionLineIdSchema>;

export const SourceRecordIdSchema = z.string().uuid().brand<'SourceRecordId'>();
export type SourceRecordId = z.infer<typeof SourceRecordIdSchema>;

export const CandidateIdSchema = z.string().uuid().brand<'CandidateId'>();
export type CandidateId = z.infer<typeof CandidateIdSchema>;

// ---------------------------------------------------------------------------
// Brand factory helpers
//
// In the hledger-based system, AccountId and CategoryId are NOT database UUIDs —
// they ARE the hledger account/category path strings (e.g. "assets:bank:hdfc").
// These factories make that mapping explicit and traceable. All unsafe casts must
// go through here — never use 'as unknown as AccountId' or 'as any' directly.
// ---------------------------------------------------------------------------

/**
 * Creates a branded AccountId from an hledger account path string.
 * @example toAccountId('assets:bank:hdfc') // AccountId
 */
export function toAccountId(path: string): AccountId {
  // Safe: AccountId is string-branded; the path IS the identity in this system.
  return path as unknown as AccountId;
}

/**
 * Strips the AccountId brand back to a plain string for hledger CLI usage.
 */
export function toAccountPath(id: AccountId): string {
  return id as unknown as string;
}

/**
 * Creates a branded CategoryId from an hledger category path string.
 * @example toCategoryId('expenses:food') // CategoryId
 */
export function toCategoryId(path: string): CategoryId {
  return path as unknown as CategoryId;
}

/**
 * Creates a branded TransactionId from a UUID string.
 * Use only when the UUID provenance is certain (e.g. parsed from a journal tag).
 */
export function toTransactionId(uuid: string): TransactionId {
  return uuid as unknown as TransactionId;
}

