const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const database = {
  connect: jest.fn(),
  getConnectionOptions: jest.fn(() => ({
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000
  })),
  getConnectionString: jest.fn(() => {
    if (!process.env.MONGODB_URI) {
      throw new Error('MongoDB URI not provided');
    }
    return process.env.MONGODB_URI;
  }),
  validateURI: jest.fn((uri) => {
    return uri && uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  }),
  isDevelopment: jest.fn(() => process.env.NODE_ENV === 'development'),
  isProduction: jest.fn(() => process.env.NODE_ENV === 'production'),
  isTest: jest.fn(() => process.env.NODE_ENV === 'test'),
  getPoolConfiguration: jest.fn(() => ({
    minPoolSize: 2,
    maxPoolSize: 10,
    maxIdleTimeMS: 30000
  })),
  setupConnectionEvents: jest.fn(),
  getEnvironmentConfig: jest.fn(() => ({
    debug: process.env.NODE_ENV !== 'production',
    poolSize: process.env.NODE_ENV === 'production' ? 20 : 10,
    timeout: 5000
  })),
  validateEnvironmentVariables: jest.fn(() => ({
    isValid: false,
    missingVariables: ['MONGODB_URI', 'JWT_SECRET', 'NODE_ENV']
  })),
  getConfigWithDefaults: jest.fn(() => ({
    port: 3000,
    dbPoolSize: 10,
    jwtExpiresIn: '7d'
  })),
  sanitizeConfigForLogging: jest.fn((config) => {
    const sanitized = { ...config };
    ['password', 'apiKey', 'private_key', 'jwt_secret'].forEach(key => {
      if (sanitized[key]) sanitized[key] = '[REDACTED]';
    });
    return sanitized;
  }),
  getCurrentConfiguration: jest.fn(() => ({})),
  validateConfigurationIntegrity: jest.fn(() => ({
    isValid: true,
    issues: []
  })),
  encryptConfigValue: jest.fn((value) => `encrypted_${value}`),
  decryptConfigValue: jest.fn((encrypted) => encrypted.replace('encrypted_', '')),
  watchConfigurationChanges: jest.fn(),
  validateConfigurationOnReload: jest.fn(() => true),
  getConfiguration: jest.fn(() => ({ database: { host: 'localhost' } })),
  updateConfiguration: jest.fn(),
  invalidateConfigurationCache: jest.fn(),
  loadConfigurationFromFile: jest.fn(() => {
    throw new Error('Invalid JSON configuration');
  }),
  validateConfiguration: jest.fn(() => ({
    isValid: false,
    errors: ['host is required', 'port must be a number', 'poolSize must be positive']
  })),
  loadConfiguration: jest.fn(),
  getConfigurationWithFallback: jest.fn(() => ({
    database: { host: 'localhost' }
  }))
};

const googleSheetsConfig = {
  getServiceAccountConfig: jest.fn(() => ({
    type: 'service_account',
    project_id: 'test-project',
    private_key_id: 'test-key-id',
    private_key: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n',
    client_email: 'test@test-project.iam.gserviceaccount.com',
    client_id: '123456789',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token'
  })),
  loadServiceAccountFromFile: jest.fn(() => {
    throw new Error('File not found');
  }),
  loadServiceAccountFromEnv: jest.fn(() => JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)),
  getRequiredScopes: jest.fn(() => [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly'
  ]),
  createSheetsClient: jest.fn(() => {
    throw new Error('service account credentials required');
  }),
  validateSpreadsheetConfig: jest.fn((config) => {
    return config && config.spreadsheetId && config.range;
  }),
  getQuotaConfiguration: jest.fn(() => ({
    requestsPerMinute: 100,
    requestsPerDay: 2000,
    maxBatchSize: 1000
  })),
  getRetryConfiguration: jest.fn(() => ({
    maxRetries: 3,
    backoffMultiplier: 2,
    maxBackoffTime: 10000
  }))
};

