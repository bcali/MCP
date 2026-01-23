/**
 * Structured logging utility for MCP Hub
 * Outputs JSON logs for production, human-readable logs for development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();

    if (this.isDevelopment) {
      // Human-readable format for development
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      const levelPrefix = `[${level.toUpperCase()}]`;
      console.error(`${timestamp} ${levelPrefix} ${message}${contextStr}`);
    } else {
      // Structured JSON for production
      const logEntry = {
        timestamp,
        level,
        message,
        ...context,
      };
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorContext.error = error;
    }

    this.log('error', message, errorContext);
  }
}

export const logger = new Logger();
