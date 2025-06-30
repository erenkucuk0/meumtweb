const { google } = require('googleapis');
const logger = require('../utils/logger');
const SystemConfig = require('../models/SystemConfig');
const NodeCache = require('node-cache');

const sheetsCache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60
});

class GoogleSheetsManager {
  constructor() {
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.sheets = null;
    this.auth = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const config = await SystemConfig.findOne();
      if (!config || !config.googleServiceAccountKey) {
        throw new Error('Google Sheets yapılandırması bulunamadı');
      }

      const credentials = JSON.parse(config.googleServiceAccountKey);
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.initialized = true;
      logger.info('Google Sheets servisi başarıyla başlatıldı');
    } catch (error) {
      logger.error('Google Sheets başlatma hatası:', error);
      throw new Error('Google Sheets servisi başlatılamadı: ' + error.message);
    }
  }

  async retryOperation(operation) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Google Sheets işlemi başarısız (Deneme ${attempt}/${this.retryAttempts}):`, error);
        
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    throw lastError;
  }

  async readSheet(spreadsheetId, range) {
    await this.initialize();
    
    const cacheKey = `sheet:${spreadsheetId}:${range}`;
    const cached = sheetsCache.get(cacheKey);
    if (cached) {
      logger.info('Returning cached sheet data');
      return cached;
    }

    try {
      const response = await this.retryOperation(async () => {
        return await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });
      });

      const data = response.data.values;
      sheetsCache.set(cacheKey, data);
      return data;
    } catch (error) {
      logger.error('Sheet okuma hatası:', error);
      throw new Error('Google Sheets verisi okunamadı: ' + error.message);
    }
  }

  async appendToSheet(spreadsheetId, range, values) {
    await this.initialize();

    try {
      const response = await this.retryOperation(async () => {
        return await this.sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values: [values]
          }
        });
      });

      sheetsCache.del(`sheet:${spreadsheetId}:${range}`);
      
      logger.info('Veri başarıyla eklendi:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Sheet ekleme hatası:', error);
      throw new Error('Google Sheets\'e veri eklenemedi: ' + error.message);
    }
  }

  async updateSheet(spreadsheetId, range, values) {
    await this.initialize();

    try {
      const response = await this.retryOperation(async () => {
        return await this.sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [values]
          }
        });
      });

      sheetsCache.del(`sheet:${spreadsheetId}:${range}`);
      
      logger.info('Veri başarıyla güncellendi:', response.data);
      return response.data;
    } catch (error) {
      logger.error('Sheet güncelleme hatası:', error);
      throw new Error('Google Sheets verisi güncellenemedi: ' + error.message);
    }
  }
}

module.exports = new GoogleSheetsManager(); 