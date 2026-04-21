/**
 * @file auth.service.ts
 * Service d'authentification VAN BTP ERP.
 * Branché sur le backend Node.js via l'API REST.
 * Le token JWT reçu est stocké dans localStorage pour les requêtes suivantes.
 */

import { api } from './api';
import { Role } from '../types/permissions';

export interface AuthUser {
  id: number;
  matricule: string;
  nom: string;
  prenom: string;
  email: string;
  photoUrl?: string;
  doitChangerMotDePasse?: boolean;
}

export interface LoginCredentials {
  matricule: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  role?: Role;
  token?: string;
  error?: string;
}

const TOKEN_KEY = 'van_btp_token';
const USER_KEY  = 'van_btp_user';
const ROLE_KEY  = 'van_btp_role';

export const authService = {
  /**
   * Authentifie un utilisateur — appel POST /api/auth/login
   */
  login: async (credentials: LoginCredentials): Promise<AuthResult> => {
    try {
      const data = await api.post<{ data: { token: string; role: Role; user: AuthUser } }>(
        '/api/auth/login',
        credentials
      );
      const { token, role, user } = data.data;

      // Stocker le token pour les prochaines requêtes
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_KEY, role);

      return { success: true, token, role, user };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Erreur de connexion',
      };
    }
  },

  /**
   * Déconnexion — supprime le token du localStorage
   */
  logout: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
  },

  /**
   * Récupère le token JWT stocké
   */
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),

  /**
   * Récupère l'utilisateur stocké en cache
   */
  getCachedUser: (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  /**
   * Récupère le rôle stocké en cache
   */
  getCachedRole: (): Role | null => {
    return (localStorage.getItem(ROLE_KEY) as Role) || null;
  },

  /**
   * Vérifie la session en cours — appel GET /api/auth/me
   */
  checkSession: async (): Promise<{ user: AuthUser; role: Role } | null> => {
    const token = authService.getToken();
    if (!token) return null;
    try {
      const data = await api.get<{ data: { user: AuthUser; role: Role } }>('/api/auth/me', { token });
      return data.data;
    } catch {
      authService.logout();
      return null;
    }
  },

  /**
   * Change le mot de passe — appel PUT /api/auth/password
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await api.put('/api/auth/password', { currentPassword, newPassword }, {
        token: authService.getToken() || undefined,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erreur lors du changement' };
    }
  },
};
