// js/business/reportService.js
import { CONFIG, LOCATIONS } from '../config.js';

export class ReportService {
  /**
   * Normaliza el tipo de residuo para admitir inglés y español con o sin tildes
   */
  static normalizeWasteType(raw) {
    if (!raw) return '';
    const s = String(raw).toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (s === 'papel' || s === 'paper') return 'papel';
    if (s === 'carton' || s === 'cardboard') return 'carton';
    if (s === 'plastico' || s === 'plastic') return 'plastico';
    return s;
  }

  /**
   * Normaliza la ubicación del contenedor
   */
  static normalizeLocation(raw) {
    if (!raw) return 'laboratorios';
    const s = String(raw).toLowerCase().trim();
    if (s.includes('biblio')) return 'biblioteca';
    if (s.includes('lab')) return 'laboratorios';
    return s;
  }

  /**
   * Procesa los datos recolectados para generar el resumen estadístico.
   * Incluye análisis de rotación de ubicaciones (qué lugar tuvo más movimiento - Requisito Adicional 1)
   */
  static generateMetricsSummary(rawReadings = [], filterType = 'all') {
    const counts = { papel: 0, carton: 0, plastico: 0 };
    const hourlyStats = { papel: {}, carton: {}, plastico: {} };
    const alertLogs = [];

    // Estadísticas por ubicación para responder qué lugar tuvo más movimiento
    const locationStats = {
      laboratorios: { total: 0, papel: 0, carton: 0, plastico: 0, alerts: 0 },
      biblioteca: { total: 0, papel: 0, carton: 0, plastico: 0, alerts: 0 }
    };

    const defaultHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    defaultHours.forEach(h => {
      hourlyStats.papel[h] = 0;
      hourlyStats.carton[h] = 0;
      hourlyStats.plastico[h] = 0;
    });

    rawReadings.forEach(item => {
      const type = ReportService.normalizeWasteType(item.tipo_residuo);
      const loc = ReportService.normalizeLocation(item.ubicacion);
      const amount = item.conteo || 1;
      const date = new Date(item.created_at);
      const hour = isNaN(date.getTime()) ? '12:00' : String(date.getHours()).padStart(2, '0') + ':00';

      if (counts[type] !== undefined) {
        counts[type] += amount;
        hourlyStats[type][hour] = (hourlyStats[type][hour] || 0) + amount;
      }

      // Registro por ubicación
      if (locationStats[loc]) {
        locationStats[loc].total += amount;
        if (locationStats[loc][type] !== undefined) {
          locationStats[loc][type] += amount;
        }
      }

      if (item.nivel_llenado >= CONFIG.ALERT_THRESHOLD) {
        alertLogs.push({
          tipo: type,
          ubicacion: loc,
          nivel: item.nivel_llenado,
          fecha: isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-DO')
        });
        if (locationStats[loc]) {
          locationStats[loc].alerts += 1;
        }
      }
    });

    // Encontrar mayor y menor residuo
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxWaste = sorted[0] ? { type: sorted[0][0], total: sorted[0][1] } : { type: 'N/A', total: 0 };
    const minWaste = sorted[sorted.length - 1] ? { type: sorted[sorted.length - 1][0], total: sorted[sorted.length - 1][1] } : { type: 'N/A', total: 0 };

    const totalAll = counts.papel + counts.carton + counts.plastico;

    // Determinar qué lugar tuvo más movimiento (Requisito Adicional 1)
    const labsTotal = locationStats.laboratorios.total;
    const libTotal = locationStats.biblioteca.total;
    const totalLocations = labsTotal + libTotal;

    let topLocation = null;
    if (labsTotal > libTotal) {
      topLocation = {
        id: 'laboratorios',
        name: 'Laboratorios (Edificio de Labs - Estación A)',
        shortName: 'Laboratorios',
        total: labsTotal,
        percentage: totalLocations > 0 ? ((labsTotal / totalLocations) * 100).toFixed(1) : '50.0',
        difference: labsTotal - libTotal
      };
    } else if (libTotal > labsTotal) {
      topLocation = {
        id: 'biblioteca',
        name: 'Biblioteca (Estación B - Biblioteca)',
        shortName: 'Biblioteca',
        total: libTotal,
        percentage: totalLocations > 0 ? ((libTotal / totalLocations) * 100).toFixed(1) : '50.0',
        difference: libTotal - labsTotal
      };
    } else {
      topLocation = {
        id: 'empate',
        name: 'Laboratorios y Biblioteca (Mismo flujo)',
        shortName: 'Empate de movimiento',
        total: labsTotal,
        percentage: '50.0',
        difference: 0
      };
    }

    // Si el reporte es de todos
    if (filterType === 'all') {
      return {
        filterType: 'all',
        total: totalAll,
        counts,
        maxWaste,
        minWaste,
        hourlyStats,
        locationStats,
        topLocation,
        alertLogs
      };
    }

    // Reporte de un solo residuo
    const normFilter = ReportService.normalizeWasteType(filterType);
    const configKey = normFilter === 'papel' ? 'PAPER' : (normFilter === 'carton' ? 'CARDBOARD' : 'PLASTIC');
    const config = CONFIG.WASTE_TYPES[configKey] || { label: filterType, color: '#10b981' };

    const singleCount = counts[normFilter] || 0;
    const singleAlertLogs = alertLogs.filter(a => ReportService.normalizeWasteType(a.tipo) === normFilter);

    // Calcular hora pico de este residuo
    let peakHour = '--:--';
    let maxHourCount = 0;
    for (const [h, cnt] of Object.entries(hourlyStats[normFilter] || {})) {
      if (cnt > maxHourCount) {
        maxHourCount = cnt;
        peakHour = h;
      }
    }

    const hourlyData = defaultHours.map(h => (hourlyStats[normFilter] && hourlyStats[normFilter][h]) || 0);

    const chartData = {
      labels: defaultHours,
      datasets: [
        {
          label: config.label,
          data: hourlyData,
          backgroundColor: config.color,
          borderRadius: 4
        }
      ]
    };

    return {
      filterType,
      config,
      total: singleCount,
      singleCount,
      peakHour: maxHourCount > 0 ? peakHour : '--:--',
      maxHourCount,
      counts,
      hourlyStats,
      locationStats,
      topLocation,
      alertLogs: singleAlertLogs,
      chartData
    };
  }

