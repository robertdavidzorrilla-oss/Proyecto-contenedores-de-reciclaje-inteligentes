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