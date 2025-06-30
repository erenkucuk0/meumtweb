const mongoose = require('mongoose');
const Permission = require('../models/Permission');
const logger = require('../utils/logger');
require('dotenv').config();

async function migratePermissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    const actionMap = {
      'approve': 'update',
      'reject': 'update'
    };

    const permissions = await Permission.find({
      actions: { $in: ['approve', 'reject'] }
    });

    for (const permission of permissions) {
      const updatedActions = permission.actions.map(action => actionMap[action] || action);
      permission.actions = updatedActions;
      await permission.save();
      logger.info(`Updated permission ${permission._id}`);
    }

    logger.info('Permission migration completed');
    process.exit(0);
  } catch (error) {
    logger.error('Migration error:', error);
    process.exit(1);
  }
}

migratePermissions(); 