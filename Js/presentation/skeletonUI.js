// js/presentation/skeletonUI.js

export function showDashboardSkeleton() {
  const container = document.getElementById('dashboard-content');
  if (!container) return;

  container.innerHTML = `
    <!-- Skeleton KPIs -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-pulse">
      ${[1, 2, 3, 4].map(() => `
        <div class="bg-white p-5 rounded-xl border border-gray-200">
          <div class="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div class="h-8 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div class="h-3 bg-gray-100 rounded w-1/3"></div>
        </div>
      `).join('')}
    </div>

    <!-- Skeleton Gráficos -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6 animate-pulse">
      <div class="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200">
        <div class="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div class="h-3 bg-gray-100 rounded w-1/4 mb-6"></div>
        <div class="h-56 bg-gray-100 rounded"></div>
      </div>
      <div class="bg-white p-6 rounded-xl border border-gray-200 flex flex-col justify-between">
        <div>
          <div class="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div class="h-20 bg-gray-100 rounded mb-4"></div>
        </div>
        <div class="space-y-3">
          <div class="h-3 bg-gray-100 rounded"></div>
          <div class="h-3 bg-gray-100 rounded"></div>
        </div>
      </div>
    </div>
  `;
}