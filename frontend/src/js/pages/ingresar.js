// src/js/pages/ingresar.js
import { auth, setAuth, isLoggedIn } from '../api.js';
import { renderNavbar, toast, setLoading } from '../components/ui.js';
import { initBgScene } from '../three/heroScene.js';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('');
  // Redirect if already logged in
  if (isLoggedIn()) { window.location.href = 'index.html'; return; }
  setTimeout(() => initBgScene('auth-canvas'), 200);

  const form = document.getElementById('login-form');
  const errEl = document.getElementById('form-error');
  const btn = document.getElementById('submit-btn');

  // Password toggle
  document.getElementById('toggle-password')?.addEventListener('click', () => {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    if (!email || !password) { errEl.textContent = 'Completa todos los campos'; errEl.classList.remove('hidden'); return; }

    setLoading(btn, true, 'Ingresando...');
    try {
      const res = await auth.login(email, password);
      setAuth(res.token, res.user);
      toast(`¡Bienvenido, ${res.user.name.split(' ')[0]}! 👋`, 'success');
      setTimeout(() => {
        window.location.href = res.user.role === 'empresa' ? 'dashboard-empresa.html' : 'index.html';
      }, 800);
    } catch (err) {
      errEl.textContent = err.message || 'Error al iniciar sesión';
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
});
