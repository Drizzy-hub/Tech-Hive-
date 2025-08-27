import { Router, Request, Response } from 'express';
import { HealthCheckResponse } from '../models/scan';
import { db, redis } from '../config/database';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Quick health check endpoint for load balancers
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is operational
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    
    const dbClient = await db.connect();
    await dbClient.query('SELECT 1');
    dbClient.release();

    
    await redis.ping();

    
    let trufflehogAvailable = false;
    try {
      await execAsync('trufflehog --version');
      trufflehogAvailable = true;
    } catch {

    }

    const response: HealthCheckResponse = {
      status: 'healthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
        trufflehog: trufflehogAvailable ? 'available' : 'unavailable'
      }
    };

    if (!trufflehogAvailable) {
      response.status = 'healthy'; 
    }

    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', `${responseTime}ms`);
    res.status(200).json(response);

  } catch (error) {
    const response: HealthCheckResponse = {
      status: 'unhealthy',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
        redis: 'disconnected',
        trufflehog: 'unavailable'
      }
    };

    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', `${responseTime}ms`);
    res.status(503).json(response);
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     description: Check if the service is ready to handle requests
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
  
    const dbClient = await db.connect();
    await dbClient.query('SELECT 1');
    dbClient.release();

    await redis.ping();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check
 *     description: Check if the service is alive (for Kubernetes liveness probes)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;