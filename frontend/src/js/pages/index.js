// src/js/pages/index.js
import { jobs, applications, isLoggedIn, isCandidato, getUser, uploadsUrl } from '../api.js';
import { renderNavbar, toast, setLoading, statusBadge, showModal, hideModal, initModalClose, initScrollAnimations } from '../components/ui.js';
import { initHeroScene } from '../three/heroScene.js';

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = { jobs: [], page: 1, totalPages: 1, total: 0, q: '', category: '', type: '', selectedJobId: null };

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('empleos');
  initModalClose();
  initScrollAnimations();

  // Three.js hero — wait for script
  setTimeout(() => initHeroScene('hero-canvas'), 200);

  await loadJobs();
  bindEvents();
  // Animate quick stats
  setTimeout(() => {
    const el = document.querySelector('[style*="opacity:0"]');
    if (el) { el.style.opacity = '1'; el.style.animation = ''; }
  }, 500);
});

// ─── LOAD JOBS ────────────────────────────────────────────────────────────────
async function loadJobs() {
  const listEl = document.getElementById('jobs-list');
  listEl.innerHTML = renderSkeletons(4);

  try {
    const res = await jobs.getAll({ q: state.q, category: state.category, type: state.type, page: state.page, limit: 8 });
    state.jobs = res.jobs;
    state.totalPages = res.totalPages;
    state.total = res.total;

    // Update stat
    document.getElementById('stat-jobs').querySelector('span').textContent = res.total;
    document.getElementById('results-title').textContent = `${res.total} Empleo${res.total !== 1 ? 's' : ''} disponible${res.total !== 1 ? 's' : ''}`;

    renderJobsList(res.jobs);
    renderPagination();
  } catch (err) {
    listEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-title">No se pudo cargar</div><p class="empty-state-sub">${err.message}</p></div>`;
  }
}

function renderSkeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="card mb-3" style="padding:1.25rem;">
      <div class="skeleton" style="height:1rem; width:75%; margin-bottom:0.5rem;"></div>
      <div class="skeleton" style="height:0.75rem; width:50%; margin-bottom:1rem;"></div>
      <div style="display:flex; gap:0.5rem;">
        <div class="skeleton" style="height:1.5rem; width:5rem; border-radius:99px;"></div>
        <div class="skeleton" style="height:1.5rem; width:6rem; border-radius:99px;"></div>
      </div>
    </div>
  `).join('');
}

function renderJobsList(jobList) {
  const el = document.getElementById('jobs-list');
  if (!jobList.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Sin resultados</div><p class="empty-state-sub">Intenta con otros términos o categorías</p></div>`;
    return;
  }
  el.innerHTML = jobList.map(job => `
    <div class="card card-interactive job-card mb-3 ${state.selectedJobId === job.id ? 'selected' : ''}" data-job-id="${job.id}" style="padding:1.25rem;">
      <div class="flex items-start justify-between gap-2 mb-1">
        <h3 class="job-card-title">${escHtml(job.title)}</h3>
        <span style="font-size:0.7rem; color:var(--text-light); white-space:nowrap;">${relativeTime(job.createdAt)}</span>
      </div>
      <p class="job-card-company">${escHtml(job.company?.name || 'Empresa')}</p>
      <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">📍 ${escHtml(job.location)}</p>
      <div class="job-card-meta">
        <span class="job-tag salary">💰 ${escHtml(job.salary)}</span>
        <span class="job-tag type">⏱ ${escHtml(job.type)}</span>
        <span class="job-tag">${escHtml(job.category)}</span>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('[data-job-id]').forEach(card => {
    card.addEventListener('click', () => selectJob(card.dataset.jobId));
  });
}

async function selectJob(jobId) {
  state.selectedJobId = jobId;
  document.querySelectorAll('[data-job-id]').forEach(c => c.classList.toggle('selected', c.dataset.jobId === jobId));

  const detailEl = document.getElementById('job-detail');
  detailEl.innerHTML = `<div class="detail-panel"><div class="empty-state" style="padding:4rem;">${renderSpinner()}</div></div>`;

  try {
    const res = await jobs.getOne(jobId);
    const job = res.job;
    detailEl.innerHTML = renderJobDetail(job);

    // Bind apply button
    document.getElementById('apply-cta-btn')?.addEventListener('click', () => openApplyModal(job));
    // Scroll on mobile
    if (window.innerWidth < 1024) detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    detailEl.innerHTML = `<div class="detail-panel"><div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${err.message}</p></div></div>`;
  }
}

function renderJobDetail(job) {
  const canApply = isLoggedIn() && isCandidato();
  const notLogged = !isLoggedIn();
  return `
    <div class="detail-panel">
      <div class="detail-header">
        <div class="flex items-start gap-3">
          <div style="width:52px; height:52px; border-radius:12px; background:var(--zita-gradient); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:white; font-weight:800;">
            ${(job.company?.name || 'E').charAt(0)}
          </div>
          <div style="flex:1;">
            <h2 style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; margin-bottom:0.2rem;">${escHtml(job.title)}</h2>
            <p style="color:var(--zita-primary); font-weight:600; font-size:0.9rem;">${escHtml(job.company?.name || '')}</p>
            <p style="color:var(--text-muted); font-size:0.8rem; margin-top:0.2rem;">📍 ${escHtml(job.location)} &nbsp;·&nbsp; 👁 ${job.views} vistas</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mt-4">
          <span class="job-tag salary">💰 ${escHtml(job.salary)}</span>
          <span class="job-tag type">⏱ ${escHtml(job.type)}</span>
          <span class="job-tag">${escHtml(job.category)}</span>
          ${job.schedule ? `<span class="job-tag">🕐 ${escHtml(job.schedule)}</span>` : ''}
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-section">
          <p class="detail-section-title">Descripción del puesto</p>
          <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.8;">${escHtml(job.description)}</p>
        </div>
        ${job.requirements?.length ? `
          <div class="detail-section">
            <p class="detail-section-title">Requisitos</p>
            <ul class="requirements-list">
              ${job.requirements.map(r => `<li>${escHtml(r)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${job.benefits?.length ? `
          <div class="detail-section">
            <p class="detail-section-title">Beneficios</p>
            <div class="benefits-grid">
              ${job.benefits.map(b => `<span class="benefit-tag">✓ ${escHtml(b)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px solid var(--border);">
          ${canApply ? `
            <button id="apply-cta-btn" class="btn btn-primary btn-lg btn-block">
              Postularme ahora →
            </button>
          ` : notLogged ? `
            <div style="text-align:center;">
              <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Inicia sesión para postularte a este empleo</p>
              <div style="display:flex; gap:0.75rem; justify-content:center;">
                <a href="ingresar.html" class="btn btn-primary">Iniciar sesión</a>
                <a href="crear-cuenta.html" class="btn btn-secondary">Crear cuenta</a>
              </div>
            </div>
          ` : `<p style="text-align:center; color:var(--text-muted); font-size:0.85rem;">Solo los candidatos pueden postularse</p>`}
        </div>
      </div>
    </div>
  `;
}

// ─── APPLY MODAL ──────────────────────────────────────────────────────────────
let currentApplyJobId = null;
function openApplyModal(job) {
  currentApplyJobId = job.id;
  document.getElementById('apply-job-preview').innerHTML = `
    <div style="font-weight:700;">${escHtml(job.title)}</div>
    <div style="color:var(--zita-primary); font-size:0.875rem;">${escHtml(job.company?.name || '')}</div>
    <div style="color:var(--text-muted); font-size:0.8rem; margin-top:0.25rem;">📍 ${escHtml(job.location)}</div>
  `;
  const user = getUser();
  const note = document.getElementById('cv-existing-note');
  if (user?.cv) note.textContent = '✓ Tienes un CV guardado. Puedes subir uno nuevo o usar el existente.';
  else note.textContent = 'No tienes CV guardado. Se recomienda adjuntarlo.';
  showModal('apply-modal');
}

document.getElementById('apply-submit-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('apply-submit-btn');
  const fileInput = document.getElementById('cv-file-input');
  const coverLetter = document.getElementById('apply-cover-letter').value;
  const file = fileInput.files[0] || null;

  setLoading(btn, true, 'Enviando postulación...');
  try {
    await applications.apply(currentApplyJobId, coverLetter, file);
    hideModal('apply-modal');
    toast('✅ Postulación enviada. La empresa estará en contacto contigo.', 'success', 4000);
    document.getElementById('apply-cover-letter').value = '';
    fileInput.value = '';
    document.getElementById('cv-file-selected').classList.add('hidden');
    document.getElementById('cv-upload-placeholder').classList.remove('hidden');
  } catch (err) {
    toast(err.message || 'Error al enviar postulación', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// File input UI
document.getElementById('cv-drop-zone')?.addEventListener('click', () => document.getElementById('cv-file-input').click());
document.getElementById('cv-file-input')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('cv-file-selected').textContent = `📎 ${file.name}`;
    document.getElementById('cv-file-selected').classList.remove('hidden');
    document.getElementById('cv-upload-placeholder').classList.add('hidden');
  }
});
['dragover','dragenter'].forEach(ev => document.getElementById('cv-drop-zone')?.addEventListener(ev, (e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }));
['dragleave','drop'].forEach(ev => document.getElementById('cv-drop-zone')?.addEventListener(ev, (e) => { e.preventDefault(); e.currentTarget.classList.remove('dragover'); }));
document.getElementById('cv-drop-zone')?.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file) { document.getElementById('cv-file-input').files = e.dataTransfer.files; document.getElementById('cv-file-selected').textContent = `📎 ${file.name}`; document.getElementById('cv-file-selected').classList.remove('hidden'); document.getElementById('cv-upload-placeholder').classList.add('hidden'); }
});

// ─── PAGINATION ───────────────────────────────────────────────────────────────
function renderPagination() {
  const el = document.getElementById('pagination');
  if (state.totalPages <= 1) { el.innerHTML = ''; return; }
  let html = `<button class="page-btn" ${state.page === 1 ? 'disabled' : ''} onclick="changePage(${state.page - 1})">‹</button>`;
  for (let i = 1; i <= state.totalPages; i++) {
    html += `<button class="page-btn ${state.page === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" ${state.page === state.totalPages ? 'disabled' : ''} onclick="changePage(${state.page + 1})">›</button>`;
  el.innerHTML = html;
}
window.changePage = (p) => { state.page = p; loadJobs(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

// ─── EVENTS ───────────────────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('hero-search-btn')?.addEventListener('click', () => {
    state.q = document.getElementById('search-q').value.trim();
    state.page = 1;
    loadJobs();
    document.querySelector('.jobs-layout')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('search-q')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('hero-search-btn').click(); });
  document.getElementById('filter-type')?.addEventListener('change', (e) => { state.type = e.target.value; state.page = 1; loadJobs(); });
  document.getElementById('filter-category')?.addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; loadJobs(); });

  document.getElementById('category-chips')?.addEventListener('click', (e) => {
    const chip = e.target.closest('.category-chip');
    if (!chip) return;
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.category = chip.dataset.cat;
    state.page = 1;
    loadJobs();
  });
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function escHtml(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function relativeTime(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 3600) return `Hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff/3600)} h`;
  if (diff < 604800) return `Hace ${Math.floor(diff/86400)} días`;
  return new Date(iso).toLocaleDateString('es-MX', { day:'numeric', month:'short' });
}
function renderSpinner() { return `<svg class="animate-spin" style="width:2rem;height:2rem;margin:0 auto;display:block;color:var(--zita-primary);" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" opacity=".25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" opacity=".75"/></svg>`; }
