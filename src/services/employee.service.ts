import { api } from './api';

export const employeeService = {
  getAll: async (filters?: { projectId?: number }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    const res = await api.get<{ data: any[] }>(`/api/employees${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  create: async (payload: any) => (await api.post<{ data: any }>('/api/employees', payload)).data,
  update: async (id: number, payload: any) => (await api.put<{ data: any }>(`/api/employees/${id}`, payload)).data,
  remove: async (id: number) => { await api.delete(`/api/employees/${id}`); },
};
