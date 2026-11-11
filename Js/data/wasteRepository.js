// js/data/wasteRepository.js
import { supabase } from './supabaseClient.js';

export class WasteRepository {
  /**
   * Obtiene el resumen del Dashboard consumiendo la función RPC de Supabase 
   */
  static async getDashboardMetrics(location = 'laboratorios') {
  try {
    const { data, error } = await supabase.rpc('obtener_metricas_dashboard', {
      p_ubicacion: location
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error al obtener métricas para ${location}:`, error);
    return null;
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
   * Obtiene la vista de actividad por turnos (Mañana, Mediodía, Tarde)
   */
  static async getShiftActivity() {
    try {
      const { data, error } = await supabase
        .from('vw_actividad_turnos')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener actividad por turnos:', error);
      return { turno_manana: 0, turno_mediodia: 0, turno_tarde: 0 };
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