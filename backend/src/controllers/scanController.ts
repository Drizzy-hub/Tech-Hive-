import { Request, Response, NextFunction } from 'express';
import { scanService } from '../services/scanService';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiResponse, ScanRequest, HistoryQuery } from '../models/scan';

export class ScanController {
 
  scanRepository = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const scanRequest: ScanRequest = req.body;
    const clientIp = req.ip;
    const userAgent = req.get('User-Agent');

    logger.info('Scan request received', {
      repoUrl: scanRequest.repoUrl,
      provider: scanRequest.provider,
      clientIp,
      userAgent
    });

    const startTime = Date.now();
    
    try {
      const result = await scanService.scanRepository(scanRequest);
      const duration = Date.now() - startTime;

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      logger.info('Scan request completed', {
        repoUrl: scanRequest.repoUrl,
        provider: scanRequest.provider,
        duration,
        vulnerabilities: result.vulnerabilities.length,
        verified: result.metadata.verifiedVulnerabilities,
        clientIp
      });

      res.status(200).json(response);
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Scan request failed', {
        repoUrl: scanRequest.repoUrl,
        provider: scanRequest.provider,
        duration,
        clientIp,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  });

  
  getScanHistory = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const query: HistoryQuery = req.query as any;
    const clientIp = req.ip;

    logger.debug('Scan history request received', {
      query,
      clientIp
    });

    try {
      const result = await scanService.getScanHistory(query);

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      (response as any).pagination = result.pagination;

      logger.debug('Scan history request completed', {
        totalResults: result.pagination.total,
        page: result.pagination.page,
        clientIp
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Scan history request failed', {
        query,
        clientIp,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  });

  getScanById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const clientIp = req.ip;

    logger.debug('Get scan by ID request received', { id, clientIp });

    try {
      const result = await scanService.getScanById(id);

      if (!result) {
        const response: ApiResponse = {
          success: false,
          error: {
            message: 'Scan not found',
            code: 'SCAN_NOT_FOUND'
          },
          timestamp: new Date().toISOString()
        };

        return res.status(404).json(response);
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };

      logger.debug('Get scan by ID completed', { id, clientIp });
      res.status(200).json(response);
    } catch (error) {
      logger.error('Get scan by ID failed', {
        id,
        clientIp,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  });


  invalidateCache = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { repoUrl } = req.body;
    const clientIp = req.ip;

    if (!repoUrl) {
      const response: ApiResponse = {
        success: false,
        error: {
          message: 'Repository URL is required',
          code: 'VALIDATION_ERROR'
        },
        timestamp: new Date().toISOString()
      };

      return res.status(400).json(response);
    }

    logger.info('Cache invalidation request received', { repoUrl, clientIp });

    try {
      const deletedKeys = await scanService.invalidateRepositoryCache(repoUrl);

      const response: ApiResponse<{ deletedKeys: number }> = {
        success: true,
        data: { deletedKeys },
        timestamp: new Date().toISOString()
      };

      logger.info('Cache invalidation completed', { repoUrl, deletedKeys, clientIp });
      res.status(200).json(response);
    } catch (error) {
      logger.error('Cache invalidation failed', {
        repoUrl,
        clientIp,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  });


  getHealth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip;

    try {
      const health = await scanService.getServiceHealth();

      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;

      const response: ApiResponse<typeof health> = {
        success: health.status !== 'unhealthy',
        data: health,
        timestamp: new Date().toISOString()
      };

      logger.debug('Health check completed', {
        status: health.status,
        services: health.services,
        clientIp
      });

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Health check failed', {
        clientIp,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      const response: ApiResponse = {
        success: false,
        error: {
          message: 'Health check failed',
          code: 'HEALTH_CHECK_ERROR'
        },
        timestamp: new Date().toISOString()
      };

      res.status(503).json(response);
    }
  });

  getStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const clientIp = req.ip;

    try {
      const health = await scanService.getServiceHealth();

      const response: ApiResponse<typeof health.stats> = {
        success: true,
        data: health.stats,
        timestamp: new Date().toISOString()
      };

      logger.debug('Stats request completed', { clientIp });
      res.status(200).json(response);
    } catch (error) {
      logger.error('Stats request failed', {
        clientIp,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      next(error);
    }
  });
}

export const scanController = new ScanController();