const { query } = require("../config/db");
const { isUuid } = require("../utils/tokens");
const { sendMailInBackground, frontendUrl } = require("../services/mailer");
const tpl = require("../services/emailTemplates");

const REASONS = ["fraude", "cobro", "informacion_falsa", "ofensivo", "discriminacion", "otro"];
// Con este número de reportes abiertos de personas distintas, la vacante se oculta hasta revisión.
const autoHideThreshold = () => Math.max(1, parseInt(process.env.REPORTS_AUTOHIDE_THRESHOLD || "3", 10));

const reportJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reason = String((req.body && req.body.reason) || "");
    const details = String((req.body && req.body.details) || "").trim().slice(0, 1000);
    if (!isUuid(id)) return res.status(404).json({ success: false, message: "Empleo no encontrado" });
    if (!REASONS.includes(reason)) return res.status(400).json({ success: false, message: "Elige un motivo para el reporte" });

    const job = await query(
      `SELECT j.id, j.title, j.company_id, j.moderation_status, u.company_name
       FROM jobs j JOIN users u ON u.id = j.company_id WHERE j.id = $1 AND j.active = true`,
      [id],
    );
    if (!job.rowCount) return res.status(404).json({ success: false, message: "Empleo no encontrado" });
    const j = job.rows[0];
    if (j.company_id === req.user.id) return res.status(403).json({ success: false, message: "No puedes reportar tu propia vacante" });

    const ins = await query(
      `INSERT INTO job_reports(job_id, reporter_id, reason, details) VALUES($1,$2,$3,$4)
       ON CONFLICT (job_id, reporter_id) DO NOTHING RETURNING id`,
      [id, req.user.id, reason, details],
    );
    if (!ins.rowCount) return res.status(409).json({ success: false, message: "Ya reportaste esta vacante. Gracias, la estamos revisando." });

    const open = await query(`SELECT COUNT(*)::int AS n FROM job_reports WHERE job_id=$1 AND status='abierto'`, [id]);
    const count = open.rows[0].n;
    let hidden = false;
    if (count >= autoHideThreshold() && j.moderation_status === "aprobada") {
      await query(`UPDATE jobs SET moderation_status='en_revision', updated_at=NOW() WHERE id=$1 AND moderation_status='aprobada'`, [id]);
      hidden = true;
    }

    // Aviso a los administradores (en segundo plano).
    query("SELECT email FROM users WHERE is_admin = true")
      .then((admins) => {
        const msg = tpl.jobReported({ jobTitle: j.title, companyName: j.company_name, reason, count, hidden, url: `${frontendUrl()}/admin.html` });
        admins.rows.forEach((a) => sendMailInBackground({ to: a.email, ...msg }));
      })
      .catch((e) => console.error("[reportJob] aviso a admins:", e.message));

    res.status(201).json({ success: true, message: "Gracias por avisarnos. Revisaremos la vacante." });
  } catch (err) {
    next(err);
  }
};

module.exports = { reportJob, REASONS };
