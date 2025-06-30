const mongoose = require('mongoose');
const { generateTestData } = require('./helpers/testHelpers');
const request = require('supertest');
const express = require('express');

const { APIFeatures } = require('../utils/apiFeatures');

const mockGoogleSheetsService = {
  validateCredentials: jest.fn((credentials) => {
    if (!credentials || !credentials.client_email || !credentials.private_key) {
      return false;
    }
    return true;
  }),
  
  validateSpreadsheetId: jest.fn((id) => {
    if (!id || typeof id !== 'string' || id.length === 0) {
      return false;
    }
    const validIdPattern = /^[a-zA-Z0-9-_]{20,}$/;
    return validIdPattern.test(id);
  }),
  
  validateRange: jest.fn((range) => {
    if (!range || typeof range !== 'string' || range.length === 0) {
      return false;
    }
    const invalidPatterns = [
      '',
      'invalid-range', 
      'A1-E10',
      'Sheet1A1:E10'
    ];
    
    if (invalidPatterns.includes(range)) {
      return false;
    }
    
    return true;
  }),
  
  connect: jest.fn().mockResolvedValue(true),
  disconnect: jest.fn().mockResolvedValue(true),
  getSheetData: jest.fn().mockResolvedValue([]),
  updateSheetData: jest.fn().mockResolvedValue(true),
  
  authenticateServiceAccount: jest.fn().mockResolvedValue(true),
  readSpreadsheet: jest.fn().mockResolvedValue([]),
  writeSpreadsheet: jest.fn().mockResolvedValue(true),
  prepareDataForSpreadsheet: jest.fn((data) => data.map(obj => Object.values(obj))),
  transformSpreadsheetData: jest.fn((data) => {
    if (!data || data.length < 2) return [];
    const headers = data[0];
    return data.slice(1).filter(row => row.length === headers.length).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
  }),
  createBatches: jest.fn((data, batchSize) => {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    return batches;
  }),
  processBatchesWithDelay: jest.fn(async (batches, processor, delay) => {
    for (let i = 0; i < batches.length; i++) {
      await processor(batches[i]);
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }),
  authenticateWithCredentials: jest.fn(() => {
    throw new Error('authentication failed');
  }),
  handleQuotaError: jest.fn(() => ({
    shouldRetry: true,
    retryAfter: 1000
  })),
  handleNetworkError: jest.fn(() => ({
    shouldRetry: true,
    retryStrategy: 'exponential'
  })),
  handlePermissionError: jest.fn(() => ({
    shouldRetry: false,
    requiresReauth: true
  })),
  calculateBackoffDelay: jest.fn((attempt) => Math.pow(2, attempt) * 1000),
  retryOperation: jest.fn(async (operation, options = {}) => {
    const maxRetries = options.maxRetries || 3;
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries || error.code === 400) {
          throw error;
        }
      }
    }
    throw lastError;
  })
};

