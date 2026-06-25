import { inboxRepository, type DBTransactionCandidate } from './inbox.repository.js';
import type { TransactionCandidate, CandidateId, SourceRecord } from '../../../src/shared-types/index.js';
import { NotFoundError, BadRequestError } from '../../errors/index.js';

export class InboxService {
  async getPendingCandidates(): Promise<TransactionCandidate[]> {
    return inboxRepository.findPending();
  }

  async getDeferredCandidates(): Promise<TransactionCandidate[]> {
    return inboxRepository.findDeferred();
  }

  async getTrashCandidates(): Promise<TransactionCandidate[]> {
    // 3 days cooldown period
    const cooldownLimit = new Date();
    cooldownLimit.setDate(cooldownLimit.getDate() - 3);
    return inboxRepository.findDeleted(cooldownLimit);
  }

  async getCandidateById(id: CandidateId): Promise<TransactionCandidate> {
    const candidate = await inboxRepository.findById(id);
    if (!candidate) {
      throw new NotFoundError(`Candidate with ID ${id} not found`);
    }
    return candidate;
  }

  async getCandidateDetails(id: CandidateId): Promise<{ candidate: TransactionCandidate; sourceRecord: SourceRecord | null }> {
    const candidate = await this.getCandidateById(id);
    const sourceRecord = await inboxRepository.getSourceRecordById(candidate.sourceRecordId);
    return { candidate, sourceRecord };
  }

  async approveCandidate(id: CandidateId, updates: Partial<Omit<TransactionCandidate, 'id' | 'status'>>): Promise<TransactionCandidate> {
    const cand = await this.getCandidateById(id);
    if (cand.status === 'Approved') {
      throw new BadRequestError('Candidate is already approved');
    }

    // Update DB candidate status
    const updated = await inboxRepository.update(id, {
      ...updates,
      status: 'Approved',
    } as Partial<Omit<DBTransactionCandidate, 'id'>>);

    if (!updated) {
      throw new NotFoundError(`Candidate with ID ${id} failed to update`);
    }

    // Note: Future Milestones will interface here to write the transaction into Hledger journal
    return updated;
  }

  async deferCandidate(id: CandidateId): Promise<TransactionCandidate> {
    await this.getCandidateById(id);
    const updated = await inboxRepository.update(id, { status: 'Deferred' });
    if (!updated) throw new NotFoundError(`Candidate with ID ${id} failed to update`);
    return updated;
  }

  async undeferCandidate(id: CandidateId): Promise<TransactionCandidate> {
    await this.getCandidateById(id);
    const updated = await inboxRepository.update(id, { status: 'Pending' });
    if (!updated) throw new NotFoundError(`Candidate with ID ${id} failed to update`);
    return updated;
  }

  async deleteCandidate(id: CandidateId): Promise<TransactionCandidate> {
    await this.getCandidateById(id);
    const updated = await inboxRepository.update(id, { 
      status: 'Deleted', 
      deletedAt: new Date() 
    });
    if (!updated) throw new NotFoundError(`Candidate with ID ${id} failed to update`);
    return updated;
  }

  async restoreCandidate(id: CandidateId): Promise<TransactionCandidate> {
    await this.getCandidateById(id);
    const updated = await inboxRepository.update(id, { 
      status: 'Pending', 
      deletedAt: null 
    });
    if (!updated) throw new NotFoundError(`Candidate with ID ${id} failed to update`);
    return updated;
  }

  async purgeCandidate(id: CandidateId): Promise<boolean> {
    await this.getCandidateById(id);
    return inboxRepository.deletePermanently(id);
  }
}
export const inboxService = new InboxService();
