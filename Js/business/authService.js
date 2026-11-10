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
   * Aceptar o rechazar solicitudes (Requisito 10)
   */
  static async handleRequest(requestId, action) {
    if (!this.isAdmin()) {
      throw new Error('Acceso restringido.');
    }
    const status = action === 'approve' ? 'aprobado' : 'rechazado';
    return await AuthRepository.resolveRequest(requestId, status);
  }
}