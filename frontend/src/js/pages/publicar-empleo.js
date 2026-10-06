// src/js/pages/publicar-empleo.js
import { jobs, isLoggedIn, isEmpresa, getUser } from '../api.js';
import { renderNavbar, toast, setLoading, initScrollAnimations } from '../components/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn() || !isEmpresa()) { window.location.href = 'ingresar.html'; return; }
  renderNavbar('publicar');
  initScrollAnimations();
  loadLocationSuggestions();

  // Preview button
  document.getElementById('preview-btn')?.addEventListener('click', showPreview);

  // Form submit
  document.getElementById('job-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const btn = document.getElementById('submit-btn');
    const errEl = document.getElementById('form-error');
    const successEl = document.getElementById('form-success');
    errEl.classList.add('hidden');
    successEl.classList.add('hidden');

    const data = getFormData();
    setLoading(btn, true, 'Publicando oferta...');
    try {
      const res = await jobs.create(data);
      successEl.textContent = res.job?.moderationStatus === 'pendiente'
        ? '⏳ Recibimos tu oferta. Se publicará en cuanto la revisemos; te avisaremos por correo.'
        : '✅ ¡Oferta publicada exitosamente! Los candidatos ya pueden postularse.';
      successEl.classList.remove('hidden');
      toast('Oferta publicada ✓', 'success');
      document.getElementById('job-form').reset();
      document.getElementById('preview-card').style.display = 'none';
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { window.location.href = 'dashboard-empresa.html'; }, 2000);
    } catch (err) {
      errEl.textContent = err.message || 'Error al publicar la oferta';
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
});

async function loadLocationSuggestions() {
  try {
    const res = await jobs.getLocations();
    document.getElementById('locations-list').innerHTML = res.suggestions.map(s => `<option value="${escHtml(s)}"></option>`).join('');
  } catch { /* opcional: sin sugerencias se puede escribir libremente */ }
}

function getFormData() {
  const requirements = document.getElementById('requirements').value
    .split('\n').map(r => r.trim()).filter(Boolean);
  const benefits = document.getElementById('benefits').value
    .split('\n').map(b => b.trim()).filter(Boolean);
  return {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
    type: document.getElementById('type').value,
    salary: document.getElementById('salary').value.trim() || 'A convenir',
    location: document.getElementById('location').value.trim() || 'Zitácuaro, Michoacán',
    schedule: document.getElementById('schedule').value.trim(),
    description: document.getElementById('description').value.trim(),
    requirements,
    benefits
  };
}

function validateForm() {
  let valid = true;
  const fields = [
    { id: 'title', errId: 'err-title', msg: 'El título es obligatorio' },
    { id: 'description', errId: 'err-description', msg: 'La descripción es obligatoria' },
  ];
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    const errEl = document.getElementById(f.errId);
    if (!el.value.trim()) {
      errEl.classList.remove('hidden');
      el.style.borderColor = '#ef4444';
      valid = false;
    } else {
      errEl.classList.add('hidden');
      el.style.borderColor = '';
    }
  });
  if (!document.getElementById('category').value) {
    toast('Selecciona una categoría', 'warning');
    valid = false;
  }
  return valid;
}

function showPreview() {
  if (!document.getElementById('title').value.trim()) {
    toast('Escribe al menos un título para la vista previa', 'warning');
    return;
  }
  const data = getFormData();
  const user = getUser();
  const previewCard = document.getElementById('preview-card');
  const previewContent = document.getElementById('preview-content');

  previewContent.innerHTML = `
    <div style="display:flex; align-items:start; gap:0.875rem; margin-bottom:1rem;">
      <div style="width:44px;height:44px;border-radius:10px;background:var(--zita-gradient);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:1.25rem;flex-shrink:0;">
        ${(user?.companyName || 'E').charAt(0)}
      </div>
      <div>
        <h3 style="font-family:var(--font-display);font-size:1.1rem;font-weight:800;">${escHtml(data.title)}</h3>
        <p style="color:var(--zita-primary);font-size:0.875rem;font-weight:600;">${escHtml(user?.companyName || 'Tu empresa')}</p>
        <p style="color:var(--text-muted);font-size:0.8rem;">📍 ${escHtml(data.location)}</p>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
      <span class="job-tag salary">💰 ${escHtml(data.salary)}</span>
      <span class="job-tag type">⏱ ${escHtml(data.type)}</span>
      <span class="job-tag">${escHtml(data.category)}</span>
    </div>
    <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.7;">${escHtml(data.description)}</p>
    ${data.requirements.length ? `
      <div style="margin-top:1rem;">
        <p style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:0.5rem;">Requisitos</p>
        <ul class="requirements-list">${data.requirements.map(r => `<li>${escHtml(r)}</li>`).join('')}</ul>
      </div>` : ''}
    ${data.benefits.length ? `
      <div style="margin-top:1rem;">
        <p style="font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:0.5rem;">Beneficios</p>
        <div class="benefits-grid">${data.benefits.map(b => `<span class="benefit-tag">✓ ${escHtml(b)}</span>`).join('')}</div>
      </div>` : ''}
  `;
  previewCard.style.display = 'block';
  previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function escHtml(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
