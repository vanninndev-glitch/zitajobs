// src/js/pages/restablecer-contrasena.js
import { auth, isLoggedIn } from '../api.js';
import { renderNavbar, setLoading } from '../components/ui.js';
import { initBgScene } from '../three/heroScene.js';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('');
  if (isLoggedIn()) { window.location.href = 'index.html'; return; }
  setTimeout(() => initBgScene('auth-canvas'), 200);

  const form = document.getElementById('reset-form');
  const errEl = document.getElementById('form-error');
  const okEl = document.getElementById('form-success');
  const btn = document.getElementById('submit-btn');
  const token = new URLSearchParams(window.location.search).get('token') || '';

  if (!/^[0-9a-f]{64}$/.test(token)) {
    errEl.innerHTML = 'Este enlace no es válido. <a href="olvide-contrasena.html" style="font-weight:700;">Solicita uno nuevo</a>.';
    errEl.classList.remove('hidden');
    form.classList.add('hidden');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');
    const password = document.getElementById('password').value;
    const password2 = document.getElementById('password2').value;
    if (password.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres'; errEl.classList.remove('hidden'); return; }
    if (password !== password2) { errEl.textContent = 'Las contraseñas no coinciden'; errEl.classList.remove('hidden'); return; }

    setLoading(btn, true, 'Guardando...');
    try {
      const res = await auth.resetPassword(token, password);
      okEl.textContent = res.message + ' Te llevamos al inicio de sesión…';
      okEl.classList.remove('hidden');
      form.classList.add('hidden');
      setTimeout(() => { window.location.href = 'ingresar.html'; }, 2200);
    } catch (err) {
      errEl.innerHTML = `${(err.message || 'No se pudo cambiar la contraseña').replace(/</g, '&lt;')} <a href="olvide-contrasena.html" style="font-weight:700;">Solicitar un enlace nuevo</a>`;
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
});
