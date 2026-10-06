// src/js/pages/admin.js - Panel de moderación
import { admin, auth, getToken, setAuth, isLoggedIn } from '../api.js';
import { renderNavbar, toast } from '../components/ui.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const when = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const reasonLabels = { fraude: 'Posible fraude', cobro: 'Cobran por contratar', informacion_falsa: 'Información falsa', ofensivo: 'Contenido ofensivo', discriminacion: 'Discriminación', otro: 'Otro motivo' };
const modLabels = { pendiente: '⏳ Pendiente', en_revision: '⚠ Oculta por reportes', rechazada: '✕ Rechazada', aprobada: '✓ Aprobada' };

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) { window.location.href = 'ingresar.html'; return; }
  try {
    const { user } = await auth.me(); // refresca el usuario guardado (por si ahora es admin)
    setAuth(getToken(), user);
    if (!user.isAdmin) { window.location.href = 'index.html'; return; }
  } catch { window.location.href = 'ingresar.html'; return; }

  renderNavbar('admin');
  bindTabs();
  $('jobs-filter').addEventListener('change', loadJobs);
  $('company-filter').addEventListener('change', loadCompanies);
  let t; $('company-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(loadCompanies, 300); });
  document.body.addEventListener('click', onAction);
  await Promise.all([loadOverview(), loadJobs(), loadReports()]);
});

function bindTabs() {
  document.querySelectorAll('.admin-tab').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach((x) => x.classList.toggle('active', x === b));
    ['jobs', 'reports', 'companies'].forEach((k) => $(`tab-${k}`).classList.toggle('hidden', k !== b.dataset.tab));
    if (b.dataset.tab === 'companies') loadCompanies();
  }));
}

async function loadOverview() {
  try {
    const { overview: o } = await admin.overview();
    $('ov-review').textContent = o.pendingJobs + o.jobsInReview;
    $('ov-reports').textContent = o.openReports;
    $('ov-unverified').textContent = o.unverifiedCompanies;
    $('ov-live').textContent = o.liveJobs;
    for (const [id, n] of [['cnt-jobs', o.pendingJobs + o.jobsInReview], ['cnt-reports', o.openReports]]) {
      $(id).textContent = n; $(id).classList.toggle('hidden', !n);
    }
  } catch (err) { toast(err.message, 'error'); }
}

const empty = (icon, text) => `<div class="empty-state"><div class="empty-state-icon">${icon}</div><div class="empty-state-title">${text}</div></div>`;

async function loadJobs() {
  const el = $('jobs-list');
  try {
    const { jobs } = await admin.jobs($('jobs-filter').value);
    if (!jobs.length) { el.innerHTML = empty('✅', 'No hay vacantes en esta lista'); return; }
    el.innerHTML = jobs.map((j) => `
      <div class="card admin-item">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3>${esc(j.title)}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">${esc(j.company.name)} ${j.company.verified ? '<span class="verified-badge">✔ Verificada</span>' : ''} · ${esc(j.company.email)}</p>
            <p style="font-size:0.8rem; color:var(--text-light);">📍 ${esc(j.location)} · ${esc(j.category)} · ${when(j.createdAt)}</p>
          </div>
          <span class="mod-badge mod-${j.moderationStatus}">${modLabels[j.moderationStatus]}</span>
        </div>
        <p style="font-size:0.88rem; color:var(--text-muted); margin-top:0.6rem; line-height:1.6; display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;">${esc(j.description)}</p>
        ${j.openReports ? `<div style="margin-top:0.7rem; font-size:0.82rem;"><strong>${j.openReports} reporte(s) abierto(s):</strong><ul style="list-style:disc; padding-left:1.2rem; color:var(--text-muted);">${j.reports.map((r) => `<li>${esc(reasonLabels[r.reason] || r.reason)}${r.details ? ` — ${esc(r.details)}` : ''}</li>`).join('')}</ul></div>` : ''}
        ${j.moderationNote ? `<p style="font-size:0.8rem; margin-top:0.5rem;"><em>Nota: ${esc(j.moderationNote)}</em></p>` : ''}
        <div class="admin-actions">
          <button class="btn btn-sm btn-success" data-action="approve" data-id="${j.id}">Aprobar</button>
          ${j.moderationStatus !== 'rechazada' ? `<button class="btn btn-sm btn-danger" data-action="reject" data-id="${j.id}">Rechazar</button>` : ''}
        </div>
      </div>`).join('');
  } catch (err) { el.innerHTML = empty('⚠️', esc(err.message)); }
}

