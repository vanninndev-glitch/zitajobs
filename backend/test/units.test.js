const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeLocation, DEFAULT_LOCATION } = require("../src/config/locations");
const { hashToken, newToken, isUuid } = require("../src/utils/tokens");
const tpl = require("../src/services/emailTemplates");
const mailer = require("../src/services/mailer");

test("ubicaciones: variantes de Zitácuaro se unifican", () => {
  for (const v of ["zitacuaro", "Zitácuaro", "ZITACUARO, MICH.", "Zitácuaro, Michoacán", " zitacuaro   michoacan ", "Col. Centro, Zitácuaro, Mich."]) {
    assert.equal(normalizeLocation(v).label, "Zitácuaro, Michoacán", v);
  }
});

test("ubicaciones: vacío usa la ubicación por defecto", () => {
  assert.equal(normalizeLocation("").label, DEFAULT_LOCATION);
  assert.equal(normalizeLocation(undefined).label, DEFAULT_LOCATION);
});

test("ubicaciones: remoto y otras ciudades", () => {
  assert.equal(normalizeLocation("home office").label, "Remoto");
  assert.equal(normalizeLocation("cdmx").label, "Ciudad de México");
  const other = normalizeLocation("Guadalajara, Jalisco");
  assert.equal(other.label, "Guadalajara, Jalisco");
  assert.equal(other.known, false);
});

test("ubicaciones: no confunde homónimos de otros estados", () => {
  assert.equal(normalizeLocation("Pachuca, Hidalgo").known, false);
  assert.equal(normalizeLocation("Tuxpan, Veracruz").known, false);
  assert.equal(normalizeLocation("Ciudad Juárez, Chihuahua").known, false);
});

test("tokens: hash estable, token aleatorio de 64 hex", () => {
  const t = newToken();
  assert.match(t, /^[0-9a-f]{64}$/);
  assert.equal(hashToken(t), hashToken(t));
  assert.notEqual(hashToken(t), t);
  assert.ok(isUuid("123e4567-e89b-12d3-a456-426614174000"));
  assert.ok(!isUuid("no-es-uuid"));
});

test("plantillas: escapan HTML de datos del usuario", () => {
  const m = tpl.applicationReceived({ companyName: "X", candidateName: "<script>alert(1)</script>", jobTitle: "A & B", url: "https://x.test" });
  assert.ok(!m.html.includes("<script>"));
  assert.ok(m.html.includes("A &amp; B"));
});

test("plantillas: solo aceptado/rechazado generan correo de estado", () => {
  assert.equal(tpl.applicationStatus({ name: "A", jobTitle: "T", companyName: "C", status: "revision", url: "u" }), null);
  assert.ok(tpl.applicationStatus({ name: "A", jobTitle: "T", companyName: "C", status: "aceptado", url: "u" }));
});

test("mailer: sin configuración no lanza y se omite", async () => {
  delete process.env.EMAIL_PROVIDER;
  const r = await mailer.sendMail({ to: "a@b.co", subject: "x", html: "y", text: "y" });
  assert.equal(r.ok, false);
  assert.equal(r.skipped, true);
});
