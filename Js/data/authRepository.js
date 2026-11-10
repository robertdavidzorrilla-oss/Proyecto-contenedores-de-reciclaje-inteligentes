// js/data/authRepository.js
import { supabase } from './supabaseClient.js';

export class AuthRepository {
  /**
   * Inicia sesión con correo y contraseña (Requisito 5)
   */
  static async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  /**
   * Obtiene el rol del usuario desde la tabla de perfiles en Supabase (Requisito 6)
   */
  static async getUserRole(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error al obtener el rol del usuario:', error);
      return 'Usuario Común';
    }
    return data?.role || 'Usuario Común';
  }

  /**
   * Solicita el restablecimiento de contraseña vía Gmail (Requisito 8)
   */
  static async requestPasswordReset(email) {
    const redirectUrl = `${window.location.origin}/reset-password.html`;
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    // Se suprime el error en el retorno para mantener el mensaje genérico contra enumeración de usuarios
    return { success: true };
  }

  /**
   * Cierra la sesión activa
   */
  static async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Invita un nuevo usuario enviándole instrucciones por correo (Requisitos 7 y 11)
   */
  static async inviteUser(email, role) {
    const { data, error } = await supabase.rpc('invitar_usuario_admin', {
      p_email: email,
      p_role: role
    });
    if (error) throw error;
    return data;
  }

  /**
   * Obtiene la lista de solicitudes pendientes para el administrador (Requisito 10)
   */
  static async getPendingRequests() {
    const { data, error } = await supabase
      .from('solicitudes_acceso')
      .select('*')
      .eq('estado', 'pendiente');

    if (error) throw error;
    return data;
  }

  /**
   * Aprueba o rechaza una solicitud de usuario (Requisito 10)
   */
  static async resolveRequest(requestId, status) {
    const { data, error } = await supabase.rpc('resolver_solicitud_acceso', {
      p_solicitud_id: requestId,
      p_nuevo_estado: status
    });
    if (error) throw error;
    return data;
  }
}