import { api } from './api';

export const attendanceService = {
  getAll: async (filters?: { projectId?: number; date?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.projectId) params.set('projectId', String(filters.projectId));
    if (filters?.date)      params.set('date', filters.date);
    if (filters?.status)    params.set('status', filters.status);
    const res = await api.get<{ data: any[] }>(`/api/attendance${params.toString() ? `?${params}` : ''}`);
    return res.data;
  },
  bulkCreate: async (payload: { projectId: number; date: string; records: any[] }) => {
    const res = await api.post<{ data: any[] }>('/api/attendance/bulk', payload);
    return res.data;
  },
  getHistory: async (employeeId: number) => {
    const res = await api.get<{ data: any[] }>(`/api/attendance/employee/${employeeId}`);
    return res.data;
  },
};
