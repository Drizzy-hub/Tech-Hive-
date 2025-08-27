import winston from 'winston';
import config from '../config';

const { combine, timestamp, errors, printf, colorize, json } = winston.format;


const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (stack) {
    msg += `\n${stack}`;
  }
  
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`;
  }
  
  return msg;
});


export const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'dataulinzi-backend' },
  transports: [

    new winston.transports.File({
      filename: config.logging.file,
      format: combine(json()),
      maxsize: 5242880, 
      maxFiles: 5,
    }),
    
   
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: combine(json()),
      maxsize: 5242880, 
      maxFiles: 5,
    }),
  ],
});


if (config.server.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'HH:mm:ss' }),
      logFormat
    ),
  }));
}


export const requestLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/requests.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

export default logger;