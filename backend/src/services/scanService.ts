import { TruffleHogService } from './trufflehogService';
import { cacheService } from './cacheService';
import { scanRepository } from '../repositories/scanRepository';
import { logger } from '../utils/logger';
import { ScanResult, ScanRequest, HistoryQuery, HistoryResponse } from '../models/scan';
import { ValidationError, ScanError } from '../middleware/errorHandler';

export class ScanService {
  private trufflehogService: TruffleHogService;

  constructor() {
    this.trufflehogService = new TruffleHogService();
  }

 
  async scanRepository(scanRequest: ScanRequest): Promise<ScanResult> {
    const { repoUrl, provider } = scanRequest;
    
    

    logger.info('Starting repository scan', { 
      repoUrl: repoUrl, 
      provider,
      originalUrl: repoUrl !== repoUrl ? repoUrl : undefined 
    });

    const startTime = Date.now();

    try {
      //  Check cache first
      const cachedResult = await cacheService.getScanResult(repoUrl, provider);
      if (cachedResult) {
        logger.info('Returning cached scan result', {
          repoUrl: repoUrl,
          provider,
          age: Date.now() - new Date(cachedResult.metadata.scannedAt).getTime(),
          vulnerabilities: cachedResult.vulnerabilities.length
        });
        return cachedResult;
      }

    
      const isAvailable = await this.trufflehogService.checkTruffleHogAvailability();
      if (!isAvailable) {
        throw new ScanError('TruffleHog scanner is not available. Please ensure it is properly installed.');
      }

  
      logger.info('Cache miss - performing fresh scan', { repoUrl: repoUrl, provider });
      const vulnerabilities = await this.trufflehogService.scanRepository(repoUrl, provider);

     
      const scanDuration = Date.now() - startTime;
      const scanResult: ScanResult = {
        repoUrl: repoUrl,
        provider,
        vulnerabilities,
        metadata: {
          totalVulnerabilities: vulnerabilities.length,
          verifiedVulnerabilities: vulnerabilities.filter(v => v.Verified).length,
          scanDuration,
          scannedAt: new Date()
        }
      };

    
      cacheService.setScanResult(repoUrl, provider, scanResult).catch(error => {
        logger.warn('Failed to cache scan result', { error: error.message });
      });


      scanRepository.createScanRecord(scanResult).catch(error => {
        logger.warn('Failed to store scan result in database', { error: error.message });
      });

      logger.info('Scan completed successfully', {
        repoUrl: repoUrl,
        provider,
        duration: scanDuration,
        totalVulnerabilities: scanResult.metadata.totalVulnerabilities,
        verifiedVulnerabilities: scanResult.metadata.verifiedVulnerabilities
      });

      return scanResult;

    } catch (error) {
      const scanDuration = Date.now() - startTime;
      logger.error('Scan failed', {
        repoUrl: repoUrl,
        provider,
        duration: scanDuration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

 
      if (error instanceof ValidationError || error instanceof ScanError) {
        throw error;
      }

    
      throw new ScanError(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  async getScanHistory(query: HistoryQuery): Promise<HistoryResponse> {
    try {
      logger.debug('Retrieving scan history', { query });
      
      const history = await scanRepository.getScanHistory(query);
      
      logger.debug('Scan history retrieved successfully', {
        totalResults: history.pagination.total,
        page: history.pagination.page,
        limit: history.pagination.limit
      });

      return history;
    } catch (error) {
      logger.error('Failed to get scan history', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new ScanError('Failed to retrieve scan history');
    }
  }

  async getScanById(id: string): Promise<ScanResult | null> {
    try {
      const record = await scanRepository.getScanById(id);
      return record ? record.result : null;
    } catch (error) {
      logger.error('Failed to get scan by ID', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new ScanError('Failed to retrieve scan');
    }
  }


  async deleteScan(id: string): Promise<boolean> {
    try {
     
      const record = await scanRepository.getScanById(id);
      
    
      const deleted = await scanRepository.deleteScan(id);
      
      if (deleted && record) {
        await cacheService.deleteScanResult(record.repo_url, record.provider);
      }
      
      logger.info('Scan deleted successfully', { id, deleted });
      return deleted;
    } catch (error) {
      logger.error('Failed to delete scan', {
        id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new ScanError('Failed to delete scan');
    }
  }

  async invalidateRepositoryCache(repoUrl: string): Promise<number> {
    try {
      const sanitizedUrl = repoUrl;
      const deletedCount = await cacheService.invalidateRepository(sanitizedUrl);
      
      logger.info('Repository cache invalidated', { 
        repoUrl: sanitizedUrl, 
        deletedKeys: deletedCount 
      });
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to invalidate repository cache', {
        repoUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }


  async getServiceHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      trufflehog: boolean;
      database: boolean;
      cache: boolean;
    };
    stats: {
      scan: any;
      cache: any;
      scanner: any;
    };
  }> {
    try {
      const [trufflehogAvailable, dbHealthy, cacheHealthy] = await Promise.all([
        this.trufflehogService.checkTruffleHogAvailability(),
        scanRepository.healthCheck(),
        cacheService.healthCheck()
      ]);

     
      const services = {
        trufflehog: trufflehogAvailable,
        database: dbHealthy,
        cache: cacheHealthy
      };

    
      const healthyServices = Object.values(services).filter(Boolean).length;
      let status: 'healthy' | 'degraded' | 'unhealthy';
      
      if (healthyServices === 3) {
        status = 'healthy';
      } else if (healthyServices >= 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        status,
        services,
        stats: {
          scan: {},
          cache: {},
          scanner: {}
        }
      };
    } catch (error) {
      logger.error('Failed to get service health', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        status: 'unhealthy',
        services: {
          trufflehog: false,
          database: false,
          cache: false
        },
        stats: {
          scan: {},
          cache: {},
          scanner: {}
        }
      };
    }
  }


 
}


export const scanService = new ScanService();