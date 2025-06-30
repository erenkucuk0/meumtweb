const { google } = require('googleapis');
const logger = require('./logger');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.initialized = false;
  }

  extractSpreadsheetId(url) {
    try {
      if (!url) return null;
      
      if (!url.includes('http') && url.length > 20) {
        return url;
      }
      
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (error) {
      logger.error('Spreadsheet ID extraction error:', error);
      return null;
    }
  }

  async initialize() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: './config/google-service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const client = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: client });
      this.initialized = true;

      logger.info('✅ Google Sheets service initialized successfully');
      return { success: true };
    } catch (error) {
      logger.error('❌ Google Sheets service initialization failed:', error);
      return { 
        success: false, 
        message: error.message,
        instructions: [
          'Google service account key dosyasını kontrol edin',
          'API erişim izinlerini kontrol edin',
          'Internet bağlantınızı kontrol edin'
        ]
      };
    }
  }

  async readSheet(urlOrId, range = 'A:Z') {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      const spreadsheetId = this.extractSpreadsheetId(urlOrId);
      if (!spreadsheetId) {
        return {
          success: false,
          message: 'Geçersiz Google Sheets URL veya ID'
        };
      }

      logger.info(`📖 Reading Google Sheets: ${spreadsheetId}, range: ${range}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
        dateTimeRenderOption: 'FORMATTED_STRING'
      });

      const rows = response.data.values || [];
      logger.info(`✅ Successfully read ${rows.length} rows from Google Sheets`);

      return { success: true, data: rows };
    } catch (error) {
      logger.error('❌ Google Sheets read error:', error);
      
      if (error.code === 404) {
        return {
          success: false,
          message: 'Requested entity was not found.'
        };
      } else if (error.code === 403) {
        return {
          success: false,
          message: 'Access denied. Check sheet permissions.'
        };
      } else {
        return {
          success: false,
          message: error.message || 'Unknown error occurred'
        };
      }
    }
  }

  async appendRow(urlOrId, rowData) {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      const spreadsheetId = this.extractSpreadsheetId(urlOrId);
      if (!spreadsheetId) {
        return {
          success: false,
          message: 'Geçersiz Google Sheets URL veya ID'
        };
      }

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A:Z',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [rowData]
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Google Sheets append error:', error);
      return { success: false, message: error.message };
    }
  }

  async updateRow(urlOrId, range, rowData) {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      const spreadsheetId = this.extractSpreadsheetId(urlOrId);
      if (!spreadsheetId) {
        return {
          success: false,
          message: 'Geçersiz Google Sheets URL veya ID'
        };
      }

      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData]
        }
      });

      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Google Sheets update error:', error);
      return { success: false, message: error.message };
    }
  }

  async deleteRow(urlOrId, range) {
    try {
      if (!this.initialized) {
        const initResult = await this.initialize();
        if (!initResult.success) {
          return initResult;
        }
      }

      const spreadsheetId = this.extractSpreadsheetId(urlOrId);
      if (!spreadsheetId) {
        return {
          success: false,
          message: 'Geçersiz Google Sheets URL veya ID'
        };
      }

      const response = await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range
      });

      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Google Sheets delete error:', error);
      return { success: false, message: error.message };
    }
  }

  parseMemberData(rows) {
    try {
      if (!rows || rows.length === 0) {
        return {
          success: false,
          message: 'No data found in spreadsheet'
        };
      }

      const headers = rows[0] || [];
      const dataRows = rows.slice(1);
      
      const members = [];
      const errors = [];

      dataRows.forEach((row, index) => {
        try {
          const member = {
            fullName: row[0] || '',
            tcKimlikNo: row[1] ? row[1].toString() : '',
            studentNumber: row[2] ? row[2].toString() : '',
            phone: row[3] ? row[3].toString() : '',
            department: row[4] || '',
            date: row[5] || new Date().toISOString().split('T')[0]
          };

          if (member.fullName && member.studentNumber && member.tcKimlikNo) {
            members.push(member);
          } else {
            errors.push(`Row ${index + 2}: Missing required fields`);
          }
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      });

      return {
        success: true,
        validMembers: members.length,
        errorCount: errors.length,
        errors: errors,
        data: members,
        availableHeaders: headers
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}

const googleSheetsService = new GoogleSheetsService();

module.exports = googleSheetsService;
module.exports = new GoogleSheetsService();