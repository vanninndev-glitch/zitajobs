// src/js/pages/crear-cuenta.js
import { auth, setAuth, isLoggedIn } from '../api.js';
import { renderNavbar, toast, setLoading } from '../components/ui.js';
import { initBgScene } from '../three/heroScene.js';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('');
  if (isLoggedIn()) { window.location.href = 'index.html'; return; }
  setTimeout(() => initBgScene('auth-canvas'), 200);

  // Role toggle
  let selectedRole = 'candidato';
  document.querySelectorAll('input[name="role"]').forEach(radio => {
    radio.addEventListener('change', () => {
      selectedRole = radio.value;
      const empresaFields = document.getElementById('empresa-fields');
      empresaFields.classList.toggle('hidden', selectedRole !== 'empresa');
      document.getElementById('name-label').textContent = selectedRole === 'empresa' ? 'Nombre del representante' : 'Nombre completo';
    });
  });

  // Password toggle + strength
  document.getElementById('toggle-pw')?.addEventListener('click', () => {
    const input = document.getElementById('password');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('password')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const score = [val.length >= 6, /[A-Z]/.test(val), /[0-9]/.test(val), /[^a-zA-Z0-9]/.test(val)].filter(Boolean).length;
    const bar = document.getElementById('pw-bar');
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
    bar.style.width = `${score * 25}%`;
    bar.style.background = colors[score - 1] || '#ef4444';
  });

  const errEl = document.getElementById('form-error');
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const phone = document.getElementById('phone').value.trim();
    const companyName = document.getElementById('companyName')?.value.trim();
    const sector = document.getElementById('sector')?.value;

    if (!name || !email || !password) { errEl.textContent = 'Completa los campos obligatorios'; errEl.classList.remove('hidden'); return; }
    if (password.length < 6) { errEl.textContent = 'La contraseña debe tener al menos 6 caracteres'; errEl.classList.remove('hidden'); return; }

    const btn = document.getElementById('submit-btn');
    setLoading(btn, true, 'Creando cuenta...');
    try {
      const res = await auth.register({ name, email, password, role: selectedRole, phone, companyName, sector });
      setAuth(res.token, res.user);
      toast(`¡Cuenta creada! Bienvenido/a ${res.user.name.split(' ')[0]} 🎉`, 'success');
      setTimeout(() => {
        window.location.href = selectedRole === 'empresa' ? 'dashboard-empresa.html' : 'index.html';
      }, 900);
    } catch (err) {
      errEl.textContent = err.message || 'Error al crear cuenta';
      errEl.classList.remove('hidden');
    } finally {
      setLoading(btn, false);
    }
  });
});
