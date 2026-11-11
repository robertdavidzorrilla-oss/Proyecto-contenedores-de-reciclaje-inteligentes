// js/presentation/ui.js
import { CONFIG } from '../config.js';

let chartInstance = null;

export function initDashboardEvents(onFilterChange) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => {
        b.classList.remove('active', 'bg-slate-900', 'text-white');
      });
      
      const target = e.currentTarget;
      target.classList.add('active', 'bg-slate-900', 'text-white');
      
      const wasteType = target.dataset.wasteType;
      onFilterChange(wasteType);
    });
  });
}

export function renderDashboard(mode, data = null) {
  const container = document.getElementById('dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const breadcrumb = document.getElementById('breadcrumb-current');

  if (mode === 'all') {
    pageTitle.textContent = 'Una mirada a tus residuos';
    breadcrumb.textContent = 'Vista general';
    container.innerHTML = createGeneralLayout(data);
    renderMultiChart(data ? data.chartData : null);
  } else {
    const label = CONFIG.WASTE_TYPES[mode.toUpperCase()].label;
    pageTitle.textContent = `${label}, en detalle`;
    breadcrumb.textContent = label;
    container.innerHTML = createIndividualLayout(mode, data);
    renderSingleChart(mode, data ? data.chartData : null);
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function renderReportView(metricsData, onExport) {
  const container = document.getElementById('dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const breadcrumb = document.getElementById('breadcrumb-current');

  pageTitle.textContent = 'Reportes Analíticos';
  breadcrumb.textContent = 'Generación de Reportes';

  container.innerHTML = `
    <!-- Barra de acciones de exportación -->
    <div class="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm mb-6">
      <h3 class="text-sm font-bold text-gray-800">Exportar Reporte Clasificado</h3>
      <div class="flex gap-2">
        <button id="btn-export-pdf" class="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 flex items-center gap-1">
          <i data-lucide="file-text" class="w-4 h-4"></i> PDF
        </button>
        <button id="btn-export-excel" class="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1">
          <i data-lucide="sheet" class="w-4 h-4"></i> Excel
        </button>
        <button id="btn-export-word" class="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1">
          <i data-lucide="file" class="w-4 h-4"></i> Word
        </button>
        <button id="btn-export-img" class="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 flex items-center gap-1">
          <i data-lucide="image" class="w-4 h-4"></i> Imagen
        </button>
      </div>
    </div>

    <!-- Plantilla del Reporte para Visualización y Exportación -->
    <div id="report-printable-area" class="bg-white p-8 rounded-xl border shadow-sm space-y-6">
      <div class="flex justify-between items-center border-b pb-4">
        <div>
          <h2 class="text-xl font-bold text-gray-900">Consola Ambiental RecySense</h2>
          <p class="text-xs text-gray-500">Reporte de clasificación y alertas - Universidad Central del Este</p>
        </div>
        <img src="assets/logo.png" class="h-10 w-auto">
      </div>

      <!-- Resumen de Destacados -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Mayor Residuo</p>
          <p class="text-lg font-bold text-emerald-600 uppercase">${metricsData.maxWaste.type}</p>
          <p class="text-xs text-gray-400">${metricsData.maxWaste.total} depósitos</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Menor Residuo</p>
          <p class="text-lg font-bold text-amber-600 uppercase">${metricsData.minWaste.type}</p>
          <p class="text-xs text-gray-400">${metricsData.minWaste.total} depósitos</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Total Recolectado</p>
          <p class="text-lg font-bold text-gray-900">${metricsData.total}</p>
          <p class="text-xs text-gray-400">papel, cartón, plástico</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Alertas Enviadas (85%)</p>
          <p class="text-lg font-bold text-red-600">${metricsData.alertLogs.length}</p>
          <p class="text-xs text-gray-400">vaciados prioritarios</p>
        </div>
      </div>

      <!-- Registro de Alertas de Llenado -->
      <div>
        <h3 class="text-sm font-bold text-gray-800 mb-3">Historial de Alertas de Vaciado (&ge; 85%)</h3>
        <table class="w-full text-xs text-left border">
          <thead class="bg-gray-100 text-gray-700">
            <tr>
              <th class="p-2.5 border">Residuo</th>
              <th class="p-2.5 border">Nivel de Llenado</th>
              <th class="p-2.5 border">Fecha / Hora</th>
            </tr>
          </thead>
          <tbody>
            ${metricsData.alertLogs.length === 0 ? `
              <tr><td colspan="3" class="p-3 text-center text-gray-400">No se han registrado alertas de llenado.</td></tr>
            ` : metricsData.alertLogs.map(a => `
              <tr>
                <td class="p-2.5 border font-semibold uppercase">${a.tipo}</td>
                <td class="p-2.5 border text-red-600 font-bold">${a.nivel}%</td>
                <td class="p-2.5 border">${a.fecha}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Escuchadores de botones de exportación
  document.getElementById('btn-export-pdf')?.addEventListener('click', () => onExport('pdf'));
  document.getElementById('btn-export-excel')?.addEventListener('click', () => onExport('excel'));
  document.getElementById('btn-export-word')?.addEventListener('click', () => onExport('word'));
  document.getElementById('btn-export-img')?.addEventListener('click', () => onExport('image'));
}


/**
 * Muestra u oculta la pantalla de inicio de sesión
 */
export function toggleLoginModal(show) {
  const loginModal = document.getElementById('login-screen');
  if (!loginModal) return;

  if (show) {
    loginModal.classList.remove('hidden');
  } else {
    loginModal.classList.add('hidden');
  }
}

/**
 * Configura la vista en base al rol de usuario (Requisitos 6 y 10)
 */
export function applyRolePermissions(user, role) {
  const adminMenuGroup = document.getElementById('admin-menu-group');
  const userEmailDisplay = document.getElementById('user-email-display');
  const userAvatarInitials = document.getElementById('user-avatar-initials');

  if (userEmailDisplay) {
    userEmailDisplay.textContent = `${user.email} (${role})`;
  }

  if (userAvatarInitials && user.email) {
    userAvatarInitials.textContent = user.email.substring(0, 2).toUpperCase();
  }

  // Ocultar o mostrar acciones exclusivas del Administrador (Requisitos 6, 7, 10 y Restricción 3)
  if (role === 'Administrador') {
    adminMenuGroup?.classList.remove('hidden');
  } else {
    adminMenuGroup?.classList.add('hidden');
  }
}

/**
 * Muestra el panel interno de gestión de usuarios/solicitudes para Admin (Requisito 7 y 10)
 */
export function renderAdminPanel(pendingRequests = []) {
  const container = document.getElementById('dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const breadcrumb = document.getElementById('breadcrumb-current');

  pageTitle.textContent = 'Panel de Administración';
  breadcrumb.textContent = 'Gestión de Usuarios';

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Módulo Registrar / Invitar Usuario (Requisito 7) -->
      <div class="bg-white p-6 rounded-xl border shadow-sm">
        <h3 class="text-base font-bold text-gray-900 mb-2">Invitar Nuevo Usuario</h3>
        <p class="text-xs text-gray-500 mb-4">El usuario recibirá un correo electrónico para configurar su contraseña.</p>
        
        <form id="form-invite-user" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-700 uppercase mb-1">Correo Electrónico</label>
            <input type="email" id="invite-email" required placeholder="usuario@uce.edu.do" class="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-emerald-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-700 uppercase mb-1">Rol Asignado</label>
            <select id="invite-role" class="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-emerald-500">
              <option value="Usuario Común">Usuario Común</option>
              <option value="Administrador">Administrador</option>
            </select>
          </div>
          <button type="submit" class="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 text-sm">
            Enviar Invitación
          </button>
        </form>
      </div>

      <!-- Módulo Solicitudes Pendientes (Requisito 10) -->
      <div class="bg-white p-6 rounded-xl border shadow-sm">
        <h3 class="text-base font-bold text-gray-900 mb-2">Solicitudes Pendientes</h3>
        <p class="text-xs text-gray-500 mb-4">Aceptar o rechazar acceso a nuevos usuarios.</p>

        <div class="space-y-3 max-h-64 overflow-y-auto">
          ${pendingRequests.length === 0 ? `
            <div class="text-center py-8 text-xs text-gray-400">No hay solicitudes pendientes en este momento.</div>
          ` : pendingRequests.map(req => `
            <div class="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div>
                <p class="text-sm font-medium text-gray-800">${req.email}</p>
                <p class="text-xs text-gray-400">Solicitado: ${new Date(req.created_at).toLocaleDateString()}</p>
              </div>
              <div class="flex gap-2">
                <button data-req-id="${req.id}" data-action="approve" class="btn-req-action px-3 py-1 bg-emerald-600 text-white text-xs rounded-md hover:bg-emerald-700">Aceptar</button>
                <button data-req-id="${req.id}" data-action="reject" class="btn-req-action px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700">Rechazar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function createGeneralLayout(data) {
  const total = data?.totalCount || 0;
  const paper = data?.paperCount || 0;
  const cardboard = data?.cardboardCount || 0;
  const plastic = data?.plasticCount || 0;

  const paperFill = data?.paperFill || 0;
  const cardboardFill = data?.cardboardFill || 0;
  const plasticFill = data?.plasticFill || 0;

  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs text-gray-500 font-medium uppercase">Total recolectado</span>
          <span class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><i data-lucide="recycle" class="w-4 h-4"></i></span>
        </div>
        <div class="text-3xl font-bold text-gray-900">${total} <span class="text-xs text-gray-400 font-normal">residuos</span></div>
        <p class="text-xs text-gray-500 mt-2">Conteo acumulado de la jornada</p>
      </div>

      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs text-blue-600 font-medium uppercase">Papel</span>
          <span class="p-2 bg-blue-50 text-blue-600 rounded-lg"><i data-lucide="file-text" class="w-4 h-4"></i></span>
        </div>
        <div class="text-3xl font-bold text-gray-900">${paper} <span class="text-xs text-gray-400 font-normal">residuos</span></div>
        <p class="text-xs text-gray-500 mt-2">${total > 0 ? ((paper / total) * 100).toFixed(1) : 0}% del total</p>
      </div>

      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs text-amber-700 font-medium uppercase">Cartón</span>
          <span class="p-2 bg-amber-50 text-amber-700 rounded-lg"><i data-lucide="package" class="w-4 h-4"></i></span>
        </div>
        <div class="text-3xl font-bold text-gray-900">${cardboard} <span class="text-xs text-gray-400 font-normal">residuos</span></div>
        <p class="text-xs text-gray-500 mt-2">${total > 0 ? ((cardboard / total) * 100).toFixed(1) : 0}% del total</p>
      </div>

      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs text-purple-600 font-medium uppercase">Plástico</span>
          <span class="p-2 bg-purple-50 text-purple-600 rounded-lg"><i data-lucide="cup-soda" class="w-4 h-4"></i></span>
        </div>
        <div class="text-3xl font-bold text-gray-900">${plastic} <span class="text-xs text-gray-400 font-normal">residuos</span></div>
        <p class="text-xs text-gray-500 mt-2">${total > 0 ? ((plastic / total) * 100).toFixed(1) : 0}% del total</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div class="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
        <h3 class="text-base font-bold text-gray-900 mb-1">Actividad de los residuos</h3>
        <p class="text-xs text-gray-500 mb-4">Residuos por intervalo de 1 hora</p>
        <div class="h-64 relative">
          <canvas id="mainChart"></canvas>
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between">
        <div>
          <h3 class="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
            <i data-lucide="sparkles" class="w-4 h-4 text-emerald-600"></i> Lectura de la jornada
          </h3>
          <div class="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-4">
            <span class="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Mayor Actividad</span>
            <div class="text-2xl font-bold text-emerald-900 mt-1">${data?.peakHour || '--:--'}</div>
            <p class="text-xs text-emerald-700 mt-1">${data?.peakDetails || 'Esperando datos de Supabase...'}</p>
          </div>
        </div>
        <div class="space-y-2 text-xs text-gray-600 border-t pt-4">
          <div class="flex justify-between"><span>Mañana (08:00 - 12:00)</span><span class="font-bold font-mono">${data?.shifts?.morning || 0}</span></div>
          <div class="flex justify-between"><span>Mediodía (12:00 - 16:00)</span><span class="font-bold font-mono">${data?.shifts?.noon || 0}</span></div>
          <div class="flex justify-between"><span>Tarde (16:00 - 20:00)</span><span class="font-bold font-mono">${data?.shifts?.afternoon || 0}</span></div>
        </div>
      </div>
    </div>

    <div class="bg-white p-6 rounded-xl border shadow-sm">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-bold text-gray-900">Estado de los contenedores</h3>
        <span class="text-xs text-gray-500">La alerta se activa con un llenado &ge; ${CONFIG.ALERT_THRESHOLD}%</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${renderContainerCard('Papel', paperFill, '#2b7fff')}
        ${renderContainerCard('Cartón', cardboardFill, '#d97706')}
        ${renderContainerCard('Plástico', plasticFill, '#8b5cf6')}
      </div>
    </div>
  `;
}

function createIndividualLayout(type, data) {
  const config = CONFIG.WASTE_TYPES[type.toUpperCase()];
  const count = data ? data[`${type}Count`] : 0;
  const fill = data ? data[`${type}Fill`] : 0;

  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Total ${config.label}</span>
        <div class="text-3xl font-bold text-gray-900 mt-2">${count} <span class="text-xs text-gray-400 font-normal">residuos</span></div>
      </div>
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Hora de mayor actividad</span>
        <div class="text-3xl font-bold text-gray-900 mt-2">${data?.peakHour || '--:--'}</div>
      </div>
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Promedio por hora</span>
        <div class="text-3xl font-bold text-gray-900 mt-2">${data?.averagePerHour || 0}</div>
      </div>
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Llenado del contenedor</span>
        <div class="text-3xl font-bold ${fill >= CONFIG.ALERT_THRESHOLD ? 'text-red-600' : 'text-gray-900'} mt-2">${fill}%</div>
      </div>
    </div>

    <div class="bg-white p-6 rounded-xl border shadow-sm mb-6">
      <h3 class="text-base font-bold text-gray-900 mb-4">Actividad del ${config.label.toLowerCase()}</h3>
      <div class="h-64 relative">
        <canvas id="mainChart"></canvas>
      </div>
    </div>
  `;
}

function renderContainerCard(name, fillPercent, color) {
  const isAlert = fillPercent >= CONFIG.ALERT_THRESHOLD;
  return `
    <div class="p-4 rounded-lg border ${isAlert ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}">
      <div class="flex justify-between items-center mb-2">
        <span class="font-bold text-gray-800">${name}</span>
        <span class="text-2xl font-bold ${isAlert ? 'text-red-600' : 'text-gray-900'}">${fillPercent}%</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-2">
        <div class="h-2.5 rounded-full transition-all duration-500" style="width: ${Math.min(fillPercent, 100)}%; background-color: ${isAlert ? '#dc2626' : color};"></div>
      </div>
      <div class="text-xs flex justify-between ${isAlert ? 'text-red-600 font-bold' : 'text-gray-500'}">
        <span>${isAlert ? '⚠️ Contenedor lleno · Retirar' : 'Capacidad disponible'}</span>
        <span>Umbral ${CONFIG.ALERT_THRESHOLD}%</span>
      </div>
    </div>
  `;
}

function renderMultiChart(chartData) {
  const ctx = document.getElementById('mainChart');
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: chartData || {
      labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      datasets: [
        { label: 'Papel', data: [0,0,0,0,0,0,0,0,0,0,0,0], borderColor: '#2b7fff', backgroundColor: '#2b7fff', tension: 0.3 },
        { label: 'Cartón', data: [0,0,0,0,0,0,0,0,0,0,0,0], borderColor: '#d97706', backgroundColor: '#d97706', tension: 0.3 },
        { label: 'Plástico', data: [0,0,0,0,0,0,0,0,0,0,0,0], borderColor: '#8b5cf6', backgroundColor: '#8b5cf6', tension: 0.3 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderSingleChart(type, chartData) {
  const ctx = document.getElementById('mainChart');
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();

  const config = CONFIG.WASTE_TYPES[type.toUpperCase()];

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: chartData || {
      labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'],
      datasets: [
        { label: config.label, data: [0,0,0,0,0,0,0,0,0,0,0,0], backgroundColor: config.color }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}


import { LOCATIONS } from '../config.js';

let currentLocation = 'laboratorios';

export function initLocationEvents(onLocationChange) {
  const locBtns = document.querySelectorAll('.location-btn');
  const stationLabel = document.getElementById('location-station-label');

  locBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const locId = e.currentTarget.dataset.location;
      if (locId === currentLocation) return;

      currentLocation = locId;

      locBtns.forEach(b => {
        b.classList.remove('bg-emerald-600', 'text-white');
        b.classList.add('bg-slate-700', 'text-slate-300');
      });

      e.currentTarget.classList.remove('bg-slate-700', 'text-slate-300');
      e.currentTarget.classList.add('bg-emerald-600', 'text-white');

      if (stationLabel) {
        stationLabel.textContent = locId === 'laboratorios' 
          ? LOCATIONS.LABS.station 
          : LOCATIONS.LIBRARY.station;
      }

      onLocationChange(currentLocation);
    });
  });
}

export function getCurrentLocation() {
  return currentLocation;
}

/**
 * Actualiza el estado visual del menú lateral según la sección activa 
 * @param {string} activeNavId - ID del elemento nav activo (ej. 'nav-dashboard', 'nav-history', etc.)
 */
export function setActiveNav(activeNavId) {
  const navIds = ['nav-dashboard', 'nav-containers', 'nav-history', 'nav-admin-users', 'nav-admin-requests'];

  navIds.forEach(id => {
    const navItem = document.getElementById(id);
    if (!navItem) return;

    if (id === activeNavId) {
      navItem.className = 'flex items-center justify-between px-3 py-2.5 rounded-lg bg-emerald-600/20 text-emerald-400 font-medium transition-all';
    } else {
      navItem.className = 'flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all';
    }
  });

  // Control de visibilidad de los botones de filtro (Punto 4)
  const filterBar = document.getElementById('waste-filter-bar');
  if (filterBar) {
    if (activeNavId === 'nav-dashboard' || activeNavId === 'nav-history') {
      filterBar.classList.remove('hidden');
    } else {
      filterBar.classList.add('hidden');
    }
  }
}
