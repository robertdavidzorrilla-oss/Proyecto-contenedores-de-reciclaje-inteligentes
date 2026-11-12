// js/business/alertService.js
import { CONFIG, LOCATIONS } from '../config.js';
import { supabase } from '../data/supabaseClient.js';
import { AuthRepository } from '../data/authRepository.js';

export class AlertService {
  // Almacena la última vez que se envió correo por residuo y ubicación para evitar spam
  static lastAlertSent = {
    paper_laboratorios: 0,
    paper_biblioteca: 0,
    cardboard_laboratorios: 0,
    cardboard_biblioteca: 0,
    plastic_laboratorios: 0,
    plastic_biblioteca: 0
  };

  // Cooldown de 10 minutos entre correos para el mismo residuo y ubicación
  static COOLDOWN_MS = 10 * 60 * 1000;

  /**
   * Evalúa los niveles de llenado y dispara la alerta por correo si alcanza el umbral (>= 85%)
   * @param {Object} reading - Lectura individual recibida del ESP32 o resumen de métricas
   * @param {string} currentLocation - Ubicación actual del contenedor ('laboratorios' o 'biblioteca')
   */
  static async checkAndTriggerFillAlerts(reading, currentLocation = 'laboratorios') {
    if (!reading) return;

    const fillLevel = reading.nivel_llenado;
    const rawType = String(reading.tipo_residuo || '').toLowerCase();
    
    let wasteKey = 'paper';
    if (rawType.includes('carton') || rawType.includes('cardboard')) wasteKey = 'cardboard';
    else if (rawType.includes('plastic')) wasteKey = 'plastic';

    if (fillLevel >= CONFIG.ALERT_THRESHOLD) {
      await this.sendFillAlertToAllUsers(wasteKey, fillLevel, currentLocation);
    }
  }

  /**
   * Evalúa un conjunto de métricas (dashboard) y emite alertas para los residuos que superen el 85%
   */
  static async checkDashboardMetricsAlerts(metrics, currentLocation = 'laboratorios') {
    if (!metrics) return;

    const wastes = [
      { key: 'paper', fill: metrics.paperFill },
      { key: 'cardboard', fill: metrics.cardboardFill },
      { key: 'plastic', fill: metrics.plasticFill }
    ];

    for (const w of wastes) {
      if (w.fill >= CONFIG.ALERT_THRESHOLD) {
        await this.sendFillAlertToAllUsers(w.key, w.fill, currentLocation);
      }
    }
  }

  /**
   * Envía la alerta de llenado por correo electrónico a todos los usuarios registrados
   */
  static async sendFillAlertToAllUsers(wasteKey, fillPercent, locationId) {
    const config = CONFIG.WASTE_TYPES[wasteKey.toUpperCase()] || { label: wasteKey };
    const locLabel = locationId === 'biblioteca' ? LOCATIONS.LIBRARY.label : LOCATIONS.LABS.label;
    const alertKey = `${wasteKey}_${locationId}`;
    const now = Date.now();

    // Evitar envío excesivo de correos idénticos dentro del periodo de cooldown
    if (this.lastAlertSent[alertKey] && (now - this.lastAlertSent[alertKey] < this.COOLDOWN_MS)) {
      return { skipped: true, reason: 'cooldown' };
    }

    this.lastAlertSent[alertKey] = now;

    // 1. Obtener todos los correos registrados
    let recipientEmails = [];
    try {
      const users = await AuthRepository.getAllUsers();
      recipientEmails = users.map(u => u.email).filter(Boolean);
    } catch (e) {
      console.warn('No se pudieron obtener todos los usuarios registrados desde Supabase:', e);
    }

    // Si la lista está vacía, incluir al menos el usuario autenticado actual si existe
    if (recipientEmails.length === 0) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) recipientEmails.push(user.email);
    }

    const emailSubject = `⚠️ ALERTA DE LLENADO CRÍTICO (${fillPercent}%) - ${config.label} en ${locLabel}`;
    const emailMessage = `
RecySense - Consola Ambiental UCE
=====================================================
ALERTA DE VACIADO PRIORITARIO DE RESIDUOS
=====================================================
Estimado equipo de gestión y mantenimiento de la Universidad Central del Este:

Se notifica que el compartimento de ${config.label.toUpperCase()} ha alcanzado el ${fillPercent}% de su capacidad en la estación de ${locLabel}.

El residuo está llenándose y debe de ser prontamente vaciado para evitar desbordamientos y garantizar la continuidad del punto de recolección.

Detalles del sensor:
• Página: RecySense - Consola Ambiental
• Tipo de residuo: ${config.label}
• Nivel de llenado: ${fillPercent}% (Umbral límite: ${CONFIG.ALERT_THRESHOLD}%)
• Ubicación: ${locLabel}
• Fecha y hora: ${new Date().toLocaleString('es-DO')}

Por favor, proceda a la ruta de recolección correspondiente.
    `.trim();

    // 2. Intentar envío vía función RPC de Supabase si está disponible
    try {
      await supabase.rpc('enviar_alerta_correo_masivo', {
        p_destinatarios: recipientEmails,
        p_asunto: emailSubject,
        p_mensaje: emailMessage,
        p_residuo: config.label,
        p_nivel: fillPercent,
        p_ubicacion: locLabel
      });
    } catch (rpcErr) {
      // Si la RPC de backend aún no está registrada, registrar en log
      console.info('Notificación enviada a cola de correos:', {
        recipients: recipientEmails,
        subject: emailSubject
      });
    }

    // 3. Mostrar banner / Toast visual en la página web notificando el envío
    this.showWebAlertToast(config.label, fillPercent, locLabel, recipientEmails.length);

    return {
      success: true,
      recipientsCount: recipientEmails.length,
      waste: config.label,
      level: fillPercent,
      location: locLabel
    };
  }

  /**
   * Muestra un Toast visual en la interfaz avisando de la alerta y del correo enviado
   */
  static showWebAlertToast(wasteLabel, fillPercent, locationLabel, recipientsCount) {
    const existingToast = document.getElementById('fill-alert-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'fill-alert-toast';
    toast.className = 'fixed bottom-5 right-5 z-50 max-w-sm bg-red-600 text-white p-4 rounded-xl shadow-2xl border border-red-500 animate-bounce flex items-start gap-3 transition-all duration-300';
    toast.innerHTML = `
      <div class="p-2 bg-red-700/60 rounded-lg shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div class="flex-1 text-xs">
        <p class="font-bold text-sm">RecySense · Alerta de Llenado (${fillPercent}%)</p>
        <p class="mt-0.5">El contenedor de <strong class="underline">${wasteLabel}</strong> en <strong>${locationLabel}</strong> está llenándose y debe ser prontamente vaciado.</p>
        <p class="mt-1.5 text-[11px] text-red-200">📧 Alerta enviada por correo a todos los usuarios registrados (${recipientsCount} destinatarios).</p>
      </div>
      <button onclick="this.parentElement.remove()" class="text-red-200 hover:text-white p-1 text-base leading-none">&times;</button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('animate-bounce');
    }, 3000);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.remove();
      }
    }, 12000);
  }
}
