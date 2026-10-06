// src/js/pages/olvide-contrasena.js
import { auth, isLoggedIn } from '../api.js';
import { renderNavbar, setLoading } from '../components/ui.js';
import { initBgScene } from '../three/heroScene.js';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('');
  if (isLoggedIn()) { window.location.href = 'index.html'; return; }
  setTimeout(() => initBgScene('auth-canvas'), 200);

  const form = document.getElementById('forgot-form');
  const errEl = document.getElementById('form-error');
  const okEl = document.getElementById('form-success');
  const btn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');
    const email = document.getElementById('email').value.trim();
    if (!email) { errEl.textContent = 'Escribe tu correo'; errEl.classList.remove('hidden'); return; }

    setLoading(btn, true, 'Enviando...');
    try {
      const res = await auth.forgotPassword(email);
      okEl.textContent = res.message;
      okEl.classList.remove('hidden');
      form.classList.add('hidden');
    } catch (err) {
      errEl.textContent = err.message || 'No se pudo enviar el enlace';
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
});
