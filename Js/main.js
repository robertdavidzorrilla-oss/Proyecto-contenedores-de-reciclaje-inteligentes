// js/main.js
import { initDashboardEvents, renderDashboard } from './presentation/ui.js';
import { WasteRepository } from './data/wasteRepository.js';

document.addEventListener('DOMContentLoaded', async () => {
  let currentMode = 'all';

  // 1. Render inicial del Dashboard (vacio / cargando)
  renderDashboard(currentMode, null);

  // 2. Inicializar eventos de filtrado de pestañas
  initDashboardEvents((selectedMode) => {
    currentMode = selectedMode;
    renderDashboard(currentMode, null);
  });

  // 3. Suscribirse a actualizaciones en tiempo real desde Supabase (ESP32)
  WasteRepository.subscribeToLiveUpdates((newReading) => {
    console.log('Nueva lectura recibida desde ESP32:', newReading);
    // Aquí actualizaremos dinámicamente las gráficas y KPIs
  });
});