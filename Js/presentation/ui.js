// js/presentation/ui.js
import { CONFIG, LOCATIONS } from '../config.js';

let chartInstance = null;
let reportChartInstance = null;
let currentLocation = 'laboratorios';

export function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  function openSidebar() {
    if (sidebar) sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
  }

  function closeSidebar() {
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  toggleBtn?.addEventListener('click', openSidebar);
  closeBtn?.addEventListener('click', closeSidebar);
  backdrop?.addEventListener('click', closeSidebar);

  // Cerrar el sidebar al seleccionar una sección en celulares
  const navLinks = sidebar?.querySelectorAll('nav a, .location-btn');
  navLinks?.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        closeSidebar();
      }
    });
  });
}

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

export function setActiveFilter(wasteType) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    if (btn.dataset.wasteType === wasteType) {
      btn.classList.add('active', 'bg-slate-900', 'text-white');
    } else {
      btn.classList.remove('active', 'bg-slate-900', 'text-white');
    }
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

export function renderReportView(metricsData, onExport, filterType = 'all') {
  const container = document.getElementById('dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const breadcrumb = document.getElementById('breadcrumb-current');

  if (reportChartInstance) {
    reportChartInstance.destroy();
    reportChartInstance = null;
  }

  const isAll = filterType === 'all';
  const label = !isAll ? (CONFIG.WASTE_TYPES[filterType.toUpperCase()]?.label || filterType) : 'Todos';

  pageTitle.textContent = isAll ? 'Reportes Analíticos' : `Reporte de ${label}`;
  breadcrumb.textContent = isAll ? 'Generación de Reportes' : `Reporte · ${label}`;

  let summaryHtml = '';
  let chartSectionHtml = '';
  let alertsTitle = 'Historial de Alertas de Vaciado (&ge; 85%)';

  if (isAll) {
    // Si el reporte es de todos
    summaryHtml = `
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
    `;
  } else {
    // Si el reporte es de un solo residuo
    const config = CONFIG.WASTE_TYPES[filterType.toUpperCase()];
    summaryHtml = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Residuo</p>
          <p class="text-lg font-bold" style="color: ${config.color}">${config.label}</p>
          <p class="text-xs text-gray-400">Reporte individual</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Total Recolectado</p>
          <p class="text-lg font-bold text-gray-900">${metricsData.singleCount}</p>
          <p class="text-xs text-gray-400">depósitos registrados</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Mayor Actividad</p>
          <p class="text-lg font-bold text-emerald-600">${metricsData.peakHour || '--:--'}</p>
          <p class="text-xs text-gray-400">hora pico</p>
        </div>
        <div class="p-4 bg-gray-50 rounded-lg border">
          <p class="text-xs text-gray-500 font-medium">Alertas Enviadas (85%)</p>
          <p class="text-lg font-bold text-red-600">${metricsData.alertLogs.length}</p>
          <p class="text-xs text-gray-400">vaciados prioritarios</p>
        </div>
      </div>
    `;

    // Incluir el gráfico del residuo individual para exportación y visualización
    chartSectionHtml = `
      <div class="p-5 bg-gray-50 rounded-lg border">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-sm font-bold text-gray-800">Actividad del ${config.label.toLowerCase()} por intervalo de hora</h3>
          <span class="text-xs text-gray-500">Distribución de depósitos</span>
        </div>
        <div class="h-64 relative">
          <canvas id="reportChart"></canvas>
        </div>
      </div>
    `;
    alertsTitle = `Historial de Alertas de Vaciado - ${config.label} (&ge; 85%)`;
  }

  // Bloque de Análisis de Movimiento por Ubicación (Requisito Adicional 1)
  let locationComparisonHtml = '';
  if (metricsData.topLocation && metricsData.locationStats) {
    const labsTotal = metricsData.locationStats.laboratorios.total;
    const libTotal = metricsData.locationStats.biblioteca.total;
    const sumBoth = labsTotal + libTotal;
    const labsPct = sumBoth > 0 ? ((labsTotal / sumBoth) * 100).toFixed(1) : 50;
    const libPct = sumBoth > 0 ? ((libTotal / sumBoth) * 100).toFixed(1) : 50;

    locationComparisonHtml = `
      <div class="p-5 bg-gray-50 rounded-xl border space-y-3">
        <div class="flex justify-between items-center border-b pb-2">
          <div class="flex items-center gap-2">
            <span class="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><i data-lucide="map-pin" class="w-4 h-4"></i></span>
            <h3 class="text-sm font-bold text-gray-900">Análisis de Movimiento por Ubicación (Prototipo Móvil)</h3>
          </div>
          <span class="text-xs px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-full">
            Líder: ${metricsData.topLocation.shortName} (${metricsData.topLocation.percentage}%)
          </span>
        </div>
        <p class="text-xs text-gray-600">
          El prototipo único fue rotado entre las 2 zonas prioritarias del campus. 
          <strong>${metricsData.topLocation.name}</strong> registró el <strong>mayor volumen de depósitos (${metricsData.topLocation.total} unidades)</strong> frente a la otra estación.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div class="p-3 bg-white rounded-lg border ${metricsData.topLocation.id === 'laboratorios' ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-gray-200'}">
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <i data-lucide="flask-conical" class="w-3.5 h-3.5 text-blue-600"></i> Laboratorios (Estación A)
              </span>
              <span class="text-xs font-bold text-gray-900">${labsTotal} depósitos <span class="text-gray-400 font-normal">(${labsPct}%)</span></span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="bg-blue-600 h-2 rounded-full" style="width: ${labsPct}%"></div>
            </div>
          </div>

          <div class="p-3 bg-white rounded-lg border ${metricsData.topLocation.id === 'biblioteca' ? 'border-emerald-400 ring-1 ring-emerald-300' : 'border-gray-200'}">
            <div class="flex justify-between items-center mb-1.5">
              <span class="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                <i data-lucide="book-open" class="w-3.5 h-3.5 text-amber-600"></i> Biblioteca (Estación B)
              </span>
              <span class="text-xs font-bold text-gray-900">${libTotal} depósitos <span class="text-gray-400 font-normal">(${libPct}%)</span></span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div class="bg-amber-600 h-2 rounded-full" style="width: ${libPct}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Barra de acciones de exportación (Responsive para celular) -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border shadow-sm mb-6 gap-3">
      <div>
        <h3 class="text-sm font-bold text-gray-800">Exportar Reporte ${isAll ? 'Clasificado General' : `de ${label}`}</h3>
        <p class="text-xs text-gray-400">Genera y descarga en formatos PDF, Excel, Word o Imagen</p>
      </div>
      <div class="flex flex-wrap gap-2 w-full sm:w-auto">
        <button id="btn-export-pdf" class="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 flex items-center gap-1 shadow-sm">
          <i data-lucide="file-text" class="w-4 h-4"></i> PDF
        </button>
        <button id="btn-export-excel" class="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1 shadow-sm">
          <i data-lucide="sheet" class="w-4 h-4"></i> Excel
        </button>
        <button id="btn-export-word" class="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 flex items-center gap-1 shadow-sm">
          <i data-lucide="file" class="w-4 h-4"></i> Word
        </button>
        <button id="btn-export-img" class="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700 flex items-center gap-1 shadow-sm">
          <i data-lucide="image" class="w-4 h-4"></i> Imagen
        </button>
      </div>
    </div>

    <!-- Plantilla del Reporte para Visualización y Exportación -->
    <div id="report-printable-area" class="bg-white p-4 sm:p-8 rounded-xl border shadow-sm space-y-6">
      <div class="flex justify-between items-center border-b pb-4">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-gray-900">Consola Ambiental RecySense</h2>
          <p class="text-xs text-gray-500">${isAll ? 'Reporte general de clasificación y alertas' : `Reporte individual de ${label}`} - Universidad Central del Este</p>
        </div>
        <img src="assets/Logo.png" class="h-8 sm:h-10 w-auto object-contain" alt="Logo RecySense">
      </div>

      <!-- Resumen de Destacados -->
      ${summaryHtml}

      <!-- Análisis de Movimiento por Ubicación (Requisito Adicional 1) -->
      ${locationComparisonHtml}

      <!-- Gráfico de Actividad del Residuo (cuando es individual) -->
      ${chartSectionHtml}

      <!-- Registro de Alertas de Llenado -->
      <div>
        <h3 class="text-sm font-bold text-gray-800 mb-3">${alertsTitle}</h3>
        <div class="overflow-x-auto w-full rounded-lg border">
          <table class="w-full text-xs text-left">
            <thead class="bg-gray-100 text-gray-700">
              <tr>
                <th class="p-2.5 border-b">Residuo</th>
                <th class="p-2.5 border-b">Ubicación</th>
                <th class="p-2.5 border-b">Nivel de Llenado</th>
                <th class="p-2.5 border-b">Fecha / Hora</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              ${metricsData.alertLogs.length === 0 ? `
                <tr><td colspan="4" class="p-3 text-center text-gray-400">No se han registrado alertas de llenado.</td></tr>
              ` : metricsData.alertLogs.map(a => `
                <tr>
                  <td class="p-2.5 font-semibold uppercase">${a.tipo}</td>
                  <td class="p-2.5 text-gray-600 capitalize">${a.ubicacion || 'Laboratorios'}</td>
                  <td class="p-2.5 text-red-600 font-bold">${a.nivel}%</td>
                  <td class="p-2.5 text-gray-600">${a.fecha}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Renderizar gráfico de barras en el canvas del reporte si es residuo individual
  if (!isAll && metricsData.chartData) {
    const ctx = document.getElementById('reportChart');
    if (ctx) {
      reportChartInstance = new Chart(ctx, {
        type: 'bar',
        data: metricsData.chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  }

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

  // Ocultar o mostrar acciones exclusivas del Administrador
  if (role === 'Administrador') {
    adminMenuGroup?.classList.remove('hidden');
  } else {
    adminMenuGroup?.classList.add('hidden');
  }
}

/**
 * Muestra el panel de Gestión de Usuarios y Roles (Punto 6: Invitación + Brindar/Revocar Roles)
 */
export function renderAdminUsersPanel(users = [], onInvite, onRoleChange) {
  const container = document.getElementById('dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const breadcrumb = document.getElementById('breadcrumb-current');

  pageTitle.textContent = 'Panel de Administración';
  breadcrumb.textContent = 'Gestión de Usuarios';

  container.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Módulo Registrar / Invitar Usuario (Requisito 7) -->
      <div class="bg-white p-6 rounded-xl border shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <span class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><i data-lucide="user-plus" class="w-4 h-4"></i></span>
          <h3 class="text-base font-bold text-gray-900">Invitar Nuevo Usuario</h3>
        </div>
        <p class="text-xs text-gray-500 mb-4">El usuario recibirá un correo electrónico con instrucciones para configurar su contraseña.</p>
        
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
          <button type="submit" class="w-full py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 text-sm flex items-center justify-center gap-2 shadow-sm">
            <i data-lucide="send" class="w-4 h-4"></i> Enviar Invitación
          </button>
        </form>
      </div>

      <!-- Módulo Brindar / Revocar Roles (Punto 6) -->
      <div class="bg-white p-6 rounded-xl border shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-purple-50 text-purple-600 rounded-lg"><i data-lucide="shield-check" class="w-4 h-4"></i></span>
            <h3 class="text-base font-bold text-gray-900">Gestión de Roles</h3>
          </div>
          <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">${users.length} usuarios</span>
        </div>
        <p class="text-xs text-gray-500 mb-4">Brindar privilegios (ascender a Administrador) o revocarlos (descender a Usuario Común).</p>

        <div class="space-y-3 max-h-80 overflow-y-auto pr-1">
          ${users.length === 0 ? `
            <div class="text-center py-10 text-xs text-gray-400">No hay usuarios registrados en este momento.</div>
          ` : users.map(u => {
            const isAdmin = u.role === 'Administrador';
            const userEmail = u.email || 'usuario@uce.edu.do';
            return `
              <div class="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-white transition-all">
                <div class="min-w-0 flex-1 mr-3">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold text-gray-800 truncate">${userEmail}</p>
                    <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}">
                      ${u.role}
                    </span>
                  </div>
                  <p class="text-[11px] text-gray-400">ID: ${u.id ? u.id.substring(0, 8) + '...' : '--'}</p>
                </div>
                <div>
                  ${isAdmin ? `
                    <button data-user-id="${u.id}" data-user-email="${userEmail}" data-new-role="Usuario Común" class="btn-change-role px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300 text-xs font-semibold rounded-md flex items-center gap-1 transition-all" title="Descender a Usuario Común">
                      <i data-lucide="arrow-down" class="w-3.5 h-3.5"></i> Descender
                    </button>
                  ` : `
                    <button data-user-id="${u.id}" data-user-email="${userEmail}" data-new-role="Administrador" class="btn-change-role px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-xs font-semibold rounded-md flex items-center gap-1 transition-all" title="Ascender a Administrador">
                      <i data-lucide="arrow-up" class="w-3.5 h-3.5"></i> Ascender
                    </button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Escuchador de formulario de invitación
  const formInvite = document.getElementById('form-invite-user');
  formInvite?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('invite-email').value.trim();
    const role = document.getElementById('invite-role').value;
    if (onInvite) onInvite(email, role);
  });

  // Escuchadores de botones de cambio de rol
  const roleButtons = document.querySelectorAll('.btn-change-role');
  roleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const userId = e.currentTarget.dataset.userId;
      const userEmail = e.currentTarget.dataset.userEmail;
      const newRole = e.currentTarget.dataset.newRole;
      if (confirm(`¿Estás seguro de que deseas cambiar el rol de ${userEmail} a "${newRole}"?`)) {
        if (onRoleChange) onRoleChange(userId, newRole);
      }
    });
  });
}

// Alias para compatibilidad
export function renderAdminPanel(users = [], onInvite, onRoleChange) {
  renderAdminUsersPanel(users, onInvite, onRoleChange);
}

/**
 * Muestra el panel de Solicitudes de Registro Pendientes (Punto 6)
 */
export function renderAdminRequestsPanel(pendingRequests = [], onResolve) {
  const container = document.getElementById('dashboard-content');
  const pageTitle = document.getElementById('page-title');
  const breadcrumb = document.getElementById('breadcrumb-current');

  pageTitle.textContent = 'Solicitudes de Acceso';
  breadcrumb.textContent = 'Solicitudes Pendientes';

  container.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="bg-white p-6 rounded-xl border shadow-sm">
        <div class="flex justify-between items-center mb-4 pb-3 border-b">
          <div>
            <h3 class="text-base font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="user-check" class="w-5 h-5 text-emerald-600"></i> Solicitudes de Registro Pendientes
            </h3>
            <p class="text-xs text-gray-500 mt-0.5">Aceptar o rechazar solicitudes de acceso a la consola ambiental.</p>
          </div>
          <span class="text-xs px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200">
            ${pendingRequests.length} pendientes
          </span>
        </div>

        <div class="space-y-3">
          ${pendingRequests.length === 0 ? `
            <div class="text-center py-12">
              <div class="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <i data-lucide="check-circle" class="w-6 h-6"></i>
              </div>
              <p class="text-sm font-semibold text-gray-700">No hay solicitudes pendientes en este momento.</p>
              <p class="text-xs text-gray-400 mt-1">Todas las peticiones han sido procesadas.</p>
            </div>
          ` : pendingRequests.map(req => `
            <div class="flex items-center justify-between p-4 border rounded-xl bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                  ${(req.email || 'U').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p class="text-sm font-semibold text-gray-900">${req.email}</p>
                  <p class="text-xs text-gray-400">Solicitado el: ${req.created_at ? new Date(req.created_at).toLocaleString('es-DO') : 'Reciente'}</p>
                </div>
              </div>
              <div class="flex gap-2">
                <button data-req-id="${req.id}" data-action="approve" class="btn-req-action px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i> Aceptar
                </button>
                <button data-req-id="${req.id}" data-action="reject" class="btn-req-action px-3.5 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1 shadow-sm">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i> Rechazar
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Escuchadores para resolver solicitudes (Aceptar / Rechazar)
  const reqButtons = document.querySelectorAll('.btn-req-action');
  reqButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const reqId = e.currentTarget.dataset.reqId;
      const action = e.currentTarget.dataset.action;
      if (onResolve) onResolve(reqId, action);
    });
  });
}

