// src/js/pages/perfil.js
import { users, isLoggedIn, isEmpresa, isCandidato, getUser, setAuth, getToken, openOwnCv } from '../api.js';
import { renderNavbar, toast, setLoading, initScrollAnimations } from '../components/ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) { window.location.href = 'ingresar.html'; return; }
  renderNavbar('');
  initScrollAnimations();

  await loadProfile();
  bindTabs();
  bindProfileForm();
  bindCVUpload();
});

async function loadProfile() {
  try {
    const res = await users.getProfile();
    const user = res.user;
    renderHeader(user);
    fillForm(user);
    renderCVSection(user);

    // Show/hide role-specific fields
    if (user.role === 'empresa') {
      document.getElementById('empresa-fields').classList.remove('hidden');
      document.getElementById('candidato-fields').classList.add('hidden');
      document.getElementById('tab-cv-btn').textContent = '🏢 Logo / Documentos';
      document.getElementById('logo-section').classList.remove('hidden');
    }
  } catch (err) {
    toast(err.message || 'Error al cargar perfil', 'error');
  }
}

function renderHeader(user) {
  document.getElementById('avatar-big').textContent = (user.name || 'U').charAt(0).toUpperCase();
  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('member-since').textContent = `Miembro desde ${new Date(user.createdAt).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;

  const roleBadge = document.getElementById('profile-role-badge');
  if (user.role === 'empresa') {
    roleBadge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.2rem 0.6rem;border-radius:99px;background:rgba(139,31,169,0.12);color:#8B1FA9;border:1px solid rgba(139,31,169,0.25);font-size:0.75rem;font-weight:600;">🏢 Empresa</span>`;
  } else {
    roleBadge.innerHTML = `<span style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.2rem 0.6rem;border-radius:99px;background:rgba(0,188,212,0.12);color:var(--zita-cyan);border:1px solid rgba(0,188,212,0.25);font-size:0.75rem;font-weight:600;">👤 Candidato</span>`;
  }
}

function fillForm(user) {
  setValue('pf-name', user.name);
  setValue('pf-phone', user.phone);
  if (user.role === 'candidato') {
    setValue('pf-education', user.education);
    setValue('pf-experience', user.experience);
    setValue('pf-skills', (user.skills || []).join(', '));
  } else {
    setValue('pf-companyName', user.companyName);
    setValue('pf-sector', user.sector);
    setValue('pf-description', user.description);
    setValue('pf-website', user.website);
  }
}

function setValue(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }

function renderCVSection(user) {
  const el = document.getElementById('cv-current');
  if (user.role === 'candidato') {
    el.innerHTML = user.cv ? `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
        <div style="display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size:1.75rem;">📄</span>
          <div>
            <p style="font-weight:600; font-size:0.9rem;">CV actualizado</p>
            <p style="font-size:0.78rem; color:var(--text-muted);">${escHtml(user.cv)}</p>
          </div>
        </div>
        <button type="button" onclick="openOwnCvFile()" class="btn btn-sm btn-secondary">Descargar ↗</button>
      </div>
    ` : `<p style="font-size:0.875rem; color:var(--text-muted);">⚠️ No tienes CV cargado. Sube uno para mejorar tus postulaciones.</p>`;
  }
}

