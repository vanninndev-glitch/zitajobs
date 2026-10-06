const router = require("express").Router();
const { authMiddleware, requireAdmin } = require("../middleware/auth");
const c = require("../controllers/adminController");

router.use(authMiddleware, requireAdmin);

router.get("/overview", c.overview);
router.get("/jobs", c.listJobs);
router.patch("/jobs/:id/moderation", c.moderateJob);
router.get("/reports", c.listReports);
router.patch("/reports/:id", c.updateReport);
router.get("/companies", c.listCompanies);
router.patch("/companies/:id/verify", c.verifyCompany);

module.exports = router;
