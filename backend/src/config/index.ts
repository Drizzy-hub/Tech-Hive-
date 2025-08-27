import dotenv from 'dotenv';

dotenv.config();

interface Config {
  server: {
    port: number;
    env: string;
    apiPrefix: string;
  };
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    maxConnections: number;
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
    url: string;
  };
  trufflehog: {
    timeout: number;
    maxConcurrentScans: number;
  };
  security: {
    jwtSecret: string;
    bcryptRounds: number;
  };
  logging: {
    level: string;
    file: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'dataulinzi_db',
    user: process.env.DB_USER || 'dataulinzi_user',
    password: process.env.DB_PASSWORD || 'dataulinzi_pass',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
    url: process.env.DATABASE_URL || 
         `postgresql://${process.env.DB_USER || 'dataulinzi_user'}:${process.env.DB_PASSWORD || 'dataulinzi_pass'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'dataulinzi_db'}`,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '86400', 10),
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  trufflehog: {
    timeout: parseInt(process.env.TRUFFLEHOG_TIMEOUT || '300000', 10),
    maxConcurrentScans: parseInt(process.env.TRUFFLEHOG_MAX_CONCURRENT_SCANS || '3', 10),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};
console.log('DEBUG Final Config:', JSON.stringify(config, null, 2));

export default config;