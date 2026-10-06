// Envío de correos por API HTTP (sin dependencias).
// Render Free bloquea SMTP (puertos 25/465/587), por eso se usa la API de Brevo o Resend.
//
// Variables (todas opcionales; sin ellas los correos simplemente no se envían):
//   EMAIL_PROVIDER = brevo | resend
//   EMAIL_API_KEY  = clave de la API del proveedor
//   EMAIL_FROM     = remitente verificado en el proveedor
//   EMAIL_FROM_NAME= nombre visible (por defecto "ZitaJobs")

let transportOverride = null; // para pruebas

const config = () => ({
  provider: String(process.env.EMAIL_PROVIDER || "").toLowerCase(),
  apiKey: process.env.EMAIL_API_KEY || "",
  from: process.env.EMAIL_FROM || "",
  fromName: process.env.EMAIL_FROM_NAME || "ZitaJobs",
});

const isEnabled = () => {
  if (transportOverride) return true;
  const c = config();
  return ["brevo", "resend"].includes(c.provider) && !!c.apiKey && !!c.from;
};

async function post(url, headers, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`${res.status} ${detail}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

const providers = {
  brevo: (c, m) =>
    post("https://api.brevo.com/v3/smtp/email", { "api-key": c.apiKey }, {
      sender: { name: c.fromName, email: c.from },
      to: [{ email: m.to }],
      subject: m.subject,
      htmlContent: m.html,
      textContent: m.text,
    }),
  resend: (c, m) =>
    post("https://api.resend.com/emails", { Authorization: `Bearer ${c.apiKey}` }, {
      from: `${c.fromName} <${c.from}>`,
      to: [m.to],
      subject: m.subject,
      html: m.html,
      text: m.text,
    }),
};

let warned = false;

/** Nunca lanza. Devuelve { ok, skipped?, error? }. */
async function sendMail({ to, subject, html, text }) {
  try {
    if (!to || !subject) return { ok: false, error: "Faltan destinatario o asunto" };
    if (transportOverride) {
      await transportOverride({ to, subject, html, text });
      return { ok: true };
    }
    if (!isEnabled()) {
      if (!warned) {
        warned = true;
        console.warn("[mailer] Correo desactivado: define EMAIL_PROVIDER, EMAIL_API_KEY y EMAIL_FROM para enviar correos.");
      }
      return { ok: false, skipped: true };
    }
    const c = config();
    await providers[c.provider](c, { to, subject, html, text });
    return { ok: true };
  } catch (err) {
    console.error("[mailer] No se pudo enviar el correo:", err.message);
    return { ok: false, error: err.message };
  }
}

/** Envía sin esperar (no retrasa la respuesta HTTP). */
const sendMailInBackground = (msg) => {
  sendMail(msg);
};

const frontendUrl = () =>
  String(process.env.PUBLIC_FRONTEND_URL || (process.env.FRONTEND_URL || "").split(",")[0] || "")
    .trim()
    .replace(/\/$/, "");

const __setTransportForTests = (fn) => {
  transportOverride = fn;
};

module.exports = { sendMail, sendMailInBackground, isEnabled, frontendUrl, __setTransportForTests };
