// Rellena los datos del responsable en las páginas legales.
import { renderNavbar } from '../components/ui.js';

document.addEventListener('DOMContentLoaded', () => {
  renderNavbar('');
  const L = window.ZITAJOBS_LEGAL || {};
  document.querySelectorAll('[data-legal]').forEach((el) => {
    const v = L[el.dataset.legal] || '';
    if (el.dataset.legal === 'correo' && v) el.innerHTML = `<a href="mailto:${encodeURI(v)}">${v.replace(/</g, '&lt;')}</a>`;
    else el.textContent = v;
  });
  const incompleto = !L.responsable || !L.correo || /TU NOMBRE|ejemplo\.com/i.test(`${L.responsable} ${L.correo}`);
  document.getElementById('legal-warning')?.classList.toggle('hidden', !incompleto);
});
