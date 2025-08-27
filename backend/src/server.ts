import { createServer } from 'http';
import App from './app';
import config from './config';
import { logger } from './utils/logger';
import { closeConnections } from './config/database';

const startServer = async (): Promise<void> => {
  try {
    
    const app = new App();
    await app.initialize();

   
    const server = createServer(app.app);

 
    server.listen(config.server.port, () => {
      logger.info(`🚀 DataUlinzi Backend API running on port ${config.server.port}`);
      logger.info(`📝 API Documentation available at http://localhost:${config.server.port}/docs`);
      logger.info(`🏥 Health check available at http://localhost:${config.server.port}/health`);
      logger.info(`🌍 Environment: ${config.server.env}`);
      logger.info(`📊 API Base URL: http://localhost:${config.server.port}${config.server.apiPrefix}`);
    });

    
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(async (err) => {
        if (err) {
          logger.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        try {
       
          await closeConnections();
          logger.info('✅ Server shut down successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during cleanup:', error);
          process.exit(1);
        }
      });

      
      setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

   
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

  
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

    logger.info('🎉 Server started successfully');

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    
    try {
      await closeConnections();
    } catch (closeError) {
      logger.error('Error closing connections during startup failure:', closeError);
    }
    
    process.exit(1);
  }
};


startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});