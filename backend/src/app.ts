import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import config from './config';
import { logger, requestLogger } from './utils/logger';
import { initializeDatabase, createTables } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { swaggerSpec } from './config/swagger';
import scanRoutes from './routes/scan';
import healthRoutes from './routes/health';

class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
   
    this.app.set('trust proxy', 1);


    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
    }));

    this.app.use(rateLimiter);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    const morganFormat = config.server.env === 'production' ? 'combined' : 'dev';
    this.app.use(morgan(morganFormat, {
      stream: {
        write: (message: string) => {
          requestLogger.info(message.trim());
        },
      },
    }));

    // Swagger documentation
    this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // API prefix middleware
    this.app.use(config.server.apiPrefix, (req, res, next) => {
      res.header('X-API-Version', '1.0');
      next();
    });
  }

  private initializeRoutes(): void {
    // Welcome route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'DataUlinzi Backend API',
        version: '1.0.0',
        docs: '/docs',
        health: '/health',
      });
    });

    // API routes
    this.app.use(`${config.server.apiPrefix}`, scanRoutes);
    this.app.use('/health', healthRoutes);

    // 404 handler
    this.app.use(/(.*)/, (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Route not found',
          code: 'ROUTE_NOT_FOUND',
        },
        timestamp: new Date().toISOString(),
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize database connections
      await initializeDatabase();
      
      // Create database tables
      await createTables();
      
      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Application initialization failed:', error);
      throw error;
    }
  }
}

export default App;