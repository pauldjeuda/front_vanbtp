import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { authService } from '../services/auth.service';

export type Role = 'dg' | 'chef' | 'technicien' | 'rh';

export interface UserProfile {
  matricule: string;
  name: string;
  email?: string;
  photoUrl?: string;
}

interface UserContextType {
  role: Role | null;
  setRole: (role: Role | null) => void;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const cachedUser = authService.getCachedUser();
  const cachedRole = authService.getCachedRole();

  const [role, setRoleState] = useState<Role | null>(cachedRole);
  const [profile, setProfileState] = useState<UserProfile | null>(
    cachedUser
      ? {
          matricule: cachedUser.matricule,
          name: ([cachedUser.prenom, cachedUser.nom].filter(Boolean).join(' ').trim() || cachedUser.matricule || 'Utilisateur').toString(),
          email: cachedUser.email,
          photoUrl: cachedUser.photoUrl,
        }
      : null
  );

  const setRole = (nextRole: Role | null) => {
    setRoleState(nextRole);
  };

  const setProfile = (nextProfile: UserProfile | null) => {
    setProfileState(nextProfile);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfileState(prev => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  };

  const logout = () => {
    authService.logout();
    setRoleState(null);
    setProfileState(null);
  };

  const value = useMemo(() => ({ role, setRole, profile, setProfile, updateProfile, logout }), [role, profile]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
