import { supabase } from './supabaseClient.js';

export class WasteRepository {
  /**
   * Obtiene el resumen de métricas mediante una Vista o Stored Procedure en Supabase
   */
  static async getDashboardMetrics() {
    const { data, error } = await supabase.rpc('obtener_metricas_dashboard');
    if (error) {
      console.error('Error al obtener métricas desde Supabase:', error);
      return null;
    }
    return data;
  }

  /**
   * Escucha inserciones de sensores enviadas por el ESP32 en tiempo real
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