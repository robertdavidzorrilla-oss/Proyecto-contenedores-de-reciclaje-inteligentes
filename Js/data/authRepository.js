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
   * Obtiene todos los usuarios registrados para la gestión de roles
   */
  static async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      return [];
    }
  }

  /**
   * Actualiza el rol de un usuario (ascender a Administrador o descender a Usuario Común)
   */
  static async updateUserRole(userId, newRole) {
    try {
      const { data, error } = await supabase.rpc('cambiar_rol_usuario', {
        p_user_id: userId,
        p_nuevo_rol: newRole
      });
      if (!error && data) return data;
    } catch (e) {
      // Fallback si la función RPC no está presente en la base de datos
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
      .select();

    if (error) throw error;
    return data;
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
    try {
      const { data, error } = await supabase
        .from('solicitudes_acceso')
        .select('*')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener solicitudes pendientes:', error);
      return [];
    }
  }

  /**
   * Obtiene la cantidad de solicitudes pendientes para el badge del menú
   */
  static async getPendingRequestsCount() {
    try {
      const { count, error } = await supabase
        .from('solicitudes_acceso')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'pendiente');

      if (error) throw error;
      return count || 0;
    } catch (error) {
      const list = await this.getPendingRequests();
      return list ? list.length : 0;
    }
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
