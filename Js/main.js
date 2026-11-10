// Actualización de js/main.js
import { initDashboardEvents, renderDashboard, toggleLoginModal, applyRolePermissions, renderAdminPanel } from './presentation/ui.js';
import { showDashboardSkeleton } from './presentation/skeletonUI.js';
import { AuthService } from './business/authService.js';
import { WasteRepository } from './data/wasteRepository.js';
import { ReportService } from './business/reportService.js';
import { renderReportView } from './presentation/ui.js';

// Evento en menú lateral para abrir Reportes
document.getElementById('nav-history')?.addEventListener('click', async () => {
  // Simulamos/obtenemos los datos actuales
  const metrics = ReportService.generateMetricsSummary([]);
  
  renderReportView(metrics, (format) => {
    switch(format) {
      case 'pdf':
        ReportService.exportToPDF('report-printable-area');
        break;
      case 'excel':
        ReportService.exportToExcel(metrics);
        break;
      case 'word':
        ReportService.exportToWord(metrics);
        break;
      case 'image':
        ReportService.exportToImage('report-printable-area');
        break;
    }
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  let currentMode = 'all';

  // 1. Mostrar pantalla de login al iniciar
  toggleLoginModal(true);

  // Evento Formulario de Login
  const loginForm = document.getElementById('auth-login-form');
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      toggleLoginModal(false);
      showDashboardSkeleton(); // Requisito 9: Esqueleto de carga visual

      const { user, role } = await AuthService.login(email, password);
      
      applyRolePermissions(user, role);
      renderDashboard(currentMode, null);
    } catch (err) {
      alert('Error de autenticación: Verifique sus credenciales.');
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
    // Siempre muestra la respuesta genérica independientemente de si el correo existe o no
    feedbackMsg.classList.remove('hidden');
  });

  // Navegación del Dashboard
  initDashboardEvents((selectedMode) => {
    currentMode = selectedMode;
    renderDashboard(currentMode, null);
  });

  // Navegación Panel Administrador (Solo si es Admin)
  document.getElementById('nav-admin-users')?.addEventListener('click', () => {
    if (AuthService.isAdmin()) {
      renderAdminPanel([]);
    }
  });
});