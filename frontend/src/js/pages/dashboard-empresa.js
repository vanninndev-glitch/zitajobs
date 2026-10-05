// src/js/pages/dashboard-empresa.js
import { jobs, applications, users, isLoggedIn, isEmpresa, getUser, openApplicationCv } from '../api.js';
import { renderNavbar, toast, setLoading, statusBadge, showModal, hideModal, initModalClose, initScrollAnimations } from '../components/ui.js';

let myJobs = [];
let allApplications = {};

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn() || !isEmpresa()) { window.location.href = 'ingresar.html'; return; }
  renderNavbar('dashboard');
  initModalClose();
  initScrollAnimations();

  const user = getUser();
  document.getElementById('company-greeting').textContent = `${user.companyName || user.name} — Panel de gestión`;

  await loadAll();
  bindTabs();
  bindProfileForm();
});

async function loadAll() {
  try {
    const res = await jobs.getMy();
    myJobs = res.jobs;
    renderMyJobs();
    updateStats();
    populateJobSelector();
    loadProfileForm();
  } catch (err) {
    toast(err.message || 'Error al cargar datos', 'error');
  }
}

function updateStats() {
  const activeJobs = myJobs.filter(j => j.active).length;
  const totalApps = myJobs.reduce((a, j) => a + (j.applicationsCount || 0), 0);
  const totalViews = myJobs.reduce((a, j) => a + (j.views || 0), 0);
  document.getElementById('stat-active-jobs').textContent = activeJobs;
  document.getElementById('stat-total-apps').textContent = totalApps;
  document.getElementById('stat-views').textContent = totalViews;
  // accepted: will load when tab is opened
  document.getElementById('stat-accepted').textContent = '—';
}