async function loadReports() {
  const el = $('reports-list');
  try {
    const { reports } = await admin.reports('abierto');
    if (!reports.length) { el.innerHTML = empty('🎉', 'No hay reportes abiertos'); return; }
    el.innerHTML = reports.map((r) => `
      <div class="card admin-item">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3>${esc(r.job.title)}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">${esc(r.job.companyName)} · reportó ${esc(r.reporterName)} · ${when(r.createdAt)}</p>
          </div>
          <span class="mod-badge mod-${r.job.moderationStatus}">${modLabels[r.job.moderationStatus]}</span>
        </div>
        <p style="font-size:0.9rem; margin-top:0.5rem;"><strong>${esc(r.reasonLabel)}</strong>${r.details ? ` — ${esc(r.details)}` : ''}</p>
        <div class="admin-actions">
          <button class="btn btn-sm btn-secondary" data-action="report-dismiss" data-id="${r.id}">Descartar</button>
          <button class="btn btn-sm btn-secondary" data-action="report-resolve" data-id="${r.id}">Marcar atendido</button>
          <button class="btn btn-sm btn-danger" data-action="reject" data-id="${r.job.id}">Rechazar vacante</button>
        </div>
      </div>`).join('');
  } catch (err) { el.innerHTML = empty('⚠️', esc(err.message)); }
}

async function loadCompanies() {
  const el = $('companies-list');
  try {
    const { companies } = await admin.companies({ verified: $('company-filter').value, q: $('company-q').value.trim() });
    if (!companies.length) { el.innerHTML = empty('🏢', 'No hay empresas con ese filtro'); return; }
    el.innerHTML = companies.map((c) => `
      <div class="card admin-item">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3>${esc(c.companyName)} ${c.verified ? '<span class="verified-badge">✔ Verificada</span>' : ''}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">${esc(c.representative)} · ${esc(c.email)}${c.phone ? ' · ' + esc(c.phone) : ''}</p>
            <p style="font-size:0.8rem; color:var(--text-light);">${esc(c.sector || 'Sin sector')} · ${c.jobsCount} vacante(s) · registrada ${when(c.createdAt)}${c.website ? ` · <a href="${esc(c.website)}" target="_blank" rel="noopener" style="color:var(--zita-primary);">sitio web</a>` : ''}</p>
          </div>
          <button class="btn btn-sm ${c.verified ? 'btn-secondary' : 'btn-success'}" data-action="verify" data-id="${c.id}" data-verified="${c.verified ? 'false' : 'true'}">${c.verified ? 'Quitar verificación' : 'Verificar empresa'}</button>
        </div>
      </div>`).join('');
  } catch (err) { el.innerHTML = empty('⚠️', esc(err.message)); }
}

async function onAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  btn.disabled = true;
  try {
    if (action === 'approve') { await admin.moderateJob(id, 'aprobada'); toast('Vacante aprobada', 'success'); }
    else if (action === 'reject') {
      const note = window.prompt('Motivo para la empresa (opcional):');
      if (note === null) { btn.disabled = false; return; }
      await admin.moderateJob(id, 'rechazada', note.trim()); toast('Vacante rechazada', 'success');
    }
    else if (action === 'report-dismiss') { await admin.updateReport(id, 'descartado'); toast('Reporte descartado', 'success'); }
    else if (action === 'report-resolve') { await admin.updateReport(id, 'resuelto'); toast('Reporte atendido', 'success'); }
    else if (action === 'verify') { await admin.verifyCompany(id, btn.dataset.verified === 'true'); toast('Empresa actualizada', 'success'); await loadCompanies(); }
    await Promise.all([loadOverview(), loadJobs(), loadReports()]);
  } catch (err) { toast(err.message || 'No se pudo completar la acción', 'error'); btn.disabled = false; }
}
