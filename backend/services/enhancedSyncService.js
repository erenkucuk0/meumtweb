const SystemConfig = require('../models/SystemConfig');
const googleSheetsManager = require('./googleSheetsManager');
const logger = require('../utils/logger');

/**
 * Enhanced Sync Service using Context7 patterns
 * Provides robust synchronization between Google Sheets and MongoDB
 */
class EnhancedSyncService {
  constructor() {
    this.isRunning = false;
    this.sheetsManager = googleSheetsManager;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastError: null
    };
    
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };
    
    this.circuitBreaker = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null
    };

    this.syncInProgress = false;
  }

  /**
   * Context7 pattern: Circuit breaker implementation
   */
  async executeWithCircuitBreaker(operation, operationName) {
    if (this.circuitBreaker.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < this.circuitBreaker.resetTimeout) {
        throw new Error(`Circuit breaker is OPEN for ${operationName}. Retrying in ${Math.ceil((this.circuitBreaker.resetTimeout - timeSinceLastFailure) / 1000)}s`);
      } else {
        this.circuitBreaker.state = 'HALF_OPEN';
        logger.info('Circuit breaker transitioning to HALF_OPEN state');
      }
    }

    try {
      const result = await operation();
      
      if (this.circuitBreaker.state === 'HALF_OPEN') {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failures = 0;
        logger.info('Circuit breaker reset to CLOSED state');
      }
      
      return result;
    } catch (error) {
      this.circuitBreaker.failures++;
      this.circuitBreaker.lastFailureTime = Date.now();
      
      if (this.circuitBreaker.failures >= this.circuitBreaker.failureThreshold) {
        this.circuitBreaker.state = 'OPEN';
        logger.error(`Circuit breaker opened after ${this.circuitBreaker.failures} failures`);
      }
      
      throw error;
    }
  }

  /**
   * Context7 pattern: Exponential backoff retry
   */
  async executeWithRetry(operation, operationName = 'Operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`${operationName} failed (attempt ${attempt}/${this.retryConfig.maxRetries}): ${error.message}`);
        
        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
            this.retryConfig.maxDelay
          );
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Context7 pattern: Enhanced connection handling with timeouts
   */
  async ensureConnectionHealth() {
    try {
      if (!this.sheetsManager.sheetsService.isInitialized) {
        const initResult = await this.sheetsManager.sheetsService.initialize();
        if (!initResult.success) {
          if (initResult.mockMode) {
            logger.warn('Google Sheets in mock mode - sync will be database-only');
            return { sheetsAvailable: false, dbAvailable: true };
          }
          throw new Error(`Google Sheets initialization failed: ${initResult.message}`);
        }
      }

      return { sheetsAvailable: true, dbAvailable: true };
    } catch (error) {
      logger.error('Connection health check failed:', error);
      return { 
        sheetsAvailable: false, 
        dbAvailable: true,
        error: error.message 
      };
    }
  }

  /**
   * Context7 pattern: Comprehensive sync with fallback mechanisms
   */
  async performSync(options = {}) {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    const syncId = `sync_${Date.now()}`;
    logger.info(`Starting sync operation: ${syncId}`);

    try {
      this.syncStats.totalSyncs++;

      const healthCheck = await this.ensureConnectionHealth();
      
      if (!healthCheck.dbAvailable) {
        throw new Error('Database connection unavailable');
      }

      if (!healthCheck.sheetsAvailable) {
        logger.warn('Google Sheets unavailable - performing database-only operations');
        return await this.performDatabaseOnlySync(syncId);
      }

      const result = await this.executeWithCircuitBreaker(
        () => this.executeWithRetry(
          () => this.performFullSync(syncId, options),
          'Full Sync Operation'
        ),
        'Sync Service'
      );

      this.syncStats.successfulSyncs++;
      this.lastSyncTime = new Date();
      
      await this.updateSyncStatus(true, result);
      
      logger.info(`Sync completed successfully: ${syncId}`);
      return result;

    } catch (error) {
      this.syncStats.failedSyncs++;
      this.syncStats.lastError = error.message;
      
      logger.error(`Sync failed: ${syncId}`, error);
      
      try {
        logger.info('Attempting fallback database-only sync');
        const fallbackResult = await this.performDatabaseOnlySync(syncId, true);
        await this.updateSyncStatus(false, fallbackResult, error.message);
        return fallbackResult;
      } catch (fallbackError) {
        logger.error('Fallback sync also failed:', fallbackError);
        await this.updateSyncStatus(false, null, error.message);
        throw error;
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Context7 pattern: Full sync implementation
   */
  async performFullSync(syncId, options = {}) {
    const results = {
      syncId,
      timestamp: new Date(),
      sheetsToDb: { created: 0, updated: 0, errors: [] },
      dbToSheets: { synced: 0, errors: [] },
      summary: { totalProcessed: 0, totalErrors: 0 }
    };

    logger.info(`${syncId}: Syncing from Google Sheets to database`);
    try {
      const sheetsData = await this.sheetsManager.sheetsService.importFromSheet();
      if (sheetsData.success && sheetsData.members) {
        const syncResult = await this.syncMembersToDatabase(sheetsData.members);
        results.sheetsToDb = syncResult;
        results.summary.totalProcessed += syncResult.created + syncResult.updated;
        results.summary.totalErrors += syncResult.errors.length;
      }
    } catch (error) {
      logger.error(`${syncId}: Sheets to DB sync failed:`, error);
      results.sheetsToDb.errors.push(error.message);
      results.summary.totalErrors++;
    }

    if (options.syncPendingToSheets !== false) {
      logger.info(`${syncId}: Syncing pending applications to Google Sheets`);
      try {
        const pendingMembers = await CommunityMember.find({ 
          status: 'APPROVED',
          syncedToSheets: { $ne: true }
        });
        
        for (const member of pendingMembers) {
          try {
            await this.syncMemberToSheets(member);
            await member.updateOne({ syncedToSheets: true, lastSyncDate: new Date() });
            results.dbToSheets.synced++;
          } catch (error) {
            logger.error(`${syncId}: Failed to sync member ${member._id} to sheets:`, error);
            results.dbToSheets.errors.push(`${member.fullName}: ${error.message}`);
            results.summary.totalErrors++;
          }
        }
      } catch (error) {
        logger.error(`${syncId}: DB to Sheets sync failed:`, error);
        results.dbToSheets.errors.push(error.message);
        results.summary.totalErrors++;
      }
    }

    return results;
  }

  /**
   * Context7 pattern: Database-only operations when Sheets unavailable
   */
  async performDatabaseOnlySync(syncId, isFallback = false) {
    const results = {
      syncId,
      timestamp: new Date(),
      mode: 'database-only',
      isFallback,
      operations: { validated: 0, cleaned: 0, errors: [] }
    };

    try {
      const duplicates = await this.findAndCleanDuplicates();
      results.operations.cleaned = duplicates.cleaned;

      const validation = await this.validateDataIntegrity();
      results.operations.validated = validation.fixed;

      logger.info(`${syncId}: Database-only sync completed`);
      return results;
    } catch (error) {
      logger.error(`${syncId}: Database-only sync failed:`, error);
      results.operations.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Context7 pattern: Robust member synchronization with conflict resolution
   */
  async syncMembersToDatabase(members) {
    const results = { created: 0, updated: 0, errors: [] };
    
    for (const memberData of members) {
      try {
        const query = {
          $or: [
            { tcKimlikNo: memberData.tcKimlikNo },
            { studentNumber: memberData.studentNumber }
          ].filter(condition => Object.values(condition)[0]) // Remove empty conditions
        };

        if (query.$or.length === 0) {
          results.errors.push(`${memberData.fullName}: No unique identifier provided`);
          continue;
        }

        const existingMember = await CommunityMember.findOne(query);
        
        if (existingMember) {
          await CommunityMember.findByIdAndUpdate(
            existingMember._id,
            {
              ...memberData,
              isFromGoogleSheets: true,
              lastGoogleSheetsUpdate: new Date()
            },
            { 
              new: true,
              runValidators: true,
              context: 'query' // Ensure validators run properly
            }
          );
          results.updated++;
        } else {
          await CommunityMember.create({
            ...memberData,
            isFromGoogleSheets: true,
            status: 'APPROVED',
            applicationSource: 'IMPORT',
            lastGoogleSheetsUpdate: new Date()
          });
          results.created++;
        }
      } catch (error) {
        logger.error(`Failed to sync member ${memberData.fullName}:`, error);
        results.errors.push(`${memberData.fullName}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Context7 pattern: Data cleanup utilities
   */
  async findAndCleanDuplicates() {
    const results = { cleaned: 0, errors: [] };
    
    try {
      const tcDuplicates = await CommunityMember.aggregate([
        {
          $match: {
            tcKimlikNo: { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$tcKimlikNo',
            count: { $sum: 1 },
            docs: { $push: { id: '$_id', createdAt: '$createdAt' } }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      for (const duplicate of tcDuplicates) {
        const sortedDocs = duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const toRemove = sortedDocs.slice(1); // Keep the oldest
        
        for (const doc of toRemove) {
          await CommunityMember.findByIdAndDelete(doc.id);
          results.cleaned++;
        }
      }

      const studentDuplicates = await CommunityMember.aggregate([
        {
          $match: {
            studentNumber: { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$studentNumber',
            count: { $sum: 1 },
            docs: { $push: { id: '$_id', createdAt: '$createdAt' } }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      for (const duplicate of studentDuplicates) {
        const sortedDocs = duplicate.docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const toRemove = sortedDocs.slice(1); // Keep the oldest
        
        for (const doc of toRemove) {
          await CommunityMember.findByIdAndDelete(doc.id);
          results.cleaned++;
        }
      }

    } catch (error) {
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Context7 pattern: Data integrity validation
   */
  async validateDataIntegrity() {
    const results = { fixed: 0, errors: [] };
    
    try {
      const membersToFix = await CommunityMember.find({
        $or: [
          { status: { $exists: false } },
          { status: null },
          { applicationSource: { $exists: false } }
        ]
      });

      for (const member of membersToFix) {
        await CommunityMember.findByIdAndUpdate(member._id, {
          status: member.status || 'PENDING',
          applicationSource: member.applicationSource || 'UNKNOWN'
        });
        results.fixed++;
      }

    } catch (error) {
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Context7 pattern: Safe member sync to sheets
   */
  async syncMemberToSheets(member) {
    const memberData = [
      member.fullName,
      member.tcKimlikNo || '',
      member.studentNumber || '',
      member.phoneNumber || member.phone || '',
      member.department || '',
      'IBAN', // ödeme alanı
      member.createdAt ? member.createdAt.toLocaleDateString('tr-TR') : ''
    ];

    await this.sheetsManager.sheetsService.appendRow(null, memberData);
  }

  /**
   * Update system configuration with sync status
   */
  async updateSyncStatus(success, result, error = null) {
    try {
      let systemConfig = await SystemConfig.findOne();
      
      if (!systemConfig) {
        systemConfig = new SystemConfig({
          googleSheets: {
            lastSync: new Date(),
            lastSyncSuccess: success,
            syncCount: 1
          }
        });
      } else {
        systemConfig.googleSheets = {
          ...systemConfig.googleSheets,
          lastSync: new Date(),
          lastSyncSuccess: success,
          syncCount: (systemConfig.googleSheets.syncCount || 0) + 1,
          lastError: error
        };
      }

      await systemConfig.save();
    } catch (configError) {
      logger.error('Failed to update sync status:', configError);
    }
  }

  /**
   * Context7 pattern: Get comprehensive sync status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      stats: this.syncStats,
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures
      },
      health: {
        database: true,
        googleSheets: this.sheetsManager.sheetsService.isInitialized
      }
    };
  }

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async sync() {
    if (this.isRunning) {
      return {
        success: false,
        message: 'Sync is already running'
      };
    }

    this.isRunning = true;

    try {
      const config = await SystemConfig.findOne();
      if (!config || !config.googleSheets) {
        throw new Error('Google Sheets configuration not found');
      }

      const result = await this.sheetsManager.sync();
      if (!result.success) {
        throw new Error(result.message || 'Failed to sync with Google Sheets');
      }

      config.googleSheets.lastSync = new Date();
      await config.save();

      return {
        success: true,
        message: 'Sync completed successfully',
        data: result.data
      };
    } catch (error) {
      logger.error('Enhanced sync error:', error);
      return {
        success: false,
        message: error.message
      };
    } finally {
      this.isRunning = false;
    }
  }

  async validateMember(tcKimlikNo = null, studentNumber = null) {
    try {
      const result = await this.sheetsManager.sheetsService.searchMember(
        config.googleSheets.spreadsheetId,
        tcKimlikNo,
        studentNumber
      );

      if (!result.success) {
        throw new Error(result.message || 'Üye doğrulanamadı');
      }

      return {
        success: true,
        isValid: result.found,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      logger.error('Üye doğrulama hatası:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

const enhancedSyncService = new EnhancedSyncService();
module.exports = enhancedSyncService; 