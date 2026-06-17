import { create } from 'zustand';
import { api } from '../api';

export interface MonthlyPlan {
  id:           string;
  userId:       string;
  userName?:    string | null;
  department?:  string | null;
  projectName:  string | null;
  category:     string | null;
  taskName:     string;
  assigneeNote: string | null;
  startDate:    string;
  endDate:      string;
  progress:     number;
  priority:     number;
}

interface State {
  plans:   MonthlyPlan[];
  loading: boolean;
  fetchPlans:  (params: { year: number }) => Promise<void>;
  addPlan:     (data: Omit<MonthlyPlan, 'id' | 'userId' | 'userName' | 'department'>) => Promise<MonthlyPlan>;
  editPlan:    (id: string, data: Partial<MonthlyPlan>) => Promise<void>;
  removePlan:  (id: string) => Promise<void>;
}

export const useMonthlyPlanStore = create<State>()((set) => ({
  plans:   [],
  loading: false,

  fetchPlans: async (params) => {
    set({ loading: true });
    try {
      const plans = await api.getMonthlyPlans(params);
      set({ plans, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addPlan: async (data) => {
    const created = await api.createMonthlyPlan(data);
    set(s => ({ plans: [...s.plans, created] }));
    return created;
  },

  editPlan: async (id, data) => {
    await api.updateMonthlyPlan(id, data);
    set(s => ({ plans: s.plans.map(p => p.id === id ? { ...p, ...data } : p) }));
  },

  removePlan: async (id) => {
    await api.deleteMonthlyPlan(id);
    set(s => ({ plans: s.plans.filter(p => p.id !== id) }));
  },
}));