/**
 * Actualiza el contador/badge de solicitudes pendientes en el menú lateral
 */
export function updateRequestsBadge(count) {
  const badge = document.getElementById('requests-badge');
  if (badge) {
    badge.textContent = count;
  }
}

function createGeneralLayout(data) {
  const total = data?.totalCount || 0;
  const paper = data?.paperCount || 0;
  const cardboard = data?.cardboardCount || 0;
  const plastic = data?.plasticCount || 0;
  const paperFill = data?.paperFill || 0;
  const cardboardFill = data?.cardboardFill || 0;
  const plasticFill = data?.plasticFill || 0;

  const locLabel = data?.location === 'biblioteca' ? 'Biblioteca (Estación B)' : 'Laboratorios (Estación A)';

  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs text-gray-500 font-medium uppercase">Total recolectado</span>
          <span class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><i data-lucide="recycle" class="w-4 h-4"></i></span>
        </div>
        <div class="text-3xl font-bold text-gray-900">${total} <span class="text-xs text-gray-400 font-normal">residuos</span></div>
        <p class="text-xs text-gray-500 mt-2">Conteo en ${locLabel}</p>
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
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-base font-bold text-gray-900">Actividad de los residuos</h3>
          <span class="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">${locLabel}</span>
        </div>
        <p class="text-xs text-gray-500 mb-4">Residuos por intervalo de 1 hora en este sitio</p>
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
          <div class="flex justify-between items-center">
            <span class="flex items-center gap-1.5"><i data-lucide="sunrise" class="w-3.5 h-3.5 text-amber-500"></i> Mañana (08:00 - 12:00)</span>
            <span class="font-bold font-mono text-gray-900">${data?.shifts?.morning || 0}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="flex items-center gap-1.5"><i data-lucide="sun" class="w-3.5 h-3.5 text-orange-500"></i> Tarde (12:00 - 18:00)</span>
            <span class="font-bold font-mono text-gray-900">${data?.shifts?.afternoon ?? data?.shifts?.noon ?? 0}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="flex items-center gap-1.5"><i data-lucide="moon" class="w-3.5 h-3.5 text-indigo-500"></i> Noche (18:00 - 00:00)</span>
            <span class="font-bold font-mono text-gray-900">${data?.shifts?.night || 0}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white p-6 rounded-xl border shadow-sm">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h3 class="text-base font-bold text-gray-900">Estado de los compartimentos (${locLabel})</h3>
          <span class="text-xs text-gray-500">La alerta se activa con un llenado &ge; ${CONFIG.ALERT_THRESHOLD}%</span>
        </div>
        <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg border border-emerald-200">
          Prototipo rotativo activo
        </span>
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
  const locLabel = data?.location === 'biblioteca' ? 'Biblioteca (Estación B)' : 'Laboratorios (Estación A)';

  return `
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Total ${config.label}</span>
        <div class="text-3xl font-bold text-gray-900 mt-2">${count} <span class="text-xs text-gray-400 font-normal">residuos</span></div>
        <p class="text-xs text-gray-400 mt-1">${locLabel}</p>
      </div>
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Hora de mayor actividad</span>
        <div class="text-3xl font-bold text-gray-900 mt-2">${data?.peakHour || '--:--'}</div>
        <p class="text-xs text-gray-400 mt-1">Franja más concurrida</p>
      </div>
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Promedio por hora</span>
        <div class="text-3xl font-bold text-gray-900 mt-2">${data?.averagePerHour || 0}</div>
        <p class="text-xs text-gray-400 mt-1">residuos / hora</p>
      </div>
      <div class="bg-white p-5 rounded-xl border shadow-sm">
        <span class="text-xs text-gray-500 font-medium uppercase">Llenado del contenedor</span>
        <div class="text-3xl font-bold ${fill >= CONFIG.ALERT_THRESHOLD ? 'text-red-600' : 'text-gray-900'} mt-2">${fill}%</div>
        <p class="text-xs text-gray-400 mt-1">Sensor ultrasónico</p>
      </div>
    </div>

    <div class="bg-white p-6 rounded-xl border shadow-sm mb-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-base font-bold text-gray-900">Actividad del ${config.label.toLowerCase()}</h3>
        <span class="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-md">${locLabel}</span>
      </div>
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
  const navIds = ['nav-dashboard', 'nav-history', 'nav-admin-users', 'nav-admin-requests'];

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