function bindProfileForm() {
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('profile-save-btn');
    const msgEl = document.getElementById('form-msg');
    msgEl.classList.add('hidden');

    const user = getUser();
    let data = { name: document.getElementById('pf-name').value.trim(), phone: document.getElementById('pf-phone').value.trim() };

    if (user?.role === 'candidato') {
      const skillsRaw = document.getElementById('pf-skills').value;
      data = {
        ...data,
        education: document.getElementById('pf-education').value.trim(),
        experience: document.getElementById('pf-experience').value.trim(),
        skills: skillsRaw.split(',').map(s => s.trim()).filter(Boolean)
      };
    } else {
      data = {
        ...data,
        companyName: document.getElementById('pf-companyName').value.trim(),
        sector: document.getElementById('pf-sector').value.trim(),
        description: document.getElementById('pf-description').value.trim(),
        website: document.getElementById('pf-website').value.trim()
      };
    }

    setLoading(btn, true, 'Guardando...');
    try {
      const res = await users.updateProfile(data);
      // Update local user in storage
      const currentUser = getUser();
      setAuth(getToken(), { ...currentUser, ...res.user });
      msgEl.className = 'alert alert-success mb-4';
      msgEl.textContent = '✅ Perfil actualizado correctamente';
      msgEl.classList.remove('hidden');
      renderHeader(res.user);
      setTimeout(() => msgEl.classList.add('hidden'), 3000);
      toast('Perfil guardado ✓', 'success');
    } catch (err) {
      msgEl.className = 'alert alert-error mb-4';
      msgEl.textContent = err.message || 'Error al guardar';
      msgEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
}

function bindCVUpload() {
  // CV
  const cvZone = document.getElementById('cv-drop-zone');
  const cvInput = document.getElementById('cv-input');
  const cvSelectedName = document.getElementById('cv-selected-name');
  const cvUploadBtn = document.getElementById('cv-upload-btn');

  cvZone?.addEventListener('click', () => cvInput.click());
  cvInput?.addEventListener('change', () => {
    if (cvInput.files[0]) {
      cvSelectedName.textContent = `📎 ${cvInput.files[0].name}`;
      cvSelectedName.classList.remove('hidden');
      document.getElementById('cv-upload-ph').classList.add('hidden');
      cvUploadBtn.classList.remove('hidden');
    }
  });
  ['dragover','dragenter'].forEach(ev => cvZone?.addEventListener(ev, e => { e.preventDefault(); cvZone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => cvZone?.addEventListener(ev, e => { e.preventDefault(); cvZone.classList.remove('dragover'); }));
  cvZone?.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) {
      cvInput.files = e.dataTransfer.files;
      cvSelectedName.textContent = `📎 ${file.name}`;
      cvSelectedName.classList.remove('hidden');
      document.getElementById('cv-upload-ph').classList.add('hidden');
      cvUploadBtn.classList.remove('hidden');
    }
  });

  cvUploadBtn?.addEventListener('click', async () => {
    const file = cvInput.files[0];
    if (!file) return;
    setLoading(cvUploadBtn, true, 'Subiendo...');
    try {
      await users.uploadCV(file);
      toast('CV subido correctamente ✓', 'success');
      await loadProfile();
      cvUploadBtn.classList.add('hidden');
      cvSelectedName.classList.add('hidden');
      document.getElementById('cv-upload-ph').classList.remove('hidden');
    } catch (err) {
      toast(err.message || 'Error al subir CV', 'error');
    } finally {
      setLoading(cvUploadBtn, false);
    }
  });

  // Logo (empresa)
  const logoZone = document.getElementById('logo-drop-zone');
  const logoInput = document.getElementById('logo-input');
  const logoUploadBtn = document.getElementById('logo-upload-btn');

  logoZone?.addEventListener('click', () => logoInput.click());
  logoInput?.addEventListener('change', () => { if (logoInput.files[0]) logoUploadBtn.classList.remove('hidden'); });
  logoUploadBtn?.addEventListener('click', async () => {
    const file = logoInput.files[0];
    if (!file) return;
    setLoading(logoUploadBtn, true, 'Subiendo...');
    try {
      await users.uploadLogo(file);
      toast('Logo actualizado ✓', 'success');
    } catch (err) {
      toast(err.message || 'Error al subir logo', 'error');
    } finally {
      setLoading(logoUploadBtn, false);
    }
  });
}

function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('hidden', p.id !== `tab-${tab.dataset.tab}`));
    });
  });
}

function escHtml(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window.openOwnCvFile = () => openOwnCv().catch(err => toast(err.message || 'No se pudo abrir el CV', 'error'));
