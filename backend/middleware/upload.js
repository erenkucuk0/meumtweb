const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'avatar') {
      uploadPath += 'avatars/';
    } else if (file.fieldname === 'eventImage') {
      uploadPath += 'events/';
    } else if (file.fieldname === 'galleryImage') {
      uploadPath += 'gallery/';
    } else if (file.fieldname === 'heroImage') {
      uploadPath += 'hero/';
    }
    
    try {
      await fs.mkdir(path.join(__dirname, '..', uploadPath), { recursive: true });
      cb(null, path.join(__dirname, '..', uploadPath));
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
    return cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

module.exports = upload; 