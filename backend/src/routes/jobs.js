// routes/jobs.js
const router = require('express').Router();
const { getJobs, getJob, createJob, updateJob, deleteJob, getMyJobs } = require('../controllers/jobsController');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', getJobs);
router.get('/my', authMiddleware, requireRole('empresa'), getMyJobs);
router.get('/:id', getJob);
router.post('/', authMiddleware, requireRole('empresa'), createJob);
router.put('/:id', authMiddleware, requireRole('empresa'), updateJob);
router.delete('/:id', authMiddleware, requireRole('empresa'), deleteJob);

module.exports = router;
