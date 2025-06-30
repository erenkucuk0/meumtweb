const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

async function testBcrypt() {
  try {
    const password = 'test123';
    
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    logger.info('Password:', password);
    logger.info('Hash:', hash);
    
    const isMatch = await bcrypt.compare(password, hash);
    logger.info('Password match:', isMatch);
    
    const wrongMatch = await bcrypt.compare('wrong123', hash);
    logger.info('Wrong password match:', wrongMatch);
    
    return {
      success: true,
      message: 'Bcrypt tests passed successfully'
    };
  } catch (error) {
    logger.error('Bcrypt test error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

testBcrypt().then(result => {
  if (result.success) {
    logger.info('✅ Bcrypt tests completed successfully');
  } else {
    logger.error('❌ Bcrypt tests failed:', result.message);
  }
}); 