// src/js/pages/empresas.js
import { users, jobs } from '../api.js';
import { renderNavbar, toast, initScrollAnimations } from '../components/ui.js';
import { initBgScene } from '../three/heroScene.js';

let allCompanies = [];

document.addEventListener('DOMContentLoaded', async () => {
  renderNavbar('empresas');
  initScrollAnimations();
  setTimeout(() => initBgScene('empresas-canvas'), 200);
  await loadCompanies();
  bindSearch();
});

async function loadCompanies() {
  const grid = document.getElementById('companies-grid');
  try {
    const res = await users.getCompanies();
    allCompanies = res.companies;
    renderCompanies(allCompanies);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderCompanies(companies) {
  const grid = document.getElementById('companies-grid');
  if (!companies.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Sin resultados</div><p class="empty-state-sub">Prueba con otros términos</p></div>`;
    return;
  }

  const sectorColors = {
    'Manufactura': '#E91E8C', 'Tecnología': '#00BCD4', 'Comercio': '#FFB800',
    'Servicios': '#8B1FA9', 'Educación': '#4CAF50', 'Salud': '#FF5722',
    'Construcción': '#795548', 'Agropecuario': '#8BC34A'
  };

  grid.innerHTML = companies.map(company => {
    const color = sectorColors[company.sector] || '#E91E8C';
    return `
      <div class="card card-interactive" data-animate style="cursor:default;">
        <div style="display:flex; align-items:start; gap:0.875rem; margin-bottom:1rem;">
          <div style="width:52px; height:52px; border-radius:12px; background:linear-gradient(135deg, ${color}, ${color}99); display:flex; align-items:center; justify-content:center; font-size:1.5rem; font-weight:800; color:white; flex-shrink:0; box-shadow:0 4px 12px ${color}40;">
            ${(company.companyName || company.name || 'E').charAt(0)}
          </div>
          <div style="flex:1; min-width:0;">
            <h3 style="font-family:var(--font-display); font-weight:700; font-size:0.95rem; margin-bottom:0.15rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${escHtml(company.companyName || company.name)}
            </h3>
            <span style="display:inline-block; padding:0.15rem 0.5rem; border-radius:99px; font-size:0.72rem; font-weight:600; background:${color}18; color:${color}; border:1px solid ${color}30;">
              ${escHtml(company.sector || 'General')}
            </span>
          </div>
          ${company.verified ? `<span title="Empresa verificada" style="color:${color}; font-size:1rem;">✓</span>` : ''}
        </div>

        ${company.description ? `
          <p style="font-size:0.82rem; color:var(--text-muted); line-height:1.6; margin-bottom:0.875rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${escHtml(company.description)}
          </p>
        ` : `<p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.875rem; font-style:italic;">Sin descripción disponible</p>`}

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; flex-direction:column; gap:0.2rem;">
            ${company.phone ? `<span style="font-size:0.75rem; color:var(--text-muted);">📞 ${escHtml(company.phone)}</span>` : ''}
            ${company.website ? `<a href="${escHtml(company.website)}" target="_blank" style="font-size:0.75rem; color:var(--zita-primary);">🌐 Sitio web</a>` : ''}
          </div>
          <a href="index.html?company=${encodeURIComponent(company.companyName || company.name)}" class="btn btn-sm btn-secondary">
            Ver empleos →
          </a>
        </div>
      </div>
    `;
  }).join('');
}

function bindSearch() {
  const searchBtn = document.getElementById('company-search-btn');
  const searchInput = document.getElementById('company-search');

  const doSearch = async () => {
    const q = searchInput.value.trim();
    try {
      const res = await users.getCompanies(q);
      renderCompanies(res.companies);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  searchBtn?.addEventListener('click', doSearch);
  searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
}

function escHtml(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
