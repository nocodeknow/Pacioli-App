import { connectorsRepository, type ConnectorRecord } from './connectors.repository.js';
import { NotFoundError } from '../../errors/index.js';

export class ConnectorsService {
  async getConnectors(): Promise<ConnectorRecord[]> {
    // Seed Google Sheets connector config if none exists
    const list = await connectorsRepository.findAll();
    if (list.length === 0) {
      const sheetsSeed = await connectorsRepository.upsert('google-sheets', {
        name: 'Google Sheets',
        status: 'Unconfigured',
        sheetId: null,
        range: null,
        lastSyncedAt: null,
        enabled: true,
        sheetMappings: null,
      });
      return [sheetsSeed];
    }
    return list;
  }

  async getConnectorById(id: string): Promise<ConnectorRecord> {
    const conn = await connectorsRepository.findById(id);
    if (!conn) {
      throw new NotFoundError(`Connector with ID "${id}" not found`);
    }
    return conn;
  }

  async updateConnector(id: string, updates: Partial<Omit<ConnectorRecord, 'id' | 'name'>>): Promise<ConnectorRecord> {
    await this.getConnectorById(id);
    const updated = await connectorsRepository.update(id, updates);
    if (!updated) {
      throw new NotFoundError(`Connector with ID "${id}" failed to update`);
    }
    return updated;
  }
}
export const connectorsService = new ConnectorsService();
