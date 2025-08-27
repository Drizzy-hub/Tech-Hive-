import { Pool, PoolConfig } from 'pg';
import Redis from 'ioredis';
import config from './index';
import { logger } from '../utils/logger';

// PostgreSQL connection
const poolConfig: PoolConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: config.database.maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

export const db = new Pool(poolConfig);

// Test database connection
db.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

db.on('error', (err) => {
  logger.error('PostgreSQL connection error:', err);
});

// Redis connection
const redisOptions: any = {
  host: config.redis.host,
  port: config.redis.port,
  db: config.redis.db,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
};


if (config.redis.password) {
  redisOptions.password = config.redis.password;
}

export const redis = new Redis(redisOptions);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});


export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test PostgreSQL connection
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    // Test Redis connection
    await redis.ping();
    
    logger.info('Database connections initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// shutdown
export const closeConnections = async (): Promise<void> => {
  try {
    await db.end();
    redis.disconnect();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
};

// create tables 
export const createTables = async (): Promise<void> => {
  const createScansTable = `
    CREATE TABLE IF NOT EXISTS scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      repo_url TEXT NOT NULL,
      provider TEXT NOT NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_scans_repo_provider ON scans(repo_url, provider);
    CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
  `;

  try {
    await db.query(createScansTable);
    logger.info('Database tables created successfully');
  } catch (error) {
    logger.error('Error creating database tables:', error);
    throw error;
  }
};