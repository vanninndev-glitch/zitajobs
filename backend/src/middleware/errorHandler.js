// middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  console.error(err.stack || err.message);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: `El archivo excede el tamaño máximo permitido (${process.env.MAX_FILE_SIZE_MB || 5}MB)` });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: 'Campo de archivo no permitido' });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' && status === 500 ? 'Error interno del servidor' : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.originalUrl}` });
};

module.exports = { errorHandler, notFound };
