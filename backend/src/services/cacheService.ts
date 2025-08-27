import { redis } from '../config/database';
import config from '../config';
import { logger } from '../utils/logger';
import { ScanResult } from '../models/scan';
import crypto from 'crypto';

export class CacheService {
  private defaultTTL = config.redis.ttl; // Default TTL in seconds

  private generateCacheKey(repoUrl: string, provider: string): string {
    const urlHash = crypto.createHash('md5').update(repoUrl).digest('hex');
    return `scan:${provider}:${urlHash}`;
  }

  async getScanResult(repoUrl: string, provider: string): Promise<ScanResult | null> {
    const cacheKey = this.generateCacheKey(repoUrl, provider);
    
    try {
      const cachedData = await redis.get(cacheKey);
      
      if (!cachedData) {
        logger.debug('Cache miss for scan result', { repoUrl, provider, cacheKey });
        return null;
      }

      const parsedData = JSON.parse(cachedData) as ScanResult;
      logger.debug('Cache hit for scan result', { 
        repoUrl, 
        provider, 
        cacheKey,
        vulnerabilities: parsedData.vulnerabilities.length 
      });

      return parsedData;
    } catch (error) {
      logger.error('Failed to get scan result from cache', {
        repoUrl,
        provider,
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null; 
    }
  }

  async setScanResult(repoUrl: string, provider: string, result: ScanResult, ttl?: number): Promise<boolean> {
    const cacheKey = this.generateCacheKey(repoUrl, provider);
    const cacheTTL = ttl || this.defaultTTL;
    
    try {
      const serializedData = JSON.stringify(result);
      await redis.setex(cacheKey, cacheTTL, serializedData);
      
      logger.debug('Scan result cached successfully', {
        repoUrl,
        provider,
        cacheKey,
        ttl: cacheTTL,
        dataSize: serializedData.length,
        vulnerabilities: result.vulnerabilities.length
      });

      return true;
    } catch (error) {
      logger.error('Failed to cache scan result', {
        repoUrl,
        provider,
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false; 
    }
  }

  async deleteScanResult(repoUrl: string, provider: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(repoUrl, provider);
    
    try {
      const result = await redis.del(cacheKey);
      logger.debug('Scan result deleted from cache', { repoUrl, provider, cacheKey, deleted: result > 0 });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete scan result from cache', {
        repoUrl,
        provider,
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async hasScanResult(repoUrl: string, provider: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(repoUrl, provider);
    
    try {
      const exists = await redis.exists(cacheKey);
      return exists === 1;
    } catch (error) {
      logger.error('Failed to check cache existence', {
        repoUrl,
        provider,
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }


  async getScanResultTTL(repoUrl: string, provider: string): Promise<number> {
    const cacheKey = this.generateCacheKey(repoUrl, provider);
    
    try {
      const ttl = await redis.ttl(cacheKey);
      return ttl;
    } catch (error) {
      logger.error('Failed to get cache TTL', {
        repoUrl,
        provider,
        cacheKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return -2; 
    }
  }

  async invalidateRepository(repoUrl: string): Promise<number> {
    try {
      const urlHash = crypto.createHash('md5').update(repoUrl).digest('hex');
      const pattern = `scan:*:${urlHash}`;
      
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await redis.del(...keys);
      logger.info('Invalidated repository cache', { repoUrl, deletedKeys: deletedCount });
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to invalidate repository cache', {
        repoUrl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  async getCacheStats(): Promise<{
    totalKeys: number;
    scanKeys: number;
    memoryUsed: string;
    hitRate?: number;
  }> {
    try {
      const info = await redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1].trim() : 'Unknown';

      const allKeys = await redis.keys('*');
      const scanKeys = await redis.keys('scan:*');

      // Get hit rate from Redis info if available
      const statsInfo = await redis.info('stats');
      const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
      const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);
      
      let hitRate: number | undefined;
      if (hitsMatch && missesMatch) {
        const hits = parseInt(hitsMatch[1]);
        const misses = parseInt(missesMatch[1]);
        const total = hits + misses;
        hitRate = total > 0 ? (hits / total) * 100 : 0;
      }

      return {
        totalKeys: allKeys.length,
        scanKeys: scanKeys.length,
        memoryUsed,
        hitRate
      };
    } catch (error) {
      logger.error('Failed to get cache stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return {
        totalKeys: 0,
        scanKeys: 0,
        memoryUsed: 'Unknown'
      };
    }
  }

  async clearScanCache(): Promise<number> {
    try {
      const keys = await redis.keys('scan:*');
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await redis.del(...keys);
      logger.info('Cleared all scan cache', { deletedKeys: deletedCount });
      
      return deletedCount;
    } catch (error) {
      logger.error('Failed to clear scan cache', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }
  async setWithTTL(key: string, value: any, ttl: number): Promise<boolean> {
    try {
      const serializedValue = JSON.stringify(value);
      await redis.setex(key, ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Failed to set cache with TTL', {
        key,
        ttl,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }


  async get(key: string): Promise<any | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Failed to get cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
}

export const cacheService = new CacheService();