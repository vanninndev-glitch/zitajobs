const { query } = require("../config/db");
const { isUuid } = require("../utils/tokens");
const { sendMailInBackground, frontendUrl } = require("../services/mailer");
const tpl = require("../services/emailTemplates");

const JOB_STATUSES = ["aprobada", "pendiente", "en_revision", "rechazada"];

const overview = async (req, res, next) => {
  try {
    const r = await query(`SELECT
      (SELECT COUNT(*)::int FROM jobs WHERE moderation_status='pendiente') AS pending_jobs,
      (SELECT COUNT(*)::int FROM jobs WHERE moderation_status='en_revision') AS jobs_in_review,
      (SELECT COUNT(*)::int FROM job_reports WHERE status='abierto') AS open_reports,
      (SELECT COUNT(*)::int FROM users WHERE role='empresa' AND verified=false) AS unverified_companies,
      (SELECT COUNT(*)::int FROM users WHERE role='empresa') AS companies,
      (SELECT COUNT(*)::int FROM jobs WHERE active=true AND moderation_status='aprobada') AS live_jobs`);
    const o = r.rows[0];
    res.json({
      success: true,
      overview: { pendingJobs: o.pending_jobs, jobsInReview: o.jobs_in_review, openReports: o.open_reports, unverifiedCompanies: o.unverified_companies, companies: o.companies, liveJobs: o.live_jobs },
    });
  } catch (err) {
    next(err);
  }
};