  /**
   * Exporta el reporte a PDF usando html2pdf
   */
  static exportToPDF(elementId, fileName = 'Reporte_RecySense.pdf') {
    const element = document.getElementById(elementId);
    if (!element) return;
    const opt = {
      margin:       0.5,
      filename:     fileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  /**
   * Exporta las métricas a Excel (.xlsx) usando SheetJS incluyendo comparativa de ubicación
   */
  static exportToExcel(metricsData, fileName = 'Reporte_RecySense.xlsx', filterType = 'all') {
    const wb = XLSX.utils.book_new();

    if (filterType === 'all') {
      // Hoja 1: Resumen General con Análisis de Ubicaciones
      const summaryData = [
        ['Categoría', 'Valor'],
        ['Total Residuos Recolectados', metricsData.total],
        ['Mayor Residuo Depositado', `${metricsData.maxWaste.type.toUpperCase()} (${metricsData.maxWaste.total})`],
        ['Menor Residuo Depositado', `${metricsData.minWaste.type.toUpperCase()} (${metricsData.minWaste.total})`],
        ['Lugar con Mayor Movimiento', `${metricsData.topLocation.name} (${metricsData.topLocation.total} depósitos - ${metricsData.topLocation.percentage}%)`],
        ['Total Depósitos - Laboratorios, Estación A', metricsData.locationStats.laboratorios.total],
        ['Total Depósitos - Biblioteca, Estación B', metricsData.locationStats.biblioteca.total],
        ['Papel Total', metricsData.counts.papel],
        ['Cartón Total', metricsData.counts.carton],
        ['Plástico Total', metricsData.counts.plastico]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');

      // Hoja 2: Comparativa de Lugares
      const locationsData = [
        ['Ubicación', 'Total Residuos', 'Papel', 'Cartón', 'Plástico', 'Alertas >= 85%'],
        ['Laboratorios, Estación A', metricsData.locationStats.laboratorios.total, metricsData.locationStats.laboratorios.papel, metricsData.locationStats.laboratorios.carton, metricsData.locationStats.laboratorios.plastico, metricsData.locationStats.laboratorios.alerts],
        ['Biblioteca, Estación B', metricsData.locationStats.biblioteca.total, metricsData.locationStats.biblioteca.papel, metricsData.locationStats.biblioteca.carton, metricsData.locationStats.biblioteca.plastico, metricsData.locationStats.biblioteca.alerts]
      ];
      const wsLocs = XLSX.utils.aoa_to_sheet(locationsData);
      XLSX.utils.book_append_sheet(wb, wsLocs, 'Movimiento por Ubicación');

      // Hoja 3: Log de Alertas (>= 85%)
      const alertsData = [['Tipo Residuo', 'Ubicación', 'Nivel Llenado (%)', 'Fecha y Hora']];
      metricsData.alertLogs.forEach(alert => {
        alertsData.push([alert.tipo.toUpperCase(), alert.ubicacion ? alert.ubicacion.toUpperCase() : 'LABORATORIOS', alert.nivel, alert.fecha]);
      });
      const wsAlerts = XLSX.utils.aoa_to_sheet(alertsData);
      XLSX.utils.book_append_sheet(wb, wsAlerts, 'Alertas Llenado');
    } else {
      const label = metricsData.config?.label || filterType.toUpperCase();
      // Hoja 1: Resumen Individual
      const summaryData = [
        ['Categoría', 'Valor'],
        ['Tipo de Residuo', label],
        ['Total Recolectado', metricsData.singleCount],
        ['Hora de Mayor Actividad', metricsData.peakHour],
        ['Lugar con Mayor Movimiento General', `${metricsData.topLocation.name} (${metricsData.topLocation.total})`],
        ['Total Alertas Llenado (>= 85%)', metricsData.alertLogs.length]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, `Resumen ${label}`);

      // Hoja 2: Actividad por Hora
      const hourlyData = [['Hora', 'Residuos Depositados']];
      if (metricsData.chartData && metricsData.chartData.labels) {
        metricsData.chartData.labels.forEach((lbl, idx) => {
          hourlyData.push([lbl, metricsData.chartData.datasets[0].data[idx] || 0]);
        });
      }
      const wsHourly = XLSX.utils.aoa_to_sheet(hourlyData);
      XLSX.utils.book_append_sheet(wb, wsHourly, 'Actividad por Hora');

      // Hoja 3: Log de Alertas
      const alertsData = [['Tipo Residuo', 'Nivel Llenado (%)', 'Fecha y Hora']];
      metricsData.alertLogs.forEach(alert => {
        alertsData.push([alert.tipo.toUpperCase(), alert.nivel, alert.fecha]);
      });
      const wsAlerts = XLSX.utils.aoa_to_sheet(alertsData);
      XLSX.utils.book_append_sheet(wb, wsAlerts, 'Alertas Llenado');
    }

    XLSX.writeFile(wb, fileName);
  }

  /**
   * Exporta la interfaz del reporte como imagen PNG mediante html2canvas
   */
  static exportToImage(elementId, fileName = 'Reporte_RecySense.png') {
    const element = document.getElementById(elementId);
    if (!element) return;
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  /**
   * Exporta el reporte estructurado en formato Word (.docx) incluyendo comparativa de ubicación
   */
  static exportToWord(metricsData, fileName = 'Reporte_RecySense.docx', filterType = 'all') {
    let children = [];

    if (filterType === 'all') {
      children = [
        new docx.Paragraph({
          text: "Reporte de Conteo y Monitoreo de Residuos - RecySense UCE",
          heading: docx.HeadingLevel.HEADING_1,
        }),
        new docx.Paragraph({ text: `Fecha de generación: ${new Date().toLocaleString('es-DO')}` }),
        new docx.Paragraph({ text: "" }),
        new docx.Paragraph({ text: `Total de Residuos Recolectados: ${metricsData.total}` }),
        new docx.Paragraph({ text: `Mayor Residuo: ${metricsData.maxWaste.type.toUpperCase()} (${metricsData.maxWaste.total})` }),
        new docx.Paragraph({ text: `Menor Residuo: ${metricsData.minWaste.type.toUpperCase()} (${metricsData.minWaste.total})` }),
        new docx.Paragraph({ text: "" }),
        new docx.Paragraph({
          text: "Análisis de Movimiento por Ubicación (Rotación del Prototipo)",
          heading: docx.HeadingLevel.HEADING_2,
        }),
        new docx.Paragraph({ text: `• Lugar con mayor flujo registrado: ${metricsData.topLocation.name}` }),
        new docx.Paragraph({ text: `• Total depósitos en Laboratorios, Estación A: ${metricsData.locationStats.laboratorios.total}` }),
        new docx.Paragraph({ text: `• Total depósitos en Biblioteca, Estación B: ${metricsData.locationStats.biblioteca.total}` }),
        new docx.Paragraph({ text: `• Proporción líder: ${metricsData.topLocation.percentage}% del total de movimientos` }),
        new docx.Paragraph({ text: "" }),
        new docx.Paragraph({
          text: "Registro de Alertas de Llenado (>= 85%)",
          heading: docx.HeadingLevel.HEADING_2,
        }),
        ...(metricsData.alertLogs.length === 0
          ? [new docx.Paragraph({ text: "No se registraron alertas de llenado." })]
          : metricsData.alertLogs.map(alert => 
              new docx.Paragraph({ text: `• [${alert.fecha}] ${alert.tipo.toUpperCase()} alcanzó el ${alert.nivel}% (${alert.ubicacion ? alert.ubicacion.toUpperCase() : 'LABORATORIOS'})` })
            )
        )
      ];
    } else {
      const label = metricsData.config?.label || filterType.toUpperCase();
      children = [
        new docx.Paragraph({
          text: `Reporte Individual: ${label} - RecySense UCE`,
          heading: docx.HeadingLevel.HEADING_1,
        }),
        new docx.Paragraph({ text: `Fecha de generación: ${new Date().toLocaleString('es-DO')}` }),
        new docx.Paragraph({ text: "" }),
        new docx.Paragraph({ text: `Tipo de Residuo: ${label}` }),
        new docx.Paragraph({ text: `Total Recolectado: ${metricsData.singleCount} residuos` }),
        new docx.Paragraph({ text: `Hora de Mayor Actividad: ${metricsData.peakHour}` }),
        new docx.Paragraph({ text: `Lugar con Mayor Movimiento General: ${metricsData.topLocation.name} (${metricsData.topLocation.total})` }),
        new docx.Paragraph({ text: "" }),
        new docx.Paragraph({
          text: `Registro de Alertas de Llenado - ${label} (>= 85%)`,
          heading: docx.HeadingLevel.HEADING_2,
        }),
        ...(metricsData.alertLogs.length === 0
          ? [new docx.Paragraph({ text: `No se registraron alertas de llenado para ${label.toLowerCase()}.` })]
          : metricsData.alertLogs.map(alert => 
              new docx.Paragraph({ text: `• [${alert.fecha}] Nivel alcanzado: ${alert.nivel}%` })
            )
        )
      ];
    }

    const doc = new docx.Document({
      sections: [{
        properties: {},
        children
      }],
    });

    docx.Packer.toBlob(doc).then(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
    });
  }
}
