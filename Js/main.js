// Actualización de js/main.js
import { initDashboardEvents, toggleLoginModal, applyRolePermissions,  } from './presentation/ui.js';
import { showDashboardSkeleton } from './presentation/skeletonUI.js';
import { AuthService } from './business/authService.js';
import { WasteRepository } from './data/wasteRepository.js';
import { ReportService } from './business/reportService.js';
import {setActiveNav, renderDashboard, renderAdminPanel, renderReportView, getCurrentLocation } from './presentation/ui.js';

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
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    toggleLoginModal(false);
    showDashboardSkeleton();

    // Intentar autenticación
    const { user, role } = await AuthService.login(email, password);
    
    applyRolePermissions(user, role);

    const initialMetrics = await WasteRepository.getDashboardMetrics(getCurrentLocation());
    renderDashboard('all', initialMetrics);

    WasteRepository.subscribeToLiveUpdates(async (newReading) => {
      const updatedMetrics = await WasteRepository.getDashboardMetrics(getCurrentLocation());
      renderDashboard('all', updatedMetrics);
    });

  } catch (err) {
    // Imprimir el error exacto devuelto por Supabase o por el script
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

  document.getElementById('nav-containers')?.addEventListener('click', (e) => {
   e.preventDefault();
   const locationCard = document.getElementById('location-station-label')?.parentElement;
    if (locationCard) {
    locationCard.classList.add('ring-2', 'ring-emerald-500');
    setTimeout(() => locationCard.classList.remove('ring-2', 'ring-emerald-500'), 1500);
    }
  });

  // 1. Clic en "Vista general"
  document.getElementById('nav-dashboard')?.addEventListener('click', async (e) => {
    e.preventDefault();
    currentMode = 'all';
    setActiveNav('nav-dashboard');
    const metrics = await WasteRepository.getDashboardMetrics(getCurrentLocation());
    renderDashboard('all', metrics);
  });

  // 2. Clic en "Contenedores"
  document.getElementById('nav-containers')?.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveNav('nav-containers');
    const locationCard = document.getElementById('location-station-label')?.parentElement;
    if (locationCard) {
      locationCard.classList.add('ring-2', 'ring-emerald-500');
      setTimeout(() => locationCard.classList.remove('ring-2', 'ring-emerald-500'), 1500);
    }
  });

  // 3. Clic en "Historial" (Reportes)
  document.getElementById('nav-history')?.addEventListener('click', async (e) => {
    e.preventDefault();
    setActiveNav('nav-history');
    const rawReadings = await WasteRepository.getAllReadings();
    const metrics = ReportService.generateMetricsSummary(rawReadings);
    renderReportView(metrics, (format) => {
      if (format === 'pdf') ReportService.exportToPDF('report-printable-area');
      if (format === 'excel') ReportService.exportToExcel(metrics);
      if (format === 'word') ReportService.exportToWord(metrics);
      if (format === 'image') ReportService.exportToImage('report-printable-area');
    });
  });

  // 4. Clic en "Gestión Usuarios" (Admin)
  document.getElementById('nav-admin-users')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (AuthService.isAdmin()) {
      setActiveNav('nav-admin-users');
      renderAdminPanel([]);
    }
  });

  // 5. Clic en "Solicitudes" (Admin)
  document.getElementById('nav-admin-requests')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (AuthService.isAdmin()) {
      setActiveNav('nav-admin-requests');
      // Vista de solicitudes pendientes
    }
  });

});



