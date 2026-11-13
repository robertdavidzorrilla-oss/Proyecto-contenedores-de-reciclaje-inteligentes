// js/main.js
import { CONFIG } from './config.js';
import { 
  initDashboardEvents, 
  initMobileMenu,
  toggleLoginModal, 
  applyRolePermissions, 
  setActiveNav, 
  setActiveFilter,
  renderDashboard, 
  renderAdminUsersPanel, 
  renderAdminRequestsPanel,
  updateRequestsBadge, 
  renderReportView, 
  initLocationEvents, 
  getCurrentLocation 
} from './presentation/ui.js';
import { showDashboardSkeleton } from './presentation/skeletonUI.js';
import { AuthService } from './business/authService.js';
import { WasteRepository } from './data/wasteRepository.js';
import { ReportService } from './business/reportService.js';
import { AlertService } from './business/alertService.js';

document.addEventListener('DOMContentLoaded', async () => {
  let currentNav = 'nav-dashboard';
  let currentWasteFilter = 'all';
  let cachedMetrics = null;
  let cachedReadings = [];

  // Inicializar menú interactivo para dispositivos móviles (Requisito Adicional 2)
  initMobileMenu();

  // Función auxiliar para renderizar el reporte analítico según el filtro seleccionado
  async function renderCurrentReport(filterType = currentWasteFilter) {
    if (!cachedReadings || cachedReadings.length === 0) {
      cachedReadings = await WasteRepository.getAllReadings();
    }
    const metrics = ReportService.generateMetricsSummary(cachedReadings, filterType);
    const label = filterType === 'all' 
      ? 'General' 
      : (CONFIG.WASTE_TYPES[filterType.toUpperCase()]?.label || filterType);
    const fileName = `Reporte_${label}_RecySense`;

    renderReportView(metrics, (format) => {
      switch(format) {
        case 'pdf':
          ReportService.exportToPDF('report-printable-area', `${fileName}.pdf`);
          break;
        case 'excel':
          ReportService.exportToExcel(metrics, `${fileName}.xlsx`, filterType);
          break;
        case 'word':
          ReportService.exportToWord(metrics, `${fileName}.docx`, filterType);
          break;
        case 'image':
          ReportService.exportToImage('report-printable-area', `${fileName}.png`);
          break;
      }
    }, filterType);
  }

  // Función para cargar y renderizar la Gestión de Usuarios (Punto 6)
  async function loadAndRenderUsers() {
    try {
      const users = await AuthService.getAllUsers();
      renderAdminUsersPanel(
        users,
        async (email, role) => {
          try {
            await AuthService.createNewUser(email, role);
            alert(`Invitación enviada con éxito a ${email} con el rol "${role}".`);
            await loadAndRenderUsers();
          } catch (err) {
            console.error('Error al invitar usuario:', err);
            alert(`Error al invitar usuario: ${err.message}`);
          }
        },
        async (userId, newRole) => {
          try {
            await AuthService.updateUserRole(userId, newRole);
            alert(`Rol actualizado con éxito a "${newRole}".`);
            await loadAndRenderUsers();
          } catch (err) {
            console.error('Error al actualizar rol:', err);
            alert(`Error al actualizar rol: ${err.message}`);
          }
        }
      );
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      renderAdminUsersPanel([], null, null);
    }
  }

  // Función para cargar y renderizar Solicitudes Pendientes (Punto 6)
  async function loadAndRenderRequests() {
    try {
      const pendingRequests = await AuthService.getPendingRequests();
      updateRequestsBadge(pendingRequests.length);

      renderAdminRequestsPanel(pendingRequests, async (reqId, action) => {
        try {
          await AuthService.handleRequest(reqId, action);
          alert(`Solicitud ${action === 'approve' ? 'aceptada' : 'rechazada'} exitosamente.`);
          await loadAndRenderRequests();
        } catch (err) {
          console.error('Error al resolver solicitud:', err);
          alert(`Error al procesar la solicitud: ${err.message}`);
        }
      });
    } catch (err) {
      console.error('Error al cargar solicitudes:', err);
      renderAdminRequestsPanel([], null);
    }
  }

  // 1. Mostrar pantalla de login al iniciar
  toggleLoginModal(true);

  // Evento Formulario de Login
  const loginForm = document.getElementById('auth-login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      toggleLoginModal(false);
      showDashboardSkeleton();

      // Intentar autenticación
      const { user, role } = await AuthService.login(email, password);
      
      applyRolePermissions(user, role);

      // Si es administrador, inicializar contador de solicitudes pendientes en el menú
      if (role === 'Administrador') {
        const count = await AuthService.getPendingRequestsCount();
        updateRequestsBadge(count);
      }

      cachedMetrics = await WasteRepository.getDashboardMetrics(getCurrentLocation());
      renderDashboard(currentWasteFilter, cachedMetrics);

      // Evaluar alertas de llenado y disparar envío de correo masivo si supera 85% (Requisito Adicional 2)
      await AlertService.checkDashboardMetricsAlerts(cachedMetrics, getCurrentLocation());

      // Suscripción en tiempo real a lecturas del ESP32
      WasteRepository.subscribeToLiveUpdates(async (newReading) => {
        cachedReadings = []; // Invalidar caché de historial

        // Verificar si la lectura individual dispara alerta de llenado por correo (>= 85%)
        await AlertService.checkAndTriggerFillAlerts(newReading, getCurrentLocation());

        const updatedMetrics = await WasteRepository.getDashboardMetrics(getCurrentLocation());
        cachedMetrics = updatedMetrics;
        if (currentNav === 'nav-dashboard') {
          renderDashboard(currentWasteFilter, updatedMetrics);
        } else if (currentNav === 'nav-history') {
          await renderCurrentReport(currentWasteFilter);
        }
      });

    } catch (err) {
      console.error('Error detallado de autenticación:', err);
      alert(`Error de autenticación: ${err.message || 'Verifique sus credenciales'}`);
      toggleLoginModal(true);
    }
  });

  // Evento Recuperación de Contraseña (Requisito 8: Respuesta genérica)
  const btnForgot = document.getElementById('btn-forgot-password');
  const btnBackLogin = document.getElementById('btn-back-to-login');
  const resetForm = document.getElementById('auth-reset-form');

  btnForgot?.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    resetForm.classList.remove('hidden');
  });

  btnBackLogin?.addEventListener('click', () => {
    resetForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  });

  resetForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const resetEmail = document.getElementById('reset-email').value;
    const feedbackMsg = document.getElementById('reset-feedback-msg');

    await AuthService.resetPassword(resetEmail);
    feedbackMsg.classList.remove('hidden');
  });

  // Evento para alternar entre ubicaciones rotativas (Laboratorios / Biblioteca - Requisito Adicional 1)
  initLocationEvents(async (newLocation) => {
    // Al cambiar de ubicación, navegar siempre a Vista General con los datos de esa ubicación
    currentNav = 'nav-dashboard';
    setActiveNav('nav-dashboard');
    currentWasteFilter = 'all';
    setActiveFilter('all');

    cachedMetrics = await WasteRepository.getDashboardMetrics(newLocation);
    renderDashboard(currentWasteFilter, cachedMetrics);

    // Comprobar alertas de la nueva ubicación
    await AlertService.checkDashboardMetricsAlerts(cachedMetrics, newLocation);
  });

  // Navegación de filtros (Punto 5: Comportamiento según sección activa)
  initDashboardEvents(async (selectedWasteType) => {
    currentWasteFilter = selectedWasteType;
    
    if (currentNav === 'nav-dashboard') {
      // En Vista General: filtra el dashboard
      const metrics = cachedMetrics || await WasteRepository.getDashboardMetrics(getCurrentLocation());
      cachedMetrics = metrics;
      renderDashboard(currentWasteFilter, metrics);
    } else if (currentNav === 'nav-history') {
      // En Historial: NO lleva a vista general, genera el reporte de ese residuo (con su gráfico) o de todos
      await renderCurrentReport(currentWasteFilter);
    }
  });

  // 1. Clic en "Vista general"
  document.getElementById('nav-dashboard')?.addEventListener('click', async (e) => {
    e.preventDefault();
    currentNav = 'nav-dashboard';
    setActiveNav('nav-dashboard');
    const metrics = await WasteRepository.getDashboardMetrics(getCurrentLocation());
    cachedMetrics = metrics;
    renderDashboard(currentWasteFilter, metrics);
  });

  // 2. Clic en "Contenedores" (Solo resalta el cuadro de punto de recolección en el menú)
  document.getElementById('nav-containers')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Si está en pantalla móvil y el sidebar está cerrado, abrirlo para mostrar el cuadro
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar && sidebar.classList.contains('-translate-x-full')) {
      sidebar.classList.remove('-translate-x-full');
      backdrop?.classList.remove('hidden');
    }

    const locationCard = document.getElementById('point-recollection-card') || document.getElementById('location-station-label')?.parentElement;
    if (locationCard) {
      // Marcar en verde los bordes del cuadro de punto de recolección en el menú
      locationCard.classList.remove('border-slate-700/60');
      locationCard.classList.add('border-emerald-500', 'ring-2', 'ring-emerald-400', 'shadow-lg', 'shadow-emerald-500/25', 'scale-[1.02]');
      
      locationCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Retirar el resaltado verde después de 2.5 segundos
      setTimeout(() => {
        locationCard.classList.remove('border-emerald-500', 'ring-2', 'ring-emerald-400', 'shadow-lg', 'shadow-emerald-500/25', 'scale-[1.02]');
        locationCard.classList.add('border-slate-700/60');
      }, 2500);
    }
  });

  // 3. Clic en "Historial" (Reportes)
  document.getElementById('nav-history')?.addEventListener('click', async (e) => {
    e.preventDefault();
    currentNav = 'nav-history';
    setActiveNav('nav-history');
    cachedReadings = await WasteRepository.getAllReadings();
    await renderCurrentReport(currentWasteFilter);
  });

  // 4. Clic en "Gestión Usuarios" (Admin - Punto 6)
  document.getElementById('nav-admin-users')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (AuthService.isAdmin()) {
      currentNav = 'nav-admin-users';
      setActiveNav('nav-admin-users');
      await loadAndRenderUsers();
    }
  });

  // 5. Clic en "Solicitudes" (Admin - Punto 6)
  document.getElementById('nav-admin-requests')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (AuthService.isAdmin()) {
      currentNav = 'nav-admin-requests';
      setActiveNav('nav-admin-requests');
      await loadAndRenderRequests();
    }
  });
});
