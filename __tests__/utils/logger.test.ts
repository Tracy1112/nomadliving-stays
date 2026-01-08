/**
 * Tests for structured logging utility
 * @module __tests__/utils/logger
 */

import { logger, logError, logInfo, logWarn, logDebug, logPerformance } from '@/utils/logger';

// Mock console methods
const originalConsole = { ...console };
const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

beforeAll(() => {
  global.console = mockConsole as any;
});

afterAll(() => {
  global.console = originalConsole;
});

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  describe('logDebug', () => {
    it('should log debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      logDebug('Debug message', { key: 'value' });
      expect(mockConsole.debug).toHaveBeenCalledWith('[DEBUG] Debug message', { key: 'value' });
    });

    it('should not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      logDebug('Debug message');
      expect(mockConsole.debug).not.toHaveBeenCalled();
    });
  });

  describe('logInfo', () => {
    it('should log info messages in development', () => {
      process.env.NODE_ENV = 'development';
      logInfo('Info message', { key: 'value' });
      expect(mockConsole.info).toHaveBeenCalledWith('[INFO] Info message', { key: 'value' });
    });

    it('should not log info messages in production (console)', () => {
      process.env.NODE_ENV = 'production';
      logInfo('Info message');
      expect(mockConsole.info).not.toHaveBeenCalled();
    });
  });

  describe('logWarn', () => {
    it('should log warning messages', () => {
      logWarn('Warning message', { key: 'value' });
      expect(mockConsole.warn).toHaveBeenCalledWith('[WARN] Warning message', { key: 'value' });
    });
  });

  describe('logError', () => {
    it('should log error messages', () => {
      const error = new Error('Test error');
      logError('Error message', error, { key: 'value' });
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should log error messages without error object', () => {
      logError('Error message', undefined, { key: 'value' });
      expect(mockConsole.error).toHaveBeenCalled();
    });

    it('should include error details in context', () => {
      const error = new Error('Test error');
      logError('Error message', error, { additional: 'context' });
      const callArgs = mockConsole.error.mock.calls[0];
      expect(callArgs[0]).toContain('[ERROR] Error message');
    });
  });

  describe('logPerformance', () => {
    it('should log performance metrics in development', () => {
      process.env.NODE_ENV = 'development';
      logPerformance('Database query', 150, { query: 'SELECT * FROM users' });
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[PERF] Database query took 150ms',
        { query: 'SELECT * FROM users' }
      );
    });

    it('should not log performance in production (console)', () => {
      process.env.NODE_ENV = 'production';
      logPerformance('Database query', 150);
      expect(mockConsole.log).not.toHaveBeenCalled();
    });
  });

  describe('logger instance', () => {
    it('should provide all logging methods', () => {
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.performance).toBeDefined();
    });
  });
});