const listJobs = async (req, res, next) => {
  try {
    const wanted = String(req.query.status || "pendiente,en_revision").split(",").map((x) => x.trim()).filter((x) => JOB_STATUSES.includes(x));
    const statuses = wanted.length ? wanted : ["pendiente", "en_revision"];
    const r = await query(
      `SELECT j.id, j.title, j.category, j.location, j.description, j.moderation_status, j.moderation_note, j.created_at,
              u.company_name, u.email AS company_email, u.verified,
              COALESCE((SELECT COUNT(*) FROM job_reports r WHERE r.job_id=j.id AND r.status='abierto'),0)::int AS open_reports,
              COALESCE((SELECT json_agg(json_build_object('reason', r.reason, 'details', r.details) ORDER BY r.created_at DESC) FROM job_reports r WHERE r.job_id=j.id AND r.status='abierto'),'[]'::json) AS reports
       FROM jobs j JOIN users u ON u.id=j.company_id
       WHERE j.moderation_status = ANY($1) ORDER BY j.created_at DESC LIMIT 100`,
      [statuses],
    );
    res.json({
      success: true,
      jobs: r.rows.map((x) => ({
        id: x.id, title: x.title, category: x.category, location: x.location, description: x.description,
        moderationStatus: x.moderation_status, moderationNote: x.moderation_note, createdAt: x.created_at,
        company: { name: x.company_name, email: x.company_email, verified: x.verified },
        openReports: x.open_reports, reports: x.reports,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const moderateJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const status = String((req.body && req.body.status) || "");
    const note = String((req.body && req.body.note) || "").trim().slice(0, 500);
    if (!isUuid(id)) return res.status(404).json({ success: false, message: "Vacante no encontrada" });
    if (!["aprobada", "rechazada"].includes(status)) return res.status(400).json({ success: false, message: "Estado inválido. Usa: aprobada o rechazada" });
    const r = await query(
      `UPDATE jobs SET moderation_status=$1, moderation_note=$2, moderated_at=NOW(), updated_at=NOW() WHERE id=$3 RETURNING id,title,company_id`,
      [status, note || null, id],
    );
    if (!r.rowCount) return res.status(404).json({ success: false, message: "Vacante no encontrada" });
    // Los reportes abiertos de esta vacante quedan atendidos.
    await query(`UPDATE job_reports SET status=$1 WHERE job_id=$2 AND status='abierto'`, [status === "aprobada" ? "descartado" : "resuelto", id]);
    const owner = await query("SELECT email, company_name FROM users WHERE id=$1", [r.rows[0].company_id]);
    if (owner.rowCount) {
      sendMailInBackground({ to: owner.rows[0].email, ...tpl.jobModeration({ companyName: owner.rows[0].company_name, jobTitle: r.rows[0].title, status, note, url: `${frontendUrl()}/dashboard-empresa.html` }) });
    }
    res.json({ success: true, message: status === "aprobada" ? "Vacante aprobada" : "Vacante rechazada" });
  } catch (err) {
    next(err);
  }
};

const listReports = async (req, res, next) => {
  try {
    const status = ["abierto", "resuelto", "descartado"].includes(req.query.status) ? req.query.status : "abierto";
    const r = await query(
      `SELECT r.id, r.reason, r.details, r.status, r.created_at, j.id AS job_id, j.title, j.moderation_status, u.company_name, rp.name AS reporter_name
       FROM job_reports r JOIN jobs j ON j.id=r.job_id JOIN users u ON u.id=j.company_id JOIN users rp ON rp.id=r.reporter_id
       WHERE r.status=$1 ORDER BY r.created_at DESC LIMIT 100`,
      [status],
    );
    res.json({
      success: true,
      reports: r.rows.map((x) => ({
        id: x.id, reason: x.reason, reasonLabel: tpl.reasonLabel(x.reason), details: x.details, status: x.status, createdAt: x.created_at,
        job: { id: x.job_id, title: x.title, moderationStatus: x.moderation_status, companyName: x.company_name }, reporterName: x.reporter_name,
      })),
    });
  } catch (err) {
    next(err);
  }
};

const updateReport = async (req, res, next) => {
  try {
    const status = String((req.body && req.body.status) || "");
    if (!isUuid(req.params.id)) return res.status(404).json({ success: false, message: "Reporte no encontrado" });
    if (!["resuelto", "descartado"].includes(status)) return res.status(400).json({ success: false, message: "Estado inválido. Usa: resuelto o descartado" });
    const r = await query("UPDATE job_reports SET status=$1 WHERE id=$2 RETURNING id", [status, req.params.id]);
    if (!r.rowCount) return res.status(404).json({ success: false, message: "Reporte no encontrado" });
    res.json({ success: true, message: "Reporte actualizado" });
  } catch (err) {
    next(err);
  }
};

const listCompanies = async (req, res, next) => {
  try {
    const params = [];
    let where = "role='empresa'";
    if (req.query.verified === "false") where += " AND verified=false";
    if (req.query.verified === "true") where += " AND verified=true";
    if (req.query.q) {
      params.push(`%${req.query.q}%`);
      where += ` AND (company_name ILIKE $1 OR email ILIKE $1)`;
    }
    const r = await query(
      `SELECT id, company_name, name, email, phone, sector, website, verified, created_at,
              (SELECT COUNT(*)::int FROM jobs j WHERE j.company_id=users.id) AS jobs_count
       FROM users WHERE ${where} ORDER BY created_at DESC LIMIT 100`,
      params,
    );
    res.json({
      success: true,
      companies: r.rows.map((x) => ({ id: x.id, companyName: x.company_name, representative: x.name, email: x.email, phone: x.phone, sector: x.sector, website: x.website, verified: x.verified, jobsCount: x.jobs_count, createdAt: x.created_at })),
    });
  } catch (err) {
    next(err);
  }
};

const verifyCompany = async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(404).json({ success: false, message: "Empresa no encontrada" });
    const verified = req.body && (req.body.verified === true || req.body.verified === "true");
    const r = await query("UPDATE users SET verified=$1, updated_at=NOW() WHERE id=$2 AND role='empresa' RETURNING id", [verified, req.params.id]);
    if (!r.rowCount) return res.status(404).json({ success: false, message: "Empresa no encontrada" });
    res.json({ success: true, message: verified ? "Empresa verificada" : "Verificación retirada" });
  } catch (err) {
    next(err);
  }
};

module.exports = { overview, listJobs, moderateJob, listReports, updateReport, listCompanies, verifyCompany };
