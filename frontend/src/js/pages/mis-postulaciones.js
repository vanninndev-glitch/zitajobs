// src/js/pages/mis-postulaciones.js
import { applications, isLoggedIn, isCandidato } from '../api.js';
import { renderNavbar, toast, statusBadge, initScrollAnimations } from '../components/ui.js';

let allApps = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn() || !isCandidato()) { window.location.href = 'ingresar.html'; return; }
  renderNavbar('postulaciones');
  initScrollAnimations();
  await loadApplications();
  bindFilterTabs();
});

async function loadApplications() {
  const container = document.getElementById('applications-container');
  try {
    const res = await applications.getMy();
    allApps = res.applications;
    updateStats();
    renderApplications(allApps);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">Error al cargar</div><p class="empty-state-sub">${err.message}</p></div>`;
  }
}

function updateStats() {
  document.getElementById('stat-revision').textContent = allApps.filter(a => a.status === 'revision').length;
  document.getElementById('stat-accepted').textContent = allApps.filter(a => a.status === 'aceptado').length;
  document.getElementById('stat-rejected').textContent = allApps.filter(a => a.status === 'rechazado').length;
}

function renderApplications(apps) {
  const container = document.getElementById('applications-container');
  if (!apps.length) {
    container.innerHTML = `
      <div class="empty-state" data-animate>
        <div class="empty-state-icon">${currentFilter === 'all' ? '📭' : '🔍'}</div>
        <div class="empty-state-title">${currentFilter === 'all' ? 'Aún no te has postulado a ningún empleo' : 'Sin postulaciones en esta categoría'}</div>
        <p class="empty-state-sub">${currentFilter === 'all' ? 'Explora las ofertas disponibles y envía tu primera postulación.' : 'Cambia el filtro para ver otras postulaciones.'}</p>
        ${currentFilter === 'all' ? `<a href="index.html" class="btn btn-primary" style="margin-top:1.25rem;">Buscar empleos →</a>` : ''}
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      ${apps.map(app => renderAppCard(app)).join('')}
    </div>
  `;
}

function renderAppCard(app) {
  const statusConfig = {
    revision:  { bg: 'rgba(255,184,0,0.08)',  border: 'rgba(255,184,0,0.3)',  accent: '#b45309' },
    aceptado:  { bg: 'rgba(76,175,80,0.08)',  border: 'rgba(76,175,80,0.3)',  accent: '#166534' },
    rechazado: { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.3)',  accent: '#991b1b' },
  };
  const cfg = statusConfig[app.status] || statusConfig.revision;

  const messages = {
    revision: '📋 Tu postulación está siendo revisada por la empresa. Te contactarán si hay avances.',
    aceptado: '🎉 ¡Felicidades! Fuiste seleccionado. La empresa se pondrá en contacto contigo pronto.',
    rechazado: '📌 Por esta ocasión no fuiste seleccionado. No te desanimes, ¡sigue buscando!'
  };

  return `
    <div class="card" style="border:1.5px solid ${cfg.border}; background:var(--bg-card);" data-animate>
      <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:start; gap:1rem;">
        <div style="flex:1; min-width:200px;">
          <h3 style="font-family:var(--font-display); font-weight:700; font-size:1.05rem; margin-bottom:0.2rem;">
            ${escHtml(app.job?.title || 'Empleo')}
          </h3>
          <p style="color:var(--zita-primary); font-size:0.875rem; font-weight:600; margin-bottom:0.15rem;">
            ${escHtml(app.company?.name || 'Empresa')}
          </p>
          <p style="color:var(--text-muted); font-size:0.8rem;">
            📍 ${escHtml(app.job?.location || '')} &nbsp;·&nbsp; ⏱ ${escHtml(app.job?.type || '')}
          </p>
          <p style="color:var(--text-light); font-size:0.75rem; margin-top:0.375rem;">
            Postulado el ${new Date(app.createdAt).toLocaleDateString('es-MX', { day:'numeric', month:'long', year:'numeric' })}
          </p>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.5rem;">
          ${statusBadge(app.status)}
          <a href="index.html" style="font-size:0.78rem; color:var(--text-muted);">Ver empleo →</a>
        </div>
      </div>

      <!-- Status message -->
      <div style="margin-top:1rem; padding:0.75rem 1rem; border-radius:var(--radius-md); background:${cfg.bg}; border-left:3px solid ${cfg.accent};">
        <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.6;">${messages[app.status] || ''}</p>
      </div>

      ${app.coverLetter ? `
        <details style="margin-top:0.875rem;">
          <summary style="font-size:0.8rem; font-weight:600; cursor:pointer; color:var(--text-muted); list-style:none; display:flex; align-items:center; gap:0.375rem;">
            ✍️ Ver carta de presentación
          </summary>
          <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.7; margin-top:0.625rem; padding-left:0.5rem; border-left:2px solid var(--border);">${escHtml(app.coverLetter)}</p>
        </details>
      ` : ''}
    </div>
  `;
}

function bindFilterTabs() {
  document.getElementById('status-tabs')?.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    currentFilter = tab.dataset.filter;
    document.querySelectorAll('#status-tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
    const filtered = currentFilter === 'all' ? allApps : allApps.filter(a => a.status === currentFilter);
    renderApplications(filtered);
  });
}

function escHtml(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
