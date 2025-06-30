const apiVersioning = (req, res, next) => {
  let version = req.headers['api-version'] || req.query.version || 'v1';
  
  if (!version.startsWith('v')) {
    version = `v${version}`;
  }

  const supportedVersions = ['v1', 'v2'];
  
  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      success: false,
      message: 'Desteklenmeyen API versiyonu',
      supportedVersions
    });
  }

  req.apiVersion = version;
  
  res.setHeader('API-Version', version);
  
  next();
};

const requireVersion = (version) => {
  return (req, res, next) => {
    if (req.apiVersion !== version) {
      return res.status(400).json({
        success: false,
        message: `Bu endpoint ${version} gerektirir`,
        currentVersion: req.apiVersion
      });
    }
    next();
  };
};

module.exports = {
  apiVersioning,
  requireVersion
}; 