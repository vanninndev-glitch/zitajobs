const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function layout({ title, intro, bodyHtml = "", ctaUrl, ctaLabel, footnote }) {
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5f5fa;font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#E91E8C;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold;">ZitaJobs</td></tr>
<tr><td style="padding:24px;">
<h1 style="font-size:19px;margin:0 0 12px;">${esc(title)}</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 14px;">${intro}</p>
${bodyHtml}
${ctaUrl ? `<p style="margin:22px 0;"><a href="${esc(ctaUrl)}" style="background:#E91E8C;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;display:inline-block;">${esc(ctaLabel)}</a></p>
<p style="font-size:12px;color:#6b6b8a;word-break:break-all;margin:0 0 8px;">Si el botón no funciona, copia este enlace: ${esc(ctaUrl)}</p>` : ""}
${footnote ? `<p style="font-size:12px;color:#6b6b8a;margin:14px 0 0;">${footnote}</p>` : ""}
</td></tr></table>
<p style="font-size:11px;color:#9999b3;margin:14px 0 0;">ZitaJobs · Empleos en Zitácuaro, Michoacán</p>
</td></tr></table></body></html>`;
  return html;
}

const textOf = (...lines) => lines.filter(Boolean).join("\n\n");

const passwordReset = ({ name, url }) => ({
  subject: "Restablece tu contraseña de ZitaJobs",
  html: layout({
    title: "Restablece tu contraseña",
    intro: `Hola ${esc(name)}, recibimos una solicitud para cambiar tu contraseña. El enlace funciona una sola vez y vence en 1 hora.`,
    ctaUrl: url,
    ctaLabel: "Crear nueva contraseña",
    footnote: "Si no fuiste tú, ignora este correo: tu contraseña actual no cambia.",
  }),
  text: textOf(`Hola ${name}, usa este enlace para crear una nueva contraseña (vence en 1 hora):`, url, "Si no fuiste tú, ignora este correo."),
});

const passwordChanged = ({ name }) => ({
  subject: "Tu contraseña de ZitaJobs fue cambiada",
  html: layout({
    title: "Contraseña actualizada",
    intro: `Hola ${esc(name)}, tu contraseña se cambió correctamente.`,
    footnote: "Si no fuiste tú, restablécela de inmediato desde la página de ingreso (¿Olvidaste tu contraseña?).",
  }),
  text: textOf(`Hola ${name}, tu contraseña de ZitaJobs se cambió correctamente.`, "Si no fuiste tú, restablécela de inmediato desde la página de ingreso."),
});

const applicationReceived = ({ companyName, candidateName, jobTitle, url }) => ({
  subject: `Nueva postulación para "${jobTitle}"`,
  html: layout({
    title: "Tienes una nueva postulación",
    intro: `<strong>${esc(candidateName)}</strong> se postuló a <strong>${esc(jobTitle)}</strong>.`,
    ctaUrl: url,
    ctaLabel: "Ver postulantes",
    footnote: `Enviado a ${esc(companyName)}.`,
  }),
  text: textOf(`${candidateName} se postuló a "${jobTitle}".`, `Revísalo en tu panel: ${url}`),
});

const applicationSent = ({ name, jobTitle, companyName, url }) => ({
  subject: `Recibimos tu postulación a "${jobTitle}"`,
  html: layout({
    title: "Postulación enviada",
    intro: `Hola ${esc(name)}, enviamos tu postulación a <strong>${esc(jobTitle)}</strong> en <strong>${esc(companyName)}</strong>. Te avisaremos por aquí cuando cambie su estado.`,
    ctaUrl: url,
    ctaLabel: "Ver mis postulaciones",
  }),
  text: textOf(`Hola ${name}, enviamos tu postulación a "${jobTitle}" en ${companyName}.`, `Sigue su estado: ${url}`),
});

const statusCopy = {
  aceptado: { subject: "¡Buenas noticias sobre tu postulación!", line: "La empresa aceptó tu postulación y puede contactarte pronto. Mantén tu teléfono y correo a la mano." },
  rechazado: { subject: "Actualización de tu postulación", line: "En esta ocasión la empresa decidió continuar con otros perfiles. Gracias por postularte; hay más vacantes esperándote." },
};
const applicationStatus = ({ name, jobTitle, companyName, status, url }) => {
  const c = statusCopy[status];
  if (!c) return null;
  return {
    subject: `${c.subject} · ${jobTitle}`,
    html: layout({ title: c.subject, intro: `Hola ${esc(name)}, sobre <strong>${esc(jobTitle)}</strong> en <strong>${esc(companyName)}</strong>: ${esc(c.line)}`, ctaUrl: url, ctaLabel: "Ver mis postulaciones" }),
    text: textOf(`Hola ${name}, sobre "${jobTitle}" en ${companyName}: ${c.line}`, url),
  };
};

const reasonLabels = { fraude: "Posible fraude", cobro: "Cobran por contratar", informacion_falsa: "Información falsa", ofensivo: "Contenido ofensivo", discriminacion: "Discriminación", otro: "Otro motivo" };
const reasonLabel = (r) => reasonLabels[r] || r;

const jobReported = ({ jobTitle, companyName, reason, count, hidden, url }) => ({
  subject: `Vacante reportada: ${jobTitle}`,
  html: layout({
    title: hidden ? "Una vacante se ocultó por reportes" : "Reportaron una vacante",
    intro: `<strong>${esc(jobTitle)}</strong> (${esc(companyName)}) recibió un reporte: ${esc(reasonLabel(reason))}. Reportes abiertos: ${count}.${hidden ? " Se ocultó automáticamente hasta que la revises." : ""}`,
    ctaUrl: url,
    ctaLabel: "Abrir panel de moderación",
  }),
  text: textOf(`"${jobTitle}" (${companyName}) fue reportada: ${reasonLabel(reason)}. Reportes abiertos: ${count}.${hidden ? " Se ocultó automáticamente." : ""}`, url),
});

const jobModeration = ({ companyName, jobTitle, status, note, url }) => {
  const ok = status === "aprobada";
  return {
    subject: ok ? `Tu vacante "${jobTitle}" ya está publicada` : `Tu vacante "${jobTitle}" fue retirada`,
    html: layout({
      title: ok ? "Vacante aprobada" : "Vacante retirada",
      intro: ok
        ? `Hola ${esc(companyName)}, revisamos <strong>${esc(jobTitle)}</strong> y ya es visible para los candidatos.`
        : `Hola ${esc(companyName)}, <strong>${esc(jobTitle)}</strong> no cumple nuestras reglas y se retiró de la plataforma.${note ? ` Motivo: ${esc(note)}` : ""}`,
      ctaUrl: url,
      ctaLabel: "Ir a mi panel",
    }),
    text: textOf(ok ? `Tu vacante "${jobTitle}" ya está publicada.` : `Tu vacante "${jobTitle}" fue retirada.${note ? ` Motivo: ${note}` : ""}`, url),
  };
};

module.exports = { esc, passwordReset, passwordChanged, applicationReceived, applicationSent, applicationStatus, jobReported, jobModeration, reasonLabel };