function renderMyJobs() {
  const el = document.getElementById('my-jobs-list');
  if (!myJobs.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div><div class="empty-state-title">Aún no tienes ofertas publicadas</div><p class="empty-state-sub">Publica tu primera oferta de trabajo y empieza a recibir candidatos.</p><a href="publicar-empleo.html" class="btn btn-primary mt-4">＋ Publicar Empleo</a></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Oferta</th>
            <th>Tipo</th>
            <th>Postulaciones</th>
            <th>Vistas</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${myJobs.map(job => `
            <tr>
              <td>
                <div style="font-weight:600;">${escHtml(job.title)}</div>
                <div style="font-size:0.78rem; color:var(--text-muted);">${escHtml(job.category)} · ${escHtml(job.salary)}</div>
              </td>
              <td><span class="job-tag type">${escHtml(job.type)}</span></td>
              <td><span style="font-weight:700; color:var(--zita-cyan);">${job.applicationsCount || 0}</span></td>
              <td>${job.views || 0}</td>
              <td>
                ${job.active
                  ? `<span class="status-badge badge-aceptado">● Activa</span>`
                  : `<span class="status-badge badge-rechazado">● Inactiva</span>`}
              </td>
              <td>
                <div style="display:flex; gap:0.4rem;">
                  <button class="btn btn-sm btn-secondary" onclick="viewApps('${job.id}', '${escHtml(job.title)}')">Ver postulantes</button>
                  <button class="btn btn-sm btn-danger" onclick="deactivateJob('${job.id}')">${job.active ? 'Pausar' : 'Activar'}</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function populateJobSelector() {
  const sel = document.getElementById('job-selector');
  sel.innerHTML = `<option value="">— Selecciona una oferta —</option>` +
    myJobs.map(j => `<option value="${j.id}">${escHtml(j.title)} (${j.applicationsCount || 0} postulaciones)</option>`).join('');
  sel.addEventListener('change', () => { if (sel.value) loadApplicationsForJob(sel.value); });
}

async function loadApplicationsForJob(jobId) {
  const el = document.getElementById('applications-list');
  el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⏳</div><p>Cargando postulaciones...</p></div>`;
  try {
    const res = await applications.getForJob(jobId);
    allApplications[jobId] = res.applications;
    renderApplicationsList(res.applications, res.jobTitle);
    // Count accepted for stat
    const accepted = res.applications.filter(a => a.status === 'aceptado').length;
    document.getElementById('stat-accepted').textContent = accepted;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderApplicationsList(apps, jobTitle) {
  const el = document.getElementById('applications-list');
  if (!apps.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">Sin postulaciones aún</div><p class="empty-state-sub">Nadie se ha postulado a "${escHtml(jobTitle)}" todavía.</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Candidato</th><th>Contacto</th><th>Fecha</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${apps.map(app => `
            <tr>
              <td>
                <div style="font-weight:600;">${escHtml(app.candidate?.name || app.candidateName)}</div>
                ${app.candidate?.skills?.length ? `<div style="font-size:0.78rem; color:var(--text-muted);">${app.candidate.skills.slice(0,3).join(', ')}</div>` : ''}
              </td>
              <td style="font-size:0.8rem; color:var(--text-muted);">${escHtml(app.candidateEmail)}</td>
              <td style="font-size:0.8rem; color:var(--text-muted);">${new Date(app.createdAt).toLocaleDateString('es-MX')}</td>
              <td>${statusBadge(app.status)}</td>
              <td>
                <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
                  <button class="btn btn-sm btn-secondary" onclick="viewAppDetail('${app.id}')">Ver CV</button>
                  <select class="form-select" style="padding:0.3rem 0.5rem; font-size:0.8rem; border-radius:6px;" onchange="updateAppStatus('${app.id}', this.value, this)">
                    <option value="revision" ${app.status==='revision'?'selected':''}>En revisión</option>
                    <option value="aceptado" ${app.status==='aceptado'?'selected':''}>Aceptar</option>
                    <option value="rechazado" ${app.status==='rechazado'?'selected':''}>Rechazar</option>
                  </select>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

window.viewApps = (jobId, jobTitle) => {
  switchTab('applications');
  document.getElementById('job-selector').value = jobId;
  loadApplicationsForJob(jobId);
};

window.viewAppDetail = (appId) => {
  let app;
  Object.values(allApplications).forEach(list => { const f = list.find(a => a.id === appId); if (f) app = f; });
  if (!app) return;
  const body = document.getElementById('app-modal-body');
  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      <div>
        <p style="font-size:0.78rem; text-transform:uppercase; font-weight:700; color:var(--text-muted); margin-bottom:0.25rem;">Candidato</p>
        <p style="font-weight:700; font-size:1rem;">${escHtml(app.candidate?.name || app.candidateName)}</p>
        <p style="color:var(--text-muted); font-size:0.875rem;">${escHtml(app.candidateEmail)}</p>
        ${app.candidate?.phone ? `<p style="color:var(--text-muted); font-size:0.875rem;">📞 ${escHtml(app.candidate.phone)}</p>` : ''}
      </div>
      ${app.candidate?.education ? `<div><p style="font-size:0.78rem;text-transform:uppercase;font-weight:700;color:var(--text-muted);margin-bottom:0.25rem;">Educación</p><p style="font-size:0.875rem;">${escHtml(app.candidate.education)}</p></div>` : ''}
      ${app.candidate?.experience ? `<div><p style="font-size:0.78rem;text-transform:uppercase;font-weight:700;color:var(--text-muted);margin-bottom:0.25rem;">Experiencia</p><p style="font-size:0.875rem;">${escHtml(app.candidate.experience)}</p></div>` : ''}
      ${app.candidate?.skills?.length ? `<div><p style="font-size:0.78rem;text-transform:uppercase;font-weight:700;color:var(--text-muted);margin-bottom:0.25rem;">Habilidades</p><div class="benefits-grid">${app.candidate.skills.map(s => `<span class="benefit-tag">${escHtml(s)}</span>`).join('')}</div></div>` : ''}
      ${app.coverLetter ? `<div><p style="font-size:0.78rem;text-transform:uppercase;font-weight:700;color:var(--text-muted);margin-bottom:0.25rem;">Carta de presentación</p><p style="font-size:0.875rem; color:var(--text-muted); line-height:1.7;">${escHtml(app.coverLetter)}</p></div>` : ''}
      ${app.cv ? `<div><p style="font-size:0.78rem;text-transform:uppercase;font-weight:700;color:var(--text-muted);margin-bottom:0.5rem;">CV adjunto</p><button type="button" onclick="openCvForApplication('${app.id}')" class="btn btn-primary btn-sm">📄 Descargar CV</button></div>` : '<p style="color:var(--text-muted); font-size:0.875rem;">Sin CV adjunto</p>'}
      <div style="padding-top:0.75rem; border-top:1px solid var(--border);">${statusBadge(app.status)}</div>
    </div>
  `;
  showModal('app-modal');
};

window.updateAppStatus = async (appId, status, selectEl) => {
  try {
    await applications.updateStatus(appId, status);
    toast(status === 'aceptado' ? '✅ Candidato aceptado' : status === 'rechazado' ? '❌ Candidato rechazado' : '🔍 En revisión', 'success');
    // Update local data
    Object.values(allApplications).forEach(list => {
      const app = list.find(a => a.id === appId);
      if (app) app.status = status;
    });
    // Re-render row status badge in table
    const row = selectEl.closest('tr');
    if (row) {
      const td = row.querySelector('td:nth-child(4)');
      if (td) td.innerHTML = statusBadge(status);
    }
  } catch (err) {
    toast(err.message || 'Error al actualizar estado', 'error');
    // Revert select
    loadApplicationsForJob(document.getElementById('job-selector').value);
  }
};

window.deactivateJob = async (jobId) => {
  const job = myJobs.find(j => j.id === jobId);
  if (!job) return;
  try {
    await jobs.update(jobId, { active: !job.active });
    job.active = !job.active;
    renderMyJobs();
    toast(job.active ? 'Oferta activada' : 'Oferta pausada', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
};

function loadProfileForm() {
  const user = getUser();
  if (!user) return;
  document.getElementById('prof-companyName').value = user.companyName || '';
  document.getElementById('prof-sector').value = user.sector || '';
  document.getElementById('prof-description').value = user.description || '';
  document.getElementById('prof-phone').value = user.phone || '';
  document.getElementById('prof-website').value = user.website || '';
}

function bindProfileForm() {
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('profile-save-btn');
    setLoading(btn, true, 'Guardando...');
    try {
      await users.updateProfile({
        companyName: document.getElementById('prof-companyName').value,
        sector: document.getElementById('prof-sector').value,
        description: document.getElementById('prof-description').value,
        phone: document.getElementById('prof-phone').value,
        website: document.getElementById('prof-website').value,
      });
      toast('Perfil actualizado ✓', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${name}`));
}

function escHtml(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.openCvForApplication = (id) => openApplicationCv(id).catch(err => toast(err.message || 'No se pudo abrir el CV', 'error'));
