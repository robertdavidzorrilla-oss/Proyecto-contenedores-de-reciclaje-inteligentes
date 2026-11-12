// js/business/authService.js
import { AuthRepository } from '../data/authRepository.js';

export class AuthService {
  static currentUser = null;
  static currentRole = 'Usuario Común';

  /**
   * Valida credenciales e inicializa el perfil de usuario
   */
  static async login(email, password) {
    const authData = await AuthRepository.login(email, password);
    this.currentUser = authData.user;
    this.currentRole = await AuthRepository.getUserRole(authData.user.id);
    
    return {
      user: this.currentUser,
      role: this.currentRole
    };
  }

  /**
   * Envía correo de restablecimiento con respuesta genérica (Requisito 8)
   */
  static async resetPassword(email) {
    return await AuthRepository.requestPasswordReset(email);
  }

  /**
   * Retorna si el usuario activo tiene rol de Administrador
   */
  static isAdmin() {
    return this.currentRole === 'Administrador';
  }

  /**
   * Registrar/Invitar nuevo usuario desde panel admin (Requisito 7)
   */
  static async createNewUser(email, role) {
    if (!this.isAdmin()) {
      throw new Error('Acceso no autorizado: Solo administradores pueden registrar usuarios.');
    }
    return await AuthRepository.inviteUser(email, role);
  }

  /**
   * Obtiene todos los usuarios registrados para la gestión de roles
   */
  static async getAllUsers() {
    if (!this.isAdmin()) {
      throw new Error('Acceso no autorizado: Solo administradores pueden ver los usuarios.');
    }
    return await AuthRepository.getAllUsers();
  }

  /**
   * Otorga o revoca roles a usuarios (ascender a Administrador o descender a Usuario Común)
   */
  static async updateUserRole(userId, newRole) {
    if (!this.isAdmin()) {
      throw new Error('Acceso no autorizado: Solo administradores pueden cambiar roles.');
    }
    return await AuthRepository.updateUserRole(userId, newRole);
  }

  /**
   * Obtiene las solicitudes pendientes para el administrador
   */
  static async getPendingRequests() {
    if (!this.isAdmin()) {
      throw new Error('Acceso no autorizado: Solo administradores pueden ver las solicitudes.');
    }
    return await AuthRepository.getPendingRequests();
  }

  /**
   * Obtiene la cantidad de solicitudes pendientes
   */
  static async getPendingRequestsCount() {
    if (!this.isAdmin()) return 0;
    return await AuthRepository.getPendingRequestsCount();
  }

  /**
   * Aceptar o rechazar solicitudes (Requisito 10)
   */
  static async handleRequest(requestId, action) {
    if (!this.isAdmin()) {
      throw new Error('Acceso restringido: Solo administradores pueden gestionar solicitudes.');
    }
    const status = action === 'approve' ? 'aprobado' : 'rechazado';
    return await AuthRepository.resolveRequest(requestId, status);
  }
}
