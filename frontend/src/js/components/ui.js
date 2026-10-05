// src/js/components/ui.js - Componentes UI reutilizables

import { getUser, isLoggedIn, isEmpresa, clearAuth } from '../api.js';

// ─── TOAST NOTIFICATIONS ─────────────────────────────────────────────────────
export function toast(message, type = 'info', duration = 3500) {
  const existing = document.getElementById('toast-container');
  const container = existing || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'fixed top-5 right-5 z-[9999] flex flex-col gap-2';
    document.body.appendChild(el);
    return el;
  })();

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-zita-primary text-white',
    warning: 'bg-yellow-500 text-white'
  };

  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-xs animate-slide-in ${styles[type] || styles.info}`;
  el.innerHTML = `<span class="text-lg">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── LOADING BUTTON ───────────────────────────────────────────────────────────
export function setLoading(btn, loading, text = '') {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.innerHTML = `<svg class="animate-spin h-4 w-4 inline mr-2" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" fill="currentColor" class="opacity-75"/></svg>${text || 'Cargando...'}`;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || text;
  }
}

// ─── STATUS BADGE ─────────────────────────────────────────────────────────────
export function statusBadge(status) {
  const map = {
    revision: { label: 'En revisión', cls: 'badge-revision', icon: '🔍' },
    aceptado: { label: 'Aceptado', cls: 'badge-aceptado', icon: '✅' },
    rechazado: { label: 'No cumples con los requerimientos', cls: 'badge-rechazado', icon: '❌' }
  };
  const s = map[status] || { label: status, cls: 'badge-revision', icon: '•' };
  return `<span class="status-badge ${s.cls}">${s.icon} ${s.label}</span>`;
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
export function renderNavbar(activePage = '') {
  const user = getUser();
  const loggedIn = isLoggedIn();
  const empresa = isEmpresa();

  const navLinks = [
    { href: 'index.html', label: 'Empleos', key: 'empleos' },
    { href: 'empresas.html', label: 'Empresas', key: 'empresas' },
    ...(loggedIn && empresa ? [
      { href: 'publicar-empleo.html', label: 'Publicar Empleo', key: 'publicar' },
      { href: 'dashboard-empresa.html', label: 'Mi Panel', key: 'dashboard' }
    ] : []),
    ...(loggedIn && !empresa ? [
      { href: 'mis-postulaciones.html', label: 'Mis Postulaciones', key: 'postulaciones' }
    ] : [])
  ];

  const html = `
    <nav class="navbar" id="main-navbar">
      <div class="navbar-inner">
        <!-- Logo -->
        <a href="index.html" class="navbar-logo">
          <img src="assets/images/logo.jpg" alt="ZitaJobs" class="navbar-logo-img">
          <div class="navbar-logo-text">
            <span class="logo-title">ZitaJobs</span>
            <span class="logo-sub">Empleos en Zitácuaro</span>
          </div>
        </a>

        <!-- Desktop Links -->
        <ul class="nav-links hidden md:flex">
          ${navLinks.map(l => `
            <li><a href="${l.href}" class="nav-link ${activePage === l.key ? 'active' : ''}">${l.label}</a></li>
          `).join('')}
        </ul>

        <!-- Actions -->
        <div class="nav-actions">
          <!-- Theme -->
          <button id="theme-toggle" class="btn-icon" aria-label="Cambiar tema">
            <svg id="icon-moon" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
            <svg id="icon-sun" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m8.66-8.66h-1M4.34 12.34h-1m15.36 5.66l-.7-.7M6.05 6.05l-.7-.7m12.02 0l-.7.7M6.05 17.95l-.7.7M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
          </button>

          ${loggedIn ? `
            <div class="user-menu-wrap">
              <button class="user-avatar-btn" id="user-menu-btn">
                <div class="avatar-circle">${(user?.name || 'U').charAt(0).toUpperCase()}</div>
                <span class="hidden sm:block text-sm font-medium">${user?.name?.split(' ')[0] || 'Usuario'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
              <div class="user-dropdown hidden" id="user-dropdown">
                <a href="perfil.html" class="dropdown-item">👤 Mi Perfil</a>
                ${empresa ? '<a href="dashboard-empresa.html" class="dropdown-item">📊 Panel Empresa</a>' : '<a href="mis-postulaciones.html" class="dropdown-item">📋 Mis Postulaciones</a>'}
                <hr class="dropdown-divider">
                <button id="logout-btn" class="dropdown-item text-red-500">🚪 Cerrar sesión</button>
              </div>
            </div>
          ` : `
            <a href="ingresar.html" class="btn-outline-sm">Ingresar</a>
            <a href="crear-cuenta.html" class="btn-primary-sm">Registrarse</a>
          `}

          <!-- Mobile hamburger -->
          <button id="menu-toggle" class="btn-icon md:hidden" aria-label="Menú">
            <svg id="icon-menu" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            <svg id="icon-close" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div id="mobile-menu" class="mobile-menu hidden">
        ${navLinks.map(l => `<a href="${l.href}" class="mobile-link ${activePage === l.key ? 'active' : ''}">${l.label}</a>`).join('')}
        ${loggedIn ? `
          <a href="perfil.html" class="mobile-link">👤 Mi Perfil</a>
          <button id="mobile-logout" class="mobile-link text-red-400 text-left w-full">🚪 Cerrar sesión</button>
        ` : `
          <a href="ingresar.html" class="mobile-link">Ingresar</a>
          <a href="crear-cuenta.html" class="mobile-link font-semibold text-zita-primary">Registrarse</a>
        `}
      </div>
    </nav>
  `;

  const target = document.getElementById('navbar-root');
  if (target) target.innerHTML = html;

  // Theme toggle
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') document.documentElement.classList.add('dark');
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    document.getElementById('icon-moon')?.classList.toggle('hidden');
    document.getElementById('icon-sun')?.classList.toggle('hidden');
  });
  if (document.documentElement.classList.contains('dark')) {
    document.getElementById('icon-moon')?.classList.add('hidden');
    document.getElementById('icon-sun')?.classList.remove('hidden');
  }

  // Mobile menu
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
    document.getElementById('icon-menu')?.classList.toggle('hidden');
    document.getElementById('icon-close')?.classList.toggle('hidden');
  });

  // User dropdown
  document.getElementById('user-menu-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('user-dropdown')?.classList.toggle('hidden');
  });
  document.addEventListener('click', () => document.getElementById('user-dropdown')?.classList.add('hidden'));

  // Logout
  const logoutHandler = () => { clearAuth(); window.location.href = 'index.html'; };
  document.getElementById('logout-btn')?.addEventListener('click', logoutHandler);
  document.getElementById('mobile-logout')?.addEventListener('click', logoutHandler);
}

// ─── SCROLL ANIMATIONS ────────────────────────────────────────────────────────
export function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('animate-in');
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
export function showModal(id) { document.getElementById(id)?.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
export function hideModal(id) { document.getElementById(id)?.classList.add('hidden'); document.body.style.overflow = ''; }
export function initModalClose() {
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => hideModal(btn.dataset.modalClose));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hideModal(overlay.id); });
  });
}
