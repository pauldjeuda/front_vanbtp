import { api } from './api';

// Base URL pour les liens de téléchargement directs (avec token dans l'URL si besoin)
const getBaseUrl = () => import.meta.env.VITE_API_URL || '';

export const documentService = {
  getAll: async (filters?: { projectId?: number; type?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.type) params.set('type', filters.type);
    const res = await api.get<{ data: any[] }>(`/api/documents${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },

  upload: async (formData: FormData) => {
    const res = await api.upload<{ data: any }>('/api/documents', formData);
    return res.data;
  },

  remove: async (id: number) => {
    await api.delete(`/api/documents/${id}`);
  },

  // URL de téléchargement avec le token JWT en query param
  downloadUrl: (id: number): string => {
    const token = localStorage.getItem('van_btp_token');
    const base  = getBaseUrl();
    return `${base}/api/documents/${id}/download${token ? `?token=${token}` : ''}`;
  },
};
