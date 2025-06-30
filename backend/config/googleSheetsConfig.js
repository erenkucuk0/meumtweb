const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const logger = require('../utils/logger');

class GoogleSheetsConfig {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.initialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 2000;
  }

  async initialize() {
    for (let i = 0; i < this.retryAttempts; i++) {
      try {
        const credentialsPath = path.join(__dirname, 'google-service-account.json');
        
        if (!fs.existsSync(credentialsPath)) {
          throw new Error('Google Sheets service account kimlik bilgileri bulunamadı');
        }

        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

        this.auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
        this.initialized = true;
        
        logger.info('✅ Google Sheets yapılandırması başarılı');
        return true;
      } catch (error) {
        logger.error(`❌ Google Sheets yapılandırma denemesi ${i + 1} başarısız:`, error);
        
        if (i === this.retryAttempts - 1) {
          throw new Error(`Google Sheets yapılandırması ${this.retryAttempts} denemede başarısız oldu: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  async getClient() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.sheets;
  }

  async readSheet(spreadsheetId, range) {
    try {
      const sheets = await this.getClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      return response.data.values;
    } catch (error) {
      logger.error('Google Sheets okuma hatası:', error);
      throw new Error(`Google Sheets okuma hatası: ${error.message}`);
    }
  }

  async writeSheet(spreadsheetId, range, values) {
    try {
      const sheets = await this.getClient();
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values },
      });
      logger.info(`✅ ${range} aralığına yazma başarılı`);
    } catch (error) {
      logger.error('Google Sheets yazma hatası:', error);
      throw new Error(`Google Sheets yazma hatası: ${error.message}`);
    }
  }

  async appendSheet(spreadsheetId, range, values) {
    try {
      const sheets = await this.getClient();
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: { values },
      });
      logger.info(`✅ ${range} aralığına ekleme başarılı`);
    } catch (error) {
      logger.error('Google Sheets ekleme hatası:', error);
      throw new Error(`Google Sheets ekleme hatası: ${error.message}`);
    }
  }

  async clearSheet(spreadsheetId, range) {
    try {
      const sheets = await this.getClient();
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });
      logger.info(`✅ ${range} aralığı temizlendi`);
    } catch (error) {
      logger.error('Google Sheets temizleme hatası:', error);
      throw new Error(`Google Sheets temizleme hatası: ${error.message}`);
    }
  }
}

const sheetsConfig = new GoogleSheetsConfig();
module.exports = sheetsConfig; 