// Pruebas de integración. Requieren una base PostgreSQL de PRUEBA:
//   TEST_DATABASE_URL=postgresql://usuario:clave@localhost:5432/zitajobs_test npm test
// Se vacían las tablas, por eso el nombre de la base debe contener "test".
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const DB = process.env.TEST_DATABASE_URL;
const skip = !DB || !/test/i.test(DB) ? "Define TEST_DATABASE_URL (la base debe contener 'test' en el nombre)" : false;

let server, base, query, sent;
const J = (method, url, body, token) =>
  fetch(base + url, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const tick = () => new Promise((r) => setTimeout(r, 150));

test("API ZitaJobs (flujos completos)", { skip }, async (t) => {
  process.env.DATABASE_URL = DB;
  process.env.DATABASE_SSL = "false";
  process.env.JWT_SECRET = "test-secret-test-secret-test-secret-test-secret-1234567890";
  process.env.FRONTEND_URL = "https://front.test";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy";
  process.env.RATE_LIMIT_MAX = "5000";
  process.env.NODE_ENV = "test";
  delete process.env.REQUIRE_JOB_APPROVAL;

  ({ query } = require("../src/config/db"));
  const app = require("../src/app");
  const mailer = require("../src/services/mailer");
  sent = [];
  mailer.__setTransportForTests(async (m) => sent.push(m));

  await query(fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"));
  await query("TRUNCATE users CASCADE");
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    server.close();
    await require("../src/config/db").pool.end();
  });

  const reg = (name, email, role, extra = {}) => J("POST", "/auth/register", { name, email, password: "secreto1", role, acceptTerms: true, ...extra });
  let empresa, cand, rep1, rep2, rep3, admin, jobId;

  await t.test("registro exige aceptar el aviso de privacidad", async () => {
    const r = await J("POST", "/auth/register", { name: "A", email: "a@test.mx", password: "secreto1", role: "candidato" });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /Aviso de Privacidad/);
  });

  await t.test("registro de usuarios y empresa", async () => {
    empresa = (await reg("Rep Empresa", "empresa@test.mx", "empresa", { companyName: "Taller Demo", sector: "Servicios" })).body;
    cand = (await reg("Carla Candidata", "carla@test.mx", "candidato")).body;
    rep1 = (await reg("Rep Uno", "r1@test.mx", "candidato")).body;
    rep2 = (await reg("Rep Dos", "r2@test.mx", "candidato")).body;
    rep3 = (await reg("Rep Tres", "r3@test.mx", "candidato")).body;
    admin = (await reg("Admin", "admin@test.mx", "candidato")).body;
    assert.ok(empresa.token && cand.token && admin.token);
    const row = await query("SELECT accepted_terms_at FROM users WHERE email='carla@test.mx'");
    assert.ok(row.rows[0].accepted_terms_at);
    assert.equal(cand.user.isAdmin, false);
  });

  await t.test("publicar con ubicación sucia la normaliza y se puede filtrar", async () => {
    const r = await J("POST", "/jobs", { title: "Mecánico", category: "Manufactura", description: "Reparar", location: "zitacuaro, mich." }, empresa.token);
    assert.equal(r.status, 201);
    assert.equal(r.body.job.location, "Zitácuaro, Michoacán");
    assert.equal(r.body.job.moderationStatus, "aprobada");
    jobId = r.body.job.id;
    await J("POST", "/jobs", { title: "Diseñador remoto", category: "Diseño", description: "Figma", location: "Home office" }, empresa.token);
    const all = await J("GET", "/jobs");
    assert.equal(all.body.total, 2);
    const f = await J("GET", "/jobs?location=" + encodeURIComponent("Remoto"));
    assert.equal(f.body.total, 1);
    assert.equal(f.body.jobs[0].title, "Diseñador remoto");
    const loc = await J("GET", "/jobs/locations");
    assert.deepEqual(loc.body.locations.map((l) => l.name).sort(), ["Remoto", "Zitácuaro, Michoacán"]);
  });

  await t.test("la búsqueda encuentra por nombre de empresa", async () => {
    assert.equal((await J("GET", "/jobs?q=Taller")).body.total, 2);
    assert.equal((await J("GET", "/jobs?q=NoExiste")).body.total, 0);
  });

  await t.test("id inválido responde 404, no 500", async () => {
    assert.equal((await J("GET", "/jobs/no-es-uuid")).status, 404);
  });

  await t.test("directorio público de empresas no expone correo ni datos privados", async () => {
    const r = await J("GET", "/users/companies");
    assert.equal(r.status, 200);
    assert.equal(r.body.companies.length, 1);
    const c = r.body.companies[0];
    assert.equal(c.companyName, "Taller Demo");
    for (const k of ["email", "name", "createdAt", "password", "cv"]) assert.ok(!(k in c), k);
  });

  await t.test("postulación y cambio de estado envían correos", async () => {
    sent.length = 0;
    const fd = new FormData();
    fd.append("jobId", jobId);
    const r = await fetch(base + "/applications", { method: "POST", headers: { Authorization: `Bearer ${cand.token}` }, body: fd });
    assert.equal(r.status, 201);
    const appId = (await r.json()).application.id;
    await tick();
    assert.deepEqual(sent.map((m) => m.to).sort(), ["carla@test.mx", "empresa@test.mx"]);
    sent.length = 0;
    const s = await J("PATCH", `/applications/${appId}/status`, { status: "aceptado" }, empresa.token);
    assert.equal(s.status, 200);
    await tick();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "carla@test.mx");
    sent.length = 0;
    await J("PATCH", `/applications/${appId}/status`, { status: "aceptado" }, empresa.token);
    await tick();
    assert.equal(sent.length, 0, "mismo estado no reenvía correo");
  });

  await t.test("recuperar contraseña: flujo completo, un solo uso", async () => {
    sent.length = 0;
    const bad = await J("POST", "/auth/forgot-password", { email: "no-es-correo" });
    assert.equal(bad.status, 400);
    const unknown = await J("POST", "/auth/forgot-password", { email: "nadie@test.mx" });
    const known = await J("POST", "/auth/forgot-password", { email: "carla@test.mx" });
    assert.equal(unknown.status, 200);
    assert.equal(known.body.message, unknown.body.message, "misma respuesta exista o no la cuenta");
    await tick();
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "carla@test.mx");
    const token = sent[0].text.match(/token=([0-9a-f]{64})/)[1];
    const stored = await query("SELECT token_hash FROM password_resets");
    assert.ok(!stored.rows.some((r) => r.token_hash === token), "el token no se guarda en claro");

    assert.equal((await J("POST", "/auth/reset-password", { token, password: "123" })).status, 400);
    const ok = await J("POST", "/auth/reset-password", { token, password: "nueva-clave-9" });
    assert.equal(ok.status, 200);
    assert.equal((await J("POST", "/auth/reset-password", { token, password: "otra-clave-9" })).status, 400, "no se reutiliza");
    assert.equal((await J("POST", "/auth/login", { email: "carla@test.mx", password: "secreto1" })).status, 401);
    assert.equal((await J("POST", "/auth/login", { email: "carla@test.mx", password: "nueva-clave-9" })).status, 200);
  });

  await t.test("un token vencido no sirve", async () => {
    sent.length = 0;
    await J("POST", "/auth/forgot-password", { email: "r1@test.mx" });
    await tick();
    const token = sent[0].text.match(/token=([0-9a-f]{64})/)[1];
    await query("UPDATE password_resets SET expires_at = NOW() - INTERVAL '1 minute'");
    assert.equal((await J("POST", "/auth/reset-password", { token, password: "nueva-clave-9" })).status, 400);
  });

  await t.test("reportes: validaciones y ocultamiento automático con 3 reportes", async () => {
    assert.equal((await J("POST", `/jobs/${jobId}/report`, { reason: "fraude" })).status, 401);
    assert.equal((await J("POST", `/jobs/${jobId}/report`, { reason: "inventado" }, rep1.token)).status, 400);
    assert.equal((await J("POST", `/jobs/${jobId}/report`, { reason: "fraude" }, empresa.token)).status, 403, "no puede reportar su propia vacante");
    assert.equal((await J("POST", `/jobs/${jobId}/report`, { reason: "fraude", details: "Piden depósito" }, rep1.token)).status, 201);
    assert.equal((await J("POST", `/jobs/${jobId}/report`, { reason: "cobro" }, rep1.token)).status, 409, "duplicado");
    await J("POST", `/jobs/${jobId}/report`, { reason: "fraude" }, rep2.token);
    assert.equal((await J("GET", `/jobs/${jobId}`)).status, 200, "con 2 reportes sigue visible");
    await J("POST", `/jobs/${jobId}/report`, { reason: "otro" }, rep3.token);
    assert.equal((await J("GET", `/jobs/${jobId}`)).status, 404, "con 3 reportes se oculta");
    assert.equal((await J("GET", "/jobs")).body.total, 1);
    const mine = await J("GET", "/jobs/my", null, empresa.token);
    assert.equal(mine.body.jobs.find((j) => j.id === jobId).moderationStatus, "en_revision");
    const fd = new FormData();
    fd.append("jobId", jobId);
    const ap = await fetch(base + "/applications", { method: "POST", headers: { Authorization: `Bearer ${rep1.token}` }, body: fd });
    assert.equal(ap.status, 404, "no se puede postular a una vacante oculta");
  });

  await t.test("panel admin: acceso restringido, aprobar y verificar empresa", async () => {
    assert.equal((await J("GET", "/admin/overview")).status, 401);
    assert.equal((await J("GET", "/admin/overview", null, cand.token)).status, 403);
    await query("UPDATE users SET is_admin=true WHERE email='admin@test.mx'");
    const ov = await J("GET", "/admin/overview", null, admin.token);
    assert.equal(ov.status, 200);
    assert.equal(ov.body.overview.jobsInReview, 1);
    assert.equal(ov.body.overview.openReports, 3);

    const list = await J("GET", "/admin/jobs", null, admin.token);
    assert.equal(list.body.jobs.length, 1);
    assert.equal(list.body.jobs[0].openReports, 3);
    assert.equal((await J("GET", "/admin/reports", null, admin.token)).body.reports.length, 3);

    sent.length = 0;
    assert.equal((await J("PATCH", `/admin/jobs/${jobId}/moderation`, { status: "xx" }, admin.token)).status, 400);
    assert.equal((await J("PATCH", `/admin/jobs/${jobId}/moderation`, { status: "aprobada" }, admin.token)).status, 200);
    await tick();
    assert.equal(sent[0].to, "empresa@test.mx");
    assert.equal((await J("GET", `/jobs/${jobId}`)).status, 200, "vuelve a ser visible");
    assert.equal((await J("GET", "/admin/reports", null, admin.token)).body.reports.length, 0, "reportes atendidos");

    const comp = await J("GET", "/admin/companies?verified=false", null, admin.token);
    assert.equal(comp.body.companies.length, 1);
    assert.equal((await J("PATCH", `/admin/companies/${comp.body.companies[0].id}/verify`, { verified: true }, admin.token)).status, 200);
    const job = await J("GET", `/jobs/${jobId}`);
    assert.equal(job.body.job.company.verified, true);
    assert.equal((await J("GET", "/users/companies")).body.companies[0].verified, true);
  });

  await t.test("rechazar una vacante la retira y avisa a la empresa", async () => {
    sent.length = 0;
    assert.equal((await J("PATCH", `/admin/jobs/${jobId}/moderation`, { status: "rechazada", note: "Pide depósito" }, admin.token)).status, 200);
    await tick();
    assert.match(sent[0].subject, /retirada/);
    assert.equal((await J("GET", `/jobs/${jobId}`)).status, 404);
  });

  await t.test("REQUIRE_JOB_APPROVAL: empresas sin verificar publican en 'pendiente'", async () => {
    process.env.REQUIRE_JOB_APPROVAL = "true";
    const e2 = (await reg("Otra", "otra@test.mx", "empresa", { companyName: "Nueva SA" })).body;
    const r = await J("POST", "/jobs", { title: "Vendedor", category: "Ventas", description: "Vender" }, e2.token);
    assert.equal(r.body.job.moderationStatus, "pendiente");
    assert.equal((await J("GET", `/jobs/${r.body.job.id}`)).status, 404);
    await J("PATCH", `/admin/jobs/${r.body.job.id}/moderation`, { status: "aprobada" }, admin.token);
    assert.equal((await J("GET", `/jobs/${r.body.job.id}`)).status, 200);
    // empresa verificada publica directo
    const ver = await J("POST", "/jobs", { title: "Chofer", category: "Otro", description: "Manejar" }, empresa.token);
    assert.equal(ver.body.job.moderationStatus, "aprobada");
    delete process.env.REQUIRE_JOB_APPROVAL;
  });
});
