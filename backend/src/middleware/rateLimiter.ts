import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/database';
import config from '../config';
import { logger } from '../utils/logger';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

class RateLimiter {
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req) => req.ip || '',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };
  }

  public middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `rate_limit:${this.options.keyGenerator!(req)}`;
      const now = Date.now();
      const window = this.options.windowMs;
      const windowStart = now - window;

      // Clean up old entries and get current count
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zcard(key);
      multi.expire(key, Math.ceil(window / 1000));
      
      const results = await multi.exec();
      
      if (!results) {
        throw new Error('Redis transaction failed');
      }

      const currentCount = results[1][1] as number;

      if (currentCount >= this.options.maxRequests) {
        res.status(429).json({
          success: false,
          error: {
            message: 'Too many requests, please try again later',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          retryAfter: Math.ceil(window / 1000),
          timestamp: new Date().toISOString(),
        });
        return;
      }

      
      await redis.zadd(key, now, `${now}-${Math.random()}`);

    
      res.set({
        'X-RateLimit-Limit': this.options.maxRequests.toString(),
        'X-RateLimit-Remaining': (this.options.maxRequests - currentCount - 1).toString(),
        'X-RateLimit-Reset': new Date(now + window).toISOString(),
      });

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      next();
    }
  };
}

export const rateLimiter = new RateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxRequests,
}).middleware;


export const scanRateLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, 
  maxRequests: 10, 
  keyGenerator: (req) => `scan:${req.ip}`,
}).middleware;

export default RateLimiter;