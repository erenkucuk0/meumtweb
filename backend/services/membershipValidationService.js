const SystemConfig = require('../models/SystemConfig');
const googleSheetsManager = require('../services/googleSheetsManager');
const logger = require('../utils/logger');

class MembershipValidationService {
  constructor() {
    this.sheetsManager = googleSheetsManager;
  }

  async validateMembership(tcKimlikNo = null, studentNumber = null) {
    try {
      const config = await SystemConfig.findOne();
      if (!config || !config.googleSheets) {
        throw new Error('Google Sheets yapılandırması bulunamadı');
      }

      const result = await this.sheetsManager.validateMember(
        config.googleSheets.url || config.googleSheets.spreadsheetId,
        tcKimlikNo,
        studentNumber
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Üye doğrulanamadı');
      }

      return {
        success: true,
        isValid: result.found,
        memberData: result.member,
        message: result.message
      };
    } catch (error) {
      logger.error('Üye doğrulama hatası:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async syncGoogleSheets() {
    try {
      const config = await SystemConfig.findOne();
      if (!config || !config.googleSheets || !config.googleSheets.url || !config.googleSheets.spreadsheetId || !config.googleSheets.worksheetName) {
        throw new Error('Google Sheets yapılandırması bulunamadı');
      }

      const result = await this.sheetsManager.sheetsService.getSpreadsheetData(
        config.googleSheets.url,
        config.googleSheets.spreadsheetId,
        config.googleSheets.worksheetName
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Google Sheets verisi alınamadı');
      }

      return {
        success: true,
        message: 'Google Sheets senkronizasyonu başarılı',
        data: result.data
      };
    } catch (error) {
      logger.error('Google Sheets senkronizasyon hatası:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async addMember(memberData) {
    try {
      const config = await SystemConfig.findOne();
      if (!config || !config.googleSheets || !config.googleSheets.url || !config.googleSheets.spreadsheetId || !config.googleSheets.worksheetName) {
        throw new Error('Google Sheets yapılandırması bulunamadı');
      }

      const result = await this.sheetsManager.sheetsService.addMemberToSheet(
        config.googleSheets.url,
        config.googleSheets.spreadsheetId,
        config.googleSheets.worksheetName,
        memberData
      );

      if (!result.success) {
        throw new Error(result.message || 'Üye eklenemedi');
      }

      return {
        success: true,
        message: 'Üye başarıyla eklendi'
      };
    } catch (error) {
      logger.error('Üye ekleme hatası:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

const membershipValidationService = new MembershipValidationService();
module.exports = membershipValidationService; 