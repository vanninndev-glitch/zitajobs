const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const cvFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) return cb(new Error('Solo se permiten archivos PDF, DOC o DOCX para el CV'), false);
  cb(null, true);
};

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
  cb(null, true);
};

const maxSize = parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10) * 1024 * 1024;
const limits = { fileSize: maxSize };

module.exports = {
  uploadCV: multer({ storage, fileFilter: cvFilter, limits }),
  uploadLogo: multer({ storage, fileFilter: imageFilter, limits })
};
