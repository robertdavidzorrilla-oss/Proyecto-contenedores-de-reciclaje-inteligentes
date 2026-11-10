// js/business/reportService.js
import { CONFIG } from '../config.js';

export class ReportService {
  /**
   * Procesa los datos recolectados para generar el resumen estadístico
   */
  static generateMetricsSummary(rawReadings = []) {
    const counts = { papel: 0, carton: 0, plastico: 0 };
    const hourlyStats = { papel: {}, carton: {}, plastico: {} };
    const alertLogs = [];

    rawReadings.forEach(item => {
      const type = item.tipo_residuo;
      const hour = new Date(item.created_at).getHours() + ':00';
      
      if (counts[type] !== undefined) {
        counts[type] += item.conteo || 1;
        hourlyStats[type][hour] = (hourlyStats[type][hour] || 0) + (item.conteo || 1);
      }

      if (item.nivel_llenado >= CONFIG.ALERT_THRESHOLD) {
        alertLogs.push({
          tipo: type,
          nivel: item.nivel_llenado,
          fecha: new Date(item.created_at).toLocaleString('es-DO')
        });
      }
    });

    // Encontrar mayor y menor residuo
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxWaste = sorted[0] ? { type: sorted[0][0], total: sorted[0][1] } : { type: 'N/A', total: 0 };
    const minWaste = sorted[sorted.length - 1] ? { type: sorted[sorted.length - 1][0], total: sorted[sorted.length - 1][1] } : { type: 'N/A', total: 0 };

    return {
      total: counts.papel + counts.carton + counts.plastico,
      counts,
      maxWaste,
      minWaste,
      hourlyStats,
      alertLogs
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
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  }

  /**
   * Exporta las métricas a Excel (.xlsx) usando SheetJS
   */
  static exportToExcel(metricsData, fileName = 'Reporte_RecySense.xlsx') {
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen General
    const summaryData = [
      ['Categoría', 'Valor'],
      ['Total Residuos', metricsData.total],
      ['Mayor Residuo Depositado', `${metricsData.maxWaste.type.toUpperCase()} (${metricsData.maxWaste.total})`],
      ['Menor Residuo Depositado', `${metricsData.minWaste.type.toUpperCase()} (${metricsData.minWaste.total})`],
      ['Papel Total', metricsData.counts.papel],
      ['Cartón Total', metricsData.counts.carton],
      ['Plástico Total', metricsData.counts.plastico]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Hoja 2: Log de Alertas (>= 85%)
    const alertsData = [['Tipo Residuo', 'Nivel Llenado (%)', 'Fecha y Hora']];
    metricsData.alertLogs.forEach(alert => {
      alertsData.push([alert.tipo.toUpperCase(), alert.nivel, alert.fecha]);
    });
    const wsAlerts = XLSX.utils.aoa_to_sheet(alertsData);
    XLSX.utils.book_append_sheet(wb, wsAlerts, 'Alertas Llenado');

    XLSX.writeFile(wb, fileName);
  }

  /**
   * Exporta la interfaz del reporte como imagen PNG mediante html2canvas
   */
  static exportToImage(elementId, fileName = 'Reporte_RecySense.png') {
    const element = document.getElementById(elementId);
    if (!element) return;
    html2canvas(element).then(canvas => {
      const link = document.createElement('a');
      link.download = fileName;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }

  /**
   * Exporta el reporte estructurado en formato Word (.docx)
   */
  static exportToWord(metricsData, fileName = 'Reporte_RecySense.docx') {
    const doc = new docx.Document({
      sections: [{
        properties: {},
        children: [
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
            text: "Registro de Alertas de Llenado (>= 85%)",
            heading: docx.HeadingLevel.HEADING_2,
          }),
          ...metricsData.alertLogs.map(alert => 
            new docx.Paragraph({ text: `• [${alert.fecha}] ${alert.tipo.toUpperCase()} alcanzó el ${alert.nivel}%` })
          )
        ],
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