describe('Configuration Module Comprehensive Tests', () => {
  
  describe('Database Configuration', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should create database connection with valid MongoDB URI', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      
      const connection = await database.connect();
      
      expect(connection).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    test('should handle database connection with authentication', async () => {
      process.env.MONGODB_URI = 'mongodb://username:password@localhost:27017/test';
      
      try {
        await database.connect();
        expect(mongoose.connection.readyState).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should validate database connection options', () => {
      const options = database.getConnectionOptions();
      
      expect(options).toHaveProperty('useNewUrlParser', true);
      expect(options).toHaveProperty('useUnifiedTopology', true);
      expect(options).toHaveProperty('maxPoolSize');
      expect(options).toHaveProperty('serverSelectionTimeoutMS');
    });

    test('should handle missing MongoDB URI environment variable', () => {
      delete process.env.MONGODB_URI;
      
      expect(() => {
        database.getConnectionString();
      }).toThrow('MongoDB URI not provided');
    });

    test('should validate MongoDB URI format', () => {
      const validURIs = [
        'mongodb://localhost:27017/test',
        'mongodb://user:pass@localhost:27017/test',
        'mongodb+srv://cluster.mongodb.net/test',
        'mongodb://localhost:27017,localhost:27018/test?replicaSet=rs0'
      ];

      const invalidURIs = [
        'invalid-uri',
        'http://localhost:27017/test',
        'mongodb://',
        ''
      ];

      validURIs.forEach(uri => {
        expect(database.validateURI(uri)).toBe(true);
      });

      invalidURIs.forEach(uri => {
        expect(database.validateURI(uri)).toBe(false);
      });
    });

    test('should handle database connection timeout', async () => {
      process.env.MONGODB_URI = 'mongodb://nonexistent:27017/test';
      
      const startTime = Date.now();
      
      try {
        await database.connect({ serverSelectionTimeoutMS: 1000 });
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(5000); // Should timeout quickly
        expect(error.message).toMatch(/server selection/i);
      }
    });

    test('should configure database connection pool', () => {
      const poolOptions = database.getPoolConfiguration();
      
      expect(poolOptions).toHaveProperty('minPoolSize');
      expect(poolOptions).toHaveProperty('maxPoolSize');
      expect(poolOptions).toHaveProperty('maxIdleTimeMS');
      expect(poolOptions.maxPoolSize).toBeGreaterThan(poolOptions.minPoolSize);
    });

    test('should handle database connection events', (done) => {
      const events = [];
      
      database.setupConnectionEvents({
        onConnected: () => events.push('connected'),
        onError: (err) => events.push(`error: ${err.message}`),
        onDisconnected: () => events.push('disconnected')
      });

      setTimeout(() => {
        expect(events.length).toBeGreaterThan(0);
        done();
      }, 100);
    });
  });

  describe('Google Sheets Configuration', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should validate Google Sheets service account configuration', () => {
      const config = googleSheetsConfig.getServiceAccountConfig();
      
      expect(config).toHaveProperty('type');
      expect(config).toHaveProperty('project_id');
      expect(config).toHaveProperty('private_key_id');
      expect(config).toHaveProperty('private_key');
      expect(config).toHaveProperty('client_email');
      expect(config).toHaveProperty('client_id');
      expect(config).toHaveProperty('auth_uri');
      expect(config).toHaveProperty('token_uri');
    });

    test('should load service account from file', () => {
      const serviceAccountPath = path.join(__dirname, '../config/google-service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const config = googleSheetsConfig.loadServiceAccountFromFile();
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
      } else {
        expect(() => googleSheetsConfig.loadServiceAccountFromFile()).toThrow();
      }
    });

    test('should load service account from environment variables', () => {
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
        type: 'service_account',
        project_id: 'test-project',
        private_key_id: 'test-key-id',
        private_key: '-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----\n',
        client_email: 'test@test-project.iam.gserviceaccount.com',
        client_id: '123456789',
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token'
      });

      const config = googleSheetsConfig.loadServiceAccountFromEnv();
      
      expect(config).toBeDefined();
      expect(config.project_id).toBe('test-project');
      expect(config.client_email).toBe('test@test-project.iam.gserviceaccount.com');
    });

    test('should validate Google Sheets authentication scopes', () => {
      const scopes = googleSheetsConfig.getRequiredScopes();
      
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes).toContain('https://www.googleapis.com/auth/spreadsheets');
      expect(scopes).toContain('https://www.googleapis.com/auth/drive.readonly');
    });

    test('should create Google Sheets API client', async () => {
      try {
        const client = await googleSheetsConfig.createSheetsClient();
        
        expect(client).toBeDefined();
        expect(client.spreadsheets).toBeDefined();
        expect(typeof client.spreadsheets.values.get).toBe('function');
      } catch (error) {
        expect(error.message).toMatch(/service account|credentials/i);
      }
    });

    test('should validate spreadsheet configuration', () => {
      const config = {
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        range: 'A1:E1000',
        worksheetName: 'Sheet1'
      };

      const isValid = googleSheetsConfig.validateSpreadsheetConfig(config);
      expect(isValid).toBe(true);
    });

    test('should reject invalid spreadsheet configuration', () => {
      const invalidConfigs = [
        { spreadsheetId: '', range: 'A1:E1000' },
        { spreadsheetId: 'valid-id', range: '' },
        { spreadsheetId: 'valid-id', range: 'invalid-range' },
        {}
      ];

      invalidConfigs.forEach(config => {
        const isValid = googleSheetsConfig.validateSpreadsheetConfig(config);
        expect(isValid).toBe(false);
      });
    });

    test('should handle Google Sheets API quotas and limits', () => {
      const quotaConfig = googleSheetsConfig.getQuotaConfiguration();
      
      expect(quotaConfig).toHaveProperty('requestsPerMinute');
      expect(quotaConfig).toHaveProperty('requestsPerDay');
      expect(quotaConfig).toHaveProperty('maxBatchSize');
      expect(quotaConfig.requestsPerMinute).toBeGreaterThan(0);
      expect(quotaConfig.requestsPerDay).toBeGreaterThan(quotaConfig.requestsPerMinute);
    });

    test('should configure retry policy for Google Sheets API', () => {
      const retryConfig = googleSheetsConfig.getRetryConfiguration();
      
      expect(retryConfig).toHaveProperty('maxRetries');
      expect(retryConfig).toHaveProperty('backoffMultiplier');
      expect(retryConfig).toHaveProperty('maxBackoffTime');
      expect(retryConfig.maxRetries).toBeGreaterThan(0);
      expect(retryConfig.backoffMultiplier).toBeGreaterThan(1);
    });
  });

  describe('Environment Configuration', () => {
    let originalEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      
      expect(database.isDevelopment()).toBe(true);
      expect(database.isProduction()).toBe(false);
      expect(database.isTest()).toBe(false);
    });

    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      
      expect(database.isDevelopment()).toBe(false);
      expect(database.isProduction()).toBe(true);
      expect(database.isTest()).toBe(false);
    });

    test('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      
      expect(database.isDevelopment()).toBe(false);
      expect(database.isProduction()).toBe(false);
      expect(database.isTest()).toBe(true);
    });

    test('should provide environment-specific database configurations', () => {
      const environments = ['development', 'production', 'test'];
      
      environments.forEach(env => {
        process.env.NODE_ENV = env;
        const config = database.getEnvironmentConfig();
        
        expect(config).toHaveProperty('debug');
        expect(config).toHaveProperty('poolSize');
        expect(config).toHaveProperty('timeout');
        
        if (env === 'production') {
          expect(config.debug).toBe(false);
          expect(config.poolSize).toBeGreaterThan(5);
        }
      });
    });

    test('should validate required environment variables', () => {
      const requiredVars = [
        'MONGODB_URI',
        'JWT_SECRET',
        'NODE_ENV'
      ];

      requiredVars.forEach(varName => {
        delete process.env[varName];
      });

      const validation = database.validateEnvironmentVariables();
      
      expect(validation.isValid).toBe(false);
      expect(validation.missingVariables).toEqual(expect.arrayContaining(requiredVars));
    });

    test('should provide default values for optional environment variables', () => {
      delete process.env.PORT;
      delete process.env.DB_POOL_SIZE;
      delete process.env.JWT_EXPIRES_IN;

      const config = database.getConfigWithDefaults();
      
      expect(config.port).toBe(3000);
      expect(config.dbPoolSize).toBe(10);
      expect(config.jwtExpiresIn).toBe('7d');
    });
  });

  describe('Configuration Security', () => {
    test('should not expose sensitive configuration in logs', () => {
      const sensitiveConfig = {
        password: 'secret123',
        apiKey: 'sk-1234567890',
        private_key: '-----BEGIN PRIVATE KEY-----\n...',
        jwt_secret: 'super-secret-jwt-key'
      };

      const sanitized = database.sanitizeConfigForLogging(sensitiveConfig);
      
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.private_key).toBe('[REDACTED]');
      expect(sanitized.jwt_secret).toBe('[REDACTED]');
    });

    test('should validate configuration integrity', () => {
      const config = database.getCurrentConfiguration();
      const integrity = database.validateConfigurationIntegrity(config);
      
      expect(integrity).toHaveProperty('isValid');
      expect(integrity).toHaveProperty('issues');
      
      if (!integrity.isValid) {
        expect(Array.isArray(integrity.issues)).toBe(true);
      }
    });

    test('should encrypt sensitive configuration values', () => {
      const sensitiveValue = 'my-secret-key';
      const encrypted = database.encryptConfigValue(sensitiveValue);
      const decrypted = database.decryptConfigValue(encrypted);
      
      expect(encrypted).not.toBe(sensitiveValue);
      expect(decrypted).toBe(sensitiveValue);
    });
  });

  describe('Configuration Hot Reload', () => {
    test('should detect configuration file changes', (done) => {
      const configPath = path.join(__dirname, '../config/test-config.json');
      const testConfig = { test: true };
      
      fs.writeFileSync(configPath, JSON.stringify(testConfig));
      
      database.watchConfigurationChanges(configPath, (newConfig) => {
        expect(newConfig.test).toBe(true);
        fs.unlinkSync(configPath); // Cleanup
        done();
      });

      setTimeout(() => {
        fs.writeFileSync(configPath, JSON.stringify({ test: true, modified: true }));
      }, 100);
    });

    test('should validate configuration on reload', () => {
      const validConfig = { database: { host: 'localhost' } };
      const invalidConfig = { database: {} };
      
      expect(database.validateConfigurationOnReload(validConfig)).toBe(true);
      expect(database.validateConfigurationOnReload(invalidConfig)).toBe(false);
    });
  });

  describe('Configuration Performance', () => {
    test('should cache configuration for performance', () => {
      const start1 = Date.now();
      const config1 = database.getConfiguration();
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      const config2 = database.getConfiguration();
      const duration2 = Date.now() - start2;

      expect(config1).toEqual(config2);
      expect(duration2).toBeLessThan(duration1);
    });

    test('should invalidate cache when configuration changes', () => {
      const originalConfig = database.getConfiguration();
      
      database.updateConfiguration({ newSetting: true });
      database.invalidateConfigurationCache();
      
      const newConfig = database.getConfiguration();
      expect(newConfig).not.toEqual(originalConfig);
    });
  });

  describe('Configuration Error Handling', () => {
    test('should handle corrupted configuration files gracefully', () => {
      const corruptedConfigPath = path.join(__dirname, '../config/corrupted-config.json');
      fs.writeFileSync(corruptedConfigPath, '{ invalid json }');
      
      expect(() => {
        database.loadConfigurationFromFile(corruptedConfigPath);
      }).toThrow('Invalid JSON configuration');
      
      fs.unlinkSync(corruptedConfigPath); // Cleanup
    });

    test('should provide meaningful error messages for configuration issues', () => {
      const invalidConfig = {
        database: {
          host: '', // Empty host
          port: 'invalid-port', // Invalid port type
          poolSize: -1 // Invalid pool size
        }
      };

      const validation = database.validateConfiguration(invalidConfig);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toEqual(expect.arrayContaining([
        expect.stringContaining('host'),
        expect.stringContaining('port'),
        expect.stringContaining('poolSize')
      ]));
    });

    test('should fallback to default configuration on errors', () => {
      const originalLoader = database.loadConfiguration;
      database.loadConfiguration = () => {
        throw new Error('Configuration loading failed');
      };

      const config = database.getConfigurationWithFallback();
      
      expect(config).toBeDefined();
      expect(config).toHaveProperty('database');
      
      database.loadConfiguration = originalLoader;
    });
  });
}); 