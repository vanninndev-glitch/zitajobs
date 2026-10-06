// Uso: npm run make-admin -- correo@ejemplo.com [--quitar]
// Da (o quita) acceso al panel de moderación. Usa DATABASE_URL de backend/.env.
require("dotenv").config();
const { pool } = require("../src/config/db");

(async () => {
  const email = process.argv[2];
  const revoke = process.argv.includes("--quitar");
  if (!email || email.startsWith("--")) {
    console.error("Uso: npm run make-admin -- correo@ejemplo.com [--quitar]");
    process.exit(1);
  }
  const r = await pool.query("UPDATE users SET is_admin=$1 WHERE lower(email)=lower($2) RETURNING email", [!revoke, email]);
  console.log(r.rowCount ? `${r.rows[0].email}: administrador = ${!revoke}` : "No existe una cuenta con ese correo. Regístrala primero en el sitio.");
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
