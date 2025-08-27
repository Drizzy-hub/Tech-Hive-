import { Pool} from 'pg';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { ScanResult, ScanRecord, HistoryQuery, HistoryResponse } from '../models/scan';

export class ScanRepository {
  constructor(private pool: Pool = db) {}

  async createScanRecord(scanResult: ScanResult): Promise<ScanRecord> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO scans (repo_url, provider, result, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, repo_url, provider, result, created_at
      `;

      const values = [
        scanResult.repoUrl,
        scanResult.provider,
        JSON.stringify(scanResult)
      ];

      const result = await client.query(query, values);
      const record = result.rows[0];

      logger.info('Scan record created', {
        id: record.id,
        repoUrl: record.repo_url,
        provider: record.provider,
        vulnerabilities: scanResult.vulnerabilities.length
      });

      return {
        id: record.id,
        repo_url: record.repo_url,
        provider: record.provider,
        result: record.result,
        created_at: record.created_at
      };
    } catch (error) {
      logger.error('Failed to create scan record', {
        repoUrl: scanResult.repoUrl,
        provider: scanResult.provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getScanHistory(query: HistoryQuery): Promise<HistoryResponse> {
    const client = await this.pool.connect();
    
    try {
      const {
        repoUrl,
        provider,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = query;

      const offset = (page - 1) * limit;
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (repoUrl) {
        whereConditions.push(`repo_url = $${paramIndex++}`);
        queryParams.push(repoUrl);
      }

      if (provider) {
        whereConditions.push(`provider = $${paramIndex++}`);
        queryParams.push(provider);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

     
      const allowedSortFields = ['created_at', 'repo_url'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      const countQuery = `
        SELECT COUNT(*) as total
        FROM scans
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      const dataQuery = `
        SELECT id, repo_url, provider, result, created_at
        FROM scans
        ${whereClause}
        ORDER BY ${safeSortBy} ${safeSortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);
      const dataResult = await client.query(dataQuery, queryParams);

      const records: ScanRecord[] = dataResult.rows.map(row => ({
        id: row.id,
        repo_url: row.repo_url,
        provider: row.provider,
        result: row.result,
        created_at: row.created_at
      }));

      const totalPages = Math.ceil(total / limit);

      logger.debug('Retrieved scan history', {
        total,
        page,
        limit,
        totalPages,
        repoUrl,
        provider
      });

      return {
        data: records,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages
        }
      };
    } catch (error) {
      logger.error('Failed to get scan history', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getLatestScan(repoUrl: string, provider: string): Promise<ScanRecord | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, repo_url, provider, result, created_at
        FROM scans
        WHERE repo_url = $1 AND provider = $2
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await client.query(query, [repoUrl, provider]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const record = result.rows[0];
      return {
        id: record.id,
        repo_url: record.repo_url,
        provider: record.provider,
        result: record.result,
        created_at: record.created_at
      };
    } catch (error) {
      logger.error('Failed to get latest scan', {
        repoUrl,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async getScanById(id: string): Promise<ScanRecord | null> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT id, repo_url, provider, result, created_at
        FROM scans
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const record = result.rows[0];
      return {
        id: record.id,
        repo_url: record.repo_url,
        provider: record.provider,
        result: record.result,
        created_at: record.created_at
      };
    } catch (error) {
      logger.error('Failed to get scan by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteScan(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM scans WHERE id = $1';
      const result = await client.query(query, [id]);
      const rowCount = result?.rowCount ?? 0;
      
      const deleted = rowCount > 0;
      if (deleted) {
        logger.info('Scan record deleted', { id });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Failed to delete scan', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export const scanRepository = new ScanRepository();