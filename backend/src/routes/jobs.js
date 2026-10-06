// routes/jobs.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { getJobs, getJob, createJob, updateJob, deleteJob, getMyJobs, getLocations } = require('../controllers/jobsController');
const { reportJob } = require('../controllers/reportsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados reportes. Intenta más tarde.' }
});

router.get('/', getJobs);
router.get('/locations', getLocations);
router.get('/my', authMiddleware, requireRole('empresa'), getMyJobs);
router.get('/:id', getJob);
router.post('/:id/report', authMiddleware, reportLimiter, reportJob);
router.post('/', authMiddleware, requireRole('empresa'), createJob);
router.put('/:id', authMiddleware, requireRole('empresa'), updateJob);
router.delete('/:id', authMiddleware, requireRole('empresa'), deleteJob);

module.exports = router;