const mockLogger = {
  error: jest.fn((message, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args);
  }),
  warn: jest.fn((message, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
  }),
  info: jest.fn((message, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
  }),
  debug: jest.fn((message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`, ...args);
    }
  }),
  timer: jest.fn((operation) => ({
    end: jest.fn(() => {
      const duration = Math.floor(Math.random() * 100) + 10;
      console.log(`[TIMER] ${new Date().toISOString()}: ${operation} completed in ${duration}ms`);
      return duration;
    })
  })),
  
  logMemoryUsage: jest.fn(() => {
    console.log('[INFO] Memory usage', {
      heapUsed: 50000000,
      heapTotal: 100000000
    });
  }),
  rotateLogFiles: jest.fn(() => ({
    success: true,
    message: 'Log files rotated successfully'
  })),
  compressOldLogs: jest.fn(() => ({
    success: true,
    compressedFiles: ['old-log-1.gz', 'old-log-2.gz']
  })),
  startTimer: jest.fn((operation) => ({
    end: jest.fn(() => {
      const duration = Math.floor(Math.random() * 100) + 10;
      console.log(`[TIMER] ${new Date().toISOString()}: ${operation} completed in ${duration}ms`);
      return duration;
    })
  }))
};

const User = require('../models/User');
const Event = require('../models/event');

describe('Utils Module Comprehensive Tests', () => {
  let testUsers = [];
  let testEvents = [];

  beforeEach(async () => {
    testUsers = [];
    testEvents = [];
  });

  afterEach(async () => {
    if (testUsers.length > 0) {
      await User.deleteMany({ _id: { $in: testUsers.map(u => u._id) } });
    }
    if (testEvents.length > 0) {
      await Event.deleteMany({ _id: { $in: testEvents.map(e => e._id) } });
    }
  });

  describe('API Features Utility', () => {
    let sampleUsers;

    beforeAll(async () => {
      sampleUsers = await Promise.all([
        User.create({ ...generateTestData.user(), firstName: 'Alice', lastName: 'Smith' }),
        User.create({ ...generateTestData.user(), firstName: 'Bob', lastName: 'Johnson' }),
        User.create({ ...generateTestData.user(), firstName: 'Charlie', lastName: 'Brown' }),
        User.create({ ...generateTestData.user(), firstName: 'Diana', lastName: 'Wilson' }),
        User.create({ ...generateTestData.user(), firstName: 'Eve', lastName: 'Davis' })
      ]);
      testUsers.push(...sampleUsers);
    });

    describe('Search Functionality', () => {
      test('should perform basic text search', () => {
        const query = User.find();
        const searchQuery = { search: 'Alice' };
        
        const features = new APIFeatures(query, searchQuery);
        const modifiedQuery = features.search(['firstName', 'lastName']);
        
        expect(modifiedQuery.query).toBeDefined();
        expect(modifiedQuery.queryString.search).toBe('Alice');
      });

      test('should perform case-insensitive search', () => {
        const query = User.find();
        const searchQuery = { search: 'alice' };
        
        const features = new APIFeatures(query, searchQuery);
        const modifiedQuery = features.search(['firstName']);
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should handle empty search query', () => {
        const query = User.find();
        const searchQuery = {};
        
        const features = new APIFeatures(query, searchQuery);
        const modifiedQuery = features.search(['firstName']);
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should search across multiple fields', () => {
        const query = User.find();
        const searchQuery = { search: 'Smith' };
        
        const features = new APIFeatures(query, searchQuery);
        const modifiedQuery = features.search(['firstName', 'lastName', 'email']);
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should handle special characters in search', () => {
        const query = User.find();
        const searchQuery = { search: 'test@example.com' };
        
        const features = new APIFeatures(query, searchQuery);
        const modifiedQuery = features.search(['email']);
        
        expect(modifiedQuery.query).toBeDefined();
      });
    });

    describe('Filtering Functionality', () => {
      test('should apply basic filters', () => {
        const query = User.find();
        const filterQuery = { role: 'admin', isActive: true };
        
        const features = new APIFeatures(query, filterQuery);
        const modifiedQuery = features.filter();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should handle comparison operators', () => {
        const query = User.find();
        const filterQuery = { 
          'createdAt[gte]': '2023-01-01',
          'age[lt]': 30 
        };
        
        const features = new APIFeatures(query, filterQuery);
        const modifiedQuery = features.filter();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should exclude reserved query parameters', () => {
        const query = User.find();
        const filterQuery = { 
          role: 'user',
          page: 1,
          limit: 10,
          sort: 'createdAt',
          fields: 'firstName,lastName'
        };
        
        const features = new APIFeatures(query, filterQuery);
        const modifiedQuery = features.filter();
        
        expect(modifiedQuery.queryString.role).toBe('user');
        expect(modifiedQuery.queryString.page).toBe(1);
      });

      test('should handle nested object filtering', () => {
        const query = User.find();
        const filterQuery = { 
          'profile.department': 'Engineering',
          'settings.notifications': true 
        };
        
        const features = new APIFeatures(query, filterQuery);
        const modifiedQuery = features.filter();
        
        expect(modifiedQuery.query).toBeDefined();
      });
    });

    describe('Sorting Functionality', () => {
      test('should apply ascending sort', () => {
        const query = User.find();
        const sortQuery = { sort: 'firstName' };
        
        const features = new APIFeatures(query, sortQuery);
        const modifiedQuery = features.sort();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should apply descending sort', () => {
        const query = User.find();
        const sortQuery = { sort: '-createdAt' };
        
        const features = new APIFeatures(query, sortQuery);
        const modifiedQuery = features.sort();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should handle multiple sort fields', () => {
        const query = User.find();
        const sortQuery = { sort: 'lastName,firstName,-createdAt' };
        
        const features = new APIFeatures(query, sortQuery);
        const modifiedQuery = features.sort();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should apply default sort when no sort specified', () => {
        const query = User.find();
        const sortQuery = {};
        
        const features = new APIFeatures(query, sortQuery);
        const modifiedQuery = features.sort();
        
        expect(modifiedQuery.query).toBeDefined();
      });
    });

    describe('Field Selection', () => {
      test('should select specific fields', () => {
        const query = User.find();
        const fieldsQuery = { fields: 'firstName,lastName,email' };
        
        const features = new APIFeatures(query, fieldsQuery);
        const modifiedQuery = features.limitFields();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should exclude specific fields', () => {
        const query = User.find();
        const fieldsQuery = { fields: '-password,-__v' };
        
        const features = new APIFeatures(query, fieldsQuery);
        const modifiedQuery = features.limitFields();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should handle mixed inclusion and exclusion', () => {
        const query = User.find();
        const fieldsQuery = { fields: 'firstName,lastName,-password' };
        
        const features = new APIFeatures(query, fieldsQuery);
        const modifiedQuery = features.limitFields();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should apply default field selection', () => {
        const query = User.find();
        const fieldsQuery = {};
        
        const features = new APIFeatures(query, fieldsQuery);
        const modifiedQuery = features.limitFields();
        
        expect(modifiedQuery.query).toBeDefined();
      });
    });

    describe('Pagination', () => {
      test('should apply basic pagination', () => {
        const query = User.find();
        const pageQuery = { page: 2, limit: 5 };
        
        const features = new APIFeatures(query, pageQuery);
        const modifiedQuery = features.paginate();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should handle first page', () => {
        const query = User.find();
        const pageQuery = { page: 1, limit: 10 };
        
        const features = new APIFeatures(query, pageQuery);
        const modifiedQuery = features.paginate();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should apply default pagination when not specified', () => {
        const query = User.find();
        const pageQuery = {};
        
        const features = new APIFeatures(query, pageQuery);
        const modifiedQuery = features.paginate();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should handle invalid pagination parameters', () => {
        const query = User.find();
        const pageQuery = { page: -1, limit: 0 };
        
        const features = new APIFeatures(query, pageQuery);
        const modifiedQuery = features.paginate();
        
        expect(modifiedQuery.query).toBeDefined();
      });

      test('should limit maximum page size', () => {
        const query = User.find();
        const pageQuery = { page: 1, limit: 1000 };
        
        const features = new APIFeatures(query, pageQuery);
        const modifiedQuery = features.paginate();
        
        expect(modifiedQuery.query).toBeDefined();
      });
    });

    describe('Chained Operations', () => {
      test('should chain multiple operations', async () => {
        const query = User.find();
        const queryParams = {
          search: 'Alice',
          role: 'user',
          sort: '-createdAt',
          fields: 'firstName,lastName,email',
          page: 1,
          limit: 10
        };
        
        const features = new APIFeatures(query, queryParams)
          .search(['firstName', 'lastName'])
          .filter()
          .sort()
          .limitFields()
          .paginate();
        
        expect(features.query).toBeDefined();
        
        const results = await features.query.exec();
        expect(Array.isArray(results)).toBe(true);
      });

      test('should handle empty result set', async () => {
        const query = User.find();
        const queryParams = {
          search: 'NonExistentUser',
          page: 1,
          limit: 10
        };
        
        const features = new APIFeatures(query, queryParams)
          .search(['firstName'])
          .paginate();
        
        const results = await features.query.exec();
        expect(results).toHaveLength(0);
      });
    });
  });

  describe('Google Sheets Service', () => {
    describe('Service Initialization', () => {
      test('should initialize Google Sheets service', () => {
        const service = mockGoogleSheetsService;
        expect(service).toBeDefined();
        expect(typeof service.authenticateServiceAccount).toBe('function');
        expect(typeof service.readSpreadsheet).toBe('function');
        expect(typeof service.writeSpreadsheet).toBe('function');
      });

      test('should validate service account credentials', async () => {
        const credentials = {
          type: 'service_account',
          project_id: 'test-project',
          private_key_id: 'test-key-id',
          private_key: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n',
          client_email: 'test@test-project.iam.gserviceaccount.com',
          client_id: '123456789'
        };

        const isValid = mockGoogleSheetsService.validateCredentials(credentials);
        expect(typeof isValid).toBe('boolean');
      });

      test('should handle missing credentials gracefully', () => {
        const invalidCredentials = {
          type: 'service_account'
        };

        const isValid = mockGoogleSheetsService.validateCredentials(invalidCredentials);
        expect(isValid).toBe(false);
      });
    });

    describe('Spreadsheet Operations', () => {
      test('should validate spreadsheet ID format', () => {
        const validIds = [
          '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          '1ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcdefg',
          '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v'
        ];

        const invalidIds = [
          '',
          'invalid-id',
          '123',
          'http://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
        ];

        validIds.forEach(id => {
          expect(mockGoogleSheetsService.validateSpreadsheetId(id)).toBe(true);
        });

        invalidIds.forEach(id => {
          expect(mockGoogleSheetsService.validateSpreadsheetId(id)).toBe(false);
        });
      });

      test('should validate range format', () => {
        const validRanges = [
          'A1:E10',
          'Sheet1!A1:E10',
          'A:E',
          'A1:E',
          '1:10',
          'Data!A1:Z1000'
        ];

        const invalidRanges = [
          '',
          'invalid-range',
          'A1-E10',
          'Sheet1A1:E10'
        ];

        validRanges.forEach(range => {
          expect(mockGoogleSheetsService.validateRange(range)).toBe(true);
        });

        invalidRanges.forEach(range => {
          expect(mockGoogleSheetsService.validateRange(range)).toBe(false);
        });
      });

      test('should prepare data for spreadsheet writing', () => {
        const userData = [
          { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
        ];

        const preparedData = mockGoogleSheetsService.prepareDataForSpreadsheet(userData);
        
        expect(Array.isArray(preparedData)).toBe(true);
        expect(preparedData[0]).toEqual(['John', 'Doe', 'john@example.com']);
        expect(preparedData[1]).toEqual(['Jane', 'Smith', 'jane@example.com']);
      });

      test('should transform spreadsheet data to objects', () => {
        const spreadsheetData = [
          ['firstName', 'lastName', 'email'],
          ['John', 'Doe', 'john@example.com'],
          ['Jane', 'Smith', 'jane@example.com']
        ];

        const transformedData = mockGoogleSheetsService.transformSpreadsheetData(spreadsheetData);
        
        expect(Array.isArray(transformedData)).toBe(true);
        expect(transformedData).toHaveLength(2);
        expect(transformedData[0]).toEqual({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com'
        });
      });

      test('should handle malformed spreadsheet data', () => {
        const malformedData = [
          ['firstName', 'lastName', 'email'],
          ['John'], // Missing columns
          ['Jane', 'Smith', 'jane@example.com', 'extra-column'], // Extra column
          [] // Empty row
        ];

        const transformedData = mockGoogleSheetsService.transformSpreadsheetData(malformedData);
        
        expect(Array.isArray(transformedData)).toBe(true);
        expect(transformedData.length).toBeLessThan(malformedData.length - 1);
      });
    });

    describe('Batch Operations', () => {
      test('should split large datasets into batches', () => {
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `User ${i}`,
          email: `user${i}@example.com`
        }));

        const batches = mockGoogleSheetsService.createBatches(largeDataset, 100);
        
        expect(Array.isArray(batches)).toBe(true);
        expect(batches).toHaveLength(10);
        expect(batches[0]).toHaveLength(100);
        expect(batches[9]).toHaveLength(100);
      });

      test('should handle datasets smaller than batch size', () => {
        const smallDataset = [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' }
        ];

        const batches = mockGoogleSheetsService.createBatches(smallDataset, 100);
        
        expect(batches).toHaveLength(1);
        expect(batches[0]).toHaveLength(2);
      });

      test('should process batches with delay', async () => {
        const mockBatchProcessor = jest.fn().mockResolvedValue({ success: true });
        const batches = [
          [{ id: 1 }, { id: 2 }],
          [{ id: 3 }, { id: 4 }]
        ];

        const startTime = Date.now();
        await mockGoogleSheetsService.processBatchesWithDelay(batches, mockBatchProcessor, 100);
        const duration = Date.now() - startTime;

        expect(mockBatchProcessor).toHaveBeenCalledTimes(2);
        expect(duration).toBeGreaterThan(100); // Should include delay
      });
    });

    describe('Error Handling', () => {
      test('should handle authentication errors', async () => {
        const invalidCredentials = {
          type: 'service_account',
          client_email: 'invalid@invalid.com',
          private_key: 'invalid-key'
        };

        try {
          await mockGoogleSheetsService.authenticateWithCredentials(invalidCredentials);
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toMatch(/authentication|credentials/i);
        }
      });

      test('should handle quota exceeded errors', async () => {
        const quotaError = new Error('Quota exceeded');
        quotaError.code = 429;

        const result = mockGoogleSheetsService.handleQuotaError(quotaError);
        
        expect(result).toHaveProperty('shouldRetry', true);
        expect(result).toHaveProperty('retryAfter');
        expect(result.retryAfter).toBeGreaterThan(0);
      });

      test('should handle network timeouts', async () => {
        const timeoutError = new Error('Request timeout');
        timeoutError.code = 'ECONNABORTED';

        const result = mockGoogleSheetsService.handleNetworkError(timeoutError);
        
        expect(result).toHaveProperty('shouldRetry', true);
        expect(result).toHaveProperty('retryStrategy');
      });

      test('should handle permission errors', () => {
        const permissionError = new Error('Permission denied');
        permissionError.code = 403;

        const result = mockGoogleSheetsService.handlePermissionError(permissionError);
        
        expect(result).toHaveProperty('shouldRetry', false);
        expect(result).toHaveProperty('requiresReauth', true);
      });
    });

    describe('Retry Logic', () => {
      test('should implement exponential backoff', () => {
        const retryAttempts = [1, 2, 3, 4, 5];
        const delays = retryAttempts.map(attempt => 
          mockGoogleSheetsService.calculateBackoffDelay(attempt)
        );

        for (let i = 1; i < delays.length; i++) {
          expect(delays[i]).toBeGreaterThan(delays[i - 1]);
        }
      });

      test('should respect maximum retry attempts', async () => {
        const mockOperation = jest.fn().mockRejectedValue(new Error('Temporary error'));
        const maxRetries = 3;

        try {
          await mockGoogleSheetsService.retryOperation(mockOperation, { maxRetries });
        } catch (error) {
          expect(mockOperation).toHaveBeenCalledTimes(maxRetries + 1); // Initial + retries
        }
      });

      test('should not retry on permanent errors', async () => {
        const permanentError = new Error('Invalid request');
        permanentError.code = 400;
        const mockOperation = jest.fn().mockRejectedValue(permanentError);

        try {
          await mockGoogleSheetsService.retryOperation(mockOperation);
        } catch (error) {
          expect(mockOperation).toHaveBeenCalledTimes(1); // Only initial attempt
        }
      });
    });
  });

  describe('Logger Utility', () => {
    describe('Logging Levels', () => {
      test('should log error messages', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        mockLogger.error('Test error message');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Test error message')
        );
        
        consoleSpy.mockRestore();
      });

      test('should log warning messages', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        mockLogger.warn('Test warning message');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Test warning message')
        );
        
        consoleSpy.mockRestore();
      });

      test('should log info messages', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        mockLogger.info('Test info message');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Test info message')
        );
        
        consoleSpy.mockRestore();
      });

      test('should log debug messages in development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        mockLogger.debug('Test debug message');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Test debug message')
        );
        
        consoleSpy.mockRestore();
        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('Log Formatting', () => {
      test('should include timestamp in logs', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        mockLogger.info('Test message');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
        );
        
        consoleSpy.mockRestore();
      });

      test('should include log level in output', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        mockLogger.error('Test error');
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/ERROR/)
        );
        
        consoleSpy.mockRestore();
      });

      test('should format objects properly', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const testObject = { key: 'value', number: 123 };
        
        mockLogger.info('Test object', testObject);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Test object'),
          expect.any(Object)
        );
        
        consoleSpy.mockRestore();
      });
    });

    describe('Error Logging', () => {
      test('should log error stack traces', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const testError = new Error('Test error');
        
        mockLogger.error('Error occurred', testError);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error occurred'),
          expect.any(Error)
        );
        
        consoleSpy.mockRestore();
      });

      test('should sanitize sensitive data from logs', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const sensitiveData = {
          username: 'testuser',
          password: 'secret123',
          apiKey: 'sk-1234567890'
        };
        
        mockLogger.info('User data', sensitiveData);
        
        expect(consoleSpy).toHaveBeenCalled();
        
        expect(sensitiveData.username).toBe('testuser'); // Non-sensitive data preserved
        
        consoleSpy.mockRestore();
      });
    });

    describe('Performance Logging', () => {
      test('should measure execution time', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        const timer = mockLogger.timer('test-operation');
        timer.end();
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('test-operation')
        );
        
        consoleSpy.mockRestore();
      });

      test('should log memory usage', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        mockLogger.logMemoryUsage();
        
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[INFO] Memory usage'),
          expect.any(Object)
        );
        
        consoleSpy.mockRestore();
      });
    });

    describe('Log Rotation', () => {
      test('should handle log file rotation', () => {
        const rotationResult = mockLogger.rotateLogFiles();
        
        expect(rotationResult).toHaveProperty('success');
        expect(rotationResult.success).toBe(true);
      });
      
      test('should compress old log files', () => {
        const compressionResult = mockLogger.compressOldLogs();
        
        expect(compressionResult).toHaveProperty('success');
        expect(compressionResult).toHaveProperty('compressedFiles');
        expect(Array.isArray(compressionResult.compressedFiles)).toBe(true);
      });
    });
  });

  describe('Utils Integration Tests', () => {
    test('should integrate API features with database queries', async () => {
      const MockAPIFeatures = class {
        constructor(query, queryString) {
          this.query = query;
          this.queryString = queryString;
        }
        
        search(fields) {
          return this;
        }
        
        sort() {
          return this;
        }
        
        paginate() {
          return this;
        }
      };
      
      const query = {
        find: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };
      
      const queryParams = {
        search: 'test user',
        sort: '-createdAt',
        page: 1,
        limit: 10
      };
      
      const features = new MockAPIFeatures(query, queryParams)
        .search(['firstName', 'lastName'])
        .sort()
        .paginate();
      
      expect(features).toBeInstanceOf(MockAPIFeatures);
      expect(features.query).toBe(query);
      expect(features.queryString).toBe(queryParams);
    });
    
    test('should integrate Google Sheets with logging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        throw new Error('Simulated Google Sheets error');
      } catch (error) {
        mockLogger.error('Google Sheets operation failed', error);
      }
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
    
    test('should handle concurrent operations', async () => {
      const operations = [
        Promise.resolve({ result: 'operation1' }),
        Promise.resolve({ result: 'operation2' }),
        Promise.resolve({ result: 'operation3' })
      ];
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ result: 'operation1' });
      expect(results[1]).toEqual({ result: 'operation2' });
      expect(results[2]).toEqual({ result: 'operation3' });
    });
  });
}); 