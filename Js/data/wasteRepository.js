// js/data/wasteRepository.js
import { supabase } from './supabaseClient.js';
import { CONFIG } from '../config.js';

export class WasteRepository {
  /**
   * Obtiene el resumen del Dashboard consumiendo la función RPC de Supabase
   * con fallback automático para procesar lecturas locales si la RPC no existe.
   */
  static async getDashboardMetrics(location = 'laboratorios') {
    try {
      const { data, error } = await supabase.rpc('obtener_metricas_dashboard', {
        p_ubicacion: location
      });
      if (!error && data && data.totalCount !== undefined) {
        return data;
      }
    } catch (error) {
      console.warn(`RPC obtener_metricas_dashboard para ${location} no disponible, calculando desde lecturas:`, error);
    }

    // Fallback: calcular las métricas desde la tabla lecturas_sensores
    return await this.calculateMetricsFromReadings(location);
  }

  /**
   * Calcula las métricas del dashboard directamente desde las lecturas filtradas por ubicación
   */
  static async calculateMetricsFromReadings(targetLocation = 'laboratorios') {
    try {
      const allReadings = await this.getAllReadings();
      
      // Filtrar lecturas para la ubicación seleccionada
      const locReadings = allReadings.filter(item => {
        const itemLoc = item.ubicacion ? item.ubicacion.toLowerCase().trim() : 'laboratorios';
        return targetLocation === 'biblioteca' 
          ? itemLoc.includes('biblio')
          : (itemLoc.includes('lab') || itemLoc === 'laboratorios');
      });

      const counts = { paper: 0, cardboard: 0, plastic: 0 };
      const fills = { paper: 0, cardboard: 0, plastic: 0 };
      const hourlyStats = {
        paper: {},
        cardboard: {},
        plastic: {}
      };
      const shiftCounts = { morning: 0, afternoon: 0, night: 0 };

      const defaultHours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
      defaultHours.forEach(h => {
        hourlyStats.paper[h] = 0;
        hourlyStats.cardboard[h] = 0;
        hourlyStats.plastic[h] = 0;
      });

      locReadings.forEach(item => {
        const rawType = String(item.tipo_residuo || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let type = 'paper';
        if (rawType.includes('carton') || rawType.includes('cardboard')) type = 'cardboard';
        else if (rawType.includes('plastic')) type = 'plastic';

        const amount = item.conteo || 1;
        counts[type] += amount;

        // Nivel de llenado más reciente para cada tipo
        if (item.nivel_llenado !== undefined && item.nivel_llenado !== null) {
          fills[type] = item.nivel_llenado;
        }

        const date = new Date(item.created_at);
        const hour = isNaN(date.getTime()) ? 12 : date.getHours();
        const hourKey = String(hour).padStart(2, '0') + ':00';
        if (hourlyStats[type] && hourlyStats[type][hourKey] !== undefined) {
          hourlyStats[type][hourKey] += amount;
        }

        // Turnos: Mañana, Tarde (de 12:00 a 18:00) y Noche
        if (hour >= 6 && hour < 12) shiftCounts.morning += amount;
        else if (hour >= 12 && hour < 18) shiftCounts.afternoon += amount;
        else shiftCounts.night += amount;
      });

      const totalCount = counts.paper + counts.cardboard + counts.plastic;

      // Calcular hora pico
      const hourlyTotals = {};
      defaultHours.forEach(h => {
        hourlyTotals[h] = (hourlyStats.paper[h] || 0) + (hourlyStats.cardboard[h] || 0) + (hourlyStats.plastic[h] || 0);
      });
      let peakHour = '--:--';
      let maxCnt = 0;
      for (const [h, cnt] of Object.entries(hourlyTotals)) {
        if (cnt > maxCnt) {
          maxCnt = cnt;
          peakHour = h;
        }
      }

      return {
        location: targetLocation,
        totalCount,
        paperCount: counts.paper,
        cardboardCount: counts.cardboard,
        plasticCount: counts.plastic,
        paperFill: fills.paper,
        cardboardFill: fills.cardboard,
        plasticFill: fills.plastic,
        peakHour: maxCnt > 0 ? peakHour : '12:00',
        peakDetails: maxCnt > 0 ? `${maxCnt} depósitos registrados en esta franja` : 'Sin registros de actividad reciente',
        averagePerHour: (totalCount / 12).toFixed(1),
        shifts: shiftCounts,
        chartData: {
          labels: defaultHours,
          datasets: [
            { label: 'Papel', data: defaultHours.map(h => hourlyStats.paper[h] || 0), borderColor: '#2b7fff', backgroundColor: '#2b7fff', tension: 0.3 },
            { label: 'Cartón', data: defaultHours.map(h => hourlyStats.cardboard[h] || 0), borderColor: '#d97706', backgroundColor: '#d97706', tension: 0.3 },
            { label: 'Plástico', data: defaultHours.map(h => hourlyStats.plastic[h] || 0), borderColor: '#8b5cf6', backgroundColor: '#8b5cf6', tension: 0.3 }
          ]
        }
      };
    } catch (e) {
      console.error(`Error calculando métricas locales para ${targetLocation}:`, e);
      return {
        location: targetLocation,
        totalCount: 0,
        paperCount: 0,
        cardboardCount: 0,
        plasticCount: 0,
        paperFill: 0,
        cardboardFill: 0,
        plasticFill: 0,
        peakHour: '--:--',
        peakDetails: 'Esperando datos...',
        shifts: { morning: 0, afternoon: 0, night: 0 }
      };
    }
  }

  /**
   * Obtiene el histórico completo de lecturas para la generación de reportes
   */
  static async getAllReadings() {
    try {
      const { data, error } = await supabase
        .from('lecturas_sensores')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener lecturas para reporte:', error);
      return [];
    }
  }

  /**
   * Escucha inserciones enviadas por el ESP32 en tiempo real mediante Realtime Subscriptions
   */
  static subscribeToLiveUpdates(onNewReading) {
    return supabase
      .channel('realtime-waste-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lecturas_sensores' },
        (payload) => {
          onNewReading(payload.new);
        }
      )
      .subscribe();
  }
}
